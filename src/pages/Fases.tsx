// src/pages/Fases.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";
import { db as firestone } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import type { Fase, Objetivo, Tarefa } from "../lib/db";

function calcularProgresso(tarefas: Tarefa[]) {
  if (tarefas.length === 0) return 0;
  const concluidas = tarefas.filter(t => t.concluida).length;
  return Math.round((concluidas / tarefas.length) * 100);
}

export default function Fases() {
  const { objetivoId } = useParams();
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFases = async () => {
      if (!objetivoId) return;

      try {
        // 🔥 Firestore: objetivo
        const objRef = doc(firestone, "objetivos", objetivoId);
        const objSnap = await getDoc(objRef);
        if (!objSnap.exists()) throw new Error("Objetivo não encontrado");

        const objData = objSnap.data();

        const objetivo: Objetivo = {
          id: objSnap.id,
          titulo: objData.titulo,
          descricao: objData.descricao || "",
          criadoEm:
            objData.criadoEm instanceof Timestamp
              ? objData.criadoEm.toDate().toISOString()
              : null,
          atualizadoEm:
            objData.atualizadoEm instanceof Timestamp
              ? objData.atualizadoEm.toDate().toISOString()
              : null,
        };
        setObjetivo(objetivo);

        // 🔥 Firestore: fases + tarefas
        const fasesSnap = await getDocs(collection(firestone, "objetivos", objetivoId, "fases"));

        const todasFases: Fase[] = [];

        for (const faseDoc of fasesSnap.docs) {
          const faseData = faseDoc.data();
          const tarefasSnap = await getDocs(
            collection(firestone, "objetivos", objetivoId, "fases", faseDoc.id, "tarefas")
          );

          const tarefas: Tarefa[] = tarefasSnap.docs.map((t) => {
            const data = t.data();
            return {
              id: t.id,
              nome: data.nome,
              concluida: data.concluida,
              ordem: data.ordem,
              faseId: faseDoc.id,
              objetivoId,
            };
          });

          const fase: Fase = {
            id: faseDoc.id,
            titulo: faseData.titulo,
            ordem: faseData.ordem,
            objetivoId,
            tarefas,
          };

          todasFases.push(fase);

          // salva tarefas localmente
          await dbLocal.tarefas.bulkPut(tarefas);
        }

        // salva fases e objetivo localmente
        await dbLocal.fases.clear();
        await dbLocal.fases.bulkPut(todasFases);
        await dbLocal.objetivos.put(objetivo);

        setFases(todasFases.sort((a, b) => a.ordem - b.ordem));
      } catch (err) {
        console.warn("Erro ao acessar Firestore, carregando do IndexedDB:", err);

        const objetivoLocal = await dbLocal.objetivos.get(objetivoId);
        if (objetivoLocal) setObjetivo(objetivoLocal);

        const fasesLocais = await dbLocal.fases
          .where("objetivoId")
          .equals(objetivoId)
          .toArray();

        for (const fase of fasesLocais) {
          if (!fase.id) continue;
          const tarefas = await dbLocal.tarefas.where("faseId").equals(fase.id).toArray();
          fase.tarefas = tarefas;
        }

        setFases(fasesLocais.sort((a, b) => a.ordem - b.ordem));
      }
    };

    fetchFases();
  }, [objetivoId]);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold text-indigo-900 cursor-pointer"
          onClick={() => navigate("/")}
        >
          Objetivo: {objetivo?.titulo ?? "Carregando..."}
        </h1>
        <Link
          to={`/objetivos/${objetivoId}/fases/nova`}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
        >
          + Nova Fase
        </Link>
      </header>

      {fases.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">
          Nenhuma fase ainda. Crie a primeira! 📌
        </p>
      ) : (
        <section className="space-y-6">
          {fases.map((fase) => {
            const progresso = calcularProgresso(fase.tarefas || []);
            const isAberta = aberta === fase.id;

            return (
              <article
                key={fase.id}
                className="border rounded-lg p-4 bg-white shadow-md transition-shadow duration-200"
              >
                <header
                  onClick={() => setAberta(isAberta ? null : fase.id)}
                  className="flex justify-between items-center cursor-pointer"
                >
                  <h2 className="font-semibold text-lg text-indigo-900">{fase.titulo}</h2>
                  <span>{isAberta ? "🔼" : "🔽"}</span>
                </header>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${progresso}%` }}
                  />
                </div>

                {isAberta && (
                  <div className="mt-4 space-y-2">
                    <ul className="space-y-2">
                      {(fase.tarefas ?? [])
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((tarefa) => (
                          <li
                            key={tarefa.id}
                            className={`flex justify-between items-center p-3 rounded border ${
                              tarefa.concluida
                                ? "bg-green-100 border-green-300"
                                : "bg-gray-100 border-gray-300"
                            }`}
                          >
                            <span
                              className={
                                tarefa.concluida
                                  ? "line-through text-gray-500"
                                  : undefined
                              }
                            >
                              {tarefa.nome}
                            </span>
                            {tarefa.concluida ? "✅" : "⬜"}
                          </li>
                        ))}
                    </ul>
                    <p className="text-sm font-bold text-gray-700">
                      Total de {(fase.tarefas ?? []).length} tarefa
                      {(fase.tarefas ?? []).length !== 1 ? "s" : ""}
                    </p>
                    <Link
                      to={`/objetivos/${objetivoId}/fases/${fase.id}/tarefas`}
                      className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Gerenciar Tarefas
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
