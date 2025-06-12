import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";

interface Objetivo {
  id: string;
  titulo: string;
  descricao?: string;
}

export default function Objetivos() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);

  useEffect(() => {
    const fetchObjetivos = async () => {
      const snapshot = await getDocs(collection(db, "objetivos"));
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Objetivo[];
      setObjetivos(lista);
    };

    fetchObjetivos();
  }, []);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Meus Objetivos</h1>
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

              {/* Barra de progresso simples (ajuste dinâmico futuro) */}
              <div className="progress-bar mb-4" aria-label="Progresso de tarefas concluídas">
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
