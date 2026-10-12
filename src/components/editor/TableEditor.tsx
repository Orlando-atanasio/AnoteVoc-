import React from 'react';
import type { TableData } from '../../types/notes';
import { Plus, Trash2 } from 'lucide-react';

interface TableEditorProps {
  table: TableData;
  onChange: (updated: TableData) => void;
  onRemove: () => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({ table, onChange, onRemove }) => {
  const handleHeaderChange = (index: number, val: string) => {
    const nextHeaders = [...table.headers];
    nextHeaders[index] = val;
    onChange({ ...table, headers: nextHeaders });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const nextRows = table.rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? val : cell)) : row
    );
    onChange({ ...table, rows: nextRows });
  };

  const addRow = () => {
    const newRow = new Array(table.headers.length).fill('');
    onChange({ ...table, rows: [...table.rows, newRow] });
  };

  const addColumn = () => {
    const nextHeaders = [...table.headers, `Coluna ${table.headers.length + 1}`];
    const nextRows = table.rows.map((row) => [...row, '']);
    onChange({ headers: nextHeaders, rows: nextRows });
  };

  return (
    <div className="my-3 border border-[#E5E5EA] rounded-[8px] overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F2F2F7]/60 border-b border-[#E5E5EA]">
              {table.headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="border-r border-[#E5E5EA] p-2 text-left text-[15px] font-semibold text-black min-w-[110px]"
                >
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                    placeholder={`Coluna ${colIndex + 1}`}
                    className="w-full bg-transparent outline-hidden font-semibold text-black"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-[#E5E5EA] last:border-b-0">
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="border-r border-[#E5E5EA] last:border-r-0 p-2 min-w-[110px]"
                  >
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      placeholder=""
                      className="w-full bg-transparent outline-hidden text-[15px] text-black"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Controls */}
      <div className="bg-[#F8F8F8] px-3 py-1.5 flex items-center justify-between text-xs text-[#8E8E93] border-t border-[#E5E5EA]">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 hover:text-black transition"
          >
            <Plus className="w-3.5 h-3.5" /> Linha
          </button>
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-1 hover:text-black transition"
          >
            <Plus className="w-3.5 h-3.5" /> Coluna
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[#FF3B30] hover:opacity-80 transition flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Excluir tabela
        </button>
      </div>
    </div>
  );
};
