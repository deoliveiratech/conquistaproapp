// src/data/fasesMock.ts
import type { Fase } from '../types';

export const fasesMock: Fase[] = [
  {
    id: '1',
    titulo: 'Fundamentos Web',
    tarefas: [
      { id: '1', nome: 'HTML Básico', concluida: true },
      { id: '2', nome: 'CSS Básico', concluida: true },
      { id: '3', nome: 'JavaScript Iniciante', concluida: false },
    ],
  },
  {
    id: '2',
    titulo: 'Avançando no Frontend',
    tarefas: [
      { id: '1', nome: 'React Hooks', concluida: false },
      { id: '2', nome: 'Context API', concluida: false },
    ],
  },
];
