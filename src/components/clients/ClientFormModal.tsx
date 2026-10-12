import React, { useState } from 'react';
import type { Client } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, User, UserPlus, Phone, Mail, UserCheck, FileText } from 'lucide-react';

interface Props {
  initialClient?: Client | null;
  onClose: () => void;
  onSuccess: (createdClientName?: string) => void;
}

export const ClientFormModal: React.FC<Props> = ({ initialClient, onClose, onSuccess }) => {
  const { users, addClient, updateClient } = useApp();

  const [name, setName] = useState(initialClient?.name || '');
  const [phone, setPhone] = useState(initialClient?.phone || '');
  const [email, setEmail] = useState(initialClient?.email || '');
  const [preferredUserId, setPreferredUserId] = useState(initialClient?.preferredUserId || '');
  const [technicalNotes, setTechnicalNotes] = useState(initialClient?.technicalNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do cliente é obrigatório.');
      return;
    }
    if (!phone.trim()) {
      setError('O número de telefone é obrigatório para notificações e contacto.');
      return;
    }

    setIsSubmitting(true);

    let success = false;
    if (initialClient) {
      success = await updateClient(initialClient.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredUserId: preferredUserId || undefined,
        technicalNotes: technicalNotes.trim() || undefined,
      });
    } else {
      success = await addClient({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredUserId: preferredUserId || undefined,
        technicalNotes: technicalNotes.trim() || undefined,
      });
    }

    setIsSubmitting(false);

    if (success) {
      onSuccess(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {initialClient ? (
              <User className="w-5 h-5 text-purple-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-purple-600" />
            )}
            {initialClient ? 'Editar Ficha de Cliente' : 'Registar Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria João Pires"
                className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telemóvel / WhatsApp *</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +351 912 345 678"
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (opcional)</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Associação a Profissional Habitual */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-600" />
              Profissional de Referência / Habitual
            </label>
            <select
              value={preferredUserId}
              onChange={(e) => setPreferredUserId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white cursor-pointer"
            >
              <option value="">Sem profissional fixo (Atendimento geral)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.specialties.join(', ') || u.role}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Permite associar o cliente diretamente ao seu cabeleireiro preferido da equipa.
            </p>
          </div>

          {/* Ficha Técnica / Fórmulas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              Notas Técnicas Iniciais & Fórmulas de Coloração
            </label>
            <textarea
              rows={3}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Ex: Fórmula habitual, histórico capilar, produtos preferidos ou alergias..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-slate-50/50"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer transition-all"
            >
              {isSubmitting ? 'A guardar...' : initialClient ? 'Guardar Alterações' : 'Registar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
