import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db as dbLocal } from "../lib/db";
import { SyncService } from "../lib/sync";
import type { Tarefa } from "../lib/db";
import { ChevronLeft, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Tarefas() {
  const { user } = useAuth();
  const userId = user?.uid;
  const { objetivoId, faseId } = useParams();
  const [tituloFase, setTituloFase] = useState("");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState<string>("");
  const navigate = useNavigate();

  // Reactive query from Dexie
  const tarefasLocal = useLiveQuery(async () => {
    if (!faseId || !userId) return [];
    const tarefas = await dbLocal.tarefas.where("faseId").equals(faseId).toArray();
    return tarefas.sort((a, b) => a.ordem - b.ordem);
  }, [faseId, userId]);

  useEffect(() => {
    if (tarefasLocal) {
      setTarefas(tarefasLocal);
    }
  }, [tarefasLocal]);

  useEffect(() => {
    const fetchFaseTitulo = async () => {
      if (!faseId || !userId) return;
      const fase = await dbLocal.fases.get(faseId);
      if (fase) {
        setTituloFase(fase.titulo);
      }
    };
    fetchFaseTitulo();
  }, [faseId, userId]);

  const alternarConclusao = async (tarefa: Tarefa) => {
    if (!objetivoId || !faseId || !tarefa.id || !userId) return;
    const novaConcluida = !tarefa.concluida;

    try {
      await dbLocal.tarefas.update(tarefa.id, { concluida: novaConcluida });
      await SyncService.enqueueMutation(
        'UPDATE',
        `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
        tarefa.id,
        { concluida: novaConcluida }
      );
    } catch (err) {
      console.error("Erro ao atualizar tarefa", err);
    }
  };

  const salvarEdicao = async (id: string) => {
    if (!objetivoId || !faseId || !id || novoNome.trim() === "" || !userId) return;

    try {
      await dbLocal.tarefas.update(id, { nome: novoNome });
      await SyncService.enqueueMutation(
        'UPDATE',
        `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
        id,
        { nome: novoNome }
      );
      setEditando(null);
      setNovoNome("");
    } catch (err) {
      console.error("Erro ao editar tarefa", err);
    }
  };

  const excluirTarefa = async (id: string) => {
    if (!objetivoId || !faseId || !id || !userId) return;

    if (!window.confirm("Deseja realmente excluir esta tarefa?")) return;

    try {
      await dbLocal.tarefas.delete(id);
      await SyncService.enqueueMutation(
        'DELETE',
        `users/${userId}/objetivos/${objetivoId}/fases/${faseId}/tarefas`,
        id
      );
    } catch (err) {
      console.error("Erro ao excluir tarefa", err);
    }
  };

  const progresso =
    tarefas.length > 0
      ? Math.round(
        (tarefas.filter((t) => t.concluida).length / tarefas.length) * 100
      )
      : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(`/objetivos/${objetivoId}/fases`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Fase: {tituloFase}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie as tarefas desta etapa</p>
        </div>
        <button
          onClick={() => navigate(`/objetivos/${objetivoId}/fases/${faseId}/nova-tarefa`)}
          className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={18} />
          Nova Tarefa
        </button>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors">
        <div className="flex justify-between items-end text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          <span>Progresso da Fase</span>
          <span className="text-indigo-600 dark:text-indigo-400">{progresso}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {tarefas.map((tarefa) => (
          <div
            key={tarefa.id}
            className={`flex flex-col p-3 bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300 ${editando === tarefa.id ? "ring-4 ring-indigo-500/10 border-indigo-500 shadow-md scale-[1.01]" : "border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md"}`}
          >
            <div className="flex items-start gap-2 w-full">
              {editando === tarefa.id ? (
                <input
                  className="flex-grow bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onBlur={() => salvarEdicao(tarefa.id!)}
                  onKeyDown={(e) => e.key === "Enter" && salvarEdicao(tarefa.id!)}
                  autoFocus
                />
              ) : (
                <span
                  className={`flex-grow text-lg font-medium cursor-pointer transition-colors line-clamp-3 ${tarefa.concluida ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-200"
                    }`}
                  onClick={() => {
                    setEditando(tarefa.id!);
                    setNovoNome(tarefa.nome);
                  }}
                >
                  {tarefa.nome}
                </span>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between w-full">
              <button
                onClick={() => alternarConclusao(tarefa)}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${tarefa.concluida ? "text-green-500" : "text-gray-400 dark:text-gray-500 hover:text-indigo-400"}`}
              >
                {tarefa.concluida ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                {tarefa.concluida ? "Concluída" : "Marcar como concluída"}
              </button>

              <button
                onClick={() => excluirTarefa(tarefa.id!)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {tarefas.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-400 dark:text-gray-500">Nenhuma tarefa cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
