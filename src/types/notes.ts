export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface NoteFormat {
  hierarchy: 'title' | 'heading' | 'subheading' | 'body';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontSize?: number;
}

export interface BodySpan {
  text: string;
  /** hex color of the letter, e.g. '#2563EB' */
  color?: string;
  /** hex color of the marker background, e.g. '#FEF08A' */
  bg?: string;
}

export interface Note {
  id: string;
  folderId: string;
  title: string;
  body: string;
  updatedAt: string;
  timeFormatted: string;
  dateCategory: 'Hoje' | 'Ontem' | 'Últimos 7 Dias' | 'Anteriores';
  isPinned: boolean;
  isLocked: boolean;
  isUnlockedTemp?: boolean;
  // C3: password is NEVER stored. Only the salted hash persists.
  lockSalt?: string;
  lockHash?: string;
  passwordHint?: string;
  checklist?: ChecklistItem[];
  table?: TableData;
  subtitle?: string;
  hasScan?: boolean;
  scanDataUrl?: string;
  drawingDataUrl?: string;
  // C5: soft delete — trashed notes stay recoverable
  deletedAt?: string;
  // A10: text formatting persisted per note (not session-only)
  format?: NoteFormat;
  // Rich text: per-segment letter color + marker. `body` always mirrors
  // the plain text for search/share/back-compat.
  bodySpans?: BodySpan[];
  // Page background chosen by the user (lines vs blank), persisted per note.
  pageBackground?: 'none' | 'lines';
  // Page color (base hex) chosen by the user, persisted per note.
  pageColor?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  isSmart?: boolean;
  isSystemRoot?: boolean;
}

export type ViewMode = 'folders' | 'notes-list' | 'note-editor';
