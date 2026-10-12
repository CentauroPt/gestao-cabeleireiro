import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Store, User, Mail, Phone, MapPin, Shield } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const SalonRegisterModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { registerNewSalon } = useApp();

  const [salonName, setSalonName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!salonName.trim()) {
      setError('O nome do salão é obrigatório.');
      return;
    }
    if (!adminName.trim()) {
      setError('O nome do administrador/gerente é obrigatório.');
      return;
    }
    if (!adminEmail.trim()) {
      setError('O email do administrador é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    const success = await registerNewSalon({
      name: salonName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-600" />
              Registo de Novo Salão de Cabeleireiro
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ambiente 100% isolado e privado. Os seus dados não são visíveis para outros salões.
            </p>
          </div>
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

          {/* Dados do Salão */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Identificação do Salão
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Salão *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="Ex: Studio Glamour & Cor"
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto Telefónico</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 9..."
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Morada / Localidade</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Cidade"
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Administrador Responsável */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              2. Administrador / Gerente do Salão
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Administrador *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex: Maria Fernandes"
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email de Acesso *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="gerencia@salão.pt"
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-[11px] text-purple-800 leading-relaxed">
            🔒 <strong>Isolamento Garantido:</strong> Após o registo, o salão terá a sua própria equipa, clientes e serviços privados. Nenhum outro salão poderá ver a sua agenda ou informações.
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
              {isSubmitting ? 'A registar...' : 'Concluir Registo do Salão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
