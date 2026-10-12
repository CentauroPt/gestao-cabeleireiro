import React, { useState } from 'react';
import type { Client } from '../../types';
import { useApp } from '../../context/AppContext';
import { InactivityBadge } from '../common/InactivityBadge';
import { getClientInactivityAnalysis, generateReactivationWhatsAppUrl } from '../../services/inactivityService';
import { X, Phone, Mail, Calendar, MessageCircle, FileText, UserCheck, Plus, Check } from 'lucide-react';

interface Props {
  client: Client;
  onClose: () => void;
  onBookAppointment: (client: Client) => void;
}

export const ClientDetailModal: React.FC<Props> = ({ client, onClose, onBookAppointment }) => {
  const { users, currentSalon, updateClient } = useApp();
  const [technicalNotes, setTechnicalNotes] = useState(client.technicalNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  const preferredUser = users.find((u) => u.id === client.preferredUserId);
  const analysis = getClientInactivityAnalysis(client);
  const whatsappUrl = generateReactivationWhatsAppUrl(client, currentSalon?.name || 'Salão');

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await updateClient(client.id, { technicalNotes });
    setIsSavingNotes(false);
    setNotesSavedSuccess(true);
    setTimeout(() => setNotesSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
              <InactivityBadge client={client} />
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {client.email}
                </span>
              )}
              {preferredUser && (
                <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  <UserCheck className="w-3.5 h-3.5" />
                  Profissional Habitual: {preferredUser.name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Banner de Inatividade / Reativação se for caso disso */}
          {analysis.status === 'INATIVO' && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-rose-800">Alerta de Inatividade</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Este cliente não visita o salão há mais de {analysis.daysSinceLastVisit} dias. Envie uma mensagem
                  direta para reativar!
                </p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          )}

          {/* Resumo de Visitas */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total de Visitas Realizadas</span>
            <p className="text-lg font-bold text-slate-900">{client.visitHistory.length}</p>
          </div>

          {/* Ficha Técnica / Fórmulas e Notas de Cabelo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                Ficha Técnica & Fórmulas Capilares
              </label>
              {notesSavedSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ficha gravada!
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Ex: Fórmulas de coloração (marca, tom, oxidante), cortes preferidos, alergias, sensibilidade no couro cabeludo..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-slate-50/50"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                {isSavingNotes ? 'A gravar...' : 'Gravar Notas Técnicas'}
              </button>
            </div>
          </div>

          {/* Histórico Completo de Visitas & Serviços */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              Histórico de Visitas e Serviços ({client.visitHistory.length})
            </h3>

            {client.visitHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic bg-slate-50 rounded-xl">
                Ainda não há visitas concluídas registadas para este cliente.
              </p>
            ) : (
              <div className="space-y-2.5">
                {client.visitHistory.map((item) => {
                  const visitDate = new Date(item.date).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {visitDate}
                        </span>
                      </div>

                      <div className="mt-2 text-xs">
                        <div className="text-slate-700 font-medium">
                          <span className="text-slate-400">Serviços:</span> {item.servicesDone.join(', ')}
                        </div>
                        <div className="text-slate-500 mt-1 flex items-center gap-2">
                          <span>
                            <span className="text-slate-400">Atendido por:</span> {item.professionalName}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="mt-1.5 text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações Rápidas */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            Fechar
          </button>
          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              Contactar
            </a>
            <button
              onClick={() => {
                onClose();
                onBookAppointment(client);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Reserva para Este Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
