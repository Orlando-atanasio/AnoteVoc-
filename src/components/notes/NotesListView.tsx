import React, { useState, useMemo } from 'react';
import type { Folder, Note } from '../../types/notes';
import { daysUntilPurge } from '../../hooks/useNotesStorage';
import { AppleMoreCircleIcon, AppleNewNoteIcon } from '../icons/AppleIcons';
import { NoteItemRow } from './NoteItemRow';
import { NotesListPopoverMenu } from './NotesListPopoverMenu';
import { AppleConfirmModal } from '../common/AppleConfirmModal';
import { BottomSheet } from '../common/BottomSheet';
import { AppLogo } from '../brand/AppLogo';
import { Search, Lock, Trash2, RotateCcw } from 'lucide-react';

interface NotesListViewProps {
  currentFolder: Folder;
  notes: Note[];
  folders: Folder[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSelectionMode: boolean;
  setIsSelectionMode: (val: boolean) => void;
  selectedNoteIds: string[];
  toggleSelectNote: (id: string) => void;
  onSelectAll: () => void;
  onBackToFolders: () => void;
  onOpenNote: (note: Note) => void;
  onNewNote: () => void;
  onTogglePin: (id: string) => void;
  onDeleteSelected: (visibleIds: string[]) => { deleted: number; skippedLocked: number };
  onMoveSelected: (targetFolderId: string, visibleIds: string[]) => { moved: number; skippedLocked: number };
  onLockAll: () => void;
  hasUnlockedNotes: boolean;
  // Trash mode (C5)
  isTrash?: boolean;
  onRestoreNote?: (id: string) => void;
  onPurgeNote?: (id: string) => void;
  onPurgeTrash?: () => void;
  onExitSelectionMode?: () => void;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

// M1: derive groups from updatedAt — never from the stale dateCategory field
function groupKey(updatedAt: string, now: Date): string {
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return 'Anteriores';
  const day = startOfDay(d).getTime();
  const today = startOfDay(now).getTime();
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays <= 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays <= 7) return 'Últimos 7 Dias';
  return 'Anteriores';
}

const GROUP_ORDER = ['Hoje', 'Ontem', 'Últimos 7 Dias', 'Anteriores'];

function formatTime(updatedAt: string, fallback: string): string {
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const NotesListView: React.FC<NotesListViewProps> = ({
  currentFolder,
  notes,
  folders,
  searchQuery,
  setSearchQuery,
  isSelectionMode,
  setIsSelectionMode,
  selectedNoteIds,
  toggleSelectNote,
  onSelectAll,
  onBackToFolders,
  onOpenNote,
  onNewNote,
  onTogglePin,
  onDeleteSelected,
  onMoveSelected,
  onLockAll,
  hasUnlockedNotes,
  isTrash = false,
  onRestoreNote,
  onPurgeNote,
  onPurgeTrash,
  onExitSelectionMode,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGalleryView, setIsGalleryView] = useState(false);
  const [isMoveSheetOpen, setIsMoveSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPurgeTrashOpen, setIsPurgeTrashOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  };

  // Group notes into Pinned and date groups (M1)
  const now = useMemo(() => new Date(), []);
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);
  const groups = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of unpinnedNotes) {
      const k = isTrash ? 'Apagadas' : groupKey(n.updatedAt, now);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    }
    const order = isTrash ? ['Apagadas'] : GROUP_ORDER;
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, items: map.get(k)! }));
  }, [unpinnedNotes, now, isTrash]);

  const visibleIds = useMemo(() => notes.map((n) => n.id), [notes]);

  const getFolderName = (folderId: string) => {
    return folders.find((f) => f.id === folderId)?.name || 'Notas';
  };

  const exitSelection = () => {
    if (onExitSelectionMode) onExitSelectionMode();
    else setIsSelectionMode(false);
  };

  const handleConfirmDelete = () => {
    setIsDeleteConfirmOpen(false);
    const { deleted, skippedLocked } = onDeleteSelected(visibleIds);
    if (skippedLocked > 0) {
      showNotice(
        `${deleted} movida(s) para Apagadas. ${skippedLocked} bloqueada(s) ignorada(s).`
      );
    }
  };

  const renderRow = (note: Note, index: number, list: Note[]) => {
    if (isTrash) {
      const remaining = daysUntilPurge(note.deletedAt);
      return (
        <div key={note.id} className="relative bg-white px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-semibold text-black truncate">
              {note.title || 'Sem título'}
            </h3>
            <div className="text-[13px] text-[#8E8E93] truncate">
              {remaining > 0 ? `Apaga em ${remaining} dia(s)` : 'Apaga hoje'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRestoreNote?.(note.id)}
            aria-label={`Restaurar ${note.title || 'nota'}`}
            className="p-2 text-[#D97706]"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onPurgeNote?.(note.id)}
            aria-label={`Apagar definitivamente ${note.title || 'nota'}`}
            className="p-2 text-[#FF3B30]"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {index !== list.length - 1 && (
            <div className="absolute bottom-0 left-[16px] right-0 h-[1px] bg-[#E5E5EA]" />
          )}
        </div>
      );
    }
    return (
      <NoteItemRow
        key={note.id}
        note={note}
        folderName={getFolderName(note.folderId)}
        isLast={index === list.length - 1}
        isSelected={selectedNoteIds.includes(note.id)}
        isSelectionMode={isSelectionMode}
        onSelect={() => toggleSelectNote(note.id)}
        onOpen={() => onOpenNote(note)}
        onTogglePin={() => onTogglePin(note.id)}
      />
    );
  };

  const renderGalleryCard = (note: Note) => {
    const isLockedAndClosed = note.isLocked && !note.isUnlockedTemp;
    if (isTrash) {
      return (
        <div
          key={note.id}
          className="bg-white rounded-[12px] p-3 h-[130px] flex flex-col justify-between border border-[#E5E5EA] shadow-xs"
        >
          <div>
            <h4 className="font-semibold text-[15px] text-black truncate">
              {note.title || 'Sem título'}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRestoreNote?.(note.id)}
              className="text-[13px] font-medium text-[#D97706]"
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={() => onPurgeNote?.(note.id)}
              className="text-[13px] font-medium text-[#FF3B30]"
            >
              Apagar
            </button>
          </div>
        </div>
      );
    }
    return (
      <div
        key={note.id}
        onClick={() => onOpenNote(note)}
        className="bg-white rounded-[12px] p-3 h-[130px] flex flex-col justify-between border border-[#E5E5EA] shadow-xs active:scale-[0.98] transition cursor-pointer"
        role="button"
        aria-label={`Abrir ${note.title || 'nota sem título'}`}
      >
        <div>
          <h4 className="font-semibold text-[15px] text-black truncate">
            {note.title || 'Sem título'}
          </h4>
          <p className="text-[12px] text-[#8E8E93] line-clamp-3 mt-1">
            {isLockedAndClosed ? '🔒 Nota Bloqueada' : (note.body || 'Nenhum texto adicional')}
          </p>
        </div>
        <span className="text-[11px] text-[#8E8E93]">
          {formatTime(note.updatedAt, note.timeFormatted)}
        </span>
      </div>
    );
  };

  // M6: distinct empty states
  const isSearching = searchQuery.trim() !== '';
  const emptyMessage = isSearching
    ? `Nenhum resultado para "${searchQuery.trim()}"`
    : isTrash
      ? 'Nenhuma nota apagada'
      : 'Nenhuma nota aqui. Toque em + para criar.';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-hidden select-none relative">
      {/* Brand watermark behind the content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <AppLogo size={300} markOpacity={0.1} taglineOpacity={0.4} />
      </div>
      {/* Top Header */}
      <div className="h-[44px] px-4 flex items-center justify-between z-30 relative">
        {!isSelectionMode ? (
          <button
            onClick={onBackToFolders}
            aria-label="Voltar para pastas"
            className="text-[17px] font-normal text-[#D97706] hover:opacity-80 active:opacity-60 transition flex items-center gap-1 -ml-1"
          >
            <span className="text-[20px] leading-none mb-0.5">‹</span>
            <span>Pastas</span>
          </button>
        ) : (
          <button
            onClick={onSelectAll}
            className="text-[17px] font-normal text-[#D97706] hover:opacity-80 active:opacity-60 transition"
          >
            {selectedNoteIds.length === notes.length && notes.length > 0 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
          </button>
        )}

        {isSelectionMode && (
          <div className="text-[17px] font-semibold text-black absolute left-1/2 -translate-x-1/2">
            {selectedNoteIds.length > 0 ? `${selectedNoteIds.length} Selecionadas` : 'Selecionar'}
          </div>
        )}

        <div className="relative">
          {!isSelectionMode ? (
            <button
              // M3: stop propagation so the outside-click handler can't reopen
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((v) => !v);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[#D97706] hover:opacity-80 active:opacity-60 transition p-1"
              aria-label="Opções da lista"
              aria-expanded={isMenuOpen}
            >
              <AppleMoreCircleIcon className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={exitSelection}
              className="text-[17px] font-semibold text-[#D97706] hover:opacity-80 active:opacity-60 transition"
            >
              OK
            </button>
          )}

          {/* Popover Menu */}
          <NotesListPopoverMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onSelectNotes={() => setIsSelectionMode(true)}
            onToggleGalleryView={() => setIsGalleryView(!isGalleryView)}
            isGalleryView={isGalleryView}
          />
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Large Title */}
        <div className="pt-0 pb-2">
          <h1 className="text-[34px] font-bold text-black tracking-tight leading-tight">
            {currentFolder.name}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="bg-[#E3E3E8] rounded-[10px] h-[36px] px-3 flex items-center gap-2 text-[#8E8E93]">
            <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar notas"
              className="w-full bg-transparent text-[16px] text-black placeholder-[#8E8E93] outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="w-4 h-4 rounded-full bg-[#8E8E93] text-white flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Pinned Notes Section (if any) */}
        {pinnedNotes.length > 0 && (
          <div className="mb-5">
            <div className="text-[13px] font-semibold text-[#8E8E93] tracking-wide mb-1.5 px-1">
              Fixadas
            </div>
            <div className="bg-white rounded-[10px] overflow-hidden shadow-xs border border-[#E5E5EA]">
              {pinnedNotes.map((note, index) => renderRow(note, index, pinnedNotes))}
            </div>
          </div>
        )}

        {/* Date-grouped Notes Sections (M1) */}
        {groups.length > 0 ? (
          groups.map((g) => (
            <div key={g.key} className="mb-4">
              <div className="text-[13px] font-semibold text-[#8E8E93] tracking-wide mb-1.5 px-1">
                {g.key}
              </div>
              {!isGalleryView ? (
                <div className="bg-white rounded-[10px] overflow-hidden shadow-xs border border-[#E5E5EA]">
                  {g.items.map((note, index) => renderRow(note, index, g.items))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {g.items.map((note) => renderGalleryCard(note))}
                </div>
              )}
            </div>
          ))
        ) : (
          pinnedNotes.length === 0 && (
            <div className="text-center py-10 text-[#8E8E93] text-[15px]">
              {emptyMessage}
            </div>
          )
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="h-[49px] border-t border-[#E5E5EA] bg-[#F8F8F8]/90 backdrop-blur-md px-4 flex items-center justify-between z-30">
        {!isSelectionMode ? (
          <>
            <div className="w-8" />
            <div className="flex flex-col items-center justify-center">
              <span className="text-[12px] text-[#8E8E93] font-normal leading-none">
                {notes.length} {notes.length === 1 ? 'Nota' : 'Notas'}
              </span>
              {hasUnlockedNotes && !isTrash && (
                <button
                  type="button"
                  onClick={onLockAll}
                  className="text-[11px] font-medium text-[#D97706] hover:opacity-80 active:opacity-60 flex items-center gap-1 mt-0.5"
                >
                  <span>Bloquear Agora</span>
                  <Lock className="w-3 h-3" />
                </button>
              )}
              {isTrash && notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPurgeTrashOpen(true)}
                  className="text-[11px] font-medium text-[#FF3B30] hover:opacity-80 active:opacity-60 flex items-center gap-1 mt-0.5"
                >
                  <span>Esvaziar Apagadas</span>
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {!isTrash && (
              <button
                onClick={onNewNote}
                className="text-[#D97706] hover:opacity-80 active:opacity-60 transition"
                title="Nova Nota"
                aria-label="Criar nova nota"
              >
                <AppleNewNoteIcon className="w-7 h-7" />
              </button>
            )}
            {isTrash && <div className="w-8" />}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={selectedNoteIds.length === 0}
              onClick={() => setIsMoveSheetOpen(true)}
              className="text-[17px] text-[#D97706] disabled:opacity-30 hover:opacity-80 transition"
            >
              Mover
            </button>

            <button
              type="button"
              onClick={onSelectAll}
              className={`text-[15px] font-medium hover:opacity-80 transition ${
                selectedNoteIds.length === notes.length && notes.length > 0
                  ? 'text-[#D97706]'
                  : 'text-[#8E8E93]'
              }`}
            >
              {selectedNoteIds.length === notes.length && notes.length > 0 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>

            <button
              type="button"
              disabled={selectedNoteIds.length === 0}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-[17px] text-[#D97706] disabled:opacity-30 hover:opacity-80 transition"
            >
              Apagar
            </button>
          </>
        )}
      </div>

      {/* Move Sheet Modal (in selection mode) */}
      {isMoveSheetOpen && (
        <BottomSheet
          onClose={() => setIsMoveSheetOpen(false)}
          label="Mover para pasta"
          panelClass="p-4 max-h-[70%]"
        >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[17px] font-bold text-black">Mover para Pasta</span>
              <button
                type="button"
                onClick={() => setIsMoveSheetOpen(false)}
                className="text-[17px] text-[#D97706]"
              >
                Cancelar
              </button>
            </div>
            <div className="bg-white rounded-[12px] divide-y divide-[#E5E5EA]">
              {folders.filter((f) => !f.isSystemRoot && f.id !== 'trash').map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    const { skippedLocked } = onMoveSelected(f.id, visibleIds);
                    setIsMoveSheetOpen(false);
                    if (skippedLocked > 0) {
                      showNotice(`${skippedLocked} bloqueada(s) não movida(s).`);
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-[17px] text-black active:bg-[#F2F2F7]"
                >
                  📁 {f.name}
                </button>
              ))}
            </div>
        </BottomSheet>
      )}

      {/* Delete confirmation (C5) */}
      <AppleConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Apagar selecionadas?"
        message="As notas ficarão na lixeira por 30 dias e após esse prazo serão apagadas automaticamente deste aparelho. Notas bloqueadas serão ignoradas."
        confirmText="Mover para Apagadas"
        cancelText="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Empty trash confirmation */}
      <AppleConfirmModal
        isOpen={isPurgeTrashOpen}
        title="Esvaziar Apagadas?"
        message="Todas as notas apagadas serão excluídas definitivamente."
        confirmText="Apagar tudo"
        cancelText="Cancelar"
        destructive
        onConfirm={() => {
          setIsPurgeTrashOpen(false);
          onPurgeTrash?.();
        }}
        onCancel={() => setIsPurgeTrashOpen(false)}
      />

      {notice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-[14px] font-medium px-4 py-2 rounded-full shadow-lg animate-in fade-in duration-200 max-w-[90%] text-center">
          {notice}
        </div>
      )}
    </div>
  );
};
