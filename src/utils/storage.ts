import type { Folder, Note } from '../types/notes';

// Safe persistence layer (C1, A9):
// - writes never throw (quota/full storage returns false + dispatches event)
// - reads validate schema, never crash the app, preserve corrupt payloads

export function safeSave(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    window.dispatchEvent(new CustomEvent('storage-error', { detail: e }));
    return false;
  }
}

function preserveCorrupt(key: string, raw: string) {
  try {
    localStorage.setItem(`${key}.corrupt.${Date.now()}`, raw);
  } catch {
    // nothing left to do
  }
}

const NOTE_DATE_CATS = ['Hoje', 'Ontem', 'Últimos 7 Dias', 'Anteriores'] as const;

export function normalizeNote(raw: unknown): Note | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const n = raw as Record<string, unknown>;
  if (typeof n.id !== 'string' || typeof n.folderId !== 'string') return null;
  const updatedAt = typeof n.updatedAt === 'string' ? n.updatedAt : new Date().toISOString();
  const d = new Date(updatedAt);
  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const hh = String(validDate.getHours()).padStart(2, '0');
  const mm = String(validDate.getMinutes()).padStart(2, '0');
  const checklist = Array.isArray(n.checklist)
    ? (n.checklist as unknown[])
        .filter(
          (c): c is { id: unknown; text: unknown; checked: unknown } =>
            typeof c === 'object' &&
            c !== null &&
            typeof (c as Record<string, unknown>).id !== 'undefined'
        )
        .map((c) => {
          const cObj = c as unknown as Record<string, unknown>;
          return {
            id: String(cObj.id),
            text: typeof cObj.text === 'string' ? cObj.text : '',
            checked: cObj.checked === true,
          };
        })
    : undefined;
  const dateCategory =
    typeof n.dateCategory === 'string' &&
    (NOTE_DATE_CATS as readonly string[]).includes(n.dateCategory)
      ? (n.dateCategory as Note['dateCategory'])
      : 'Hoje';
  const formatRaw = n.format as Record<string, unknown> | undefined;  const hierarchies = ['title', 'heading', 'subheading', 'body'] as const;
  const format: Note['format'] =
    typeof formatRaw === 'object' && formatRaw !== null
      ? {
          hierarchy: (
            hierarchies as readonly string[]
          ).includes(String(formatRaw.hierarchy))
            ? (String(formatRaw.hierarchy) as (typeof hierarchies)[number])
            : 'body',
          bold: formatRaw.bold === true,
          italic: formatRaw.italic === true,
          underline: formatRaw.underline === true,
          strikethrough: formatRaw.strikethrough === true,
          fontSize:
            typeof formatRaw.fontSize === 'number' &&
            formatRaw.fontSize >= 10 &&
            formatRaw.fontSize <= 40
              ? Math.round(formatRaw.fontSize)
              : undefined,
        }
      : undefined;
  const bodyText = typeof n.body === 'string' ? n.body : '';
  const bodySpansRaw = n.bodySpans;
  const bodySpans: Note['bodySpans'] = Array.isArray(bodySpansRaw)
    ? (bodySpansRaw as unknown[])
        .filter(
          (s): s is Record<string, unknown> =>
            typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).text === 'string'
        )
        .map((s) => ({
          text: String(s.text),
          color:
            typeof s.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.color)
              ? s.color
              : undefined,
          bg:
            typeof s.bg === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.bg)
              ? s.bg
              : undefined,
        }))
        .filter((s) => s.text !== '')
    : undefined;
  return {
    id: n.id,
    folderId: n.folderId,
    title: typeof n.title === 'string' ? n.title : '',
    body: bodyText,
    updatedAt: validDate.toISOString(),
    timeFormatted:
      typeof n.timeFormatted === 'string' ? n.timeFormatted : `${hh}:${mm}`,
    dateCategory,
    isPinned: n.isPinned === true,
    isLocked: n.isLocked === true,
    // Session-only: notes ALWAYS load locked (C3)
    isUnlockedTemp: false,
    lockSalt: typeof n.lockSalt === 'string' ? n.lockSalt : undefined,
    lockHash: typeof n.lockHash === 'string' ? n.lockHash : undefined,
    passwordHint: typeof n.passwordHint === 'string' ? n.passwordHint : undefined,
    checklist,
    table:
      typeof n.table === 'object' && n.table !== null
        ? (n.table as Note['table'])
        : undefined,
    subtitle: typeof n.subtitle === 'string' ? n.subtitle : undefined,
    hasScan: n.hasScan === true,
    scanDataUrl: typeof n.scanDataUrl === 'string' ? n.scanDataUrl : undefined,
    drawingDataUrl:
      typeof n.drawingDataUrl === 'string' ? n.drawingDataUrl : undefined,
    deletedAt: typeof n.deletedAt === 'string' ? n.deletedAt : undefined,
    format,
    bodySpans: bodySpans && bodySpans.length > 0 ? bodySpans : undefined,
    pageBackground: n.pageBackground === 'lines' ? 'lines' : undefined,
    pageColor:
      typeof n.pageColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(n.pageColor)
        ? n.pageColor
        : undefined,
  };
}

export function normalizeFolder(raw: unknown): Folder | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== 'string' || typeof f.name !== 'string') return null;
  return {
    id: f.id,
    name: f.name,
    icon: typeof f.icon === 'string' ? f.icon : undefined,
    isSmart: f.isSmart === true,
    isSystemRoot: f.isSystemRoot === true,
  };
}

export function loadNotes(key: string, fallback: Note[]): Note[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      preserveCorrupt(key, raw);
      return fallback;
    }
    return parsed
      .map(normalizeNote)
      .filter((n): n is Note => n !== null);
  } catch {
    preserveCorrupt(key, raw);
    return fallback;
  }
}

export function loadFolders(key: string, fallback: Folder[]): Folder[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      preserveCorrupt(key, raw);
      return fallback;
    }
    const folders = parsed
      .map(normalizeFolder)
      .filter((f): f is Folder => f !== null);
    return folders.length > 0 ? folders : fallback;
  } catch {
    preserveCorrupt(key, raw);
    return fallback;
  }
}
