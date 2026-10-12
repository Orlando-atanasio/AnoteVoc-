import React, { useRef, useState } from 'react';

interface BottomSheetProps {
  onClose: () => void;
  label: string;
  panelClass?: string;
  children: React.ReactNode;
}

const DISMISS_DISTANCE = 90;

// Apple-style bottom sheet: grabber handle that dismisses on drag-down.
// The X/close buttons keep working as before.
export const BottomSheet: React.FC<BottomSheetProps> = ({
  onClose,
  label,
  panelClass = '',
  children,
}) => {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dy = Math.max(0, e.clientY - startYRef.current);
    const now = performance.now();
    const dt = now - lastTRef.current;
    if (dt > 0) {
      velocityRef.current = (e.clientY - lastYRef.current) / dt;
    }
    lastYRef.current = e.clientY;
    lastTRef.current = now;
    setDragY(dy);
  };

  const handlePointerEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > DISMISS_DISTANCE || velocityRef.current > 0.45) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-xs select-none overflow-hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.22s ease-out',
        }}
        className={`w-full bg-[#F2F2F7] rounded-t-[20px] shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-[#E5E5EA] overflow-y-auto ${panelClass}`}
      >
        {/* Grabber: drag down to dismiss */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
          aria-hidden
        >
          <div className="w-9 h-1 rounded-full bg-[#D1D1D6] mx-auto" />
        </div>
        {children}
      </div>
    </div>
  );
};
