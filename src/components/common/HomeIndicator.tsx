import React from 'react';

export const HomeIndicator: React.FC<{ light?: boolean }> = ({ light = false }) => {
  return (
    <div className="w-full h-[34px] flex items-center justify-center pointer-events-none z-50 select-none">
      <div
        className={`w-[134px] h-[5px] rounded-full mb-2 transition-colors duration-200 ${
          light ? 'bg-white/80' : 'bg-black/80'
        }`}
      />
    </div>
  );
};
