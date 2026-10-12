import React from 'react';
import brandLogo from '../../assets/brand-logo.png';

interface AppLogoProps {
  size?: number;
  showWordmark?: boolean;
  /** Opacity of the mark + wordmark (kept subtle as watermark). */
  markOpacity?: number;
  /** Independent opacity of the tagline so it stays legible. */
  taglineOpacity?: number;
}

const GREEN = '#1E3A2B';

// Brand mark: the real artwork (transparent PNG) + "AnoteVocê" wordmark.
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 220,
  showWordmark = true,
  markOpacity = 1,
  taglineOpacity = 1,
}) => {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      <div style={{ opacity: markOpacity }} className="flex flex-col items-center">
        <img
          src={brandLogo}
          alt=""
          draggable={false}
          width={size}
          height={size}
          className="object-contain pointer-events-none"
        />
        {showWordmark && (
          <div
            className="font-serif font-bold tracking-tight"
            style={{ fontSize: size * 0.16, color: GREEN }}
          >
            AnoteVocê
          </div>
        )}
      </div>
      {showWordmark && (
        <div
          className="font-serif tracking-[0.35em]"
          style={{ fontSize: size * 0.055, color: '#8A6248', opacity: taglineOpacity }}
        >
          SUAS NOTAS
        </div>
      )}
    </div>
  );
};
