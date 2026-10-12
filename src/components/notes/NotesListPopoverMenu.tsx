import React, { useRef, useEffect } from 'react';
import { LayoutGrid, CheckCircle2 } from 'lucide-react';

interface NotesListPopoverMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotes: () => void;
  onToggleGalleryView: () => void;
  isGalleryView: boolean;
}

export const NotesListPopoverMenu: React.FC<NotesListPopoverMenuProps> = ({
  isOpen,
  onClose,
  onSelectNotes,
  onToggleGalleryView,
  isGalleryView,
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
      className="absolute top-[48px] right-4 z-50 w-[240px] bg-white/90 backdrop-blur-xl rounded-[14px] shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="divide-y divide-[#E5E5EA]">
        <button
          type="button"
          onClick={() => {
            onToggleGalleryView();
            onClose();
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-[16px] text-black hover:bg-black/5 active:bg-black/10 transition text-left"
        >
          <span>{isGalleryView ? 'Ver como Lista' : 'Ver como Galeria'}</span>
          <LayoutGrid className="w-5 h-5 text-[#8E8E93]" />
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectNotes();
            onClose();
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-[16px] text-black hover:bg-black/5 active:bg-black/10 transition text-left"
        >
          <span>Selecionar Notas</span>
          <CheckCircle2 className="w-5 h-5 text-[#8E8E93]" />
        </button>
      </div>
    </div>
  );
};
