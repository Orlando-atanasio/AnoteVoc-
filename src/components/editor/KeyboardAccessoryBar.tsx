import React from 'react';
import { ApplePencilMarkupIcon } from '../icons/AppleIcons';
import { Table, CheckCircle2, Camera, X, Plus } from 'lucide-react';

interface KeyboardAccessoryBarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onInsertTable: () => void;
  onOpenFormatting: () => void;
  onInsertChecklist: () => void;
  onOpenScanner: () => void;
  onOpenDrawing: () => void;
}

export const KeyboardAccessoryBar: React.FC<KeyboardAccessoryBarProps> = ({
  isExpanded,
  onToggleExpand,
  onInsertTable,
  onOpenFormatting,
  onInsertChecklist,
  onOpenScanner,
  onOpenDrawing,
}) => {
  if (!isExpanded) {
    // Collapsed: Floating circular '+' button (Tela 20)
    return (
      <div className="h-[44px] px-4 flex items-center justify-end bg-transparent select-none">
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-9 h-9 rounded-full bg-[#8E8E93]/80 text-white flex items-center justify-center shadow-md active:scale-95 transition"
          title="Expandir ferramentas"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  // Expanded toolbar (Tela 13)
  return (
    <div className="h-[44px] bg-[#D4D7DE]/90 backdrop-blur-xl border-t border-[#C7C7CC] px-3 flex items-center justify-between select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* 1. Table */}
      <button
        type="button"
        onClick={onInsertTable}
        className="p-1 text-black/80 hover:text-black active:scale-90 transition"
        title="Tabela"
      >
        <Table className="w-6 h-6" />
      </button>

      {/* 2. Text Format (Aa) */}
      <button
        type="button"
        onClick={onOpenFormatting}
        className="p-1 text-black/80 hover:text-black font-serif text-[18px] font-semibold tracking-tight active:scale-90 transition"
        title="Formatação"
      >
        Aa
      </button>

      {/* 3. Checklist */}
      <button
        type="button"
        onClick={onInsertChecklist}
        className="p-1 text-black/80 hover:text-black active:scale-90 transition"
        title="Checklist"
      >
        <CheckCircle2 className="w-6 h-6" />
      </button>

      {/* 4. Camera / Scanner */}
      <button
        type="button"
        onClick={onOpenScanner}
        className="p-1 text-black/80 hover:text-black active:scale-90 transition"
        title="Câmera e Scanner"
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* 5. Text color / marker */}
      <button
        type="button"
        onClick={onOpenDrawing}
        className="p-1 text-black/80 hover:text-black active:scale-90 transition"
        title="Cor do texto e marca-texto"
        aria-label="Cor do texto e marca-texto"
      >
        <ApplePencilMarkupIcon className="w-6 h-6" />
      </button>

      {/* 6. Dismiss / Collapse */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="p-1 text-black/50 hover:text-black active:scale-90 transition"
        title="Ocultar barra"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};
