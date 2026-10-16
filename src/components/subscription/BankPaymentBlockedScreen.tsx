import React, { useState } from 'react';
import {
  ShieldAlert,
  CreditCard,
  Building2,
  Smartphone,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { bankPaymentService } from '../../services/bankPaymentService';
import type { PagamentoBancario } from '../../types/bankPayment';
import { PaymentConfirmationScreen } from './PaymentConfirmationScreen';

interface Props {
  clienteId: string;
  clienteNome: string;
  clienteEmail: string;
  valorAPagar?: number;
  onUnlocked: () => void;
  onLogout?: () => void;
  onSwitchToManual?: () => void;
}

export const BankPaymentBlockedScreen: React.FC<Props> = ({
  clienteId,
  clienteNome,
  clienteEmail,
  valorAPagar = 29.0,
  onUnlocked,
  onLogout,
  onSwitchToManual,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePayment, setActivePayment] = useState<PagamentoBancario | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mbway' | 'multibanco'>('card');

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      const methodLabel =
        selectedMethod === 'card'
          ? 'Cartão de Crédito / Débito'
          : selectedMethod === 'mbway'
          ? 'MB WAY'
          : 'Multibanco';

      const result = await bankPaymentService.initiateCheckout({
        clienteId,
        nome: clienteNome,
        email: clienteEmail,
        valor: valorAPagar,
        metodoDetalhe: `Stripe (${methodLabel})`,
      });

      const pagamento: PagamentoBancario = {
        id: result.pagamentoId,
        cliente_id: clienteId,
        valor: valorAPagar,
        moeda: 'EUR',
        estado: 'pendente',
        referencia_bancaria: result.referenciaBancaria,
        data_criacao: new Date().toISOString(),
        data_confirmacao: null,
        metodo_detalhe: `Stripe (${methodLabel})`,
      };

      setActivePayment(pagamento);
      setShowConfirmation(true);
    } catch (err) {
      console.error('Erro ao iniciar checkout:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showConfirmation && activePayment) {
    return (
      <PaymentConfirmationScreen
        pagamento={activePayment}
        clienteId={clienteId}
        onUnlocked={onUnlocked}
        onBack={() => setShowConfirmation(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
      {/* Container Central com Estilo Bancário Sóbrio (Azul-Marinho & Branco) */}
      <div className="w-full max-w-xl bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho Bancário Oficial */}
        <div className="bg-[#1E293B] border-b border-slate-700/70 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Gateway Bancário Seguro
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  SSL 256-Bit
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white">Portal de Pagamentos Online</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encriptado</span>
          </div>
        </div>

        {/* Corpo do Ecrã de Pagamento Bloqueado */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Aviso Principal Obrigatório */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-amber-300">
                O seu acesso está bloqueado. Efetue o pagamento para continuar.
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A subscrição mensal encontra-se pendente. Após a confirmação imediata do banco via webhook, a aplicação será automaticamente desbloqueada sem qualquer intervenção manual.
              </p>
            </div>
          </div>

          {/* Resumo do Valor a Pagar */}
          <div className="bg-[#1E293B]/70 border border-slate-700/60 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 text-xs text-slate-400">
              <span>Cliente / Salão:</span>
              <span className="font-bold text-white">{clienteNome}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50 text-xs text-slate-400">
              <span>E-mail associado:</span>
              <span className="text-slate-300 font-mono">{clienteEmail}</span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div>
                <span className="block text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Valor a Pagar:
                </span>
                <span className="text-xs text-emerald-400 font-medium">Subscrição Mensal Ativa</span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white tracking-tight">
                  {valorAPagar.toFixed(2)}€
                </span>
                <span className="block text-[11px] text-slate-400">EUR • IVA incluído</span>
              </div>
            </div>
          </div>

          {/* Métodos de Pagamento Bancário */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Método de Checkout Bancário
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedMethod === 'card'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                    : 'bg-[#1E293B]/40 border-slate-700/70 text-slate-400 hover:border-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-2 text-blue-400" />
                <div>
                  <div className="text-xs font-bold">Cartão Bancário</div>
                  <div className="text-[10px] text-slate-400">Débito / Crédito</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('multibanco')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedMethod === 'multibanco'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                    : 'bg-[#1E293B]/40 border-slate-700/70 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Building2 className="w-4 h-4 mb-2 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold">Multibanco</div>
                  <div className="text-[10px] text-slate-400">Ref. Automática</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('mbway')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedMethod === 'mbway'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                    : 'bg-[#1E293B]/40 border-slate-700/70 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-2 text-rose-400" />
                <div>
                  <div className="text-xs font-bold">MB WAY</div>
                  <div className="text-[10px] text-slate-400">Pagamento Imediato</div>
                </div>
              </button>
            </div>
          </div>

          {/* Botão Pagar Agora */}
          <button
            type="button"
            onClick={handlePayNow}
            disabled={isProcessing}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>A ligar ao gateway bancário...</span>
              </>
            ) : (
              <>
                <span>Pagar agora ({valorAPagar.toFixed(2)}€)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {onSwitchToManual && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onSwitchToManual}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
              >
                Preferir dados para transferência manual (IBAN / MB WAY)
              </button>
            </div>
          )}

          {/* Garantias e Conformidade Bancária */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Desbloqueio automático garantido
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Terminar Sessão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
