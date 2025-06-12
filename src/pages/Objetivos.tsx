import { useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db as firestone } from "../lib/firebase";
import { db as dbLocal } from "../lib/db";
import { Link } from "react-router-dom";
import type { Objetivo } from "../lib/db";

export default function Objetivos() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);

  useEffect(() => {
    const fetchObjetivos = async () => {
      try {
        const snapshot = await getDocs(collection(firestone, "objetivos"));

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

        // sincroniza com IndexedDB
        await dbLocal.objetivos.clear();
        await dbLocal.objetivos.bulkAdd(lista);
        // console.log(lista);
      } catch (err) {
        console.warn("Erro ao acessar Firestore, carregando do IndexedDB:", err);
        const local = await dbLocal.objetivos.toArray();
        setObjetivos(local);
      }
    };

    fetchObjetivos();
  }, []);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900" style={{color: 'indigo', cursor: 'pointer'}}>Meus Objetivos</h1>
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
          {objetivos.map((obj) => (
            <article
              key={obj.id}
              className="card border-gray-300 hover:shadow-lg transition-shadow duration-300"
            >
              <h2 className="text-xl font-semibold text-gray-900">{obj.titulo}</h2>
              <p className="text-sm text-gray-600 mb-4">
                {obj.descricao || "Sem descrição"}
              </p>

              <div
                className="progress-bar mb-4"
                aria-label="Progresso de tarefas concluídas"
              >
                <div style={{ width: "50%" }} />
              </div>

              <Link
                to={`/objetivos/${obj.id}/fases`}
                className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm inline-block"
                aria-label={`Ver fases do objetivo ${obj.titulo}`}
              >
                Ver Fases →
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
