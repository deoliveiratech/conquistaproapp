import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import { Link, useSearchParams } from "react-router-dom";
import type { Objetivo } from "../lib/db";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Search, Filter, GripVertical, Edit2, Check, X as XIcon, PlusCircle, ChevronRight, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { SyncService } from "../lib/sync";

interface Categoria {
  id: string;
  nome: string;
  subcategorias?: { id: string; nome: string }[];
}

import { useAuth } from "../context/AuthContext";

export default function Objetivos() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [searchParams] = useSearchParams();
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [progressoPorObjetivo, setProgressoPorObjetivo] = useState<Record<string, number>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<{ titulo: string; descricao: string; categoriaId: string; subcategoriaId: string }>({
    titulo: "",
    descricao: "",
    categoriaId: "",
    subcategoriaId: "",
  });
  const [erroTitulo, setErroTitulo] = useState(false);

  // Filters state
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Reactive query from Dexie
  const objetivosLocal = useLiveQuery(async () => {
    if (!userId) return [];
    const objs = await dbLocal.objetivos.where("userId").equals(userId).toArray();
    return objs.sort((a, b) => a.ordem - b.ordem);
  }, [userId]);



  useEffect(() => {
    if (objetivosLocal) {
      setObjetivos(objetivosLocal);
      calcularProgressoLocal(objetivosLocal);
    }
  }, [objetivosLocal]);

  useEffect(() => {
    fetchCategorias();

    // Initialize filters from URL
    const q = searchParams.get("q");
    const catId = searchParams.get("categoriaId");
    if (q) setFiltroTexto(q);
    if (catId) setFiltroCategoria(catId);
  }, [searchParams]);

  const fetchCategorias = async () => {
    try {
      const snap = await getDocs(collection(firestore, "categorias"));
      const cats: Categoria[] = [];
      for (const catDoc of snap.docs) {
        const subSnap = await getDocs(collection(firestore, "categorias", catDoc.id, "subcategorias"));
        cats.push({
          id: catDoc.id,
          nome: catDoc.data().nome,
          subcategorias: subSnap.docs.map(d => ({ id: d.id, nome: d.data().nome }))
        });
      }
      setCategorias(cats);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  };

  const calcularProgressoLocal = async (lista: Objetivo[]) => {
    const progresso: Record<string, number> = {};
    for (const obj of lista) {
      if (!obj.id) continue;
      // Scoped by tenant via database integrity or extra filter? 
      // Theoretically, fases/tarefas should be fetched by ID which is unique.
      // But keeping queries scoped is better.
      const fases = await dbLocal.fases.where("objetivoId").equals(obj.id).toArray();
      let total = 0;
      let concluidas = 0;

      for (const f of fases) {
        const tarefas = await dbLocal.tarefas.where("faseId").equals(f.id).toArray();
        total += tarefas.length;
        concluidas += tarefas.filter(t => t.concluida).length;
      }

      progresso[obj.id] = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    }
    setProgressoPorObjetivo(progresso);
  };


  const objetivosFiltrados = useMemo(() => {
    return objetivos.filter(obj => {
      const matchTexto = obj.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (obj.descricao || "").toLowerCase().includes(filtroTexto.toLowerCase());
      const matchCat = !filtroCategoria || obj.categoriaId === filtroCategoria;
      return matchTexto && matchCat;
    });
  }, [objetivos, filtroTexto, filtroCategoria]);



  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !userId) return;

    const items = Array.from(objetivos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      ordem: index
    }));

    setObjetivos(updatedItems);

    try {
      // 1. Update Local (Optimistic)
      await dbLocal.objetivos.bulkPut(updatedItems);

      // 2. Queue Mutation
      updatedItems.forEach((item) => {
        if (item.id) {
          SyncService.enqueueMutation('UPDATE', `users/${userId}/objetivos`, item.id, { ordem: item.ordem });
        }
      });

    } catch (err) {
      console.error("Erro ao salvar nova ordem:", err);
    }
  };

  const iniciarEdicao = (obj: Objetivo) => {
    if (!obj.id) return;
    setEditandoId(obj.id);
    setEdicao({
      titulo: obj.titulo,
      descricao: obj.descricao || "",
      categoriaId: obj.categoriaId || "",
      subcategoriaId: obj.subcategoriaId || ""
    });
    setErroTitulo(false);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setErroTitulo(false);
  };

  const salvarEdicao = async (id: string) => {
    if (!edicao.titulo.trim() || !userId) {
      if (!edicao.titulo.trim()) setErroTitulo(true);
      return;
    }

    try {
      const updateData = {
        titulo: edicao.titulo,
        descricao: edicao.descricao,
        categoriaId: edicao.categoriaId,
        subcategoriaId: edicao.subcategoriaId,
        atualizadoEm: new Date().toISOString()
      };

      // 1. Update Local
      await dbLocal.objetivos.update(id, updateData);

      // 2. Queue Mutation
      await SyncService.enqueueMutation('UPDATE', `users/${userId}/objetivos`, id, updateData);

      setEditandoId(null);
      setErroTitulo(false);
    } catch (err) {
      console.error("Erro ao salvar edição:", err);
    }
  };

  const excluirObjetivo = async (id: string) => {
    if (!userId || !window.confirm("Deseja realmente excluir este objetivo e todos os seus dados (fases e tarefas)?")) return;

    try {
      // 1. Get related phases and tasks for deletion mutations
      const relatedFases = await dbLocal.fases.where("objetivoId").equals(id).toArray();

      // 2. Local Deletion (Optimistic)
      await dbLocal.objetivos.delete(id);

      // 3. Queue mutations and delete related records locally
      await SyncService.enqueueMutation('DELETE', `users/${userId}/objetivos`, id);

      for (const fase of relatedFases) {
        if (!fase.id) continue;
        const relatedTarefas = await dbLocal.tarefas.where("faseId").equals(fase.id).toArray();

        // Delete tasks for this phase
        for (const tarefa of relatedTarefas) {
          if (tarefa.id) {
            await SyncService.enqueueMutation('DELETE', `users/${userId}/objetivos/${id}/fases/${fase.id}/tarefas`, tarefa.id);
            await dbLocal.tarefas.delete(tarefa.id);
          }
        }

        // Delete the phase itself
        await SyncService.enqueueMutation('DELETE', `users/${userId}/objetivos/${id}/fases`, fase.id);
        await dbLocal.fases.delete(fase.id);
      }

      setObjetivos(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error("Erro ao excluir objetivo:", err);
      alert("Erro ao excluir objetivo. Verifique o console.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        {/* Removed Novo Objetivo button as requested */}
      </header>

      {/* Filters Section */}
      <section className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-2 transition-colors">
        <h2 className="text-center font-bold text-gray-700 dark:text-gray-200 mb-3 text-sm uppercase tracking-wider">Filtrar Objetivos</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por título ou descrição..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="flex items-center gap-2 md:w-1/3">
            <Filter size={18} className="text-gray-400 shrink-0" />
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
              }}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-gray-200"
            >
              <option value="">Todas as Categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {objetivos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusCircle className="text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum objetivo ainda. Crie o primeiro! 🎯</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="objetivos">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {objetivosFiltrados.map((obj, index) => {
                  if (!obj.id) return null;
                  const emEdicao = editandoId === obj.id;
                  return (
                    <Draggable key={obj.id} draggableId={obj.id} index={index}>
                      {(provided, snapshot) => (
                        <article
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-5 border transition-all duration-200 ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 scale-[1.02] z-50" : "shadow-sm border-gray-200 dark:border-gray-700 hover:shadow-md"
                            } ${emEdicao ? "ring-2 ring-indigo-500" : ""}`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div {...provided.dragHandleProps} className="mt-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing">
                              <GripVertical size={20} />
                            </div>

                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-3">
                                {emEdicao ? (
                                  <div className="flex-1 mr-4">
                                    <input
                                      value={edicao.titulo}
                                      onChange={(e) => {
                                        setEdicao((p) => ({ ...p, titulo: e.target.value }));
                                        if (e.target.value.trim()) setErroTitulo(false);
                                      }}
                                      className={`text-lg font-bold bg-gray-50 dark:bg-gray-900 border px-3 py-1.5 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-100 ${erroTitulo ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                                        }`}
                                      placeholder="Título do objetivo"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    {obj.titulo}
                                  </h2>
                                )}

                                {emEdicao ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => salvarEdicao(obj.id!)}
                                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                      title="Salvar"
                                    >
                                      <Check size={20} />
                                    </button>
                                    <button
                                      onClick={cancelarEdicao}
                                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                      title="Cancelar"
                                    >
                                      <XIcon size={20} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => iniciarEdicao(obj)}
                                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => excluirObjetivo(obj.id!)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {emEdicao ? (
                                <div className="space-y-4 mb-4">
                                  <textarea
                                    value={edicao.descricao}
                                    onChange={(e) =>
                                      setEdicao((p) => ({ ...p, descricao: e.target.value }))
                                    }
                                    className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                                    placeholder="Descrição (opcional)"
                                  />

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <select
                                      value={edicao.categoriaId}
                                      onChange={(e) => setEdicao(p => ({ ...p, categoriaId: e.target.value, subcategoriaId: "" }))}
                                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                      <option value="">Selecione a Categoria</option>
                                      {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                      ))}
                                    </select>

                                    <select
                                      value={edicao.subcategoriaId}
                                      onChange={(e) => setEdicao(p => ({ ...p, subcategoriaId: e.target.value }))}
                                      disabled={!edicao.categoriaId}
                                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                    >
                                      <option value="">Selecione a Subcategoria</option>
                                      {categorias.find(c => c.id === edicao.categoriaId)?.subcategorias?.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.nome}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                  {obj.descricao || "Sem descrição"}
                                </p>
                              )}

                              <div className="space-y-2">
                                <div className="flex justify-between items-end text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  <span>Progresso</span>
                                  <span className="text-indigo-600 dark:text-indigo-400">{obj.id ? (progressoPorObjetivo[obj.id] ?? 0) : 0}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
                                    style={{
                                      width: `${obj.id ? (progressoPorObjetivo[obj.id] ?? 0) : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              {!emEdicao && (
                                <div className="mt-6 flex items-center justify-between">
                                  <div className="flex gap-2">
                                    {obj.categoriaId && (
                                      <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase rounded-md border border-indigo-100 dark:border-indigo-800">
                                        {categorias.find(c => c.id === obj.categoriaId)?.nome}
                                      </span>
                                    )}
                                  </div>
                                  <Link
                                    to={`/objetivos/${obj.id}/fases`}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-sm flex items-center gap-1 group"
                                  >
                                    Ver Fases
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
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
