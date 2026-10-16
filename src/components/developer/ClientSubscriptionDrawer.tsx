import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { SalonSummary } from '../../services/api';
import type { SubscriptionStatus } from '../../types';
import {
  CreditCard,
  X,
  CheckCircle2,
  Clock,
  Save,
  Printer,
  TrendingUp,
} from 'lucide-react';

interface ClientSubscriptionDrawerProps {
  salonSummary: SalonSummary;
  onClose: () => void;
}

export const ClientSubscriptionDrawer: React.FC<ClientSubscriptionDrawerProps> = ({
  salonSummary,
  onClose,
}) => {
  const {
    updateSalonSubscription,
    validateSubscriptionPayment,
    refreshAllSalonsSummary,
    billingConfig,
  } = useApp();

  const salon = salonSummary.salon;
  const [monthlyRateInput, setMonthlyRateInput] = useState<string>(
    (salon.valor_mensal !== undefined ? salon.valor_mensal : billingConfig.valor_mensal_padrao || 29.0).toString()
  );
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus>(
    salon.estado_subscricao || 'prova'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingPaymentId, setIsValidatingPaymentId] = useState<string | null>(null);

  // Filtros de histórico
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const payments = salonSummary.payments || [];

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    payments.forEach((p) => {
      if (p.data) years.add(new Date(p.data).getFullYear().toString());
      if (p.mes_referencia?.includes('-')) years.add(p.mes_referencia.split('-')[0]);
    });
    return Array.from(years).sort().reverse();
  }, [payments]);

  const monthNames = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (yearFilter !== 'ALL') {
        const pYear = p.data ? new Date(p.data).getFullYear().toString() : '';
        const refYear = p.mes_referencia?.split('-')[0] || '';
        if (pYear !== yearFilter && refYear !== yearFilter) return false;
      }
      if (monthFilter !== 'ALL') {
        const pMonth = p.data ? String(new Date(p.data).getMonth() + 1).padStart(2, '0') : '';
        const refMonth = p.mes_referencia?.includes('-') ? p.mes_referencia.split('-')[1] : '';
        if (pMonth !== monthFilter && refMonth !== monthFilter) return false;
      }
      return true;
    });
  }, [payments, yearFilter, monthFilter]);

  const totalPaidFiltered = useMemo(() => {
    return filteredPayments
      .filter((p) => p.estado === 'validado')
      .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
  }, [filteredPayments]);

  const handleSaveRateAndStatus = async () => {
    const rate = parseFloat(monthlyRateInput);
    if (isNaN(rate) || rate < 0) {
      alert('Por favor introduza um valor mensal válido.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSalonSubscription(salon.id, {
        valor_mensal: rate,
        estado_subscricao: currentStatus,
      });
      await refreshAllSalonsSummary();
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtendTrial = async (days: number) => {
    const baseDate = salon.fim_prova ? new Date(salon.fim_prova) : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    setIsSaving(true);
    try {
      await updateSalonSubscription(salon.id, {
        fim_prova: newEnd,
        estado_subscricao: 'prova',
      });
      setCurrentStatus('prova');
      await refreshAllSalonsSummary();
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidatePayment = async (paymentId: string) => {
    setIsValidatingPaymentId(paymentId);
    try {
      await validateSubscriptionPayment(paymentId, 'Validado na Consola do Programador');
      await refreshAllSalonsSummary();
    } finally {
      setIsValidatingPaymentId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const trialDaysRemaining = salonSummary.daysRemainingInTrial ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Ficha do Cliente SaaS
                </span>
                <span className="text-xs text-slate-400">• Gestão de Subscrição</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">{salon.name}</h2>
              <p className="text-xs text-slate-400">
                {salonSummary.adminUser?.name || 'Administrador'} • {salonSummary.adminUser?.email || salon.phone || 'Sem contacto'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            title="Fechar Ficha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {/* Card: Edição de Valor Mensal e Estado da Subscrição */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Condições Contratuais da Subscrição
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* Campo editável Valor Mensal */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Valor Mensal (€ / mês)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRateInput}
                    onChange={(e) => setMonthlyRateInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-black text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    €/mês
                  </span>
                </div>
              </div>

              {/* Seletor Estado da Subscrição */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Estado da Subscrição
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="prova">Em Período de Teste (prova)</option>
                  <option value="ativo">Ativo (Subscrição Regular)</option>
                  <option value="bloqueado">Bloqueado (Acesso Impedido)</option>
                </select>
              </div>

              {/* Botão Gravar Condições */}
              <div>
                <button
                  type="button"
                  onClick={handleSaveRateAndStatus}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'A gravar...' : 'Guardar Alterações'}</span>
                </button>
              </div>
            </div>

            {/* Extensão de Período de Teste */}
            <div className="pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-400">
                <span>Fim do Teste: </span>
                <strong className="text-white">
                  {salon.fim_prova ? new Date(salon.fim_prova).toLocaleDateString('pt-PT') : 'N/D'}
                </strong>
                {salon.estado_subscricao === 'prova' && (
                  <span className="text-purple-300 ml-1.5">
                    ({trialDaysRemaining} dia(s) restantes)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Prolongar Teste:</span>
                <button
                  type="button"
                  onClick={() => handleExtendTrial(15)}
                  disabled={isSaving}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                >
                  +15 Dias
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendTrial(30)}
                  disabled={isSaving}
                  className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                >
                  +30 Dias
                </button>
              </div>
            </div>
          </div>

          {/* Card: Histórico de Pagamentos do Cliente */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4.5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Histórico de Pagamentos de Mensalidade
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Registo de todos os pagamentos efetuados e comprovativos submetidos por este salão.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtro Ano */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os Anos</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                {/* Filtro Mês */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os Meses</option>
                  {monthNames.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {/* Botão Imprimir */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir histórico deste salão"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Tabela de Pagamentos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-900/50">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Mês Ref.</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3">Método</th>
                    <th className="py-2.5 px-3">Comprovativo</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-300">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Nenhum pagamento registado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const isPending = p.estado === 'pendente';
                      const isValidating = isValidatingPaymentId === p.id;
                      const dateStr = p.data
                        ? new Date(p.data).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—';

                      return (
                        <tr key={p.id} className="hover:bg-slate-700/20">
                          <td className="py-2.5 px-3 font-mono">{dateStr}</td>
                          <td className="py-2.5 px-3 font-bold text-purple-300">{p.mes_referencia}</td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {(Number(p.valor) || 0).toFixed(2)}€
                          </td>
                          <td className="py-2.5 px-3">
                            {p.metodo === 'transferencia' ? 'Transf. Bancária' : 'MB Way'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {p.comprovativo_ref || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                <span>Pendente</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Validado</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleValidatePayment(p.id)}
                                disabled={isValidating}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                title="Validar pagamento e desbloquear cliente imediatamente"
                              >
                                {isValidating ? 'A validar...' : 'Validar Pagamento'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            {filteredPayments.length > 0 && (
              <div className="pt-3 border-t border-slate-700/70 flex justify-between items-center text-xs text-slate-400">
                <span>Registos: {filteredPayments.length}</span>
                <span className="font-bold text-slate-200">
                  Total Validado no Filtro:{' '}
                  <strong className="text-purple-400 text-sm font-black">
                    {totalPaidFiltered.toFixed(2)}€
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
