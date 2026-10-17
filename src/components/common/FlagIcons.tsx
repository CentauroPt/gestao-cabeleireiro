import React from 'react';
import type { CountryCode } from '../../types';

interface FlagProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-5 h-3.5',
  md: 'w-7 h-5',
  lg: 'w-9 h-6',
  xl: 'w-12 h-8',
};

/**
 * Bandeira Oficial de Espanha 🇪🇸 em SVG Vetorial Nítido
 */
export const SpainFlag: React.FC<FlagProps> = ({ className = '', size = 'md' }) => {
  const sz = sizeClasses[size] || sizeClasses.md;
  return (
    <svg
      viewBox="0 0 750 500"
      className={`${sz} rounded-xs shadow-xs object-cover overflow-hidden inline-block shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira de Espanha"
    >
      <rect width="750" height="500" fill="#AA151B" />
      <rect y="125" width="750" height="250" fill="#F1BF00" />
      <g transform="translate(180, 250) scale(1.1)">
        {/* Brasão estilizado de Espanha */}
        <path
          d="M-30,-45 L30,-45 L30,10 Q30,45 0,55 Q-30,45 -30,10 Z"
          fill="#AA151B"
          stroke="#F1BF00"
          strokeWidth="4"
        />
        <path
          d="M-22,-38 L22,-38 L22,8 Q22,38 0,46 Q-22,38 -22,8 Z"
          fill="#FFFFFF"
        />
        {/* Coroa Real */}
        <path
          d="M-32,-48 L-38,-65 L-16,-55 L0,-70 L16,-55 L38,-65 L32,-48 Z"
          fill="#F1BF00"
          stroke="#AA151B"
          strokeWidth="3"
        />
        <circle cx="0" cy="-68" r="4" fill="#AA151B" />
        <circle cx="-36" cy="-63" r="3" fill="#AA151B" />
        <circle cx="36" cy="-63" r="3" fill="#AA151B" />
        {/* Detalhe interior do escudo */}
        <line x1="0" y1="-38" x2="0" y2="46" stroke="#AA151B" strokeWidth="3" />
        <line x1="-22" y1="4" x2="22" y2="4" stroke="#AA151B" strokeWidth="3" />
      </g>
    </svg>
  );
};

/**
 * Bandeira Oficial de Portugal 🇵🇹 em SVG Vetorial Nítido
 */
export const PortugalFlag: React.FC<FlagProps> = ({ className = '', size = 'md' }) => {
  const sz = sizeClasses[size] || sizeClasses.md;
  return (
    <svg
      viewBox="0 0 600 400"
      className={`${sz} rounded-xs shadow-xs object-cover overflow-hidden inline-block shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira de Portugal"
    >
      <rect width="600" height="400" fill="#FF0000" />
      <rect width="240" height="400" fill="#006600" />
      <g transform="translate(240, 200)">
        {/* Esfera Armilar Amarela/Dourada */}
        <circle r="80" fill="none" stroke="#FFCC00" strokeWidth="12" />
        <circle r="55" fill="none" stroke="#FFCC00" strokeWidth="6" />
        <line x1="-80" y1="0" x2="80" y2="0" stroke="#FFCC00" strokeWidth="8" />
        <line x1="0" y1="-80" x2="0" y2="80" stroke="#FFCC00" strokeWidth="8" />
        <ellipse cx="0" cy="0" rx="40" ry="76" fill="none" stroke="#FFCC00" strokeWidth="6" />
        {/* Escudo Português */}
        <path
          d="M-36,-44 L36,-44 L36,15 Q36,52 0,62 Q-36,52 -36,15 Z"
          fill="#FFFFFF"
          stroke="#FF0000"
          strokeWidth="12"
        />
        {/* Quinas Azuis */}
        <g fill="#003399">
          <circle cx="0" cy="-22" r="5" />
          <circle cx="0" cy="0" r="5" />
          <circle cx="0" cy="22" r="5" />
          <circle cx="-16" cy="0" r="5" />
          <circle cx="16" cy="0" r="5" />
        </g>
      </g>
    </svg>
  );
};

interface CountrySelectorProps {
  selectedCountry: CountryCode | null;
  onSelectCountry: (country: CountryCode) => void;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  requireExplicitSelection?: boolean;
}

/**
 * Seletor de País / Idioma oficial na ordem estrita solicitada:
 * 1º Espanha 🇪🇸
 * 2º Portugal 🇵🇹
 */
export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  showLabels = true,
  size = 'md',
  requireExplicitSelection = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="inline-flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
        {/* 1. ESPANHA (PRIMEIRO OBRIGATORIAMENTE) */}
        <button
          type="button"
          onClick={() => onSelectCountry('ES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            selectedCountry === 'ES'
              ? 'bg-white text-slate-900 shadow-md ring-2 ring-purple-600 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
          title="España / Español"
        >
          <SpainFlag size={size} />
          {showLabels && <span>España</span>}
        </button>

        {/* 2. PORTUGAL (SEGUNDO) */}
        <button
          type="button"
          onClick={() => onSelectCountry('PT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            selectedCountry === 'PT'
              ? 'bg-white text-slate-900 shadow-md ring-2 ring-purple-600 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
          title="Portugal / Português"
        >
          <PortugalFlag size={size} />
          {showLabels && <span>Portugal</span>}
        </button>
      </div>

      {requireExplicitSelection && (
        <span className="text-[11px] font-semibold text-slate-500 tracking-tight">
          Elija un idioma / Escolha um idioma
        </span>
      )}
    </div>
  );
};
