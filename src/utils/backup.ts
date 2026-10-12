import type { Folder, Note } from '../types/notes';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { loadProfile, type UserProfile } from './profile';

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  folders: Folder[];
  notes: Note[];
  profile: UserProfile;
}

export function buildBackupPayload(folders: Folder[], notes: Note[]): BackupPayload {
  return {
    app: 'AnoteVocê',
    version: 1,
    exportedAt: new Date().toISOString(),
    folders,
    notes,
    profile: loadProfile(),
  };
}

function backupFileName(): string {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `anotevoce-backup-${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}-${p(d.getHours())}h${p(d.getMinutes())}`;
}

export function suggestBackupName(): string {  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `backup-${p(d.getDate())}-${p(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}-${p(d.getHours())}h${p(d.getMinutes())}`;
}
// Keep the user's name filesystem-safe and always .json
export function sanitizeBackupName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || backupFileName();
  return cleaned.toLowerCase().endsWith('.json') ? cleaned : `${cleaned}.json`;
}

export const DEFAULT_BACKUP_FOLDER = 'AnoteVocê';

// Folder names can't escape Documents (no slashes, no "..").
export function sanitizeBackupFolder(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[\\/:*?"<>|.]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .trim();
  return cleaned || DEFAULT_BACKUP_FOLDER;
}

// Save the backup file inside a dedicated folder in Documents
// (never loose among other files). Falls back to app storage.
export async function saveBackupToDevice(
  folders: Folder[],
  notes: Note[],
  name?: string,
  folderName?: string
): Promise<{ ok: boolean; message: string }> {
  const fileName = sanitizeBackupName(name || backupFileName());
  const folder = sanitizeBackupFolder(folderName || DEFAULT_BACKUP_FOLDER);
  const data = JSON.stringify(buildBackupPayload(folders, notes));
  // Web preview: download via browser
  if (!Capacitor.isNativePlatform()) {
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { ok: true, message: 'Backup baixado.' };
    } catch {
      return { ok: false, message: 'Não foi possível gerar o backup.' };
    }
  }
  // The folder is created once; later backups just save inside it.
  // mkdir throws when it already exists — that is fine, keep going.
  try {
    await Filesystem.mkdir({
      path: folder,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch {
    // already exists (or unavailable) — the write below decides
  }
  try {
    const fullPath = `${folder}/${fileName}`;
    await Filesystem.writeFile({
      path: fullPath,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    // Confirm the file really landed where the user can find it
    try {
      await Filesystem.stat({ path: fullPath, directory: Directory.Documents });
      return { ok: true, message: `Backup salvo em Documentos/${folder}.` };
    } catch {
      // written but not visible — fall through to app storage
    }
  } catch {
    // Documents unavailable — fall through to app storage
  }
  try {
    await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    return { ok: true, message: 'Backup salvo no armazenamento do app.' };
  } catch {
    return { ok: false, message: 'Não foi possível salvar o backup.' };
  }
}

// Share the backup file (Drive, e-mail, WhatsApp, cloud apps…).
export async function shareBackup(
  folders: Folder[],
  notes: Note[],
  name?: string
): Promise<{ ok: boolean; message: string }> {
  const fileName = sanitizeBackupName(name || backupFileName());
  const data = JSON.stringify(buildBackupPayload(folders, notes));
  if (!Capacitor.isNativePlatform()) {
    return saveBackupToDevice(folders, notes, name);
  }
  try {
    const written = await Filesystem.writeFile({
      // Must live under shared_files/ — the only path FileProvider exposes (B2)
      path: `shared_files/${fileName}`,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    const uri = written.uri;
    await Share.share({
      title: 'Backup AnoteVocê',
      text: 'Backup das minhas notas (AnoteVocê)',
      url: uri,
      dialogTitle: 'Enviar backup para…',
    });
    return { ok: true, message: 'Backup compartilhado.' };
  } catch (err) {
    if (err instanceof Error && err.message === 'Share canceled') {
      return { ok: true, message: 'Compartilhamento cancelado.' };
    }
    return { ok: false, message: 'Não foi possível compartilhar o backup.' };
  }
}

export interface ParsedBackup {
  folders: Folder[];
  notes: Note[];
  profile?: UserProfile;
}

function normalizeProfile(raw: unknown): UserProfile | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const p = raw as Record<string, unknown>;
  const t = p.photoTransform as Record<string, unknown> | undefined;
  return {
    name: typeof p.name === 'string' ? p.name : '',
    phone: typeof p.phone === 'string' ? p.phone : '',
    email: typeof p.email === 'string' ? p.email : '',
    photo: typeof p.photo === 'string' ? p.photo : undefined,
    photoTransform:
      t && typeof t === 'object'
        ? {
            x: Number(t.x) || 0,
            y: Number(t.y) || 0,
            scale: Number(t.scale) || 1,
            rotate: Number(t.rotate) || 0,
          }
        : undefined,
  };
}

// Read + validate a backup file (never throws; invalid files get a message).
export async function parseBackupFile(
  file: File
): Promise<{ ok: true; data: ParsedBackup } | { ok: false; message: string }> {
  try {
    const text = await file.text();
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, message: 'Arquivo inválido: formato desconhecido.' };
    }
    const obj = raw as Record<string, unknown>;
    if (!Array.isArray(obj.folders) || !Array.isArray(obj.notes)) {
      return { ok: false, message: 'Arquivo inválido: não é um backup AnoteVocê.' };
    }
    const { normalizeFolder, normalizeNote } = await import('./storage');
    const folders = (obj.folders as unknown[])
      .map(normalizeFolder)
      .filter((f): f is Folder => f !== null);
    const notes = (obj.notes as unknown[])
      .map(normalizeNote)
      .filter((n): n is Note => n !== null);
    if (folders.length === 0 && notes.length === 0) {
      return { ok: false, message: 'Backup vazio ou ilegível.' };
    }
    return { ok: true, data: { folders, notes, profile: normalizeProfile(obj.profile) } };
  } catch {
    return { ok: false, message: 'Não foi possível ler o arquivo.' };
  }
}
