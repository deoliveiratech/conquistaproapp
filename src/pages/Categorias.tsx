import { useState, useEffect } from "react";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";

interface Subcategoria {
    id: string;
    nome: string;
}

interface Categoria {
    id: string;
    nome: string;
    subcategorias?: Subcategoria[];
}

export default function Categorias() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [novaCategoria, setNovaCategoria] = useState("");
    const [novaSubcategoria, setNovaSubcategoria] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "categorias"));
            const cats: Categoria[] = [];

            for (const catDoc of snap.docs) {
                const subSnap = await getDocs(collection(db, "categorias", catDoc.id, "subcategorias"));
                cats.push({
                    id: catDoc.id,
                    nome: catDoc.data().nome,
                    subcategorias: subSnap.docs.map(d => ({ id: d.id, nome: d.data().nome }))
                });
            }
            setCategorias(cats);
        } catch (err) {
            console.error("Erro ao buscar categorias:", err);
        } finally {
            setLoading(false);
        }
    };

    const addCategoria = async () => {
        if (!novaCategoria.trim()) return;
        try {
            await addDoc(collection(db, "categorias"), { nome: novaCategoria });
            setNovaCategoria("");
            fetchCategorias();
        } catch (err) {
            console.error("Erro ao adicionar categoria:", err);
        }
    };

    const addSubcategoria = async (catId: string) => {
        const nome = novaSubcategoria[catId];
        if (!nome?.trim()) return;
        try {
            await addDoc(collection(db, "categorias", catId, "subcategorias"), { nome });
            setNovaSubcategoria(prev => ({ ...prev, [catId]: "" }));
            fetchCategorias();
        } catch (err) {
            console.error("Erro ao adicionar subcategoria:", err);
        }
    };

    const deleteCategoria = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
        try {
            await deleteDoc(doc(db, "categorias", id));
            fetchCategorias();
        } catch (err) {
            console.error("Erro ao excluir categoria:", err);
        }
    };

    const deleteSubcategoria = async (catId: string, subId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta subcategoria?")) return;
        try {
            await deleteDoc(doc(db, "categorias", catId, "subcategorias", subId));
            fetchCategorias();
        } catch (err) {
            console.error("Erro ao excluir subcategoria:", err);
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="max-w-2xl mx-auto px-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Gerenciar Categorias</h1>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={novaCategoria}
                        onChange={(e) => setNovaCategoria(e.target.value)}
                        placeholder="Nova Categoria"
                        className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                        onClick={addCategoria}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Adicionar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">Carregando categorias...</div>
            ) : (
                <div className="space-y-4">
                    {categorias.map((cat) => (
                        <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                            <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                                <div className="flex items-center gap-3 min-w-0">
                                    {expanded[cat.id] ? <ChevronDown size={20} className="text-gray-400 shrink-0" /> : <ChevronRight size={20} className="text-gray-400 shrink-0" />}
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 truncate">{cat.nome}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteCategoria(cat.id); }}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {expanded[cat.id] && (
                                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                                    <div className="space-y-2 mb-4">
                                        {cat.subcategorias?.map((sub) => (
                                            <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 ml-2 sm:ml-6 transition-colors">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{sub.nome}</span>
                                                <button
                                                    onClick={() => deleteSubcategoria(cat.id, sub.id)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {cat.subcategorias?.length === 0 && (
                                            <p className="text-xs text-gray-400 ml-2 sm:ml-6 italic">Nenhuma subcategoria cadastrada.</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 ml-2 sm:ml-6">
                                        <input
                                            type="text"
                                            value={novaSubcategoria[cat.id] || ""}
                                            onChange={(e) => setNovaSubcategoria(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                            placeholder="Nova Subcategoria"
                                            className="flex-1 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                        <button
                                            onClick={() => addSubcategoria(cat.id)}
                                            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {categorias.length === 0 && (
                        <div className="text-center py-10 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            Nenhuma categoria encontrada.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
