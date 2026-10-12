import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface PasscodePromptModalProps {
  isOpen: boolean;
  noteTitle: string;
  hint?: string;
  hasError?: boolean;
  attempts?: number;
  onClose: () => void;
  onUnlock: (password: string) => boolean | Promise<boolean>;
}

export const PasscodePromptModal: React.FC<PasscodePromptModalProps> = ({
  isOpen,
  noteTitle,
  hint,
  hasError,
  attempts = 0,
  onClose,
  onUnlock,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  // M10: state resets every time the modal opens for another note
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setBusy(false);
    }
  }, [isOpen, noteTitle]);

  useEffect(() => {
    if (hasError) setError(true);
  }, [hasError, attempts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    try {
      const success = await onUnlock(password);
      if (success) {
        setPassword('');
        setError(false);
        onClose();
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Desbloquear nota ${noteTitle}`}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-6 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[280px] bg-white/95 backdrop-blur-2xl rounded-[16px] overflow-hidden text-center shadow-2xl border border-black/5 p-5 animate-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-full bg-[#E49F13] text-white flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>

        <h3 className="text-[17px] font-bold text-black mb-1">
          {noteTitle}
        </h3>
        <p className="text-[13px] text-[#8E8E93] mb-4">
          Esta nota está protegida com senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Digite a senha"
            aria-label="Senha da nota"
            className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-[10px] px-3 py-2 text-center text-[16px] text-black outline-hidden focus:border-[#D97706]"
          />

          {hint && !error && (
            <p className="text-[12px] text-[#8E8E93]">Dica: {hint}</p>
          )}

          {error && (
            <p className="text-[12px] text-[#FF3B30]">Senha incorreta.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-[8px] bg-[#E5E5EA] text-black text-[15px] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !password}
              className="flex-1 py-2 rounded-[8px] bg-[#D97706] text-white text-[15px] font-semibold disabled:opacity-40"
            >
              {busy ? 'Verificando...' : 'Desbloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
