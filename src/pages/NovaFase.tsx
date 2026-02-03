import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db as localDB, Fase } from "../lib/db";
import { SyncService } from "../lib/sync";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, Save } from "lucide-react";

export default function NovaFase() {
  const { user } = useAuth();
  const userId = user?.uid;
  const { objetivoId } = useParams();
  const [titulo, setTitulo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSalvar = async () => {
    if (!titulo.trim() || !objetivoId || !userId) return;
    setLoading(true);

    try {
      // 1. Get current max order locally (safer for offline)
      const fasesLocais = await localDB.fases.where("objetivoId").equals(objetivoId).toArray();
      const novaOrdem = fasesLocais.length > 0
        ? Math.max(...fasesLocais.map(f => f.ordem)) + 1
        : 0;

      const newId = crypto.randomUUID();
      const novaFase: Fase = {
        id: newId,
        userId,
        objetivoId,
        titulo: titulo.trim(),
        ordem: novaOrdem,
      };

      // 2. Save locally
      await localDB.fases.add(novaFase);

      // 3. Queue Mutation
      await SyncService.enqueueMutation(
        'CREATE',
        `users/${userId}/objetivos/${objetivoId}/fases`,
        newId,
        { titulo: novaFase.titulo, ordem: novaFase.ordem }
      );

      navigate(`/objetivos/${objetivoId}/fases`);
    } catch (error) {
      console.error("Erro ao salvar fase:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(`/objetivos/${objetivoId}/fases`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Nova Fase</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Divida seu objetivo em etapas menores</p>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6 transition-colors">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">Título da Fase</label>
          <input
            type="text"
            placeholder="Ex: Planejamento Inicial"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium text-gray-800 dark:text-gray-100"
          />
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
                Criar Fase
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
