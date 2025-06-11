// Fases.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Fase, Objetivo, Tarefa } from "../types";

function calcularProgresso(tarefas: Tarefa[]) {
  if (tarefas.length === 0) return 0;
  const concluídas = tarefas.filter(t => t.concluida).length;
  return Math.round((concluídas / tarefas.length) * 100);
}

export default function Fases() {
  const { objetivoId } = useParams();
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!objetivoId) return;
      const objetivoRef = doc(db, "objetivos", objetivoId);
      const objetivoSnap = await getDoc(objetivoRef);
      if (!objetivoSnap.exists()) return;

      const objetivoData = objetivoSnap.data();
      setObjetivo({
        id: objetivoSnap.id,
        titulo: objetivoData.titulo,
        descricao: objetivoData.descricao,
        criadoEm: objetivoData.criadoEm.toDate(),
        atualizadoEm: objetivoData.atualizadoEm.toDate(),
      });

      const fasesRef = collection(db, "objetivos", objetivoId, "fases");
      const fasesSnap = await getDocs(fasesRef);

      const fasesComTarefas: Fase[] = [];

      for (const faseDoc of fasesSnap.docs) {
        const faseData = faseDoc.data();
        const tarefasRef = collection(
          db,
          "objetivos",
          objetivoId,
          "fases",
          faseDoc.id,
          "tarefas"
        );
        const tarefasSnap = await getDocs(tarefasRef);

        const tarefas: Tarefa[] = tarefasSnap.docs.map((t) => ({
          id: t.id,
          nome: t.data().nome,
          concluida: t.data().concluida,
          ordem: t.data().ordem,
        }));

        fasesComTarefas.push({
          id: faseDoc.id,
          titulo: faseData.titulo,
          ordem: faseData.ordem,
          tarefas,
        });
      }

      setFases(fasesComTarefas.sort((a, b) => a.ordem - b.ordem));
    }

    fetchData();
  }, [objetivoId]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold mb-4" style={{color: 'indigo', cursor: 'pointer'}} onClick={() => (navigate('/'))}>
          Objetivo: {objetivo?.titulo ?? "Carregando..."}
        </h1>
        <button
          onClick={() => navigate(`/objetivos/${objetivoId}/fases/nova`)}
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Nova Fase
        </button>
      </div>

      {fases.map((fase) => {
        const progresso = calcularProgresso(fase.tarefas || []);
        const isAberta = aberta === fase.id;

        return (
          <div key={fase.id} className="border rounded p-3 mb-3 bg-white shadow-sm">
            <div
              onClick={() => setAberta(isAberta ? null : fase.id)}
              className="flex justify-between items-center cursor-pointer"
            >
              <h2 className="font-semibold text-lg">{fase.titulo}</h2>
              <span>{isAberta ? "🔼" : "🔽"}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${progresso}%` }}
              />
            </div>
            {isAberta && (
              <div className="mt-3">
                <p className="text-sm text-gray-600">
                  {fase.tarefas?.length ?? 0} tarefa
                  {fase.tarefas?.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() =>
                    navigate(`/objetivos/${objetivoId}/fases/${fase.id}/tarefas`)
                  }
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Ver Tarefas
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
