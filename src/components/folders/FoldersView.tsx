import React, { useState, useRef } from 'react';
import type { Folder, Note } from '../../types/notes';import { AppleFolderIcon, AppleNewFolderIcon, AppleNewNoteIcon } from '../icons/AppleIcons';
import { NewFolderModal } from './NewFolderModal';
import { AppleConfirmModal } from '../common/AppleConfirmModal';
import { ApplePromptModal } from '../common/ApplePromptModal';
import { BottomSheet } from '../common/BottomSheet';
import { ProfileCard } from '../profile/ProfileCard';
import { AppLogo } from '../brand/AppLogo';
import { loadProfile, saveProfile, type UserProfile } from '../../utils/profile';
import { suggestBackupName, parseBackupFile, DEFAULT_BACKUP_FOLDER } from '../../utils/backup';

interface FoldersViewProps {
  folders: Folder[];
  onSelectFolder: (folderId: string) => void;
  onNewNote: () => void;
  onCreateFolder: (name: string, isSmart: boolean) => void;
  onUpdateFolder: (id: string, name: string) => void;
  onMoveFolder: (id: string, toMovableIndex: number) => void;
  onDeleteFolder: (id: string) => void;
  getFolderNoteCount: (folderId: string) => number;
  trashCount?: number;
  onSaveBackup: (name: string, folder: string) => Promise<{ ok: boolean; message: string }>;
  onShareBackup: (name: string) => Promise<{ ok: boolean; message: string }>;  onImportBackup: (
    folders: Folder[],
    notes: Note[]
  ) => { addedFolders: number; addedNotes: number; skipped: number };
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  folders,
  onSelectFolder,
  onNewNote,
  onCreateFolder,
  onUpdateFolder,
  onMoveFolder,
  onDeleteFolder,
  getFolderNoteCount,
  trashCount = 0,
  onSaveBackup,
  onShareBackup,
  onImportBackup,
}) => {
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameTargetName, setRenameTargetName] = useState('');
  const [isBackupSheetOpen, setIsBackupSheetOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupToast, setBackupToast] = useState('');
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [pendingBackupKind, setPendingBackupKind] = useState<'save' | 'share'>('save');
  const [suggestedName, setSuggestedName] = useState('');
  const [isFolderPromptOpen, setIsFolderPromptOpen] = useState(false);
  const [pendingBackupName, setPendingBackupName] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  // Reorder (drag) state
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const longPressTimer = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const movableFolders = folders.filter((f) => !f.isSystemRoot);
  const folderCount = movableFolders.length;

  const vibrate = () => {
    try {
      (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(20);
    } catch {
      // ignore
    }
  };

  // Long-press a row to enter organize mode
  const handleRowPointerDown = () => {
    longPressedRef.current = false;
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressedRef.current = true;
      vibrate();
      setIsEditing(true);
    }, 550);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Drag a row by its handle (edit mode) to reorder
  const handleDragMove = (clientY: number, id: string) => {
    const order = movableFolders;
    let target = order.length - 1;
    for (let i = 0; i < order.length; i++) {
      const el = rowRefs.current.get(order[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        target = i;
        break;
      }
    }
    const current = order.findIndex((f) => f.id === id);
    if (current !== -1 && target !== current) {
      onMoveFolder(id, target);
    }
  };
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{ folders: Folder[]; notes: Note[]; profile?: UserProfile } | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const showBackupToast = (msg: string) => {
    setBackupToast(msg);
    setTimeout(() => setBackupToast(''), 2500);
  };

  // Ask for the file name first (Apple prompt, pre-filled suggestion)
  const askBackupName = (kind: 'save' | 'share') => {
    setPendingBackupKind(kind);
    setSuggestedName(suggestBackupName());
    setIsBackupSheetOpen(false);
    setIsNamePromptOpen(true);
  };

  const runBackup = async (kind: 'save' | 'share', name: string, folder?: string) => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const res =
        kind === 'save'
          ? await onSaveBackup(name, folder ?? DEFAULT_BACKUP_FOLDER)
          : await onShareBackup(name);
      setIsNamePromptOpen(false);
      setIsFolderPromptOpen(false);
      showBackupToast(res.message);
    } finally {
      setBackupBusy(false);
    }
  };

  // Restore: pick a .json backup file, validate, confirm, merge
  const handleRestoreFile = async (file: File | undefined) => {
    if (!file || restoreBusy) return;
    setRestoreBusy(true);
    try {
      const parsed = await parseBackupFile(file);
      if (!parsed.ok) {
        showBackupToast(parsed.message);
        return;
      }
      setPendingRestore(parsed.data);
      setIsBackupSheetOpen(false);
      setIsRestoreConfirmOpen(true);
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleRestoreConfirm = () => {
    if (!pendingRestore) return;
    const res = onImportBackup(pendingRestore.folders, pendingRestore.notes);
    if (pendingRestore.profile) {
      setProfile(pendingRestore.profile);
      saveProfile(pendingRestore.profile);
    }
    setPendingRestore(null);
    setIsRestoreConfirmOpen(false);
    showBackupToast(
      `Backup restaurado: ${res.addedNotes} nota(s), ${res.addedFolders} pasta(s).`
    );
  };

  const getGreeting = (): string => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      onDeleteFolder(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleRenameConfirm = (newName: string) => {
    if (renameTargetId && newName.trim() !== '') {
      onUpdateFolder(renameTargetId, newName);
      setRenameTargetId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-hidden select-none relative">
      {/* Top Bar with Avatar + Editar (Apple style) */}
      <div className="h-[56px] px-4 flex items-center justify-between">
        <button
          onClick={() => setIsProfileOpen(true)}
          aria-label="Abrir perfil do usuário"
          className="w-12 h-12 ml-1 rounded-full overflow-hidden bg-[#E5E5EA] flex items-center justify-center shrink-0 active:scale-95 transition ring-2 ring-[#E49F13] ring-offset-2 ring-offset-[#F2F2F7] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        >
          {profile.photo ? (
            <img
              src={profile.photo}
              alt="Foto do usuário"
              className="w-full h-full object-cover pointer-events-none"
              style={{
                transform: `translate(${profile.photoTransform?.x ?? 0}px, ${profile.photoTransform?.y ?? 0}px) rotate(${profile.photoTransform?.rotate ?? 0}deg) scale(${profile.photoTransform?.scale ?? 1})`,
              }}
            />
          ) : (
            <span className="text-[17px] text-[#8E8E93]">
              {profile.name.trim() ? profile.name.trim()[0].toUpperCase() : '👤'}
            </span>
          )}
        </button>
        <div className="flex-1 ml-3 min-w-0">
          <div className="text-[16px] font-semibold text-black leading-tight truncate">
            {getGreeting()}{profile.name.trim() ? `, ${profile.name.trim().split(' ')[0]}` : ''}
          </div>
          <div className="text-[12px] text-[#8E8E93] leading-tight truncate">
            {profile.name.trim() ? 'seja bem-vindo de volta' : 'seja bem-vindo'}
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-[17px] font-normal text-[#D97706] hover:opacity-80 active:opacity-60 transition"
        >
          {isEditing ? 'OK' : 'Editar'}
        </button>
      </div>

      {/* Large Title */}
      <div className="px-5 pt-1 pb-4">
        <h1 className="text-[34px] font-bold text-black tracking-tight leading-none">
          Pastas
        </h1>
      </div>

      {/* Brand watermark behind the content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <AppLogo size={330} markOpacity={0.1} taglineOpacity={0.4} />
      </div>

      {/* Folders List Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          Neste Phone
        </div>

        <div className="bg-white rounded-[12px] overflow-hidden shadow-xs border border-[#E5E5EA]">
          {folders.map((folder, index) => {
            const count = getFolderNoteCount(folder.id);
            const isLast = index === folders.length - 1;
            const isDefault = folder.id === 'notas' || folder.id === 'all';

            return (
              <div
                key={folder.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(folder.id, el);
                  else rowRefs.current.delete(folder.id);
                }}
                className={`relative transition-all ${dragId === folder.id ? 'opacity-90' : ''}`}
              >
                <div
                  className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                    dragId === folder.id
                      ? 'bg-[#D9D9DE] shadow-[0_6px_16px_rgba(0,0,0,0.18)] rounded-[10px] scale-[1.02]'
                      : 'active:bg-[#F2F2F7]'
                  }`}
                  onPointerDown={handleRowPointerDown}
                  onPointerMove={() => {
                    // Cancel long-press if the finger moves
                    if (longPressTimer.current !== null) cancelLongPress();
                  }}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isEditing && !isDefault && (
                      <button
                        onClick={() => setDeleteTargetId(folder.id)}
                        className="text-red-500 mr-1"
                        title="Apagar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                          <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
                          <path d="M8 12h8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                    <AppleFolderIcon className="w-6 h-6 shrink-0" />
                    
                    <button 
                      className="text-[17px] text-black font-normal flex-1 text-left"
                      onClick={() => {
                        if (longPressedRef.current) {
                          longPressedRef.current = false;
                          return;
                        }
                        if (isEditing && !isDefault) {
                          setRenameTargetId(folder.id);
                          setRenameTargetName(folder.name);
                        } else if (!isEditing) {
                          onSelectFolder(folder.id);
                        }
                      }}
                    >
                      {folder.name}
                    </button>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 pointer-events-none">
                      <span className="text-[17px] text-[#8E8E93] font-normal">
                        {count}
                      </span>
                      <span className="text-[#C7C7CC] text-[18px] font-light">›</span>
                    </div>
                  )}
                  {isEditing && !isDefault && (
                    <>
                      <button
                        type="button"
                        aria-label={`Arrastar ${folder.name} para reordenar`}
                        title="Arrastar para reordenar"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          cancelLongPress();
                          setDragId(folder.id);
                          vibrate();
                          try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          } catch {
                            // ignore
                          }
                        }}
                        onPointerMove={(e) => {
                          if (dragId === folder.id) handleDragMove(e.clientY, folder.id);
                        }}
                        onPointerUp={() => setDragId(null)}
                        onPointerCancel={() => setDragId(null)}
                        className={`p-2 mr-2 cursor-grab active:cursor-grabbing touch-none transition-colors ${
                          dragId === folder.id ? 'text-[#D97706]' : 'text-[#C7C7CC]'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                          <circle cx="9" cy="6" r="1.8" />
                          <circle cx="15" cy="6" r="1.8" />
                          <circle cx="9" cy="12" r="1.8" />
                          <circle cx="15" cy="12" r="1.8" />
                          <circle cx="9" cy="18" r="1.8" />
                          <circle cx="15" cy="18" r="1.8" />
                        </svg>
                      </button>
                      <button
                        className="flex items-center gap-2 text-[#D97706] transition hover:opacity-80 p-2 -mr-2"
                        onClick={() => {
                          setRenameTargetId(folder.id);
                          setRenameTargetName(folder.name);
                        }}
                        title="Renomear"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4 M12 8h.01" strokeLinecap="round" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {!isLast && (
                  <div className={`ml-[48px] h-[1px] bg-[#E5E5EA] transition-all ${isEditing ? 'ml-[80px]' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Trash (C5: recoverable deletes) */}
        {trashCount > 0 && (
          <button
            onClick={() => onSelectFolder('trash')}
            className="mt-3 w-full bg-white rounded-[12px] overflow-hidden shadow-xs border border-[#E5E5EA] flex items-center justify-between px-4 py-3 active:bg-[#F2F2F7] transition"
            aria-label={`Apagadas, ${trashCount} notas`}
          >
            <div className="flex items-center gap-3">
              <span className="text-[20px]">🗑️</span>
              <span className="text-[17px] text-black font-normal">Apagadas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[17px] text-[#8E8E93] font-normal">{trashCount}</span>
              <span className="text-[#C7C7CC] text-[18px] font-light">›</span>
            </div>
          </button>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="h-[49px] border-t border-[#E5E5EA] bg-[#F8F8F8]/90 backdrop-blur-md px-5 flex items-center justify-between">
        <button
          onClick={() => setIsNewFolderOpen(true)}
          className="text-[#D97706] hover:opacity-80 active:opacity-60 transition flex items-center gap-1.5"
          title="Nova Pasta"
          aria-label={`Nova pasta (${folderCount} pastas)`}
        >
          <AppleNewFolderIcon className="w-7 h-7" />
          <span className="text-[12px] font-semibold text-[#D97706] leading-none min-w-[14px] text-center">
            {folderCount}
          </span>
        </button>

        <button
          onClick={onNewNote}
          className="text-[#D97706] hover:opacity-80 active:opacity-60 transition"
          title="Nova Nota"
        >
          <AppleNewNoteIcon className="w-7 h-7" />
        </button>
      </div>

      {/* New Folder Modal */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSave={onCreateFolder}
      />

      {/* Delete Confirmation Modal */}
      <AppleConfirmModal
        isOpen={!!deleteTargetId}
        title="Apagar pasta?"
        message="Tem certeza que deseja apagar esta pasta e todas as suas notas?"
        confirmText="Apagar"
        cancelText="Cancelar"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Rename Prompt Modal */}
      <ApplePromptModal
        isOpen={!!renameTargetId}
        title="Renomear pasta"
        placeholder="Nome da pasta"
        initialValue={renameTargetName}
        confirmText="OK"
        cancelText="Cancelar"
        onConfirm={handleRenameConfirm}
        onCancel={() => setRenameTargetId(null)}
      />

      {/* Backup Action Sheet (Apple style bottom sheet) */}
      {isBackupSheetOpen && (
        <BottomSheet
          onClose={() => setIsBackupSheetOpen(false)}
          label="Backup das notas"
          panelClass="p-4 max-h-[70%]"
        >
            <div className="text-center mb-3">
              <span className="text-[13px] text-[#8E8E93]">
                Salve uma cópia das suas pastas e notas
              </span>
            </div>
            <div className="bg-white rounded-[12px] divide-y divide-[#E5E5EA] overflow-hidden">
              <button
                type="button"
                disabled={backupBusy}
                onClick={() => askBackupName('save')}
                className="w-full px-4 py-3 text-center text-[17px] text-[#D97706] font-medium active:bg-[#F2F2F7] disabled:opacity-40 transition"
              >
                Salvar no aparelho
              </button>
              <button
                type="button"
                disabled={backupBusy}
                onClick={() => askBackupName('share')}
                className="w-full px-4 py-3 text-center text-[17px] text-[#D97706] font-medium active:bg-[#F2F2F7] disabled:opacity-40 transition"
              >
                Compartilhar backup…
              </button>
              <button
                type="button"
                disabled={backupBusy || restoreBusy}
                onClick={() => restoreFileRef.current?.click()}
                className="w-full px-4 py-3 text-center text-[17px] text-[#D97706] font-medium active:bg-[#F2F2F7] disabled:opacity-40 transition"
              >
                {restoreBusy ? 'Lendo…' : 'Restaurar backup…'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsBackupSheetOpen(false)}
              className="mt-3 w-full bg-white rounded-[12px] px-4 py-3 text-center text-[17px] text-[#D97706] font-semibold active:bg-[#E5E5EA] transition"
            >
              Cancelar
            </button>
        </BottomSheet>
      )}

      {/* Profile Card */}
      {isProfileOpen && (
        <ProfileCard
          key={profile.name + profile.phone + profile.email + (profile.photo ? 'p' : '')}
          isOpen={isProfileOpen}
          profile={profile}
          onClose={() => setIsProfileOpen(false)}
          onSave={(p) => {
            setProfile(p);
            saveProfile(p);
          }}
          onOpenBackup={() => {
            setIsProfileOpen(false);
            setIsBackupSheetOpen(true);
          }}
        />
      )}

      {backupToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-[14px] font-medium px-4 py-2 rounded-full shadow-lg animate-in fade-in duration-200 max-w-[90%] text-center">
          {backupToast}
        </div>
      )}

      {/* Backup file name (Apple prompt, editable suggestion) */}
      <ApplePromptModal
        isOpen={isNamePromptOpen}
        title="Nome do backup"
        placeholder="Nome do arquivo"
        initialValue={suggestedName}
        confirmText="Continuar"
        cancelText="Cancelar"
        onConfirm={(value) => {
          if (pendingBackupKind === 'save') {
            // Save flow: name first, then the mandatory destination folder
            setPendingBackupName(value);
            setIsNamePromptOpen(false);
            setIsFolderPromptOpen(true);
          } else {
            runBackup('share', value);
          }
        }}
        onCancel={() => setIsNamePromptOpen(false)}
      />

      {/* Backup destination folder (mandatory, inside Documents) */}
      <ApplePromptModal
        isOpen={isFolderPromptOpen}
        title="Pasta em Documentos"
        placeholder="Nome da pasta"
        initialValue={DEFAULT_BACKUP_FOLDER}
        confirmText="Salvar"
        cancelText="Voltar"
        onConfirm={(folder) => runBackup('save', pendingBackupName, folder)}
        onCancel={() => {
          setIsFolderPromptOpen(false);
          setIsNamePromptOpen(true);
        }}
      />

      {/* Restore file picker */}
      <input
        ref={restoreFileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          handleRestoreFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Restore confirmation (Apple style) */}
      <AppleConfirmModal
        isOpen={isRestoreConfirmOpen}
        title="Restaurar backup?"
        message={
          pendingRestore
            ? `${pendingRestore.notes.length} nota(s), ${pendingRestore.folders.length} pasta(s)${pendingRestore.profile ? ' e o perfil (foto, nome e contatos)' : ''} serão somados aos atuais, sem duplicar nem apagar nada.`
            : undefined
        }
        confirmText="Restaurar"
        cancelText="Cancelar"
        onConfirm={handleRestoreConfirm}
        onCancel={() => {
          setPendingRestore(null);
          setIsRestoreConfirmOpen(false);
        }}
      />
    </div>
  );
};
