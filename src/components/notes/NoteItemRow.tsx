import React, { useState, useRef } from 'react';
import type { Note } from '../../types/notes';
import { ApplePinIcon } from '../icons/AppleIcons';
import { Lock, Unlock, Check } from 'lucide-react';

interface NoteItemRowProps {
  note: Note;
  folderName: string;
  isLast: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onTogglePin: () => void;
}

export const NoteItemRow: React.FC<NoteItemRowProps> = ({
  note,
  folderName,
  isLast,
  isSelected,
  isSelectionMode,
  onSelect,
  onOpen,
  onTogglePin,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const offsetRef = useRef(0);

  // M5: Pointer Events with vertical-scroll lock and cancel handling
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (isSelectionMode) return;
    startXRef.current = clientX;
    startYRef.current = clientY;
    isSwipingRef.current = true;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isSwipingRef.current || isSelectionMode) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;
    // Lock to horizontal swipes: ignore mostly-vertical gestures (scroll)
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
    const next = dx > 0 ? Math.min(dx, 90) : 0;
    offsetRef.current = next;
    setSwipeOffset(next);
  };

  const handlePointerEnd = () => {
    if (!isSwipingRef.current || isSelectionMode) return;
    isSwipingRef.current = false;
    if (offsetRef.current >= 60) {
      onTogglePin();
    }
    offsetRef.current = 0;
    setSwipeOffset(0);
  };

  const handlePointerCancel = () => {
    isSwipingRef.current = false;
    offsetRef.current = 0;
    setSwipeOffset(0);
  };

  // A9: never crash on malformed persisted data
  const bodyText = typeof note.body === 'string' ? note.body : '';
  const snippet = bodyText.trim()
    ? bodyText.trim().slice(0, 40)
    : note.checklist && note.checklist.length > 0
    ? `${note.checklist.length} itens na lista`
    : 'Nenhum texto adicional';

  const isLockedAndClosed = note.isLocked && !note.isUnlockedTemp;

  return (
    <div className="relative overflow-hidden bg-white select-none">
      {/* Background Action: Orange Pin Block revealed on Swipe Right (Tela 18) */}
      <div
        className="absolute inset-y-0 left-0 w-[80px] bg-[#FF9500] flex items-center justify-center cursor-pointer transition-all z-0"
        onClick={() => {
          onTogglePin();
          setSwipeOffset(0);
        }}
      >
        <div className="flex flex-col items-center justify-center text-white">
          <ApplePinIcon className="w-6 h-6 fill-white" />
        </div>
      </div>

      {/* Foreground Content Card with Transform */}
      <div
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onPointerMove={(e) => {
          if (e.buttons !== 0 && e.pointerType === 'mouse') {
            handlePointerMove(e.clientX, e.clientY);
          } else if (e.pointerType !== 'mouse') {
            handlePointerMove(e.clientX, e.clientY);
          }
        }}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          if (isSwipingRef.current) handlePointerCancel();
        }}
        onClick={() => {
          if (offsetRef.current > 10) return;
          if (isSelectionMode) {
            onSelect();
          } else {
            onOpen();
          }
        }}
        role="button"
        aria-label={`Abrir ${note.title || 'nota sem título'}`}
        className="relative z-10 bg-white px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-[#F2F2F7] transition-colors"
      >
        {/* Selection Circle in Selection Mode (Tela 06) */}
        {isSelectionMode && (
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'bg-[#D97706] border-[#D97706] text-white'
                : 'border-[#C7C7CC] bg-white'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        )}

        {/* Lock status icon */}
        {note.isLocked && (
          <div className="shrink-0">
            {isLockedAndClosed ? (
              <Lock className="w-4 h-4 text-[#D97706]" />
            ) : (
              <Unlock className="w-4 h-4 text-[#E49F13]" />
            )}
          </div>
        )}

        {/* Note info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[17px] font-semibold text-black truncate leading-snug">
              {note.title || 'Sem título'}
            </h3>
            {note.isPinned && (
              <span className="shrink-0">
                <ApplePinIcon className="w-3.5 h-3.5 fill-[#FF9500]" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[14px] text-[#8E8E93] truncate leading-tight mt-0.5">
            <span className="shrink-0 text-black/70 font-normal">
              {note.timeFormatted}
            </span>
            <span className="truncate">
              {isLockedAndClosed ? 'Nota Bloqueada' : snippet}
            </span>
            <span className="shrink-0 text-[12px] opacity-75">
              📁 {folderName}
            </span>
          </div>
        </div>
      </div>

      {/* iOS Inset Separator */}
      {!isLast && (
        <div
          className={`h-[1px] bg-[#E5E5EA] transition-all ${
            isSelectionMode ? 'ml-[48px]' : 'ml-[16px]'
          }`}
        />
      )}
    </div>
  );
};
