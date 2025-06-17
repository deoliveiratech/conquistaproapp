// Tarefas.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Tarefa } from "../types";

export default function Tarefas() {
  const { objetivoId, faseId } = useParams();
  const [tituloFase, setTituloFase] = useState("");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTarefas() {
      if (!objetivoId || !faseId) return;

      const faseRef = doc(db, "objetivos", objetivoId, "fases", faseId);
      const faseSnap = await getDoc(faseRef);
      if (faseSnap.exists()) {
        setTituloFase(faseSnap.data().titulo);
      }

      const tarefasRef = collection(faseRef, "tarefas");
      const tarefasSnap = await getDocs(tarefasRef);

      const lista: Tarefa[] = tarefasSnap.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome,
        concluida: doc.data().concluida,
        ordem: doc.data().ordem,
      }));

      setTarefas(lista.sort((a, b) => a.ordem - b.ordem));
    }

    fetchTarefas();
  }, [objetivoId, faseId]);

  const alternarConclusao = async (tarefa: Tarefa) => {
    if (!objetivoId || !faseId || !tarefa.id) return;

    const tarefaRef = doc(db, "objetivos", objetivoId, "fases", faseId, "tarefas", tarefa.id);
    await updateDoc(tarefaRef, {
      concluida: !tarefa.concluida,
    });

    setTarefas((prev) =>
      prev.map((t) =>
        t.id === tarefa.id ? { ...t, concluida: !t.concluida } : t
      )
    );
  };

  const salvarEdicao = async (id: string) => {
    if (!objetivoId || !faseId || !id || novoNome.trim() === "") return;

    const tarefaRef = doc(db, "objetivos", objetivoId, "fases", faseId, "tarefas", id);
    await updateDoc(tarefaRef, { nome: novoNome });

    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, nome: novoNome } : t))
    );

    setEditando(null);
    setNovoNome("");
  };

  const excluirTarefa = async (id: string) => {
    if (!objetivoId || !faseId || !id) return;

    if (!window.confirm("Deseja realmente excluir esta tarefa?")) return;

    const tarefaRef = doc(db, "objetivos", objetivoId, "fases", faseId, "tarefas", id);
    await deleteDoc(tarefaRef);

    setTarefas((prev) => prev.filter((t) => t.id !== id));
  };

  const progresso =
    tarefas.length > 0
      ? Math.round(
          (tarefas.filter((t) => t.concluida).length / tarefas.length) * 100
        )
      : 0;

  let pressTimer: NodeJS.Timeout;

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: "indigo", cursor: "pointer" }}
          onClick={() => navigate(`/objetivos/${objetivoId}/fases`)}
        >
          Fase: {tituloFase}
        </h1>
        <button
          onClick={() => navigate(`/objetivos/${objetivoId}/fases/${faseId}/nova-tarefa`)}
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Nova Tarefa
        </button>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {tarefas.map((tarefa) => (
        <div
          key={tarefa.id}
          className="flex items-center gap-2 py-3 px-2 border-b last:border-none hover:bg-gray-100 rounded"
        >
          <input
            type="checkbox"
            checked={tarefa.concluida}
            onChange={() => alternarConclusao(tarefa)}
            className="h-5 w-5"
          />

          {editando === tarefa.id ? (
            <input
              className="flex-grow border rounded px-2 py-1 transition-all duration-200 ease-in-out"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onBlur={() => salvarEdicao(tarefa.id)}
              onKeyDown={(e) => e.key === "Enter" && salvarEdicao(tarefa.id)}
              autoFocus
            />
          ) : (
            <span
              className={`flex-grow text-base min-h-[40px] flex items-center rounded px-2 py-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                tarefa.concluida ? "line-through text-gray-500" : ""
              }`}
              onTouchStart={() => {
                pressTimer = setTimeout(() => {
                  setEditando(tarefa.id);
                  setNovoNome(tarefa.nome);
                }, 400);
              }}
              onTouchEnd={() => clearTimeout(pressTimer)}
              onMouseDown={() => {
                pressTimer = setTimeout(() => {
                  setEditando(tarefa.id);
                  setNovoNome(tarefa.nome);
                }, 400);
              }}
              onMouseUp={() => clearTimeout(pressTimer)}
            >
              {tarefa.nome}
            </span>
          )}

          <button
            onClick={() => excluirTarefa(tarefa.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}
