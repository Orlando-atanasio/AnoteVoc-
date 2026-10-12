import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, isSmart: boolean) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({ isOpen, onClose, onSave }) => {
  // Forms always open clean — placeholder guides, no pre-filled text to erase
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (!isOpen) setFolderName('');
  }, [isOpen ]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (folderName.trim()) {
      // M9/A10: smart folders removed until filter rules really exist
      onSave(folderName.trim(), false);
      setFolderName('');
      onClose();
    }
  };

  return (
    <BottomSheet onClose={onClose} label="Nova pasta" panelClass="max-h-[85%]">
      <div className="flex flex-col">
        {/* Navigation Bar */}
        <div className="h-[52px] px-4 flex items-center justify-between border-b border-[#E5E5EA] bg-white">
          <button
            onClick={onClose}
            className="text-[17px] text-[#D97706] hover:opacity-80 active:opacity-60 transition"
          >
            Cancelar
          </button>
          <span className="text-[17px] font-bold text-black">Nova Pasta</span>
          <button
            onClick={handleSave}
            disabled={!folderName.trim()}
            className="text-[17px] font-semibold text-[#D97706] disabled:opacity-40 hover:opacity-80 active:opacity-60 transition"
          >
            OK
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Text Input Group */}
          <div className="bg-white rounded-[12px] p-2.5 flex items-center shadow-xs border border-[#E5E5EA]">
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nome da Pasta"
              aria-label="Nome da pasta"
              className="w-full text-[17px] text-black outline-hidden bg-transparent"
            />
            {folderName.length > 0 && (
              <button
                type="button"
                onClick={() => setFolderName('')}
                aria-label="Limpar nome"
                className="w-5 h-5 rounded-full bg-[#8E8E93] text-white flex items-center justify-center shrink-0 hover:opacity-80"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
