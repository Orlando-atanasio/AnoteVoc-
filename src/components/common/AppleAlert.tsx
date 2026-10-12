import React from 'react';

interface AppleAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AppleAlert: React.FC<AppleAlertProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-6 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-[270px] bg-white/95 backdrop-blur-2xl rounded-[14px] overflow-hidden text-center shadow-2xl border border-black/5 animate-in zoom-in-95 duration-150">
        {/* Title and Message */}
        <div className="pt-5 px-4 pb-4">
          <h3 className="text-[17px] font-bold text-black leading-snug mb-1">
            {title}
          </h3>
          <p className="text-[13px] text-[#3c3c43]/80 leading-relaxed font-normal">
            {message}
          </p>
        </div>

        {/* Buttons divided by thin hairline borders */}
        <div className="border-t border-[#E5E5EA] flex flex-col">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full h-[44px] text-[17px] font-semibold text-[#D97706] hover:bg-black/5 active:bg-black/10 transition border-b border-[#E5E5EA]"
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
