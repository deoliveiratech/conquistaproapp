import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import { Link } from "react-router-dom";
import type { Objetivo } from "../lib/db";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Search, Filter, GripVertical, Edit2, Check, X as XIcon, PlusCircle, ChevronRight } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  subcategorias?: { id: string; nome: string }[];
}

export default function Objetivos() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [progressoPorObjetivo, setProgressoPorObjetivo] = useState<Record<string, number>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<{ titulo: string; descricao: string }>({
    titulo: "",
    descricao: "",
  });
  const [erroTitulo, setErroTitulo] = useState(false);

  // Filters state
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroSubcategoria, setFiltroSubcategoria] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchCategorias();
    fetchObjetivos();
  }, []);

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

  const fetchObjetivos = async () => {
    // Load local data first for immediate display
    try {
      const local = await dbLocal.objetivos.toArray();
      if (local.length > 0) {
        setObjetivos(local.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
      }
    } catch (err) {
      console.warn("Erro ao carregar dados locais:", err);
    }

    try {
      const snapshot = await getDocs(collection(firestore, "objetivos"));

      const lista: Objetivo[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          titulo: data.titulo,
          descricao: data.descricao || "",
          categoriaId: data.categoriaId || "",
          subcategoriaId: data.subcategoriaId || "",
          ordem: data.ordem ?? 0,
          criadoEm:
            data.criadoEm instanceof Timestamp
              ? data.criadoEm.toDate().toISOString()
              : null,
          atualizadoEm:
            data.atualizadoEm instanceof Timestamp
              ? data.atualizadoEm.toDate().toISOString()
              : null,
        };
      });

      const listaOrdenada = lista.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      setObjetivos(listaOrdenada);

      // Sync with local DB
      await dbLocal.objetivos.clear();
      await dbLocal.objetivos.bulkPut(listaOrdenada);

      const progresso: Record<string, number> = {};

      // Fetch progress in parallel for better performance
      await Promise.all(listaOrdenada.map(async (obj) => {
        if (!obj.id) return;
        const fasesSnap = await getDocs(
          collection(firestore, "objetivos", obj.id, "fases")
        );
        let total = 0;
        let concluidas = 0;

        for (const faseDoc of fasesSnap.docs) {
          const tarefasSnap = await getDocs(
            collection(
              firestore,
              "objetivos",
              obj.id,
              "fases",
              faseDoc.id,
              "tarefas"
            )
          );

          total += tarefasSnap.docs.length;
          concluidas += tarefasSnap.docs.filter((t) => t.data().concluida).length;
        }

        progresso[obj.id] = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      }));

      setProgressoPorObjetivo(progresso);
    } catch (err) {
      console.warn("Erro ao acessar Firestore:", err);
    }
  };

  const objetivosFiltrados = useMemo(() => {
    return objetivos.filter(obj => {
      const matchTexto = obj.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (obj.descricao || "").toLowerCase().includes(filtroTexto.toLowerCase());
      const matchCat = !filtroCategoria || obj.categoriaId === filtroCategoria;
      const matchSub = !filtroSubcategoria || obj.subcategoriaId === filtroSubcategoria;
      return matchTexto && matchCat && matchSub;
    });
  }, [objetivos, filtroTexto, filtroCategoria, filtroSubcategoria]);

  const subcategoriasDisponiveis = useMemo(() => {
    const cat = categorias.find(c => c.id === filtroCategoria);
    return cat?.subcategorias || [];
  }, [categorias, filtroCategoria]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(objetivos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      ordem: index
    }));

    setObjetivos(updatedItems);

    try {
      const batch = writeBatch(firestore);
      updatedItems.forEach((item) => {
        if (item.id) {
          const ref = doc(firestore, "objetivos", item.id);
          batch.update(ref, { ordem: item.ordem });
        }
      });
      await batch.commit();
      await dbLocal.objetivos.bulkPut(updatedItems);
    } catch (err) {
      console.error("Erro ao salvar nova ordem:", err);
    }
  };

  const iniciarEdicao = (obj: Objetivo) => {
    if (!obj.id) return;
    setEditandoId(obj.id);
    setEdicao({ titulo: obj.titulo, descricao: obj.descricao || "" });
    setErroTitulo(false);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setErroTitulo(false);
  };

  const salvarEdicao = async (id: string) => {
    if (!edicao.titulo.trim()) {
      setErroTitulo(true);
      return;
    }

    try {
      const ref = doc(firestore, "objetivos", id);
      await updateDoc(ref, {
        titulo: edicao.titulo,
        descricao: edicao.descricao,
      });

      setObjetivos((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, titulo: edicao.titulo, descricao: edicao.descricao }
            : o
        )
      );

      // Sync with local DB
      await dbLocal.objetivos.update(id, {
        titulo: edicao.titulo,
        descricao: edicao.descricao,
        atualizadoEm: new Date().toISOString()
      });

      setEditandoId(null);
      setErroTitulo(false);
    } catch (err) {
      console.error("Erro ao salvar edição:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">🎯 MetasPro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie suas metas e conquistas</p>
        </div>
        <Link
          to="/novo-objetivo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-md transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <PlusCircle size={20} />
          Novo Objetivo
        </Link>
      </header>

      {/* Filters Section */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 space-y-4 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar objetivos..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400 shrink-0" />
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                setFiltroSubcategoria("");
              }}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-gray-200"
            >
              <option value="">Todas as Categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400 shrink-0" />
            <select
              value={filtroSubcategoria}
              onChange={(e) => setFiltroSubcategoria(e.target.value)}
              disabled={!filtroCategoria}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 text-gray-700 dark:text-gray-200"
            >
              <option value="">Todas as Subcategorias</option>
              {subcategoriasDisponiveis.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.nome}</option>
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
                          className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-all duration-200 ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 scale-[1.02] z-50" : "shadow-sm border-gray-200 dark:border-gray-700 hover:shadow-md"
                            } ${emEdicao ? "ring-2 ring-indigo-500" : ""}`}
                        >
                          <div className="flex items-start gap-4">
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
                                  <button
                                    onClick={() => iniciarEdicao(obj)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                )}
                              </div>

                              {emEdicao ? (
                                <textarea
                                  value={edicao.descricao}
                                  onChange={(e) =>
                                    setEdicao((p) => ({ ...p, descricao: e.target.value }))
                                  }
                                  className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg w-full mb-4 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                                  placeholder="Descrição (opcional)"
                                />
                              ) : (
                                <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-2">
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
