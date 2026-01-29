import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
  writeBatch,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db as firestone, storage } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import type { Fase, Objetivo, Tarefa } from "../lib/db";
import {
  ChevronLeft,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Edit3,
  Save,
  X,
  FileIcon,
  Paperclip,
  Trash2,
  Loader2
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Quill modules for image handling
const modules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
    ['link', 'image'],
    ['clean']
  ],
};

function calcularProgresso(tarefas: Tarefa[]) {
  if (tarefas.length === 0) return 0;
  const concluidas = tarefas.filter(t => t.concluida).length;
  return Math.round((concluidas / tarefas.length) * 100);
}

export default function Fases() {
  const { objetivoId } = useParams();
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [faseAberta, setFaseAberta] = useState<string | null>(null);
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [editandoTarefaId, setEditandoTarefaId] = useState<string | null>(null);
  const [novaTarefaFaseId, setNovaTarefaFaseId] = useState<string | null>(null);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<Partial<Tarefa>>({});
  const [uploading, setUploading] = useState(false);
  const [editandoFaseId, setEditandoFaseId] = useState<string | null>(null);
  const [novoTituloFase, setNovoTituloFase] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchFases();
  }, [objetivoId]);

  const fetchFases = async () => {
    if (!objetivoId) return;

    // Load local data first
    try {
      const localFases = await dbLocal.fases.where("objetivoId").equals(objetivoId).toArray();
      if (localFases.length > 0) {
        setFases(localFases.sort((a, b) => a.ordem - b.ordem));
      }
    } catch (err) {
      console.warn("Erro ao carregar dados locais:", err);
    }

    try {
      const objRef = doc(firestone, "objetivos", objetivoId);
      const objSnap = await getDoc(objRef);
      if (!objSnap.exists()) throw new Error("Objetivo não encontrado");

      const objData = objSnap.data();
      const objetivo: Objetivo = {
        id: objSnap.id,
        titulo: objData.titulo,
        descricao: objData.descricao || "",
        ordem: objData.ordem ?? 0,
        criadoEm: objData.criadoEm instanceof Timestamp ? objData.criadoEm.toDate().toISOString() : null,
        atualizadoEm: objData.atualizadoEm instanceof Timestamp ? objData.atualizadoEm.toDate().toISOString() : null,
      };
      setObjetivo(objetivo);

      const fasesSnap = await getDocs(collection(firestone, "objetivos", objetivoId, "fases"));

      // Fetch all tasks in parallel for better performance
      const todasFases: Fase[] = await Promise.all(fasesSnap.docs.map(async (faseDoc) => {
        const faseData = faseDoc.data();
        const tarefasSnap = await getDocs(
          collection(firestone, "objetivos", objetivoId, "fases", faseDoc.id, "tarefas")
        );

        const tarefas: Tarefa[] = tarefasSnap.docs.map((t) => {
          const data = t.data();
          return {
            id: t.id,
            nome: data.nome,
            concluida: data.concluida,
            ordem: data.ordem ?? 0,
            faseId: faseDoc.id,
            descricao: data.descricao || "",
            arquivos: data.arquivos || [],
          };
        });

        return {
          id: faseDoc.id,
          titulo: faseData.titulo,
          ordem: faseData.ordem ?? 0,
          objetivoId,
          tarefas: tarefas.sort((a, b) => a.ordem - b.ordem),
        };
      }));

      const fasesOrdenadas = todasFases.sort((a, b) => a.ordem - b.ordem);
      setFases(fasesOrdenadas);

      // Sync with local DB
      await dbLocal.fases.where("objetivoId").equals(objetivoId).delete();
      await dbLocal.fases.bulkPut(fasesOrdenadas);
    } catch (err) {
      console.warn("Erro ao carregar dados do Firestore:", err);
    }
  };

  const atualizarProgressoObjetivo = async (fasesParaCalcular: Fase[]) => {
    if (!objetivoId) return;

    let totalTarefas = 0;
    let concluidas = 0;

    fasesParaCalcular.forEach(f => {
      const tarefas = f.tarefas || [];
      totalTarefas += tarefas.length;
      concluidas += tarefas.filter(t => t.concluida).length;
    });

    const novoProgresso = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

    try {
      // Update Firestore
      await updateDoc(doc(firestone, "objetivos", objetivoId), {
        progresso: novoProgresso,
        atualizadoEm: serverTimestamp()
      });

      // Update Dexie
      await dbLocal.objetivos.update(objetivoId, {
        progresso: novoProgresso,
        atualizadoEm: new Date().toISOString()
      });
    } catch (err) {
      console.error("Erro ao atualizar progresso do objetivo:", err);
    }
  };

  const salvarTituloFase = async (faseId: string) => {
    if (!objetivoId || !novoTituloFase.trim()) {
      setEditandoFaseId(null);
      return;
    }

    try {
      const faseRef = doc(firestone, "objetivos", objetivoId, "fases", faseId);
      await updateDoc(faseRef, { titulo: novoTituloFase });

      setFases(prev => {
        const updated = prev.map(f => f.id === faseId ? { ...f, titulo: novoTituloFase } : f);
        dbLocal.fases.bulkPut(updated);
        return updated;
      });
      setEditandoFaseId(null);
    } catch (err) {
      console.error("Erro ao salvar título da fase:", err);
    }
  };

  const copiarDescricao = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || "";
    navigator.clipboard.writeText(text).then(() => {
      alert("Descrição copiada para o clipboard!");
    }).catch(err => {
      console.error("Erro ao copiar:", err);
    });
  };

  const onDragEndFases = async (result: DropResult) => {
    if (!result.destination || !objetivoId) return;
    const items = Array.from(fases);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedFases = items.map((f, i) => ({ ...f, ordem: i }));
    setFases(updatedFases);

    try {
      const batch = writeBatch(firestone);
      updatedFases.forEach(f => {
        batch.update(doc(firestone, "objetivos", objetivoId, "fases", f.id), { ordem: f.ordem });
      });
      await batch.commit();
      await dbLocal.fases.bulkPut(updatedFases);
    } catch (err) {
      console.error("Erro ao salvar ordem das fases:", err);
    }
  };

  const onDragEndTarefas = async (result: DropResult, faseId: string) => {
    if (!result.destination || !objetivoId) return;
    const faseIndex = fases.findIndex(f => f.id === faseId);
    if (faseIndex === -1) return;

    const novasFases = [...fases];
    const tarefas = Array.from(novasFases[faseIndex].tarefas || []);
    const [reorderedItem] = tarefas.splice(result.source.index, 1);
    tarefas.splice(result.destination.index, 0, reorderedItem);

    const updatedTarefas = tarefas.map((t, i) => ({ ...t, ordem: i }));
    novasFases[faseIndex].tarefas = updatedTarefas;
    setFases(novasFases);

    try {
      const batch = writeBatch(firestone);
      updatedTarefas.forEach(t => {
        if (t.id) {
          batch.update(doc(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas", t.id), { ordem: t.ordem });
        }
      });
      await batch.commit();
      await dbLocal.fases.bulkPut(novasFases);
    } catch (err) {
      console.error("Erro ao salvar ordem das tarefas:", err);
    }
  };

  const toggleTarefaConcluida = async (faseId: string, tarefa: Tarefa) => {
    if (!objetivoId || !tarefa.id) return;
    const novaConcluida = !tarefa.concluida;

    try {
      await updateDoc(doc(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas", tarefa.id), {
        concluida: novaConcluida
      });

      setFases(prev => {
        const updated = prev.map(f => {
          if (f.id === faseId) {
            return {
              ...f,
              tarefas: f.tarefas?.map(t => t.id === tarefa.id ? { ...t, concluida: novaConcluida } : t)
            };
          }
          return f;
        });
        // Sync with local DB
        dbLocal.fases.bulkPut(updated);
        atualizarProgressoObjetivo(updated);
        return updated;
      });
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
    }
  };

  const iniciarEdicaoTarefa = (tarefa: Tarefa) => {
    setEditandoTarefaId(tarefa.id || null);
    setNovaTarefaFaseId(null);
    setTarefaEmEdicao({ ...tarefa });
  };

  const iniciarNovaTarefa = (faseId: string) => {
    setNovaTarefaFaseId(faseId);
    setEditandoTarefaId(null);
    setTarefaEmEdicao({
      nome: "",
      descricao: "",
      concluida: false,
      ordem: (fases.find(f => f.id === faseId)?.tarefas?.length || 0),
      arquivos: []
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !objetivoId) return;

    setUploading(true);
    const novosArquivos = [...(tarefaEmEdicao.arquivos || [])];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `objetivos/${objetivoId}/tarefas/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        novosArquivos.push({
          nome: file.name,
          url: url,
          tipo: file.type
        });
      }
      setTarefaEmEdicao(prev => ({ ...prev, arquivos: novosArquivos }));
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
    } finally {
      setUploading(false);
    }
  };

  const removerArquivo = (index: number) => {
    setTarefaEmEdicao(prev => ({
      ...prev,
      arquivos: prev.arquivos?.filter((_, i) => i !== index)
    }));
  };

  const salvarTarefa = async (faseId: string) => {
    if (!objetivoId || !tarefaEmEdicao.nome) return;

    try {
      let novaTarefa: Tarefa | null = null;

      if (editandoTarefaId) {
        // Editar existente
        await updateDoc(doc(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas", editandoTarefaId), {
          nome: tarefaEmEdicao.nome,
          descricao: tarefaEmEdicao.descricao || "",
          arquivos: tarefaEmEdicao.arquivos || []
        });
      } else {
        // Criar nova
        const novaRef = await addDoc(collection(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas"), {
          nome: tarefaEmEdicao.nome,
          descricao: tarefaEmEdicao.descricao || "",
          concluida: false,
          ordem: tarefaEmEdicao.ordem || 0,
          arquivos: tarefaEmEdicao.arquivos || []
        });

        novaTarefa = {
          id: novaRef.id,
          faseId,
          nome: tarefaEmEdicao.nome,
          descricao: tarefaEmEdicao.descricao || "",
          concluida: false,
          ordem: tarefaEmEdicao.ordem || 0,
          arquivos: tarefaEmEdicao.arquivos || []
        };
      }

      setFases(prev => {
        const updated = prev.map(f => {
          if (f.id === faseId) {
            if (editandoTarefaId) {
              return {
                ...f,
                tarefas: f.tarefas?.map(t => t.id === editandoTarefaId ? {
                  ...t,
                  nome: tarefaEmEdicao.nome!,
                  descricao: tarefaEmEdicao.descricao || "",
                  arquivos: tarefaEmEdicao.arquivos || []
                } : t)
              };
            } else if (novaTarefa) {
              return {
                ...f,
                tarefas: [...(f.tarefas || []), novaTarefa].sort((a, b) => a.ordem - b.ordem)
              };
            }
          }
          return f;
        });
        // Sync with local DB
        dbLocal.fases.bulkPut(updated);
        atualizarProgressoObjetivo(updated);
        return updated;
      });

      setEditandoTarefaId(null);
      setNovaTarefaFaseId(null);
      setTarefaEmEdicao({});
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
    }
  };

  const excluirTarefa = async (faseId: string, tarefaId: string) => {
    if (!objetivoId || !window.confirm("Deseja realmente excluir esta tarefa?")) return;

    try {
      const batch = writeBatch(firestone);
      batch.delete(doc(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas", tarefaId));
      await batch.commit();

      setFases(prev => {
        const updated = prev.map(f => {
          if (f.id === faseId) {
            return {
              ...f,
              tarefas: f.tarefas?.filter(t => t.id !== tarefaId)
            };
          }
          return f;
        });
        // Sync with local DB
        dbLocal.fases.bulkPut(updated);
        atualizarProgressoObjetivo(updated);
        return updated;
      });
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
    }
  };

  const excluirFase = async (faseId: string) => {
    if (!objetivoId || !window.confirm("Deseja realmente excluir esta fase e todas as suas tarefas?")) return;

    try {
      const batch = writeBatch(firestone);

      // Delete all tasks first
      const tarefasSnap = await getDocs(collection(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas"));
      tarefasSnap.docs.forEach(t => {
        batch.delete(doc(firestone, "objetivos", objetivoId, "fases", faseId, "tarefas", t.id));
      });

      // Delete the phase
      batch.delete(doc(firestone, "objetivos", objetivoId, "fases", faseId));

      await batch.commit();

      setFases(prev => {
        const updated = prev.filter(f => f.id !== faseId);
        // Sync with local DB
        dbLocal.fases.delete(faseId);
        atualizarProgressoObjetivo(updated);
        return updated;
      });
    } catch (err) {
      console.error("Erro ao excluir fase:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-2">
      <header className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 line-clamp-1">
              {objetivo?.titulo ?? "Carregando..."}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Gerencie as fases e tarefas</p>
          </div>
        </div>
        <Link
          to={`/objetivos/${objetivoId}/fases/nova`}
          className="sm:ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Nova Fase
        </Link>
      </header>

      {fases.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-400 dark:text-gray-500">Nenhuma fase cadastrada.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEndFases}>
          <Droppable droppableId="fases">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {fases.map((fase, index) => {
                  const progresso = calcularProgresso(fase.tarefas || []);
                  const isAberta = faseAberta === fase.id;

                  return (
                    <Draggable key={fase.id} draggableId={fase.id} index={index}>
                      {(provided, snapshot) => (
                        <article
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 z-50" : "shadow-sm border-gray-200 dark:border-gray-700"
                            }`}
                        >
                          <div className="p-4 flex items-center gap-3">
                            <div {...provided.dragHandleProps} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400">
                              <GripVertical size={20} />
                            </div>
                            <div
                              className="flex-1 min-w-0"
                              onClick={() => !editandoFaseId && setFaseAberta(isAberta ? null : fase.id)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                {editandoFaseId === fase.id ? (
                                  <div className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                                    <input
                                      autoFocus
                                      type="text"
                                      value={novoTituloFase}
                                      onChange={e => setNovoTituloFase(e.target.value)}
                                      onKeyDown={e => e.key === "Enter" && salvarTituloFase(fase.id)}
                                      onBlur={() => salvarTituloFase(fase.id)}
                                      className="flex-1 bg-gray-50 dark:bg-gray-900 border-b-2 border-indigo-500 text-gray-800 dark:text-gray-100 outline-none font-bold text-base sm:text-lg"
                                    />
                                  </div>
                                ) : (
                                  <h2
                                    className="font-bold text-gray-800 dark:text-gray-100 text-base sm:text-lg truncate group flex items-center gap-2 cursor-pointer"
                                    onClick={(e) => {
                                      if (isAberta) {
                                        e.stopPropagation();
                                        setEditandoFaseId(fase.id);
                                        setNovoTituloFase(fase.titulo);
                                      }
                                    }}
                                  >
                                    {fase.titulo}
                                    <Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-500 transition-all shrink-0" />
                                  </h2>
                                )}
                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                  <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                                    {progresso}%
                                  </span>
                                  {isAberta ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                </div>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="bg-indigo-500 h-full transition-all duration-500"
                                  style={{ width: `${progresso}%` }}
                                />
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                excluirFase(fase.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Excluir Fase"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {isAberta && (
                            <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10">
                              <div className="flex items-center justify-between py-4">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tarefas</h3>
                                <button
                                  onClick={() => iniciarNovaTarefa(fase.id)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-bold flex items-center gap-1"
                                >
                                  <Plus size={14} /> Adicionar Tarefa
                                </button>
                              </div>

                              <DragDropContext onDragEnd={(res) => onDragEndTarefas(res, fase.id)}>
                                <Droppable droppableId={`tarefas-${fase.id}`}>
                                  {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                      {/* Form para Nova Tarefa */}
                                      {novaTarefaFaseId === fase.id && (
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-indigo-500 p-4 shadow-lg animate-in fade-in zoom-in duration-200">
                                          <div className="space-y-4">
                                            <input
                                              type="text"
                                              value={tarefaEmEdicao.nome}
                                              onChange={e => setTarefaEmEdicao(p => ({ ...p, nome: e.target.value }))}
                                              className="w-full text-lg font-bold border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-800 dark:text-gray-100 focus:border-indigo-500 outline-none py-1"
                                              placeholder="Título da nova tarefa"
                                              autoFocus
                                            />
                                            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                              <ReactQuill
                                                theme="snow"
                                                value={tarefaEmEdicao.descricao || ""}
                                                onChange={val => setTarefaEmEdicao(p => ({ ...p, descricao: val }))}
                                                modules={modules}
                                                placeholder="Detalhes da tarefa..."
                                              />
                                            </div>

                                            {/* File Upload Section */}
                                            <div className="space-y-2">
                                              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <Paperclip size={14} /> Anexos
                                              </label>
                                              <div className="flex flex-wrap gap-2">
                                                {tarefaEmEdicao.arquivos?.map((arq, i) => (
                                                  <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-sm group">
                                                    <FileIcon size={14} className="text-indigo-500" />
                                                    <span className="text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{arq.nome}</span>
                                                    <button onClick={() => removerArquivo(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                ))}
                                                <label className="cursor-pointer flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                  {uploading ? "Enviando..." : "Anexar Arquivo"}
                                                  <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                                </label>
                                              </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                                              <button
                                                onClick={() => setNovaTarefaFaseId(null)}
                                                className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                                              >
                                                <X size={16} /> Cancelar
                                              </button>
                                              <button
                                                onClick={() => salvarTarefa(fase.id)}
                                                disabled={!tarefaEmEdicao.nome || uploading}
                                                className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                                              >
                                                <Save size={16} /> Criar Tarefa
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {fase.tarefas?.map((tarefa, tIndex) => {
                                        const isTarefaAberta = tarefaAberta === tarefa.id;
                                        const isEditando = editandoTarefaId === tarefa.id;

                                        return (
                                          <Draggable key={tarefa.id} draggableId={tarefa.id!} index={tIndex}>
                                            {(provided, tSnapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${tSnapshot.isDragging ? "shadow-lg ring-2 ring-indigo-400 z-50" : "border-gray-200 dark:border-gray-700"
                                                  }`}
                                              >
                                                <div className="p-3 flex items-center gap-3">
                                                  <div {...provided.dragHandleProps} className="text-gray-300 dark:text-gray-600">
                                                    <GripVertical size={16} />
                                                  </div>
                                                  <button
                                                    onClick={() => toggleTarefaConcluida(fase.id, tarefa)}
                                                    className={`transition-colors ${tarefa.concluida ? "text-green-500" : "text-gray-300 dark:text-gray-600 hover:text-indigo-400"}`}
                                                  >
                                                    {tarefa.concluida ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                                  </button>

                                                  <div
                                                    className="flex-1 cursor-pointer min-w-0"
                                                    onClick={() => setTarefaAberta(isTarefaAberta ? null : tarefa.id!)}
                                                  >
                                                    <span className={`font-medium block truncate ${tarefa.concluida ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-200"}`}>
                                                      {tarefa.nome}
                                                    </span>
                                                    {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                        <Paperclip size={10} /> {tarefa.arquivos.length}
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => iniciarEdicaoTarefa(tarefa)}
                                                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                      title="Editar Tarefa"
                                                    >
                                                      <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                      onClick={() => excluirTarefa(fase.id, tarefa.id!)}
                                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                      title="Excluir Tarefa"
                                                    >
                                                      <Trash2 size={16} />
                                                    </button>
                                                  </div>
                                                </div>

                                                {(isTarefaAberta || isEditando) && (
                                                  <div className="px-10 pb-4 pt-2 border-t border-gray-50 dark:border-gray-700">
                                                    {isEditando ? (
                                                      <div className="space-y-4">
                                                        <input
                                                          type="text"
                                                          value={tarefaEmEdicao.nome}
                                                          onChange={e => setTarefaEmEdicao(p => ({ ...p, nome: e.target.value }))}
                                                          className="w-full text-lg font-bold border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-800 dark:text-gray-100 focus:border-indigo-500 outline-none py-1"
                                                          placeholder="Título da tarefa"
                                                        />
                                                        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                          <ReactQuill
                                                            theme="snow"
                                                            value={tarefaEmEdicao.descricao || ""}
                                                            onChange={val => setTarefaEmEdicao(p => ({ ...p, descricao: val }))}
                                                            modules={modules}
                                                            placeholder="Detalhes da tarefa..."
                                                          />
                                                        </div>

                                                        {/* File Upload Section for Edit */}
                                                        <div className="space-y-2">
                                                          <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                            <Paperclip size={14} /> Anexos
                                                          </label>
                                                          <div className="flex flex-wrap gap-2">
                                                            {tarefaEmEdicao.arquivos?.map((arq, i) => (
                                                              <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-sm group">
                                                                <FileIcon size={14} className="text-indigo-500" />
                                                                <span className="text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{arq.nome}</span>
                                                                <button onClick={() => removerArquivo(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                                  <X size={14} />
                                                                </button>
                                                              </div>
                                                            ))}
                                                            <label className="cursor-pointer flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                                              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                              {uploading ? "Enviando..." : "Anexar Arquivo"}
                                                              <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                                            </label>
                                                          </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                                                          <button
                                                            onClick={() => setEditandoTarefaId(null)}
                                                            className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                                                          >
                                                            <X size={16} /> Cancelar
                                                          </button>
                                                          <button
                                                            onClick={() => salvarTarefa(fase.id)}
                                                            disabled={!tarefaEmEdicao.nome || uploading}
                                                            className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                          >
                                                            <Save size={16} /> Salvar
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="space-y-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                          <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Descrição</h4>
                                                          {tarefa.descricao && (
                                                            <button
                                                              onClick={() => copiarDescricao(tarefa.descricao!)}
                                                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-md transition-colors"
                                                            >
                                                              <Paperclip size={12} /> Copiar
                                                            </button>
                                                          )}
                                                        </div>
                                                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                                                          {tarefa.descricao ? (
                                                            <div dangerouslySetInnerHTML={{ __html: tarefa.descricao }} />
                                                          ) : (
                                                            <p className="italic text-gray-400 dark:text-gray-500">Sem descrição detalhada.</p>
                                                          )}
                                                        </div>

                                                        {/* Display Files */}
                                                        {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                                          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Arquivos Anexados</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                              {tarefa.arquivos.map((arq, i) => (
                                                                <a
                                                                  key={i}
                                                                  href={arq.url}
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-sm hover:border-indigo-500 transition-colors group"
                                                                >
                                                                  <FileIcon size={16} className="text-indigo-500" />
                                                                  <span className="text-gray-700 dark:text-gray-200 font-medium">{arq.nome}</span>
                                                                </a>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </DragDropContext>
                            </div>
                          )}
                        </article>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
