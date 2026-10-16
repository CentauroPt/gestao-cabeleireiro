import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageCircle, X } from 'lucide-react';

export const WhatsAppFloatingButton: React.FC = () => {
  const { billingConfig } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);

  // Mensagem automática solicitada nos requisitos:
  // "Agradeço o seu contacto. Dentro de momentos respondo. Se preferir, deixe um contacto e eu retribuo a chamada."
  const defaultMessage =
    'Agradeço o seu contacto. Dentro de momentos respondo. Se preferir, deixe um contacto e eu retribuo a chamada.';

  const rawPhone = billingConfig?.numero_whatsapp || '+351 912 345 678';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const handleOpenWhatsApp = () => {
    const encodedText = encodeURIComponent(defaultMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 group print:hidden">
      {/* Tooltip / Balão informativo */}
      {showTooltip && (
        <div className="bg-slate-900 text-white text-xs py-2 px-3.5 rounded-2xl shadow-xl border border-slate-700/80 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-start gap-2">
          <div className="flex-1">
            <p className="font-bold text-emerald-400">Apoio & Suporte ao Cliente</p>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">
              Clique para falar diretamente connosco pelo WhatsApp.
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-white p-0.5"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Botão Flutuante */}
      <button
        onClick={handleOpenWhatsApp}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
        title="Contactar por WhatsApp"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="text-xs sm:text-sm font-semibold tracking-wide">
          Contactar por WhatsApp
        </span>
      </button>
    </div>
  );
};
