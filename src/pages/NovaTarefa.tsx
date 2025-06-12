// NovaTarefa.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function NovaTarefa() {
  const { objetivoId, faseId } = useParams();
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(1);
  const navigate = useNavigate();

  const handleSalvar = async () => {
    if (!nome.trim() || !objetivoId || !faseId) return;

    await addDoc(collection(db, "objetivos", objetivoId, "fases", faseId, "tarefas"), {
      nome,
      concluida: false,
      ordem,
    });

    navigate(`/objetivos/${objetivoId}/fases/${faseId}/tarefas`);
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
