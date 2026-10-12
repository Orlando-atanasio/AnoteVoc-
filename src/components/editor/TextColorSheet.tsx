import React from 'react';
import { BottomSheet } from '../common/BottomSheet';

export type ColorScope = 'selection' | 'all';

interface TextColorSheetProps {
  isOpen: boolean;
  scope: ColorScope;
  onScopeChange: (s: ColorScope) => void;
  hint: string;
  onPick: (kind: 'color' | 'bg', value: string) => void;
  onClear: () => void;
  pageColor?: string;
  onPickPage: (hex: string | null) => void;
  onClose: () => void;
}

export const TEXT_COLORS = [
  { hex: '#000000', name: 'Preto' },
  { hex: '#8E8E93', name: 'Cinza' },
  { hex: '#2563EB', name: 'Azul' },
  { hex: '#DC2626', name: 'Vermelho' },
  { hex: '#16A34A', name: 'Verde' },
  { hex: '#D97706', name: 'Laranja' },
  { hex: '#7C3AED', name: 'Roxo' },
  { hex: '#EAB308', name: 'Amarelo' },
];

export const HIGHLIGHT_COLORS = [
  { hex: '#FEF08A', name: 'Amarelo' },
  { hex: '#BBF7D0', name: 'Verde' },
  { hex: '#FBCFE8', name: 'Rosa' },
  { hex: '#BFDBFE', name: 'Azul' },
  { hex: '#FED7AA', name: 'Laranja' },
  { hex: '#E9D5FF', name: 'Roxo' },
];

export const PAGE_COLORS = [
  { hex: '#FACC15', name: 'Amarelo' },
  { hex: '#4ADE80', name: 'Verde' },
  { hex: '#F9A8D4', name: 'Rosa' },
  { hex: '#60A5FA', name: 'Azul' },
  { hex: '#FB923C', name: 'Laranja' },
  { hex: '#C084FC', name: 'Roxo' },
];

export const TextColorSheet: React.FC<TextColorSheetProps> = ({
  isOpen,
  scope,
  onScopeChange,
  hint,
  onPick,
  onClear,
  pageColor,
  onPickPage,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <BottomSheet onClose={onClose} label="Cor do texto" panelClass="px-3 pb-3 max-h-[60%]">
        <div className="flex items-center justify-center mb-2">
          <span className="text-[16px] font-bold text-black">Cor do texto</span>
        </div>

        {/* Scope: part or whole text */}
        <div className="bg-[#E5E5EA]/70 p-0.5 rounded-[10px] flex items-center mb-2">
          {(
            [
              { key: 'selection', label: 'Trecho' },
              { key: 'all', label: 'Texto todo' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onScopeChange(item.key)}
              className={`flex-1 py-1 rounded-[8px] text-[14px] transition ${
                scope === item.key
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-[#8E8E93] font-normal'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-[12px] font-semibold text-[#8E8E93] mb-1">
          Letra
        </div>
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={`Escrever em ${c.name}`}
              onClick={() => onPick('color', c.hex)}
              className="w-7 h-7 rounded-full border-2 border-white shadow-md active:scale-90 transition flex items-center justify-center"
              style={{ backgroundColor: c.hex }}
            >
              <span className="text-[14px] font-bold" style={{ color: c.hex === '#000000' ? '#fff' : '#000' }}>
                A
              </span>
            </button>
          ))}
        </div>

        <div className="text-[12px] font-semibold text-[#8E8E93] mb-1">
          Marca-texto
        </div>
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={`Grifar de ${c.name}`}
              onClick={() => onPick('bg', c.hex)}
              className="h-8 px-2.5 rounded-[9px] border border-black/10 shadow-xs active:scale-95 transition flex items-center"
              style={{ backgroundColor: c.hex }}
            >
              <span className="text-[14px] font-bold text-black">Ab</span>
            </button>
          ))}
        </div>

        <div className="text-[12px] font-semibold text-[#8E8E93] mb-1">
          Página
        </div>
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <button
            type="button"
            title="Branco"
            aria-label="Página branca"
            onClick={() => onPickPage(null)}
            className={`h-8 px-2.5 rounded-[9px] border shadow-xs active:scale-95 transition flex items-center bg-white ${
              !pageColor ? 'border-[#D97706] border-2' : 'border-black/10'
            }`}
          >
            <span className="text-[14px] font-bold text-black">Ab</span>
          </button>
          {PAGE_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={`Página ${c.name}`}
              onClick={() => onPickPage(c.hex)}
              className={`w-7 h-7 rounded-full border-2 shadow-md active:scale-90 transition ${
                pageColor === c.hex ? 'border-black' : 'border-white'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        {hint && (
          <p className="text-[12px] text-[#D97706] text-center mb-1.5">{hint}</p>
        )}

        <button
          type="button"
          onClick={onClear}
          className="w-full h-[40px] bg-white border border-[#E5E5EA] rounded-[10px] text-[15px] font-medium text-[#FF3B30] active:bg-black/5 transition"
        >
          {scope === 'all' ? 'Limpar cores do texto todo' : 'Limpar cores da seleção'}
        </button>
    </BottomSheet>
  );
};
