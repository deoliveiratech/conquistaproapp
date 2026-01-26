// types.ts
export interface Tarefa {
  id: string;
  nome: string;
  concluida: boolean;
  ordem: number;
}

export interface Fase {
  id: string;
  titulo: string;
  ordem: number;
  objetivoId: string;
  tarefas?: Tarefa[];
}

export interface Objetivo {
  id: string;
  titulo: string;
  descricao?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
  fases?: Fase[];
}
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  objetivos?: Objetivo[];
}