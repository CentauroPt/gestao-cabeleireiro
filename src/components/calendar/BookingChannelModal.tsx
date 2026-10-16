import React from 'react';
import type { BookingChannel } from '../../types';
import {
  UserCheck,
  PhoneCall,
  MessageCircle,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onSelectChannel: (channel: BookingChannel) => void;
  onClose: () => void;
}

export const BookingChannelModal: React.FC<Props> = ({
  isOpen,
  onSelectChannel,
  onClose,
}) => {
  if (!isOpen) return null;

  const channels: {
    id: BookingChannel;
    label: string;
    description: string;
    badge: string;
    icon: React.ReactNode;
    colorClasses: string;
    badgeClasses: string;
  }[] = [
    {
      id: 'presencial',
      label: 'Presencial',
      description: 'Cliente presente diretamente ao balcão ou no salão.',
      badge: 'Balcão / Salão',
      icon: <UserCheck className="w-6 h-6 text-purple-600" />,
      colorClasses: 'border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 group',
      badgeClasses: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      id: 'telefone',
      label: 'Chamada telefónica',
      description: 'Marcação solicitada através de chamada telefónica de voz.',
      badge: 'Chamada de Voz',
      icon: <PhoneCall className="w-6 h-6 text-blue-600" />,
      colorClasses: 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 group',
      badgeClasses: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      description: 'Marcação recebida através de mensagem pelo WhatsApp.',
      badge: 'Mensagem Direta',
      icon: <MessageCircle className="w-6 h-6 text-emerald-600" />,
      colorClasses: 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 group',
      badgeClasses: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                Novo Agendamento
              </span>
              <h3 className="text-lg font-black mt-0.5">Tipo de Reserva</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cancelar e fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com a lista de escolha */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecione por onde foi solicitada esta reserva. Estes dados alimentam a{' '}
            <strong className="text-purple-700">Estatistica de reservas</strong> para saber por onde entram mais clientes:
          </p>

          <div className="space-y-3">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${ch.colorClasses} active:scale-[0.99] shadow-xs hover:shadow-md`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 group-hover:scale-105 transition-transform">
                    {ch.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 group-hover:text-purple-900">
                        {ch.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ch.badgeClasses}`}>
                        {ch.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{ch.description}</p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0 ml-2">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Escolha uma das 3 opções para prosseguir</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold px-3 py-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
