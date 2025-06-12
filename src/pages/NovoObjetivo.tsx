// NovoObjetivo.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function NovoObjetivo() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const navigate = useNavigate();

  const handleSalvar = async () => {
    if (!titulo.trim()) return;

    const docRef = await addDoc(collection(db, "objetivos"), {
      titulo,
      descricao,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    navigate(`/objetivos/${docRef.id}/fases`);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Novo Objetivo</h1>

      <input
        type="text"
        placeholder="Título do objetivo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      <textarea
        placeholder="Descrição (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      <button
        onClick={handleSalvar}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        Salvar Objetivo
      </button>
    </div>
  );
}
