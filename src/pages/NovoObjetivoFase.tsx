import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function NovoObjetivoFase() {
  const { objetivoId } = useParams();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [ordem, setOrdem] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!titulo.trim()) {
      setErro("O título é obrigatório.");
      return;
    }

    if (!objetivoId) {
      setErro("Objetivo não identificado.");
      return;
    }

    setLoading(true);
    try {
      const fasesRef = collection(db, "objetivos", objetivoId, "fases");
      await addDoc(fasesRef, {
        titulo: titulo.trim(),
        ordem: ordem === "" ? 0 : ordem,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      navigate(`/objetivos/${objetivoId}/fases`);
    } catch (error) {
      setErro("Erro ao salvar a fase.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-4">Nova Fase</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Digite o título da fase"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Ordem (opcional)</label>
          <input
            type="number"
            value={ordem}
            onChange={(e) =>
              setOrdem(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="0 para primeira fase"
            disabled={loading}
          />
        </div>

        {erro && <p className="text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Fase"}
        </button>
      </form>
    </div>
  );
}
