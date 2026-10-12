import React, { useState } from 'react';
import { HomeIndicator } from './HomeIndicator';

interface IPhoneFrameProps {
  children: React.ReactNode;
  lightStatus?: boolean;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({ children, lightStatus = false }) => {
  const [isFramed, setIsFramed] = useState(true);

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-0 md:p-6 overflow-hidden select-none">
      {/* Top desktop switch for previewing framed vs full-bleed */}
      <aside aria-label="Controles de Visualização" className="hidden md:flex items-center gap-3 mb-4 text-xs text-neutral-400">
        <span>Visualização:</span>
        <button
          onClick={() => setIsFramed(true)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            isFramed ? 'bg-[#E49F13] text-black font-semibold' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          📱 Moldura Phone
        </button>
        <button
          onClick={() => setIsFramed(false)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            !isFramed ? 'bg-[#E49F13] text-black font-semibold' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          📱 Tela Cheia (App Nativo)
        </button>
      </aside>

      {/* Main Smartphone Body */}
      <main
        className={`relative flex flex-col overflow-hidden bg-[#F2F2F7] transition-all duration-300 ${
          isFramed
            ? 'w-full md:w-[390px] h-screen md:h-[844px] md:rounded-[50px] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_0_12px_#27272a,0_0_0_14px_#3f3f46]'
            : 'w-full max-w-[430px] h-screen shadow-2xl'
        }`}
      >
        {/* Status Bar removed as requested */}
        <header className="shrink-0 h-4">
        </header>

        {/* Content Viewport */}
        <section className="flex-1 relative flex flex-col overflow-hidden">
          {children}
        </section>

        {/* Home Indicator */}
        <footer className="shrink-0">
          <HomeIndicator light={lightStatus} />
        </footer>
      </main>
    </div>
  );
};
