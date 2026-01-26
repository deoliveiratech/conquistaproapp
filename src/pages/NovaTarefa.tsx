import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as localDB } from "../lib/db";
import { ChevronLeft, Save } from "lucide-react";

export default function NovaTarefa() {
  const { objetivoId, faseId } = useParams();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSalvar = async () => {
    if (!nome.trim() || !objetivoId || !faseId) return;
    setLoading(true);

    try {
      // Get current max order
      const q = query(collection(firestore, "objetivos", objetivoId, "fases", faseId, "tarefas"), orderBy("ordem", "desc"), limit(1));
      const snap = await getDocs(q);
      const lastOrder = snap.docs.length > 0 ? snap.docs[0].data().ordem : -1;
      const novaOrdem = lastOrder + 1;

      const tarefaData = {
        nome,
        ordem: novaOrdem,
        concluida: false,
        descricao: "",
      };

      // 1. Salvar no Firestore
      const docRef = await addDoc(
        collection(firestore, "objetivos", objetivoId, "fases", faseId, "tarefas"),
        tarefaData
      );

      // 2. Salvar no IndexedDB
      await localDB.tarefas.add({
        ...tarefaData,
        id: docRef.id,
        faseId,
      });

      navigate(`/objetivos/${objetivoId}/fases`);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(`/objetivos/${objetivoId}/fases`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Nova Tarefa</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">O que precisa ser feito nesta fase?</p>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6 transition-colors">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">Nome da Tarefa</label>
          <input
            type="text"
            placeholder="Ex: Comprar materiais"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-medium text-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSalvar}
            disabled={loading || !nome.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Salvando..." : (
              <>
                <Save size={20} />
                Criar Tarefa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
