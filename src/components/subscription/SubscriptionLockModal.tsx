import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { PaymentMethod } from '../../types';
import {
  CreditCard,
  Building2,
  Smartphone,
  Copy,
  Check,
  Send,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { BankPaymentBlockedScreen } from './BankPaymentBlockedScreen';

interface SubscriptionLockModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  onPaymentSuccess?: () => void;
}

export const SubscriptionLockModal: React.FC<SubscriptionLockModalProps> = ({
  forceOpen = false,
  onClose,
  onPaymentSuccess,
}) => {
  const {
    isSubscriptionBlocked,
    subscriptionBlockReason,
    monthlyRate,
    billingConfig,
    currentSalon,
    hasPendingPayment,
    createSubscriptionPayment,
    refreshSubscriptionData,
  } = useApp();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [comprovativoRef, setComprovativoRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [unblockedSuccess, setUnblockedSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'bank_checkout' | 'manual_transfer'>('bank_checkout');

  const prevBlockedRef = useRef<boolean>(isSubscriptionBlocked);

  // Se não estiver bloqueado e não foi forçado a abrir, e não acabou de desbloquear, não renderiza
  const isOpen = forceOpen || isSubscriptionBlocked || unblockedSuccess;

  // Deteção reativa de desbloqueio automático (p. ex., programador validou pagamento na consola)
  useEffect(() => {
    if (prevBlockedRef.current && !isSubscriptionBlocked) {
      setUnblockedSuccess(true);
      const timer = setTimeout(() => {
        setUnblockedSuccess(false);
        if (onPaymentSuccess) onPaymentSuccess();
        if (onClose) onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
    prevBlockedRef.current = isSubscriptionBlocked;
  }, [isSubscriptionBlocked, onClose, onPaymentSuccess]);

  // Sincronização em tempo real com as alterações do programador (IBAN, MB Way, Mensalidade, Validação)
  useEffect(() => {
    if (!isOpen) return;

    const performSync = async () => {
      await refreshSubscriptionData();
      try {
        const remoteChanged = await api.syncWithRemote();
        if (remoteChanged) {
          await refreshSubscriptionData();
        }
      } catch {
        // Ignora erros de rede temporários
      }
    };

    // Sincronizar de imediato
    performSync();

    // Sincronizar sempre que a janela ou aba ganha foco
    const handleFocus = () => {
      performSync();
    };
    window.addEventListener('focus', handleFocus);

    // Polling local suave a cada 2.5 segundos para refletir alterações imediatas da consola
    const localPollId = setInterval(() => {
      refreshSubscriptionData();
    }, 2500);

    // Sincronização remota (Supabase) a cada 6 segundos
    const remotePollId = setInterval(() => {
      api.syncWithRemote().then((changed) => {
        if (changed) {
          refreshSubscriptionData();
        }
      }).catch(() => {});
    }, 6000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(localPollId);
      clearInterval(remotePollId);
    };
  }, [isOpen, refreshSubscriptionData]);

  if (!isOpen) return null;

  const currentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refreshSubscriptionData();
      await api.syncWithRemote();
      await refreshSubscriptionData();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 500);
    }
  };

  // Preço efetivo: Prioridade para o valor específico do salão configurado pelo programador,
  // ou valor mensal padrão das configurações de faturação, ou 29.00€
  const effectiveRate =
    currentSalon?.valor_mensal !== undefined
      ? Number(currentSalon.valor_mensal)
      : monthlyRate !== undefined
      ? monthlyRate
      : billingConfig?.valor_mensal_padrao !== undefined
      ? billingConfig.valor_mensal_padrao
      : 29.0;
  const formattedRate = effectiveRate.toFixed(2);

  const referenceCode = `SALON-${(currentSalon?.id || '001').replace('salon-', '').slice(-6)}-${currentMonthStr().replace('-', '')}`;

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    setIsSubmitting(true);
    try {
      const ok = await createSubscriptionPayment({
        valor: effectiveRate,
        metodo: selectedMethod,
        mes_referencia: currentMonthStr(),
        comprovativo_ref: comprovativoRef.trim() || undefined,
      });

      if (ok) {
        setJustSubmitted(true);
        if (onPaymentSuccess) {
          setTimeout(() => {
            onPaymentSuccess();
          }, 1200);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (viewMode === 'bank_checkout') {
    return (
      <BankPaymentBlockedScreen
        clienteId={currentSalon?.id || 'demo-cliente'}
        clienteNome={currentSalon?.name || 'Salão'}
        clienteEmail={currentSalon?.email || 'contacto@salao.pt'}
        valorAPagar={effectiveRate}
        onUnlocked={() => {
          setUnblockedSuccess(true);
          refreshSubscriptionData();
          if (onPaymentSuccess) onPaymentSuccess();
          if (onClose) onClose();
        }}
        onSwitchToManual={() => setViewMode('manual_transfer')}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                  {subscriptionBlockReason === 'prova_expirada' ? 'Período de Teste' : 'Mensalidade SaaS'}
                </span>
                <h2 className="text-xl font-black mt-1 tracking-tight">
                  Regularização de Subscrição
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              title="Atualizar dados de pagamento em tempo real"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {currentSalon && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
              <p className="text-xs text-purple-200 font-medium">
                Salão: <strong className="text-white">{currentSalon.name}</strong>
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-purple-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Dados em tempo real</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Notificação de Desbloqueio Imediato */}
          {unblockedSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-emerald-950 flex items-start gap-3 animate-in zoom-in-95 duration-200 shadow-md">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-black text-sm text-emerald-900">
                  Pagamento validado com sucesso!
                </p>
                <p className="text-emerald-800 leading-relaxed font-medium">
                  O salão foi desbloqueado pelo administrador. A fechar a janela para continuar a utilizar a aplicação...
                </p>
              </div>
            </div>
          )}

          {/* Alternar para Gateway Bancário Online */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-blue-900 font-bold">
              Prefere checkout bancário com desbloqueio automático imediato?
            </span>
            <button
              type="button"
              onClick={() => setViewMode('bank_checkout')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            >
              Pagar agora online
            </button>
          </div>

          {/* Mensagem Principal Conforme Requisitos */}
          <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-4 text-center">
            <p className="text-base sm:text-lg font-black text-purple-950">
              O período de prova terminou. Para continuar, efetue o pagamento de:{' '}
              <span className="text-purple-700 font-black underline underline-offset-4 decoration-purple-400">
                {formattedRate}€
              </span>
            </p>
            <p className="text-xs text-purple-700 mt-1 font-medium">
              Mantenha o acesso total às reservas, catálogo de serviços, clientes e relatórios do seu salão.
            </p>
          </div>

          {/* Estado de Pagamento Pendente ou Recém-Submetido */}
          {(hasPendingPayment || justSubmitted) && !unblockedSuccess && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs space-y-1">
                <p className="font-black text-amber-950">
                  Comprovativo de pagamento em validação
                </p>
                <p className="leading-relaxed">
                  O seu comprovativo foi registado. Logo que seja validado pelo administrador na consola, o programa será desbloqueado de imediato sem qualquer retenção.
                </p>
              </div>
            </div>
          )}

          {/* Botões de Escolha do Método de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Selecione o método de pagamento pretendido:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botão Transferência Bancária */}
              <button
                type="button"
                onClick={() => setSelectedMethod('transferencia')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
                  selectedMethod === 'transferencia'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-950 shadow-md ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedMethod === 'transferencia' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black">Pagar por transferência bancária</p>
                  <span className="text-[10px] text-slate-500 font-medium">Mostra IBAN e Referência</span>
                </div>
              </button>

              {/* Botão MB Way */}
              <button
                type="button"
                onClick={() => setSelectedMethod('mbway')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
                  selectedMethod === 'mbway'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-950 shadow-md ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedMethod === 'mbway' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black">Pagar por MB Way</p>
                  <span className="text-[10px] text-slate-500 font-medium">Mostra número de telemóvel</span>
                </div>
              </button>
            </div>
          </div>

          {/* Detalhes do Método Selecionado */}
          {selectedMethod === 'transferencia' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dados para Transferência Bancária
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  {formattedRate}€
                </span>
              </div>

              {/* IBAN Atualizado em Tempo Real */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600">IBAN:</span>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                  <span className="font-mono text-xs font-bold text-slate-800 break-all select-all">
                    {billingConfig.iban}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(billingConfig.iban, 'iban')}
                    className="p-1.5 hover:bg-purple-50 text-slate-500 hover:text-purple-700 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                    title="Copiar IBAN"
                  >
                    {copiedField === 'iban' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Referência do Salão */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600">Referência do Pagamento:</span>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                  <span className="font-mono text-xs font-bold text-purple-900 select-all">
                    {referenceCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(referenceCode, 'ref')}
                    className="p-1.5 hover:bg-purple-50 text-slate-500 hover:text-purple-700 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                    title="Copiar Referência"
                  >
                    {copiedField === 'ref' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Indique esta referência no descritivo da sua transferência para rápida validação.
                </p>
              </div>
            </div>
          )}

          {selectedMethod === 'mbway' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dados para Pagamento MB Way
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  {formattedRate}€
                </span>
              </div>

              {/* Número MB Way Atualizado em Tempo Real */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600">Número de Telemóvel MB Way:</span>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                  <span className="font-mono text-sm font-black text-slate-800 select-all">
                    {billingConfig.numero_mbway}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(billingConfig.numero_mbway, 'mbway')}
                    className="p-1.5 hover:bg-purple-50 text-slate-500 hover:text-purple-700 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                    title="Copiar Número"
                  >
                    {copiedField === 'mbway' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Abra a app MB Way no seu telemóvel e envie {formattedRate}€ para o número acima.
                </p>
              </div>
            </div>
          )}

          {/* Suporte WhatsApp se configurado pelo programador */}
          {billingConfig.numero_whatsapp && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-950 font-medium">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dúvidas ou envio de comprovativo por WhatsApp?</span>
              </div>
              <a
                href={`https://wa.me/${billingConfig.numero_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg shrink-0 ml-2 shadow-xs transition-colors"
              >
                {billingConfig.numero_whatsapp}
              </a>
            </div>
          )}

          {/* Formulário de Confirmação de Pagamento */}
          {selectedMethod && (
            <form onSubmit={handleSubmitProof} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {selectedMethod === 'transferencia'
                    ? 'Referência da transferência ou nome/IBAN do ordenante:'
                    : 'Número de telemóvel que efetuou o envio MB Way:'}
                </label>
                <input
                  type="text"
                  required
                  value={comprovativoRef}
                  onChange={(e) => setComprovativoRef(e.target.value)}
                  placeholder={
                    selectedMethod === 'transferencia'
                      ? 'Ex: Transf. NIB 0033... ou José Silva'
                      : 'Ex: 912 345 678'
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'A registar confirmação...' : 'Confirmar Pagamento Realizado'}
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pagamentos geridos de forma segura</span>
          </div>

          {/* Se a modal foi aberta manualmente pelo utilizador e NÃO estiver bloqueado */}
          {!isSubscriptionBlocked && onClose && (
            <button
              onClick={onClose}
              type="button"
              className="text-slate-600 hover:text-slate-900 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
