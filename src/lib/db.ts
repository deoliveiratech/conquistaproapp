// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface Objetivo {
  id?: string;
  titulo: string;
  descricao?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  ordem: number;
  criadoEm?: string | null;      // ISO string
  atualizadoEm?: string | null;  // ISO string
  progresso?: number;
}

export interface Fase {
  id: string;
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
  arquivos?: { nome: string; url: string; tipo: string }[];
}

export interface SyncQueueItem {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  docId: string;
  data: any;
  timestamp: number;
  status: 'PENDING' | 'SYNCING' | 'ERROR';
  error?: string;
}

class WeGoalDB extends Dexie {
  objetivos!: Table<Objetivo, string>;
  fases!: Table<Fase, string>;
  tarefas!: Table<Tarefa, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("WeGoalDB");
    this.version(1).stores({
      objetivos: '++id, titulo, ordem, categoriaId, subcategoriaId',
      fases: '++id, objetivoId, titulo, ordem',
      tarefas: '++id, faseId, nome, ordem, concluida',
      syncQueue: '++id, type, collection, docId, timestamp, status'
    });
  }
}

export const db = new WeGoalDB();
