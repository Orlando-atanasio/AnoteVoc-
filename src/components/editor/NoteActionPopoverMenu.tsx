import React, { useRef, useEffect } from 'react';
import { AppleScanIcon, ApplePinIcon } from '../icons/AppleIcons';
import { Lock, Search, Folder, Grid3X3, Trash2 } from 'lucide-react';

interface NoteActionPopoverMenuProps {
  isOpen: boolean;
  isPinned: boolean;
  isLocked: boolean;
  onClose: () => void;
  onScan: () => void;
  onTogglePin: () => void;
  onLockClick: () => void;
  onSearchInNote: () => void;
  onMoveNote: () => void;
  onToggleGridLines: () => void;
  onDeleteNote: () => void;
}

export const NoteActionPopoverMenu: React.FC<NoteActionPopoverMenuProps> = ({
  isOpen,
  isPinned,
  isLocked,
  onClose,
  onScan,
  onTogglePin,
  onLockClick,
  onSearchInNote,
  onMoveNote,
  onToggleGridLines,
  onDeleteNote,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // M3: pointerdown (not mousedown) so the trigger's own tap can't reopen
    const handlePointerOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerOutside);
    }
    return () => document.removeEventListener('pointerdown', handlePointerOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-[52px] right-4 z-50 w-[260px] bg-white/95 backdrop-blur-2xl rounded-[16px] shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Top 3 Large Square Buttons (Escanear | Fixar | Bloquear) */}
      <div className="grid grid-cols-3 divide-x divide-[#E5E5EA] border-b border-[#E5E5EA] bg-white/50">
        <button
          type="button"
          onClick={() => {
            onScan();
            onClose();
          }}
          className="flex flex-col items-center justify-center py-3 px-1 active:bg-black/5 transition"
        >
          <AppleScanIcon className="w-6 h-6 text-black mb-1" />
          <span className="text-[12px] text-black font-medium">Escanear</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onTogglePin();
            onClose();
          }}
          className="flex flex-col items-center justify-center py-3 px-1 active:bg-black/5 transition"
        >
          <div className="w-6 h-6 flex items-center justify-center mb-1">
            <ApplePinIcon className={`w-5 h-5 ${isPinned ? 'fill-[#FF9500]' : 'fill-black'}`} />
          </div>
          <span className="text-[12px] text-black font-medium">
            {isPinned ? 'Desafixar' : 'Fixar'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onLockClick();
            onClose();
          }}
          className="flex flex-col items-center justify-center py-3 px-1 active:bg-black/5 transition"
        >
          <Lock className={`w-6 h-6 mb-1 ${isLocked ? 'text-[#D97706]' : 'text-black'}`} />
          <span className="text-[12px] text-black font-medium">
            {isLocked ? 'Bloqueada' : 'Bloquear'}
          </span>
        </button>
      </div>

      {/* Action List with Dividers */}
      <div className="divide-y divide-[#E5E5EA]">
        <button
          type="button"
          onClick={() => {
            onSearchInNote();
            onClose();
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-[16px] text-black active:bg-black/5 transition text-left"
        >
          <span>Buscar na Nota</span>
          <Search className="w-5 h-5 text-[#8E8E93]" />
        </button>

        <button
          type="button"
          onClick={() => {
            onMoveNote();
            onClose();
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-[16px] text-black active:bg-black/5 transition text-left"
        >
          <span>Mover Nota</span>
          <Folder className="w-5 h-5 text-[#8E8E93]" />
        </button>

        <button
          type="button"
          onClick={() => {
            onToggleGridLines();
            onClose();
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-[16px] text-black active:bg-black/5 transition text-left"
        >
          <span>Linhas</span>
          <Grid3X3 className="w-5 h-5 text-[#8E8E93]" />
        </button>

        <button
          type="button"
          onClick={() => {
            onDeleteNote();
            onClose();
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-[16px] text-[#FF3B30] active:bg-red-50 transition text-left"
        >
          <span>Apagar</span>
          <Trash2 className="w-5 h-5 text-[#FF3B30]" />
        </button>
      </div>
    </div>
  );
};
