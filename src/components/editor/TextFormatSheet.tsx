import React from 'react';
import { BottomSheet } from '../common/BottomSheet';
import {
  List,
  ListOrdered,
  Indent,
  Outdent,
  Minus,
} from 'lucide-react';

export type TextHierarchy = 'title' | 'heading' | 'subheading' | 'body';

interface TextFormatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentHierarchy: TextHierarchy;
  onSelectHierarchy: (h: TextHierarchy) => void;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
  onInsertBulletList: () => void;
  onInsertDashList: () => void;
  onInsertNumberedList: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}

export const TextFormatSheet: React.FC<TextFormatSheetProps> = ({
  isOpen,
  onClose,
  currentHierarchy,
  onSelectHierarchy,
  isBold,
  isItalic,
  isUnderline,
  isStrikethrough,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrikethrough,
  onInsertBulletList,
  onInsertDashList,
  onInsertNumberedList,
  onIndent,
  onOutdent,
}) => {
  if (!isOpen) return null;

  return (
    <BottomSheet onClose={onClose} label="Formatar texto" panelClass="p-4">
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <span className="text-[17px] font-bold text-black">Formatar</span>
        </div>

        {/* Row 1: Hierarchy Selection */}
        <div className="bg-[#E5E5EA]/70 p-1 rounded-[12px] flex items-center mb-3">
          {(
            [
              { key: 'title', label: 'Título' },
              { key: 'heading', label: 'Cabeçalho' },
              { key: 'subheading', label: 'Subtítulo' },
              { key: 'body', label: 'Corpo' },
            ] as const
          ).map((item) => {
            const isActive = currentHierarchy === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectHierarchy(item.key)}
                className={`flex-1 py-2 text-center rounded-[8px] text-[15px] font-medium transition ${
                  isActive
                    ? 'bg-[#D97706] text-white shadow-xs font-semibold'
                    : 'text-black hover:bg-black/5 active:bg-black/10'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Row 2: Inline Styles (B, I, U, S) */}
        <div className="bg-[#E5E5EA]/70 p-1 rounded-[12px] flex items-center mb-3">
          <button
            type="button"
            onClick={onToggleBold}
            className={`flex-1 py-2 text-center rounded-[8px] text-[17px] font-bold transition ${
              isBold ? 'bg-[#D97706] text-white shadow-xs' : 'text-black'
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={onToggleItalic}
            className={`flex-1 py-2 text-center rounded-[8px] text-[17px] italic font-serif transition ${
              isItalic ? 'bg-[#D97706] text-white shadow-xs' : 'text-black'
            }`}
          >
            I
          </button>
          <button
            type="button"
            onClick={onToggleUnderline}
            className={`flex-1 py-2 text-center rounded-[8px] text-[17px] underline font-medium transition ${
              isUnderline ? 'bg-[#D97706] text-white shadow-xs' : 'text-black'
            }`}
          >
            U
          </button>
          <button
            type="button"
            onClick={onToggleStrikethrough}
            className={`flex-1 py-2 text-center rounded-[8px] text-[17px] line-through font-medium transition ${
              isStrikethrough ? 'bg-[#D97706] text-white shadow-xs' : 'text-black'
            }`}
          >
            S
          </button>
        </div>

        {/* Row 3: Lists and Indents */}
        <div className="bg-[#E5E5EA]/70 p-1 rounded-[12px] flex items-center">
          <button
            type="button"
            onClick={onInsertBulletList}
            className="flex-1 py-2 flex items-center justify-center rounded-[8px] text-black hover:bg-black/5 transition"
            title="Lista com Marcadores"
          >
            <List className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onInsertDashList}
            className="flex-1 py-2 flex items-center justify-center rounded-[8px] text-black hover:bg-black/5 transition"
            title="Lista com Travessão"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={onInsertNumberedList}
            className="flex-1 py-2 flex items-center justify-center rounded-[8px] text-black hover:bg-black/5 transition"
            title="Lista Numerada"
          >
            <ListOrdered className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOutdent}
            className="flex-1 py-2 flex items-center justify-center rounded-[8px] text-black hover:bg-black/5 transition"
            title="Diminuir Recuo"
          >
            <Outdent className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onIndent}
            className="flex-1 py-2 flex items-center justify-center rounded-[8px] text-black hover:bg-black/5 transition"
            title="Aumentar Recuo"
          >
            <Indent className="w-5 h-5" />
          </button>
        </div>
    </BottomSheet>
  );
};
