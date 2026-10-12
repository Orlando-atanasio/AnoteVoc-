import React, { useState, useEffect } from 'react';

interface ApplePromptModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmText: string;
  cancelText: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const ApplePromptModal: React.FC<ApplePromptModalProps> = ({
  isOpen,
  title,
  placeholder = '',
  initialValue = '',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);

  // M4: sync the field every time the modal opens for another item.
  // (The component stays mounted; useState(initial) alone would go stale.)
  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-6 select-none"
    >
      <div className="w-full max-w-[300px] bg-white/95 backdrop-blur-2xl rounded-[14px] overflow-hidden text-center shadow-2xl border border-black/5">
        <div className="pt-5 px-4 pb-2">
          <h3 className="text-[17px] font-bold text-black leading-snug mb-1">
            {title}
          </h3>
        </div>

        <div className="px-4 pb-4">
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label={title}
            className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-[10px] px-3 py-2 text-center text-[15px] text-black outline-hidden focus:border-[#D97706]"
          />
        </div>

        <div className="border-t border-[#E5E5EA] flex flex-col">
          <button
            type="button"
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            className="w-full h-[44px] text-[17px] font-semibold text-[#D97706] hover:bg-black/5 active:bg-black/10 transition border-b border-[#E5E5EA] disabled:opacity-40"
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-[44px] text-[17px] font-normal text-[#D97706] hover:bg-black/5 active:bg-black/10 transition"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
