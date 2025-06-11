// Tarefas.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Tarefa } from "../types";

export default function Tarefas() {
  const { objetivoId, faseId } = useParams();
  const [tituloFase, setTituloFase] = useState("");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);

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

  const progresso =
    tarefas.length > 0
      ? Math.round(
          (tarefas.filter((t) => t.concluida).length / tarefas.length) * 100
        )
      : 0;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Fase: {tituloFase}</h1>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {tarefas.map((tarefa) => (
        <div
          key={tarefa.id}
          className="flex items-center gap-2 py-2 border-b last:border-none"
        >
          <input
            type="checkbox"
            checked={tarefa.concluida}
            onChange={() => alternarConclusao(tarefa)}
            className="h-5 w-5"
          />
          <span className={tarefa.concluida ? "line-through text-gray-500" : ""}>
            {tarefa.nome}
          </span>
        </div>
      ))}
    </div>
  );
}
