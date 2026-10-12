import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Folder, Note, ViewMode } from '../types/notes';
import { INITIAL_FOLDERS, INITIAL_NOTES } from '../data/initialData';
import {
  safeSave,
  loadNotes,
  loadFolders,
} from '../utils/storage';

const FOLDERS_KEY = 'anote_voce_folders_v1';
const NOTES_KEY = 'anote_voce_notes_v1';
const AUTO_SORT_KEY = 'anote_voce_auto_sort_checklist';

// Strip session-only state before persisting (C3). Hashes (lockSalt/lockHash)
// persist; the password itself never exists in storage.
function sanitizeNoteForStorage(note: Note) {
  const { isUnlockedTemp: _ut, ...safe } = note;
  void _ut;
  return safe;
}

export interface LockCredentials {
  salt: string;
  hash: string;
}

export function isNoteEmpty(n: Note): boolean {
  const hasText = n.title.trim() !== '' || n.body.trim() !== '';
  const hasChecklist = !!n.checklist && n.checklist.some((i) => i.text.trim() !== '');
  const hasTable =
    !!n.table &&
    [...n.table.headers, ...n.table.rows.flat()].some((c) => c.trim() !== '');
  return !hasText && !hasChecklist && !hasTable && !n.scanDataUrl && !n.drawingDataUrl;
}

export function isLockedClosed(n: Note): boolean {
  return n.isLocked && !n.isUnlockedTemp;
}

// C5: trash retention — notes stay 30 days, then are purged automatically.
export const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 86400000;

export function daysUntilPurge(deletedAt?: string): number {
  if (!deletedAt) return TRASH_RETENTION_DAYS;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  if (Number.isNaN(elapsed)) return TRASH_RETENTION_DAYS;
  return Math.max(0, Math.ceil((TRASH_RETENTION_MS - elapsed) / 86400000));
}

