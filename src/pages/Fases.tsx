import { db as firestore, storage } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import { Link, useParams, useNavigate } from "react-router-dom";
import type { Fase, Objetivo, Tarefa } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { SyncService } from "../lib/sync";
import { useSync } from "../hooks/useSync";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useState } from "react";
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

import { useAuth } from "../context/AuthContext";

export default function Fases() {
  const { user } = useAuth();
  const userId = user?.uid;
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

  // Reactive query | Offline-First
  const fasesLocal = useLiveQuery(async () => {
    if (!objetivoId || !userId) return [];

    const fases = await dbLocal.fases.where("objetivoId").equals(objetivoId).toArray();
    // Optional: filter by userId too, but objetivoId implies it
    fases.sort((a, b) => a.ordem - b.ordem);

    for (const f of fases) {
      if (f.id) {
        const tarefas = await dbLocal.tarefas.where("faseId").equals(f.id).toArray();
        f.tarefas = tarefas.sort((a, b) => a.ordem - b.ordem);
      }
    }
    return fases;
  }, [objetivoId, userId]);

  const { triggerSync } = useSync();

  useEffect(() => {
    if (fasesLocal) {
      setFases(fasesLocal);
    }
  }, [fasesLocal]);

  useEffect(() => {
    fetchFases();
    // Fetch objective details local or remote
    fetchObjetivoDetalhes();
    triggerSync();
  }, [objetivoId, userId]);

  const fetchObjetivoDetalhes = async () => {
    if (!objetivoId || !userId) return;
    try {
      const localObj = await dbLocal.objetivos.get(objetivoId);
      if (localObj) {
        setObjetivo(localObj);
        return;
      }
      // If not local, try remote
      const objRef = doc(firestore, "users", userId, "objetivos", objetivoId);
      const objSnap = await getDoc(objRef);
      if (objSnap.exists()) {
        const data = objSnap.data();
        const obj: Objetivo = {
          id: objSnap.id,
          userId,
          titulo: data.titulo,
          descricao: data.descricao || "",
          ordem: data.ordem ?? 0,
          criadoEm: data.criadoEm instanceof Timestamp ? data.criadoEm.toDate().toISOString() : null,
          atualizadoEm: data.atualizadoEm instanceof Timestamp ? data.atualizadoEm.toDate().toISOString() : null,
        };
        setObjetivo(obj);
      }
    } catch (e) {
      console.error("Error fetching objective details", e);
    }
  };

  const fetchFases = async () => {
    if (!objetivoId || !userId) return;

    try {
      const fasesSnap = await getDocs(collection(firestore, "users", userId, "objetivos", objetivoId, "fases"));

      const todasFases: Fase[] = await Promise.all(fasesSnap.docs.map(async (faseDoc) => {
        const faseData = faseDoc.data();
        const tarefasSnap = await getDocs(
          collection(firestore, "users", userId, "objetivos", objetivoId, "fases", faseDoc.id, "tarefas")
        );

        const tarefas: Tarefa[] = tarefasSnap.docs.map((t) => {
          const data = t.data();
          return {
            id: t.id,
            userId,
            nome: data.nome,
            concluida: data.concluida,
            ordem: data.ordem ?? 0,
            faseId: faseDoc.id,
            descricao: data.descricao || "",
            arquivos: data.arquivos || [],
          };
        });

        // Save tasks locally
        await dbLocal.tarefas.bulkPut(tarefas);

        return {
          id: faseDoc.id,
          userId,
          titulo: faseData.titulo,
          ordem: faseData.ordem ?? 0,
          objetivoId,
        };
      }));

      // Update phases locally
      if (todasFases.length > 0) {
        await dbLocal.fases.bulkPut(todasFases);
      }

    } catch (err) {
      // console.warn("Background fetch failed or offline", err);
    }
  };


  const salvarTituloFase = async (faseId: string) => {
    if (!objetivoId || !novoTituloFase.trim() || !userId) {
      setEditandoFaseId(null);
      return;
    }

    try {
      const updateData = { titulo: novoTituloFase };

      // Update Local
      await dbLocal.fases.update(faseId, updateData);

      // Queue Mutation
      await SyncService.enqueueMutation('UPDATE', `users/${userId}/objetivos/${objetivoId}/fases`, faseId, updateData);

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
    if (!result.destination || !objetivoId || !userId) return;
    const items = Array.from(fases);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedFases = items.map((f, i) => ({ ...f, ordem: i }));
    setFases(updatedFases);

    try {
      // 1. Update Local
      await dbLocal.fases.bulkPut(updatedFases);

      // 2. Queue Mutation
      updatedFases.forEach(f => {
        if (f.id) {
          SyncService.enqueueMutation('UPDATE', `users/${userId}/objetivos/${objetivoId}/fases`, f.id, { ordem: f.ordem });
        }
      });
    } catch (err) {
      console.error("Erro ao salvar ordem das fases:", err);
    }
  };

  const onDragEndTarefas = async (result: DropResult, faseId: string) => {
    if (!result.destination || !objetivoId || !userId) return;
    const faseIndex = fases.findIndex(f => f.id === faseId);
    if (faseIndex === -1) return;

    const novasFases = [...fases];
    const tarefas = Array.from(novasFases[faseIndex].tarefas || []);
    const [reorderedItem] = tarefas.splice(result.source.index, 1);
    tarefas.splice(result.destination.index, 0, reorderedItem);

    const updatedTarefas = tarefas.map((t, i) => ({ ...t, ordem: i }));
    novasFases[faseIndex].tarefas = updatedTarefas;

    // Optimistic Update
    setFases(novasFases);

    try {
      // 1. Update Local (Tarefas table)
      await dbLocal.tarefas.bulkPut(updatedTarefas);

      // 2. Queue Mutation
      updatedTarefas.forEach(t => {
        if (t.id) {
          SyncService.enqueueMutation(
            'UPDATE',
            `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
            t.id,
            { ordem: t.ordem }
          );
        }
      });
    } catch (err) {
      console.error("Erro ao salvar ordem das tarefas:", err);
    }
  };

  const toggleTarefaConcluida = async (faseId: string, tarefa: Tarefa) => {
    if (!objetivoId || !tarefa.id || !userId) return;
    const novaConcluida = !tarefa.concluida;

    try {
      // 1. Update Local
      await dbLocal.tarefas.update(tarefa.id, { concluida: novaConcluida });

      // 2. Queue Mutation
      await SyncService.enqueueMutation(
        'UPDATE',
        `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
        tarefa.id,
        { concluida: novaConcluida }
      );

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
    if (!files || files.length === 0 || !objetivoId || !userId) return; // userId useful for storage path?

    setUploading(true);
    const novosArquivos = [...(tarefaEmEdicao.arquivos || [])];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Update Storage path to include userId? Usually good practice.
        const storageRef = ref(storage, `users/${userId}/objetivos/${objetivoId}/tarefas/${Date.now()}_${file.name}`);
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
    if (!objetivoId || !tarefaEmEdicao.nome || !userId) return;

    try {
      const taskData = {
        nome: tarefaEmEdicao.nome,
        descricao: tarefaEmEdicao.descricao || "",
        arquivos: tarefaEmEdicao.arquivos || [],
      };

      if (editandoTarefaId) {
        // UPDATE existing
        await dbLocal.tarefas.update(editandoTarefaId, taskData);
        await SyncService.enqueueMutation(
          'UPDATE',
          `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
          editandoTarefaId,
          taskData
        );
      } else {
        // CREATE new
        const newId = crypto.randomUUID();
        const newTask: Tarefa = {
          id: newId,
          userId,
          faseId,
          nome: taskData.nome,
          descricao: taskData.descricao,
          concluida: false,
          ordem: tarefaEmEdicao.ordem || 0,
          arquivos: taskData.arquivos
        };

        await dbLocal.tarefas.add(newTask);

        await SyncService.enqueueMutation(
          'CREATE',
          `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
          newId,
          { ...taskData, concluida: false, ordem: newTask.ordem }
        );
      }

      setEditandoTarefaId(null);
      setNovaTarefaFaseId(null);
      setTarefaEmEdicao({});
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
    }
  };

  const excluirTarefa = async (faseId: string, tarefaId: string) => {
    if (!objetivoId || !window.confirm("Deseja realmente excluir esta tarefa?") || !userId) return;

    try {
      await dbLocal.tarefas.delete(tarefaId);
      await SyncService.enqueueMutation(
        'DELETE',
        `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
        tarefaId
      );
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
    }
  };

  const excluirFase = async (faseId: string) => {
    if (!objetivoId || !window.confirm("Deseja realmente excluir esta fase e todas as suas tarefas?") || !userId) return;

    try {
      // Delete tasks locally
      const tasksToDelete = await dbLocal.tarefas.where("faseId").equals(faseId).toArray();
      const taskIds = tasksToDelete.map(t => t.id).filter((id): id is string => !!id);

      await dbLocal.tarefas.bulkDelete(taskIds);
      await dbLocal.fases.delete(faseId);

      for (const tid of taskIds) {
        await SyncService.enqueueMutation(
          'DELETE',
          `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
          tid
        );
      }

      // Queue DELETE for Phase
      await SyncService.enqueueMutation(
        'DELETE',
        `users/${userId}/objetivos/${objetivoId}/fases`,
        faseId
      );

    } catch (err) {
      console.error("Erro ao excluir fase:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-6 sm:pb-20 px-2 sm:px-4">
      <header className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
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
                          className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300 ${isAberta ? "ring-4 ring-indigo-500/10 border-indigo-500 shadow-lg" : "shadow-sm border-gray-200 dark:border-gray-700 hover:shadow-md"} ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 z-50" : ""}`}
                        >
                          <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
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
                                                className={`bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 ${isTarefaAberta ? "ring-4 ring-indigo-400/10 border-indigo-400 shadow-md" : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"} ${tSnapshot.isDragging ? "shadow-lg ring-2 ring-indigo-400 z-50" : ""}`}
                                              >
                                                <div className="p-2 sm:p-3">
                                                  <div className="flex items-start gap-3">
                                                    <div {...provided.dragHandleProps} className="text-gray-300 dark:text-gray-600 mt-1">
                                                      <GripVertical size={16} />
                                                    </div>
                                                    <div
                                                      className="flex-1 cursor-pointer min-w-0"
                                                      onClick={() => setTarefaAberta(isTarefaAberta ? null : tarefa.id!)}
                                                    >
                                                      <span className={`font-medium block break-words ${tarefa.concluida ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-200"}`}>
                                                        {tarefa.nome}
                                                      </span>
                                                      {tarefa.arquivos && tarefa.arquivos.length > 0 && (
                                                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                          <Paperclip size={10} /> {tarefa.arquivos.length}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between ml-7">
                                                    <button
                                                      onClick={() => toggleTarefaConcluida(fase.id, tarefa)}
                                                      className={`flex items-center gap-2 text-xs font-bold transition-colors ${tarefa.concluida ? "text-green-500" : "text-gray-400 dark:text-gray-500 hover:text-indigo-400"}`}
                                                    >
                                                      {tarefa.concluida ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                      {tarefa.concluida ? "Concluída" : "Marcar como concluída"}
                                                    </button>

                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        onClick={() => iniciarEdicaoTarefa(tarefa)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                        title="Editar Tarefa"
                                                      >
                                                        <Edit3 size={18} />
                                                      </button>
                                                      <button
                                                        onClick={() => excluirTarefa(fase.id, tarefa.id!)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Excluir Tarefa"
                                                      >
                                                        <Trash2 size={18} />
                                                      </button>
                                                    </div>
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
