// NovaFase.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";

import { db as firestore } from "../lib/firebase";
import { db as localDB } from "../lib/db";

export default function NovaFase() {
  const { objetivoId } = useParams();
  const [titulo, setTitulo] = useState("");
  const [ordem, setOrdem] = useState(1);
  const navigate = useNavigate();

  const handleSalvar = async () => {
    if (!titulo.trim() || !objetivoId) return;

    const faseData = {
      titulo,
      ordem,
    };

    try {
      // 1. Salvar no Firestore
      const docRef = await addDoc(
        collection(firestore, "objetivos", objetivoId, "fases"),
        faseData
      );

      // 2. Salvar no IndexedDB
      await localDB.fases.add({
        ...faseData,
        id: docRef.id,
        objetivoId,
      });

      navigate(`/objetivos/${objetivoId}/fases`);
    } catch (error) {
      console.error("Erro ao salvar fase:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nova Fase</h1>

      <input
        type="text"
        placeholder="Título da fase"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
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
        Salvar Fase
      </button>
    </div>
  );
}
