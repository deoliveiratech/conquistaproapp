import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, doc, deleteDoc } from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as localDB } from "../lib/db";
import { SyncService } from "../lib/sync";
import { ChevronLeft, Save, Plus, X, Check, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Categoria {
  id: string;
  nome: string;
  subcategorias?: { id: string; nome: string }[];
}

export default function NovoObjetivo() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchCategorias();
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

  const subcategoriasDisponiveis = useMemo(() => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.subcategorias || [];
  }, [categorias, categoriaId]);

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setQuickAddLoading(true);
    try {
      const docRef = await addDoc(collection(firestore, "categorias"), { nome: newCategoryName });
      await fetchCategorias();
      setCategoriaId(docRef.id);
      setIsAddingCategory(false);
      setNewCategoryName("");
    } catch (err) {
      console.error("Erro ao adicionar categoria rápida:", err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleQuickAddSubcategory = async () => {
    if (!newSubcategoryName.trim() || !categoriaId) return;
    setQuickAddLoading(true);
    try {
      const docRef = await addDoc(collection(firestore, "categorias", categoriaId, "subcategorias"), { nome: newSubcategoryName });
      await fetchCategorias();
      setSubcategoriaId(docRef.id);
      setIsAddingSubcategory(false);
      setNewSubcategoryName("");
    } catch (err) {
      console.error("Erro ao adicionar subcategoria rápida:", err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoriaId) return;
    const cat = categorias.find(c => c.id === categoriaId);
    if (!cat) return;

    if (!confirm(`Tem certeza que deseja excluir a categoria "${cat.nome}"?`)) return;

    setQuickAddLoading(true);
    try {
      await deleteDoc(doc(firestore, "categorias", categoriaId));
      await fetchCategorias();
      setCategoriaId("");
      setSubcategoriaId("");
    } catch (err) {
      console.error("Erro ao excluir categoria rápida:", err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!categoriaId || !subcategoriaId) return;
    const sub = subcategoriasDisponiveis.find(s => s.id === subcategoriaId);
    if (!sub) return;

    if (!confirm(`Tem certeza que deseja excluir a subcategoria "${sub.nome}"?`)) return;

    setQuickAddLoading(true);
    try {
      await deleteDoc(doc(firestore, "categorias", categoriaId, "subcategorias", subcategoriaId));
      await fetchCategorias();
      setSubcategoriaId("");
    } catch (err) {
      console.error("Erro ao excluir subcategoria rápida:", err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!titulo.trim() || !userId) return;
    setLoading(true);

    try {
      // Get current max order locally
      const lastObj = await localDB.objetivos.orderBy("ordem").last();
      const novaOrdem = lastObj ? lastObj.ordem + 1 : 0;

      const newId = crypto.randomUUID();
      const novoObjetivo = {
        id: newId,
        userId,
        titulo,
        descricao,
        categoriaId,
        subcategoriaId,
        ordem: novaOrdem,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        progresso: 0
      };

      // 1. Salvar no IndexedDB
      await localDB.objetivos.add(novoObjetivo);

      // 2. Queue Mutation
      await SyncService.enqueueMutation('CREATE', `users/${userId}/objetivos`, newId, {
        titulo,
        descricao,
        categoriaId,
        subcategoriaId,
        ordem: novaOrdem,
        criadoEm: novoObjetivo.criadoEm,
        atualizadoEm: novoObjetivo.atualizadoEm,
        progresso: 0
      });

      navigate(`/objetivos/${newId}/fases`);
    } catch (error) {
      console.error("Erro ao salvar objetivo:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Novo Objetivo</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Defina sua próxima grande conquista</p>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6 transition-colors">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">Título</label>
          <input
            type="text"
            placeholder="Ex: Aprender Inglês Fluente"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium text-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">Descrição</label>
          <textarea
            placeholder="Qual o seu propósito com este objetivo?"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[120px] text-gray-700 dark:text-gray-300"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Categoria</label>
              {!isAddingCategory && (
                <div className="flex items-center gap-1">
                  {categoriaId && (
                    <button
                      onClick={handleDeleteCategory}
                      className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Excluir Categoria Selecionada"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    title="Nova Categoria"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome da categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-700 dark:text-gray-300 h-[48px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAddCategory();
                    if (e.key === 'Escape') setIsAddingCategory(false);
                  }}
                />
                <button
                  onClick={handleQuickAddCategory}
                  disabled={quickAddLoading || !newCategoryName.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => setIsAddingCategory(false)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <select
                value={categoriaId}
                onChange={(e) => {
                  setCategoriaId(e.target.value);
                  setSubcategoriaId("");
                }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-700 dark:text-gray-300 h-[48px]"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subcategoria</label>
              {!isAddingSubcategory && categoriaId && (
                <div className="flex items-center gap-1">
                  {subcategoriaId && (
                    <button
                      onClick={handleDeleteSubcategory}
                      className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Excluir Subcategoria Selecionada"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddingSubcategory(true)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    title="Nova Subcategoria"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>
            {isAddingSubcategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome da subcategoria"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-700 dark:text-gray-300 h-[48px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAddSubcategory();
                    if (e.key === 'Escape') setIsAddingSubcategory(false);
                  }}
                />
                <button
                  onClick={handleQuickAddSubcategory}
                  disabled={quickAddLoading || !newSubcategoryName.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => setIsAddingSubcategory(false)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <select
                value={subcategoriaId}
                onChange={(e) => setSubcategoriaId(e.target.value)}
                disabled={!categoriaId}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 text-gray-700 dark:text-gray-300 h-[48px]"
              >
                <option value="">Selecione uma subcategoria</option>
                {subcategoriasDisponiveis.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.nome}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSalvar}
            disabled={loading || !titulo.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Salvando..." : (
              <>
                <Save size={20} />
                Criar Objetivo
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            Você poderá adicionar fases e tarefas logo em seguida.
          </p>
        </div>
      </div>
    </div>
  );
}
