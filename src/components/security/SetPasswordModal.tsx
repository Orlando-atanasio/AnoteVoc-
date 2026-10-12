import React, { useState, useEffect } from 'react';
import { BottomSheet } from '../common/BottomSheet';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePassword: (password: string, hint: string) => void;
}

const MIN_LENGTH = 6;

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSavePassword,
}) => {
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');

  // M10: never reopen with another note's leftover state
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setVerifyPassword('');
      setHint('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!password) {
      setError('A senha é obrigatória.');
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(`Use pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== verifyPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    onSavePassword(password, hint.trim());
    setPassword('');
    setVerifyPassword('');
    setHint('');
    setError('');
    onClose();
  };

  const isFormValid =
    password.length >= MIN_LENGTH && password === verifyPassword;

  return (
    <BottomSheet onClose={onClose} label="Definir senha da nota" panelClass="max-h-[85%]">
      <div className="flex flex-col">
        {/* Navigation Bar */}
        <div className="h-[52px] px-4 flex items-center justify-between border-b border-[#E5E5EA] bg-white sticky top-0">
          <button
            onClick={onClose}
            className="text-[17px] text-[#D97706] hover:opacity-80 transition"
          >
            Cancelar
          </button>
          <span className="text-[17px] font-semibold text-black">Definir Senha</span>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="text-[17px] font-semibold text-[#D97706] disabled:opacity-40 hover:opacity-80 transition"
          >
            OK
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-[13px] text-[#8E8E93] text-center px-4">
            Crie uma senha para esta nota. Ela será pedida sempre que a nota
            estiver bloqueada.
          </p>

          {error && (
            <p className="text-[13px] text-[#FF3B30] text-center">{error}</p>
          )}

          {/* Grouped Form Fields */}
          <div className="bg-white rounded-[12px] overflow-hidden border border-[#E5E5EA] divide-y divide-[#E5E5EA]">
            <div className="flex items-center px-4 py-3">
              <span className="w-[100px] text-[17px] text-black font-normal">Senha</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Mín. ${MIN_LENGTH} caracteres`}
                aria-label="Senha"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>

            <div className="flex items-center px-4 py-3">
              <span className="w-[100px] text-[17px] text-black font-normal">Verificar</span>
              <input
                type="password"
                autoComplete="new-password"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                placeholder="Repita a senha"
                aria-label="Verificar senha"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>

            <div className="flex items-center px-4 py-3">
              <span className="w-[100px] text-[17px] text-black font-normal">Dica</span>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Recomendado"
                aria-label="Dica da senha"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
