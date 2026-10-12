import React, { useState, useEffect, useRef } from 'react';
import { useNotesStorage, isNoteEmpty } from './hooks/useNotesStorage';
import { IPhoneFrame } from './components/common/IPhoneFrame';
import { FoldersView } from './components/folders/FoldersView';
import { NotesListView } from './components/notes/NotesListView';
import { NoteEditorView } from './components/editor/NoteEditorView';
import { PasscodePromptModal } from './components/security/PasscodePromptModal';
import type { Note } from './types/notes';
import { CapacitorShareTarget } from '@capgo/capacitor-share-target';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { verifyPassword } from './utils/lock';
import { saveBackupToDevice, shareBackup } from './utils/backup';
import { BottomSheet } from './components/common/BottomSheet';

export const App: React.FC = () => {
  const {
    folders,
    notes,
    currentFolder,
    currentFolderId,
    setCurrentFolderId,
    currentNote,
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
    deleteSelectedNotes,
    moveSelectedNotes,
    togglePin,
    lockAllNotes,
    unlockNote,
    setNoteLock,
    importBackup,
    getFilteredNotes,
    getTrashNotes,
    getFolderNoteCount,
  } = useNotesStorage();

  const [pendingLockedNote, setPendingLockedNote] = useState<Note | null>(null);
  const [unlockError, setUnlockError] = useState(false);
  // Shares received from other apps wait here until the user picks a folder
  const [shareQueue, setShareQueue] = useState<{ title: string; body: string }[]>([]);
  const createNoteRef = useRef(createNote);
  const updateNoteRef = useRef(updateNote);

  useEffect(() => {
    createNoteRef.current = createNote;
    updateNoteRef.current = updateNote;
  }, [createNote, updateNote]);

  // A2: share-target receiver — ignore empty shares, dedupe redelivery,
  // correct listener cleanup (no leak on unmount).
  const lastShareKey = useRef<string | null>(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let handle: { remove: () => void } | null = null;
    CapacitorShareTarget.addListener('shareReceived', (event) => {
      const textToSave = (event.texts ?? []).join('\n').trim();
      const titleToSave = (event.title ?? '').trim();
      // A2: shares without usable content must not create empty notes
      if (!textToSave && !titleToSave) return;
      const key = `${titleToSave}|${textToSave}`;
      if (key === lastShareKey.current) return; // A2: redelivery dedupe
      lastShareKey.current = key;
      // Don't save yet — ask the user which folder it goes to first
      setShareQueue((prev) => [
        ...prev,
        {
          title:
            titleToSave !== ''
              ? titleToSave
              : textToSave
                ? textToSave.substring(0, 40)
                : 'Compartilhado',
          body: textToSave,
        },
      ]);
    }).then((h) => {
      if (cancelled) {
        h.remove();
      } else {
        handle = h;
      }
    }).catch(() => {
      // Listener setup failed
    });
    return () => {
      cancelled = true;
      if (handle) handle.remove();
    };
  }, []);

  // Auto-lock after 60s without touching the app (user forgot it open)
  const AUTO_LOCK_MS = 60000;
  const lockAllNotesRef = useRef(lockAllNotes);
  lockAllNotesRef.current = lockAllNotes;
  const hasUnlockedRef = useRef(hasUnlockedNotes);
  hasUnlockedRef.current = hasUnlockedNotes;
  useEffect(() => {
    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (hasUnlockedRef.current) lockAllNotesRef.current();
      }, AUTO_LOCK_MS);
    };
    schedule();
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((ev) =>
      document.addEventListener(ev, schedule, { passive: true, capture: true })
    );
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, schedule));
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  // C1+C3: flush synchronously + lock everything when leaving the scene
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushNotes();
        lockAllNotes();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [flushNotes, lockAllNotes]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let sub: { remove: () => Promise<void> } | null = null;
    CapApp.addListener('pause', () => {
      flushNotes();
      lockAllNotes();
    }).then((s) => {
      sub = s;
    }).catch(() => {
      // pause listener unavailable
    });
    return () => {
      if (sub) sub.remove().catch(() => undefined);
    };
  }, [flushNotes, lockAllNotes]);

  // C4: Android back button — close modal, walk back through screens,
  // minimize at root instead of killing the app.
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const pendingLockedNoteRef = useRef(pendingLockedNote);
  pendingLockedNoteRef.current = pendingLockedNote;
  const shareQueueRef = useRef(shareQueue);
  shareQueueRef.current = shareQueue;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let sub: { remove: () => Promise<void> } | null = null;
    CapApp.addListener('backButton', () => {
      if (shareQueueRef.current.length > 0) {
        setShareQueue((prev) => prev.slice(1));
        return;
      }
      if (pendingLockedNoteRef.current) {
        setPendingLockedNote(null);
        return;
      }
      const vm = viewModeRef.current;
      if (vm === 'note-editor') {
        handleBackFromEditor();
        return;
      }
      if (vm === 'notes-list') {
        exitSelectionMode();
        setCurrentFolderId('all');
        setViewMode('folders');
        return;
      }
      CapApp.minimizeApp().catch(() => undefined);
    }).then((s) => {
      sub = s;
    }).catch(() => {
      // back button listener unavailable
    });
    return () => {
      if (sub) sub.remove().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingShare = shareQueue[0] ?? null;

  const handleShareFolder = (folderId: string) => {
    const item = shareQueue[0];
    if (!item) return;
    const newNote = createNoteRef.current(folderId);
    updateNoteRef.current(newNote.id, { title: item.title, body: item.body });
    setShareQueue((prev) => prev.slice(1));
  };

  const handleShareDiscard = () => {
    setShareQueue((prev) => prev.slice(1));
  };

  // Handle opening a note (C3: hash verification, never plaintext compare)
  const handleOpenNote = (note: Note) => {
    if (note.isLocked && !note.isUnlockedTemp) {
      setUnlockError(false);
      setPendingLockedNote(note);
    } else {
      setCurrentNoteId(note.id);
      setViewMode('note-editor');
    }
  };

  const handleUnlockNote = async (password: string): Promise<boolean> => {
    if (!pendingLockedNote) return false;
    const ok = await verifyPassword(
      password,
      pendingLockedNote.lockSalt || '',
      pendingLockedNote.lockHash || ''
    );
    if (ok) {
      unlockNote(pendingLockedNote.id);
      setCurrentNoteId(pendingLockedNote.id);
      setViewMode('note-editor');
      setPendingLockedNote(null);
      setUnlockError(false);
      return true;
    }
    setUnlockError(true);
    return false;
  };

  // M2: navigation always resets search/selection so state never leaks screens
  const goToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
    exitSelectionMode();
    setViewMode('notes-list');
  };

  const goToFolders = () => {
    setSearchQuery('');
    exitSelectionMode();
    setViewMode('folders');
  };

  // M8: leaving a brand-new empty note discards it instead of piling trash
  const handleBackFromEditor = () => {
    if (currentNote && isNoteEmpty(currentNote) && !currentNote.isLocked) {
      purgeNote(currentNote.id);
    } else {
      setViewMode('notes-list');
    }
  };

  const filteredNotes = getFilteredNotes();
  const folderName = currentFolder?.name || 'Notas';
  const isNative = Capacitor.isNativePlatform();
  const isTrash = currentFolderId === 'trash';
  const trashNotes = isTrash ? getTrashNotes() : filteredNotes;

  const content = (
    <>
      {/* 1. Folders View (Telas 02, 04) */}
      {viewMode === 'folders' && (
        <FoldersView
          folders={folders}
          onSelectFolder={goToFolder}
          onNewNote={() => {
            createNote();
          }}
          onCreateFolder={(name, isSmart) => {
            createFolder(name, isSmart);
          }}
          onUpdateFolder={updateFolder}
          onMoveFolder={moveFolder}
          onDeleteFolder={deleteFolder}
          getFolderNoteCount={getFolderNoteCount}
          trashCount={getFolderNoteCount('trash')}
          onSaveBackup={(name, folder) => saveBackupToDevice(folders, notes, name, folder)}
          onShareBackup={(name) => shareBackup(folders, notes, name)}
          onImportBackup={importBackup}
        />
      )}

      {/* 2. Notes List View (Telas 01, 05, 06, 07, 12, 18) */}
      {viewMode === 'notes-list' && (
        <NotesListView
          currentFolder={currentFolder}
          notes={trashNotes}
          folders={folders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSelectionMode={isSelectionMode}
          setIsSelectionMode={setIsSelectionMode}
          selectedNoteIds={selectedNoteIds}
          toggleSelectNote={toggleSelectNote}
          onSelectAll={() => {
            if (selectedNoteIds.length === trashNotes.length && trashNotes.length > 0) {
              setSelectedNoteIds([]);
            } else {
              setSelectedNoteIds(trashNotes.map((n) => n.id));
            }
          }}
          onBackToFolders={goToFolders}
          onOpenNote={handleOpenNote}
          onNewNote={() => createNote(currentFolderId)}
          onTogglePin={togglePin}
          onDeleteSelected={(visibleIds) => deleteSelectedNotes(visibleIds)}
          onMoveSelected={(targetFolderId, visibleIds) =>
            moveSelectedNotes(targetFolderId, visibleIds)
          }
          onLockAll={lockAllNotes}
          hasUnlockedNotes={hasUnlockedNotes}
          isTrash={isTrash}
          onRestoreNote={restoreNote}
          onPurgeNote={purgeNote}
          onPurgeTrash={purgeTrash}
          onExitSelectionMode={exitSelectionMode}
        />
      )}

      {/* 3. Note Editor View (Telas 08, 09, 13, 14, 15, 17, 19, 20) */}
      {viewMode === 'note-editor' && currentNote && (
        <NoteEditorView
          note={currentNote}
          folderName={folderName}
          autoSortChecklist={autoSortChecklist}
          setAutoSortChecklist={setAutoSortChecklist}
          onBack={handleBackFromEditor}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
          onLockNote={setNoteLock}
          onNewNote={() => createNote(currentFolderId)}
          folders={folders.filter((f) => f.id !== 'all' && f.id !== 'trash' && !f.isSmart)}
          onMoveNote={(targetFolderId) => {
            updateNote(currentNote.id, { folderId: targetFolderId });
            setViewMode('notes-list');
          }}
        />
      )}

      {/* Passcode Unlock Modal for locked notes */}
      <PasscodePromptModal
        isOpen={!!pendingLockedNote}
        noteTitle={pendingLockedNote?.title || 'Nota'}
        hint={pendingLockedNote?.passwordHint}
        hasError={unlockError}
        onClose={() => {
          setPendingLockedNote(null);
          setUnlockError(false);
        }}
        onUnlock={handleUnlockNote}
      />

      {/* Incoming share: pick the destination folder first */}
      {pendingShare && (
        <BottomSheet
          onClose={handleShareDiscard}
          label="Salvar conteúdo recebido"
          panelClass="p-4 max-h-[70%]"
        >
          <div className="text-center mb-1">
            <span className="text-[17px] font-bold text-black">Salvar em…</span>
          </div>
          <div className="bg-white rounded-[12px] px-4 py-3 mb-3 border border-[#E5E5EA]">
            <div className="text-[15px] font-semibold text-black truncate">
              {pendingShare.title}
            </div>
            {pendingShare.body && (
              <div className="text-[13px] text-[#8E8E93] truncate mt-0.5">
                {pendingShare.body.slice(0, 80)}
              </div>
            )}
          </div>
          <div className="bg-white rounded-[12px] divide-y divide-[#E5E5EA] overflow-hidden">
            {folders
              .filter((f) => f.id !== 'all' && f.id !== 'trash' && !f.isSmart)
              .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleShareFolder(f.id)}
                  className="w-full px-4 py-3 text-left text-[17px] text-black active:bg-[#F2F2F7] transition"
                >
                  📁 {f.name}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={handleShareDiscard}
            className="mt-3 w-full bg-white rounded-[12px] px-4 py-3 text-center text-[17px] text-[#FF3B30] font-medium active:bg-[#E5E5EA] transition"
          >
            Descartar
          </button>
        </BottomSheet>
      )}
    </>
  );

  // A5: the iPhone frame is a web-dev preview tool — never on device.
  if (isNative) {
    return (
      <div className="h-dvh w-full flex flex-col bg-[#F2F2F7] overflow-hidden">
        {content}
      </div>
    );
  }
  return <IPhoneFrame>{content}</IPhoneFrame>;
};

export default App;
