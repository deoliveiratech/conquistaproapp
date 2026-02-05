import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import {
    Search,
    Target,
    BarChart3,
    ChevronRight,
    PlusCircle
} from "lucide-react";

interface Categoria {
    id: string;
    nome: string;
    subcategorias?: { id: string; nome: string }[];
}

interface Stats {
    totalObjetivos: number;
    progressoMedio: number;
    totalTarefas: number;
    concluidas: number;
}

export default function Dashboard() {
    const { user } = useAuth();
    const userId = user?.uid;
    const navigate = useNavigate();

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [filtroTexto, setFiltroTexto] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [loading, setLoading] = useState(true);



    const statsPorCategoria = useLiveQuery(async () => {
        if (!userId) return {};

        const allStats: Record<string, Stats> = {};
        const allObjs = await dbLocal.objetivos.where("userId").equals(userId).toArray();

        for (const obj of allObjs) {
            if (!obj.id || !obj.categoriaId) continue;

            const fases = await dbLocal.fases.where("objetivoId").equals(obj.id).toArray();
            let totalTasks = 0;
            let completedTasks = 0;

            for (const f of fases) {
                const tasks = await dbLocal.tarefas.where("faseId").equals(f.id!).toArray();
                totalTasks += tasks.length;
                completedTasks += tasks.filter(t => t.concluida).length;
            }

            const progresso = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            if (!allStats[obj.categoriaId]) {
                allStats[obj.categoriaId] = {
                    totalObjetivos: 0,
                    progressoMedio: 0,
                    totalTarefas: 0,
                    concluidas: 0
                };
            }

            const s = allStats[obj.categoriaId];
            s.totalObjetivos += 1;
            s.totalTarefas += totalTasks;
            s.concluidas += completedTasks;
            // Temporarily store sum for average
            s.progressoMedio += progresso;
        }

        // Calculate final averages
        Object.values(allStats).forEach(s => {
            if (s.totalObjetivos > 0) {
                s.progressoMedio = Math.round(s.progressoMedio / s.totalObjetivos);
            }
        });

        return allStats;
    }, [userId]);

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        try {
            const snap = await getDocs(collection(firestore, "categorias"));
            const cats: Categoria[] = [];
            for (const catDoc of snap.docs) {
                cats.push({
                    id: catDoc.id,
                    nome: catDoc.data().nome
                });
            }
            setCategorias(cats);
        } catch (err) {
            console.error("Erro ao buscar categorias:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (filtroTexto) params.append("q", filtroTexto);
        if (filtroCategoria) params.append("categoriaId", filtroCategoria);
        navigate(`/objetivos?${params.toString()}`);
    };

    const handleCategoryClick = (catId: string) => {
        navigate(`/objetivos?categoriaId=${catId}`);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Sua Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Acompanhe seu progresso e alcance suas metas</p>
            </header>

            {/* Search Card */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Search className="text-indigo-600 dark:text-indigo-400" size={20} />
                        <h2 className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Pesquisar Objetivos</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-7 relative">
                            <input
                                type="text"
                                placeholder="Ex: Aprender Inglês..."
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                                className="w-full pl-4 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-700 dark:text-gray-200"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <select
                                value={filtroCategoria}
                                onChange={(e) => setFiltroCategoria(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                            >
                                <option value="">Todas Categorias</option>
                                {categorias.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            {/* Category Stats Grid */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={20} />
                        <h2 className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Estatísticas por Categoria</h2>
                    </div>
                    <button
                        onClick={() => navigate("/novo-objetivo")}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                        <PlusCircle size={14} /> Novo Objetivo
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorias.map(cat => {
                        const s = statsPorCategoria?.[cat.id] || { totalObjetivos: 0, progressoMedio: 0, totalTarefas: 0, concluidas: 0 };

                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className="text-left bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 group relative overflow-hidden"
                            >
                                {/* Visual Accent */}
                                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                        <Target size={24} />
                                    </div>
                                    <ChevronRight className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" size={20} />
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cat.nome}</h3>

                                <div className="space-y-4">
                                    {/* Stats Mini Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Objetivos</p>
                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{s.totalObjetivos}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tarefas</p>
                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{s.concluidas}/{s.totalTarefas}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                            <span className="text-gray-400">Progresso Médio</span>
                                            <span className="text-indigo-600 dark:text-indigo-400">{s.progressoMedio}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${s.progressoMedio}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {categorias.length === 0 && !loading && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">Nenhuma categoria encontrada.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