export function useNotesStorage() {
  const [folders, setFolders] = useState<Folder[]>(() => {
    const loaded = loadFolders(FOLDERS_KEY, INITIAL_FOLDERS);
    // B1 (narrowed): one-time legacy rebrand of the two factory folder names only
    let hasChanges = false;
    const migrated = loaded.map((f) => {
      if (f.id === 'all' && f.name !== 'Todas no Meu Phone') {
        hasChanges = true;
        return { ...f, name: 'Todas no Meu Phone' };
      }
      return f;
    });
    if (hasChanges) safeSave(FOLDERS_KEY, migrated);
    return hasChanges ? migrated : loaded;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const loaded = loadNotes(NOTES_KEY, INITIAL_NOTES);
    // C5: purge trash older than the retention period on every start
    const now = Date.now();
    const kept = loaded.filter((n) => {
      if (!n.deletedAt) return true;
      const at = new Date(n.deletedAt).getTime();
      if (Number.isNaN(at)) return true;
      return now - at < TRASH_RETENTION_MS;
    });
    if (kept.length !== loaded.length) {
      safeSave(NOTES_KEY, kept.map(sanitizeNoteForStorage));
    }
    return kept;
  });

  const [autoSortChecklist, setAutoSortChecklist] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem(AUTO_SORT_KEY);
      return saved !== null ? (JSON.parse(saved) as boolean) : null;
    } catch {
      return null;
    }
  });

  const [currentFolderId, setCurrentFolderId] = useState<string>('all');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Refs for synchronous flush on pause (C1: no 300ms data-loss window)
  const notesRef = useRef(notes);
  const foldersRef = useRef(folders);
  const autoSortRef = useRef(autoSortChecklist);
  useEffect(() => {
    notesRef.current = notes;
    foldersRef.current = folders;
    autoSortRef.current = autoSortChecklist;
  }, [notes, folders, autoSortChecklist]);

  const flushNotes = useCallback(() => {
    safeSave(FOLDERS_KEY, foldersRef.current);
    safeSave(NOTES_KEY, notesRef.current.map(sanitizeNoteForStorage));
    if (autoSortRef.current !== null) safeSave(AUTO_SORT_KEY, autoSortRef.current);
  }, []);

  // Sync to localStorage with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      safeSave(FOLDERS_KEY, folders);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [folders]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      safeSave(NOTES_KEY, notes.map(sanitizeNoteForStorage));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [notes]);

  useEffect(() => {
    if (autoSortChecklist !== null) {
      const timeoutId = setTimeout(() => {
        safeSave(AUTO_SORT_KEY, autoSortChecklist);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [autoSortChecklist]);

  // C5: always leave selection mode clean — no ghost selection
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNoteIds([]);
  }, []);

  // Folder actions
  const createFolder = useCallback((name: string, isSmart = false) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: name.trim() || 'Nova Pasta',
      isSmart,
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, []);

  const updateFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }, []);

  // Reorder folders by drag (system roots stay pinned on top)
  const moveFolder = useCallback((id: string, toMovableIndex: number) => {
    setFolders((prev) => {
      const roots = prev.filter((f) => f.isSystemRoot);
      const mov = prev.filter((f) => !f.isSystemRoot);
      const from = mov.findIndex((f) => f.id === id);
      if (from < 0) return prev;
      const clamped = Math.max(0, Math.min(toMovableIndex, mov.length - 1));
      if (clamped === from) return prev;
      const next = [...mov];
      const [m] = next.splice(from, 1);
      next.splice(clamped, 0, m);
      return [...roots, ...next];
    });
  }, []);

  const deleteFolder = useCallback(
    (id: string) => {
      // A4: locked notes are never deleted with the folder — they move to Notas.
      // Other notes go to trash (recoverable), never permanent delete.
      const now = new Date().toISOString();
      setNotes((prev) =>
        prev.map((n) => {
          if (n.folderId !== id || n.deletedAt) return n;
          if (isLockedClosed(n)) return { ...n, folderId: 'notas' };
          return { ...n, deletedAt: now };
        })
      );
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (currentFolderId === id) {
        setCurrentFolderId('all');
      }
      exitSelectionMode();
    },
    [currentFolderId, exitSelectionMode]
  );

  // Note actions
  const createNote = useCallback(
    (folderId?: string) => {
      // M9: never create inside smart folders or trash
      let targetFolderId = folderId || (currentFolderId === 'all' ? 'notas' : currentFolderId);
      if (targetFolderId === 'trash') targetFolderId = 'notas';
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      const newNote: Note = {
        id: `note-${Date.now()}`,
        folderId: targetFolderId,
        title: '',
        body: '',
        updatedAt: now.toISOString(),
        timeFormatted: `${hours}:${minutes}`,
        dateCategory: 'Hoje',
        isPinned: false,
        isLocked: false,
      };

      setNotes((prev) => [newNote, ...prev]);
      setCurrentNoteId(newNote.id);
      setViewMode('note-editor');
      return newNote;
    },
    [currentFolderId]
  );

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              ...updates,
              updatedAt: now.toISOString(),
              timeFormatted: `${hours}:${minutes}`,
              dateCategory: 'Hoje' as const,
            }
          : n
      )
    );
  }, []);

  // C5: delete = soft delete (trash). Permanent purge is a separate action.
  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id && !n.deletedAt
            ? { ...n, deletedAt: new Date().toISOString() }
            : n
        )
      );
      if (currentNoteId === id) {
        setCurrentNoteId(null);
        setViewMode('notes-list');
      }
    },
    [currentNoteId]
  );

  const purgeNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (currentNoteId === id) {
        setCurrentNoteId(null);
        setViewMode('notes-list');
      }
    },
    [currentNoteId]
  );

  const restoreNote = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, deletedAt: undefined } : n))
    );
  }, []);

  const purgeTrash = useCallback(() => {
    setNotes((prev) => prev.filter((n) => !n.deletedAt));
    exitSelectionMode();
  }, [exitSelectionMode]);

  // C5: only notes visible on screen can be bulk-deleted; locked ones are skipped
  const deleteSelectedNotes = useCallback(
    (visibleIds: string[]): { deleted: number; skippedLocked: number } => {
      const visible = new Set(visibleIds);
      let skippedLocked = 0;
      let deleted = 0;
      setNotes((prev) =>
        prev.map((n) => {
          if (!selectedNoteIds.includes(n.id) || !visible.has(n.id) || n.deletedAt) return n;
          if (isLockedClosed(n)) {
            skippedLocked++;
            return n;
          }
          deleted++;
          return { ...n, deletedAt: new Date().toISOString() };
        })
      );
      exitSelectionMode();
      return { deleted, skippedLocked };
    },
    [selectedNoteIds, exitSelectionMode]
  );

  const moveSelectedNotes = useCallback(
    (targetFolderId: string, visibleIds: string[]): { moved: number; skippedLocked: number } => {
      if (targetFolderId === 'trash') return { moved: 0, skippedLocked: 0 };
      const visible = new Set(visibleIds);
      let skippedLocked = 0;
      let moved = 0;
      setNotes((prev) =>
        prev.map((n) => {
          if (!selectedNoteIds.includes(n.id) || !visible.has(n.id)) return n;
          if (isLockedClosed(n)) {
            skippedLocked++;
            return n;
          }
          moved++;
          return { ...n, folderId: targetFolderId };
        })
      );
      exitSelectionMode();
      return { moved, skippedLocked };
    },
    [selectedNoteIds, exitSelectionMode]
  );

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  }, []);

  const toggleSelectNote = useCallback((id: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // Restore: merge a backup without duplicating or losing anything (C5).
  // Existing ids are kept; unknown folder targets fall back to Notas.
  const importBackup = useCallback(
    (
      inFolders: Folder[],
      inNotes: Note[]
    ): { addedFolders: number; addedNotes: number; skipped: number } => {
      const curFolders = foldersRef.current;
      const curNotes = notesRef.current;
      const folderIds = new Set(curFolders.map((f) => f.id));
      const noteIds = new Set(curNotes.map((n) => n.id));
      let skipped = 0;
      const freshFolders = inFolders.filter((f) => {
        if (folderIds.has(f.id)) {
          skipped++;
          return false;
        }
        folderIds.add(f.id);
        return true;
      });
      const freshNotes = inNotes
        .filter((n) => {
          if (noteIds.has(n.id)) {
            skipped++;
            return false;
          }
          noteIds.add(n.id);
          return true;
        })
        .map((n) => {
          const targetOk =
            n.folderId !== 'all' &&
            n.folderId !== 'trash' &&
            folderIds.has(n.folderId);
          return {
            ...n,
            folderId: targetOk ? n.folderId : 'notas',
            deletedAt: undefined as string | undefined,
          };
        });
      setFolders([...curFolders, ...freshFolders]);
      setNotes([...freshNotes, ...curNotes]);
      return {
        addedFolders: freshFolders.length,
        addedNotes: freshNotes.length,
        skipped,
      };
    },
    []
  );

  // Lock and security (C3: hash only, never the password)
  const lockAllNotes = useCallback(() => {
    setNotes((prev) =>
      prev.map((n) => (n.isLocked ? { ...n, isUnlockedTemp: false } : n))
    );
  }, []);

  const unlockNote = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnlockedTemp: true } : n))
    );
  }, []);

  const setNoteLock = useCallback(
    (id: string, isLocked: boolean, lock?: LockCredentials, hint?: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                isLocked,
                isUnlockedTemp: !isLocked,
                lockSalt: isLocked ? lock?.salt : undefined,
                lockHash: isLocked ? lock?.hash : undefined,
                passwordHint: isLocked ? hint : undefined,
              }
            : n
        )
      );
    },
    []
  );

  // Checklist helper with auto-sort
  const toggleChecklistItem = useCallback(
    (noteId: string, itemId: string) => {
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id !== noteId || !note.checklist) return note;

          let updatedChecklist = note.checklist.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );

          if (autoSortChecklist === true) {
            updatedChecklist = [
              ...updatedChecklist.filter((i) => !i.checked),
              ...updatedChecklist.filter((i) => i.checked),
            ];
          }

          return { ...note, checklist: updatedChecklist };
        })
      );
    },
    [autoSortChecklist]
  );

  const applyAutoSortToChecklist = useCallback((noteId: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const sorted = [
          ...note.checklist.filter((i) => !i.checked),
          ...note.checklist.filter((i) => i.checked),
        ];
        return { ...note, checklist: sorted };
      })
    );
  }, []);

  // Get notes for current folder and search query (M1: sorted, trash excluded)
  const getFilteredNotes = useCallback(() => {
    let result = notes.filter((n) => !n.deletedAt);

    if (currentFolderId === 'trash') {
      return notes
        .filter((n) => n.deletedAt)
        .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
    }

    if (currentFolderId !== 'all') {
      result = result.filter((n) => n.folderId === currentFolderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          // C-05/A4: locked notes never leak through search
          !isLockedClosed(n) &&
          (n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q) ||
            n.checklist?.some((c) => c.text.toLowerCase().includes(q)))
      );
    }

    // M1: newest first
    result = [...result].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return result;
  }, [notes, currentFolderId, searchQuery]);

  const getTrashNotes = useCallback(() => {
    return notes
      .filter((n) => n.deletedAt)
      .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  }, [notes]);

  const currentFolder = useMemo(() => {
    if (currentFolderId === 'trash') {
      return { id: 'trash', name: 'Apagadas' };
    }
    return folders.find((f) => f.id === currentFolderId) || folders[0];
  }, [folders, currentFolderId]);

  const currentNote = useMemo(
    () => notes.find((n) => n.id === currentNoteId) || null,
    [notes, currentNoteId]
  );

  // Folder note counts (trash excluded)
  const getFolderNoteCount = useCallback(
    (folderId: string) => {
      if (folderId === 'all') return notes.filter((n) => !n.deletedAt).length;
      if (folderId === 'trash') return notes.filter((n) => n.deletedAt).length;
      return notes.filter((n) => n.folderId === folderId && !n.deletedAt).length;
    },
    [notes]
  );

  // Check if any note is unlocked
  const hasUnlockedNotes = useMemo(
    () => notes.some((n) => n.isLocked && n.isUnlockedTemp),
    [notes]
  );

  return {
    folders,
    notes,
    currentFolder,
    currentFolderId,
    setCurrentFolderId,
    currentNote,
    currentNoteId,
    setCurrentNoteId,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    isSelectionMode,
    setIsSelectionMode,
    selectedNoteIds,
    setSelectedNoteIds,
    toggleSelectNote,
    exitSelectionMode,
    hasUnlockedNotes,
    autoSortChecklist,
    setAutoSortChecklist,
    flushNotes,
    // Methods
    createFolder,
    updateFolder,
    moveFolder,
    deleteFolder,
    createNote,
    updateNote,
    deleteNote,
    purgeNote,
    restoreNote,
    purgeTrash,
    importBackup,
    deleteSelectedNotes,
    moveSelectedNotes,
    togglePin,
    lockAllNotes,
    unlockNote,
    setNoteLock,
    toggleChecklistItem,
    applyAutoSortToChecklist,
    getFilteredNotes,
    getTrashNotes,
    getFolderNoteCount,
  };
}
