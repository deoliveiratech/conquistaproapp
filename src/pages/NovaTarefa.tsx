// NovaTarefa.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
//Locais de persistência dos dados
import { db as firestore } from "../lib/firebase";
import { db as localDB } from "../lib/db";

export default function NovaTarefa() {
  const { objetivoId, faseId } = useParams();
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(1);
  const navigate = useNavigate();

  const handleSalvar = async () => {
    if (!nome.trim() || !objetivoId || !faseId) return;

    const tarefaData = {
      nome,
      ordem,
      concluida: false,
    };

    try {
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

      navigate(`/objetivos/${objetivoId}/fases/${faseId}/tarefas`);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nova Tarefa</h1>

      <input
        type="text"
        placeholder="Nome da tarefa"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      <input
        type="number"
        placeholder="Ordem"
        value={ordem}
        onChange={(e) => setOrdem(parseInt(e.target.value))}
        className="w-full border p-2 rounded mb-3"
      />

      <button
        onClick={handleSalvar}
        className="bg-purple-600 text-white px-4 py-2 rounded w-full"
      >
        Salvar Tarefa
      </button>
    </div>
  );
}
