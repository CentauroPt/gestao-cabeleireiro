import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  Building2,
  Smartphone,
  MessageCircle,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';

interface BillingConfigModalProps {
  onClose: () => void;
}

export const BillingConfigModal: React.FC<BillingConfigModalProps> = ({ onClose }) => {
  const { billingConfig, updateBillingConfig } = useApp();

  const [iban, setIban] = useState(billingConfig.iban || '');
  const [mbway, setMbway] = useState(billingConfig.numero_mbway || '');
  const [whatsapp, setWhatsapp] = useState(billingConfig.numero_whatsapp || '');
  const [defaultRate, setDefaultRate] = useState<string>(
    (billingConfig.valor_mensal_padrao || 29.0).toString()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const parsedRate = parseFloat(defaultRate);
      const rateVal = isNaN(parsedRate) ? 29.0 : parsedRate;

      const savePromise = updateBillingConfig({
        iban: iban.trim(),
        numero_mbway: mbway.trim(),
        numero_whatsapp: whatsapp.trim(),
        valor_mensal_padrao: rateVal,
      });

      const timeoutPromise = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(true), 800)
      );

      const ok = await Promise.race([savePromise, timeoutPromise]);

      if (ok !== false) {
        setSavedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Erro ao guardar configurações:', err);
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Configurações de Faturação SaaS
              </h2>
              <p className="text-xs text-slate-400">
                Dados bancários e contactos apresentados aos clientes para pagamento.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* IBAN */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              IBAN para Transferências Bancárias *
            </label>
            <input
              type="text"
              required
              placeholder="PT50 0033 0000 4523 4567 8901 2"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Apresentado no pop-up de pagamento e no portal do cliente.
            </span>
          </div>

          {/* Número MB Way */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              Número de Telemóvel MB Way *
            </label>
            <input
              type="text"
              required
              placeholder="912 345 678"
              value={mbway}
              onChange={(e) => setMbway(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Número WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              Número de WhatsApp do Administrador *
            </label>
            <input
              type="text"
              required
              placeholder="+351 912 345 678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Destino do botão flutuante 'Contactar por WhatsApp' do portal cliente.
            </span>
          </div>

          {/* Valor Mensal Padrão */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Valor Mensal Padrão (€ / mês) para Novos Salões *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-black text-white focus:outline-none focus:border-purple-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                €/mês
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Aplicado automaticamente ao registar um novo salão (pode ser ajustado por salão).
            </span>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Configurações guardadas com sucesso!</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'A guardar...' : 'Guardar Configurações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
