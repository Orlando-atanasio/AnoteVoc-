import type { Folder, Note } from '../types/notes';

// A11: fresh installs start clean — one welcome note, no demo data,
// no locked-without-password notes, no third-party trademarks.
export const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'all',
    name: 'Todas no Meu Phone',
    isSystemRoot: true,
  },
  {
    id: 'notas',
    name: 'Notas',
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-boas-vindas',
    folderId: 'notas',
    title: 'Boas-vindas ao AnoteVocê',
    body: 'Toque para editar. Use a barra de ferramentas para checklist, tabela, câmera e desenho.',
    updatedAt: new Date().toISOString(),
    timeFormatted: `${String(new Date().getHours()).padStart(2, '0')}:${String(
      new Date().getMinutes()
    ).padStart(2, '0')}`,
    dateCategory: 'Hoje',
    isPinned: false,
    isLocked: false,
  },
];
