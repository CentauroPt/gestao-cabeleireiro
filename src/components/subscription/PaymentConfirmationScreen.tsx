import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { bankPaymentService } from '../../services/bankPaymentService';
import type { PagamentoBancario } from '../../types/bankPayment';

interface Props {
  pagamento: PagamentoBancario;
  clienteId: string;
  onUnlocked: () => void;
  onBack?: () => void;
}

export const PaymentConfirmationScreen: React.FC<Props> = ({
  pagamento: initialPagamento,
  clienteId,
  onUnlocked,
  onBack,
}) => {
  const [pagamento, setPagamento] = useState<PagamentoBancario>(initialPagamento);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  // Subscrever em tempo real a alterações de estado
  useEffect(() => {
    const unsubscribe = bankPaymentService.subscribeToAccess(clienteId, (newStatus) => {
      if (newStatus === 'ativo') {
        setPagamento((prev) => ({
          ...prev,
          estado: 'pago',
          data_confirmacao: new Date().toISOString(),
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [clienteId]);

  // Simulação manual de Webhook bancário (para teste instantâneo da confirmação do banco)
  const handleSimulateWebhook = async () => {
    setIsSimulatingWebhook(true);
    try {
      const res = await bankPaymentService.processBankWebhookConfirmation(pagamento.id);
      if (res.success) {
        setPagamento((prev) => ({
          ...prev,
          estado: 'pago',
          data_confirmacao: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.error('Erro na simulação do webhook:', err);
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const isPago = pagamento.estado === 'pago';
  const isPendente = pagamento.estado === 'pendente';
  const isFalhado = pagamento.estado === 'falhado';

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="bg-[#1E293B] border-b border-slate-700/70 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Notificação Bancária em Tempo Real
            </span>
          </div>

          {onBack && !isPago && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}
        </div>

        {/* Conteúdo Central de Estado */}
        <div className="p-6 sm:p-8 space-y-6 text-center">
          {/* Ícone e Indicador de Estado com Cores Bancárias Claras */}
          <div className="flex flex-col items-center justify-center space-y-3">
            {isPago && (
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-in zoom-in-75 duration-300 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}

            {isPendente && (
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 animate-pulse shadow-lg shadow-amber-500/20">
                <Clock className="w-10 h-10" />
              </div>
            )}

            {isFalhado && (
              <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
                <XCircle className="w-10 h-10" />
              </div>
            )}

            {/* Rótulo de Estado */}
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {isPago && 'Pagamento confirmado — acesso desbloqueado'}
                {isPendente && 'Pagamento pendente'}
                {isFalhado && 'Pagamento falhado'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {isPago &&
                  'A notificação do banco foi processada com sucesso. O seu acesso foi restaurado na totalidade.'}
                {isPendente &&
                  'A aguardar receção do webhook bancário de confirmação. Assim que o banco validar, o desbloqueio será imediato.'}
                {isFalhado &&
                  'A transação bancária não foi concluída. Por favor tente novamente ou escolha outro método de pagamento.'}
              </p>
            </div>
          </div>

          {/* Dados do Pagamento e Referência Bancária */}
          <div className="bg-[#1E293B]/80 border border-slate-700/60 rounded-2xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
              <span className="text-slate-400">Referência Bancária:</span>
              <span className="font-mono font-bold text-white tracking-wide">
                {pagamento.referencia_bancaria}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
              <span className="text-slate-400">Valor do Pagamento:</span>
              <span className="font-bold text-emerald-400">
                {pagamento.valor.toFixed(2)} {pagamento.moeda}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
              <span className="text-slate-400">Método de Checkout:</span>
              <span className="text-slate-200">{pagamento.metodo_detalhe || 'Stripe Gateway'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Estado no Sistema:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isPago
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isPendente
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {pagamento.estado}
              </span>
            </div>
          </div>

          {/* Botão Aceder à Aplicação */}
          {isPago ? (
            <button
              type="button"
              onClick={onUnlocked}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Aceder à aplicação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>A escutar confirmação bancária em tempo real...</span>
              </div>

              {/* Botão de Teste Sandbox / Simulação de Webhook Bancário */}
              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={isSimulatingWebhook}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Simula a chegada da notificação do banco (Webhook) para validação imediata"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {isSimulatingWebhook
                    ? 'A processar webhook bancário...'
                    : 'Simular Confirmação do Banco (Webhook)'}
                </span>
              </button>
            </div>
          )}

          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Processado com certificação bancária PCI-DSS de nível 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
