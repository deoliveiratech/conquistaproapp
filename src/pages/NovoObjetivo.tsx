import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as localDB } from "../lib/db";
import { ChevronLeft, Save } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  subcategorias?: { id: string; nome: string }[];
}

export default function NovoObjetivo() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
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

  const handleSalvar = async () => {
    if (!titulo.trim()) return;
    setLoading(true);

    try {
      // Get current max order
      const q = query(collection(firestore, "objetivos"), orderBy("ordem", "desc"), limit(1));
      const snap = await getDocs(q);
      const lastOrder = snap.docs.length > 0 ? snap.docs[0].data().ordem : -1;
      const novaOrdem = lastOrder + 1;

      const novoObjetivo = {
        titulo,
        descricao,
        categoriaId,
        subcategoriaId,
        ordem: novaOrdem,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      };

      // 1. Salvar no Firestore
      const docRef = await addDoc(collection(firestore, "objetivos"), novoObjetivo);

      // 2. Salvar no IndexedDB
      await localDB.objetivos.add({
        id: docRef.id,
        titulo,
        descricao,
        categoriaId,
        subcategoriaId,
        ordem: novaOrdem,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      });

      navigate(`/objetivos/${docRef.id}/fases`);
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
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">Categoria</label>
            <select
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.target.value);
                setSubcategoriaId("");
              }}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-700 dark:text-gray-300"
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">Subcategoria</label>
            <select
              value={subcategoriaId}
              onChange={(e) => setSubcategoriaId(e.target.value)}
              disabled={!categoriaId}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 text-gray-700 dark:text-gray-300"
            >
              <option value="">Selecione uma subcategoria</option>
              {subcategoriasDisponiveis.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.nome}</option>
              ))}
            </select>
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
