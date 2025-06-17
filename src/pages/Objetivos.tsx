import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db as firestore } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import { Link } from "react-router-dom";
import type { Objetivo, Fase, Tarefa } from "../lib/db";

export default function Objetivos() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [progressoPorObjetivo, setProgressoPorObjetivo] = useState<Record<string, number>>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<{ titulo: string; descricao: string }>({
    titulo: "",
    descricao: "",
  });
  const [erroTitulo, setErroTitulo] = useState(false);

  useEffect(() => {
    const fetchObjetivos = async () => {
      try {
        const snapshot = await getDocs(collection(firestore, "objetivos"));

        const lista: Objetivo[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            titulo: data.titulo,
            descricao: data.descricao || "",
            criadoEm:
              data.criadoEm instanceof Timestamp
                ? data.criadoEm.toDate().toISOString()
                : null,
            atualizadoEm:
              data.atualizadoEm instanceof Timestamp
                ? data.atualizadoEm.toDate().toISOString()
                : null,
          };
        });

        setObjetivos(lista);

        await dbLocal.objetivos.clear();
        await dbLocal.objetivos.bulkAdd(lista);

        const progresso: Record<string, number> = {};
        for (const obj of lista) {
          const fasesSnap = await getDocs(
            collection(firestore, "objetivos", obj.id, "fases")
          );
          let total = 0;
          let concluidas = 0;

          for (const faseDoc of fasesSnap.docs) {
            const tarefasSnap = await getDocs(
              collection(
                firestore,
                "objetivos",
                obj.id,
                "fases",
                faseDoc.id,
                "tarefas"
              )
            );

            total += tarefasSnap.docs.length;
            concluidas += tarefasSnap.docs.filter((t) => t.data().concluida).length;
          }

          progresso[obj.id] = total > 0 ? Math.round((concluidas / total) * 100) : 0;
        }

        setProgressoPorObjetivo(progresso);
      } catch (err) {
        console.warn("Erro ao acessar Firestore, carregando do IndexedDB:", err);
        const local = await dbLocal.objetivos.toArray();
        setObjetivos(local);
      }
    };

    fetchObjetivos();
  }, []);

  const iniciarEdicao = (obj: Objetivo) => {
    setEditandoId(obj.id);
    setEdicao({ titulo: obj.titulo, descricao: obj.descricao || "" });
    setErroTitulo(false);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setErroTitulo(false);
  };

  const salvarEdicao = async (id: string) => {
    if (!edicao.titulo.trim()) {
      setErroTitulo(true);
      return;
    }

    try {
      const ref = doc(firestore, "objetivos", id);
      await updateDoc(ref, {
        titulo: edicao.titulo,
        descricao: edicao.descricao,
      });

      setObjetivos((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, titulo: edicao.titulo, descricao: edicao.descricao }
            : o
        )
      );

      setEditandoId(null);
      setErroTitulo(false);
    } catch (err) {
      console.error("Erro ao salvar edição:", err);
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-indigo-800 cursor-pointer">
          🎯 Meus Objetivos
        </h1>
        <Link
          to="/novo-objetivo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded shadow-md transition-colors duration-200 text-sm font-medium"
        >
          + Novo Objetivo
        </Link>
      </header>

      {objetivos.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">
          Nenhum objetivo ainda. Crie o primeiro! 🎯
        </p>
      ) : (
        <section className="space-y-6">
          {objetivos.map((obj) => {
            const emEdicao = editandoId === obj.id;
            return (
              <article
                key={obj.id}
                className={`rounded-xl p-4 transition-all duration-300 ${
                  emEdicao
                    ? "bg-indigo-50 border border-indigo-500 shadow-lg"
                    : "bg-white border border-indigo-300 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  {emEdicao ? (
                    <input
                      value={edicao.titulo}
                      onChange={(e) => {
                        setEdicao((p) => ({ ...p, titulo: e.target.value }));
                        if (e.target.value.trim()) setErroTitulo(false);
                      }}
                      className={`text-xl font-semibold border px-2 py-1 rounded w-full mr-2 ${
                        erroTitulo ? "border-red-500" : ""
                      }`}
                      placeholder="Título do objetivo"
                    />
                  ) : (
                    <h2 className="text-xl font-semibold text-gray-900">
                      🎯 {obj.titulo}
                    </h2>
                  )}

                  {emEdicao ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => salvarEdicao(obj.id)}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        💾 Salvar
                      </button>
                      <button
                        onClick={cancelarEdicao}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        ✖ Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => iniciarEdicao(obj)}
                      className="text-sm text-indigo-500 hover:underline"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>

                {emEdicao ? (
                  <textarea
                    value={edicao.descricao}
                    onChange={(e) =>
                      setEdicao((p) => ({ ...p, descricao: e.target.value }))
                    }
                    className="text-sm text-gray-700 border p-2 rounded w-full mb-3"
                    placeholder="Descrição (opcional)"
                  />
                ) : (
                  <p className="text-sm text-gray-600 mb-4">
                    {obj.descricao || "Sem descrição"}
                  </p>
                )}

                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${progressoPorObjetivo[obj.id] ?? 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Progresso: {progressoPorObjetivo[obj.id] ?? 0}%
                  </p>
                </div>

                {!emEdicao && (
                  <Link
                    to={`/objetivos/${obj.id}/fases`}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm inline-block"
                  >
                    Ver Fases →
                  </Link>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
