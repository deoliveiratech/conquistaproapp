// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface Objetivo {
  id?: string;
  titulo: string;
  descricao?: string;
  criadoEm?: string | null;      // ISO string
  atualizadoEm?: string | null;  // ISO string
}

export interface Fase {
  id?: string;
  objetivoId: string;
  titulo: string;
  ordem: number;
  tarefas?: Tarefa[];
}

export interface Tarefa {
  id?: string;
  faseId: string;
  nome: string;
  ordem: number;
  concluida: boolean;
  descricao?: string;
  vencimento?: string;
}

class WeGoalDB extends Dexie {
  objetivos!: Table<Objetivo, string>;
  fases!: Table<Fase, string>;
  tarefas!: Table<Tarefa, string>;

  constructor() {
    super("WeGoalDB");
    this.version(1).stores({
      objetivos: '++id, titulo, ordem',
      fases: '++id, objetivoId, titulo, ordem',
      tarefas: '++id, faseId, nome, ordem, concluida',
    });
  }
}

export const db = new WeGoalDB();
