import React, { useState, useMemo, useEffect } from 'react';
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
  Scissors,
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
  const [trialDateInput, setTrialDateInput] = useState<string>(
    salon.fim_prova ? salon.fim_prova.slice(0, 10) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isValidatingPaymentId, setIsValidatingPaymentId] = useState<string | null>(null);

  // Sincronizar inputs quando o salão selecionado é atualizado ou alterado
  useEffect(() => {
    setMonthlyRateInput(
      (salon.valor_mensal !== undefined ? salon.valor_mensal : billingConfig.valor_mensal_padrao || 29.0).toString()
    );
    setCurrentStatus(salon.estado_subscricao || 'prova');
    setTrialDateInput(salon.fim_prova ? salon.fim_prova.slice(0, 10) : '');
  }, [salon.id, salon.valor_mensal, salon.estado_subscricao, salon.fim_prova, billingConfig.valor_mensal_padrao]);

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

  const totalPendingFiltered = useMemo(() => {
    return filteredPayments
      .filter((p) => p.estado === 'pendente')
      .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
  }, [filteredPayments]);

  // Agrupar pagamentos por Mês e ordenar por Data para a Folha Oficial de Impressão
  const paymentsGroupedByMonth = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        payments: typeof payments;
        totalValidated: number;
        totalPending: number;
      }
    >();

    // Ordenação cronológica por data (do mais recente para o mais antigo)
    const sorted = [...filteredPayments].sort((a, b) => {
      const dateA = new Date(a.data || 0).getTime();
      const dateB = new Date(b.data || 0).getTime();
      return dateB - dateA;
    });

    sorted.forEach((p) => {
      const key = p.mes_referencia || (p.data ? p.data.slice(0, 7) : 'Geral');
      let label = key;
      if (key.includes('-')) {
        const [y, m] = key.split('-');
        const mObj = monthNames.find((mn) => mn.value === m);
        label = `${mObj?.label || m} de ${y}`;
      }

      if (!map.has(key)) {
        map.set(key, { label, payments: [], totalValidated: 0, totalPending: 0 });
      }
      const group = map.get(key)!;
      group.payments.push(p);
      if (p.estado === 'validado') {
        group.totalValidated += Number(p.valor) || 0;
      } else {
        group.totalPending += Number(p.valor) || 0;
      }
    });

    return Array.from(map.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      payments: data.payments,
      totalValidated: data.totalValidated,
      totalPending: data.totalPending,
    }));
  }, [filteredPayments, monthNames, payments]);

  const effectiveMonthlyRate =
    salon.valor_mensal !== undefined
      ? Number(salon.valor_mensal)
      : billingConfig.valor_mensal_padrao || 29.0;

  const isTrialActive = salon.estado_subscricao === 'prova' && !salonSummary.isSubscriptionBlocked;
  const isBlocked =
    salon.estado_subscricao === 'bloqueado' ||
    salon.status === 'SUSPENSO' ||
    Boolean(salonSummary.isSubscriptionBlocked);
  const statusLabel = isBlocked
    ? 'Bloqueado (Pendente)'
    : isTrialActive
    ? `Período Teste (${salonSummary.daysRemainingInTrial ?? 0}d restantes)`
    : 'Subscrição Regularizada';

  const daysRemainingComputed = useMemo(() => {
    if (!trialDateInput) return 0;
    const end = new Date(trialDateInput + 'T23:59:59.999Z').getTime();
    const now = Date.now();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [trialDateInput]);

  const handleSaveRateAndStatus = async () => {
    const rate = parseFloat(monthlyRateInput);
    if (isNaN(rate) || rate < 0) {
      alert('Por favor introduza um valor mensal válido.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      const updates: {
        valor_mensal: number;
        estado_subscricao: SubscriptionStatus;
        fim_prova?: string;
      } = {
        valor_mensal: rate,
        estado_subscricao: currentStatus,
      };

      if (trialDateInput) {
        updates.fim_prova = new Date(trialDateInput + 'T23:59:59.999Z').toISOString();
      }

      await updateSalonSubscription(salon.id, updates);
      await refreshAllSalonsSummary();
      setSaveSuccessMessage(`Condições contratuais de "${salon.name}" guardadas com sucesso!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtendTrial = async (days: number) => {
    const currentEnd = trialDateInput
      ? new Date(trialDateInput + 'T23:59:59.999Z')
      : (salon.fim_prova ? new Date(salon.fim_prova) : new Date());
    const baseDate = currentEnd.getTime() < Date.now() ? new Date() : currentEnd;
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const newEndIso = newEnd.toISOString();
    const newDateStr = newEndIso.slice(0, 10);

    setTrialDateInput(newDateStr);
    setCurrentStatus('prova');

    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      await updateSalonSubscription(salon.id, {
        fim_prova: newEndIso,
        estado_subscricao: 'prova',
      });
      await refreshAllSalonsSummary();
      setSaveSuccessMessage(`Período de teste prolongado em +${days} dias para "${salon.name}"!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 print:hidden">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Condições Contratuais da Subscrição (Específicas deste Salão)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Estes valores são individuais e aplicam-se exclusivamente a este salão registado.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-300 bg-slate-900/90 px-3 py-1 rounded-full border border-purple-500/30 shrink-0">
                Salão: <strong className="text-white">{salon.name}</strong>
              </span>
            </div>

            {saveSuccessMessage && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

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

            {/* Extensão de Período de Teste com Data Específica e Botões Rápidos */}
            <div className="pt-3 border-t border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <span className="font-bold text-slate-400">Data Fim do Teste:</span>
                <input
                  type="date"
                  value={trialDateInput}
                  onChange={(e) => setTrialDateInput(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                />
                {currentStatus === 'prova' && (
                  <span className="text-purple-300 font-bold bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                    {daysRemainingComputed} dia(s) restantes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 text-[11px] font-bold mr-1">Prolongar Teste:</span>
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
                <button
                  type="button"
                  onClick={() => handleExtendTrial(60)}
                  disabled={isSaving}
                  className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                >
                  +60 Dias
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

      {/* ========================================================
          2. FOLHA FORMAL DE EXTRATO DE PAGAMENTOS (APENAS NA IMPRESSÃO)
          Folha A4 formal e discriminada por Mês e por Data, com
          Logótipo do Salão, Dados Fiscais, Totais e Validação.
          Aparência idêntica aos outros relatórios do sistema.
          ======================================================== */}
      <div className="hidden print:block bg-white text-slate-900 w-full font-sans text-xs">
        {/* Cabeçalho Formal com Logótipo do Salão e Metadados */}
        <div className="border-b-2 border-slate-900 pb-5 mb-5 flex items-start justify-between gap-6">
          {/* Lado Esquerdo: Logótipo e Identificação do Salão */}
          <div className="flex items-center gap-4">
            {salon.logoUrl ? (
              <img
                src={salon.logoUrl}
                alt={salon.name}
                className="w-16 h-16 object-contain rounded-xl border border-slate-300 p-1 bg-white shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0"
                style={{ backgroundColor: salon.primaryColor || '#8B5CF6' }}
              >
                <Scissors className="w-8 h-8 -rotate-45" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {salon.name || 'Salão de Cabeleireiro'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {salon.address || 'Morada não especificada'}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                {salon.nif && (
                  <span>
                    <strong>NIF:</strong> {salon.nif}
                  </span>
                )}
                {salon.phone && (
                  <span>
                    <strong>Tel:</strong> {salon.phone}
                  </span>
                )}
                {(salon.email || salonSummary.adminUser?.email) && (
                  <span>
                    <strong>Email:</strong> {salon.email || salonSummary.adminUser?.email}
                  </span>
                )}
                {salonSummary.adminUser?.name && (
                  <span>
                    <strong>Responsável:</strong> {salonSummary.adminUser.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Identificação do Documento */}
          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md mb-1.5">
              Extrato Oficial
            </span>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Histórico de Pagamentos SaaS
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
              Doc. Nº: <strong>EXT-{String(salon.id || '001').replace(/\D/g, '').slice(-5) || '1001'}/{new Date().getFullYear()}</strong>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Emitido em: {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Quadro Resumo de Conta / Subscrição */}
        <div className="grid grid-cols-4 gap-3 mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Mensalidade Contratada</span>
            <span className="text-sm font-black text-slate-900">{effectiveMonthlyRate.toFixed(2)} € / mês</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Liquidado</span>
            <span className="text-sm font-black text-emerald-700">{totalPaidFiltered.toFixed(2)} €</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Pendente</span>
            <span className="text-sm font-black text-amber-700">{totalPendingFiltered.toFixed(2)} €</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Estado da Conta</span>
            <span className="text-xs font-bold text-slate-800">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Tabela Discriminada por Mês e por Data */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Discriminação de Mensalidades e Pagamentos
            </h3>
            <span className="text-[10px] text-slate-500">
              {yearFilter !== 'ALL' || monthFilter !== 'ALL'
                ? `Filtro: ${monthFilter !== 'ALL' ? monthNames.find((m) => m.value === monthFilter)?.label : 'Ano'} / ${yearFilter !== 'ALL' ? yearFilter : 'Todos'}`
                : 'Histórico Completo'}
            </span>
          </div>

          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 border-b border-slate-300">
                <th className="py-2 px-3 border-r border-slate-200">Data de Pagamento</th>
                <th className="py-2 px-3 border-r border-slate-200">Mês de Referência</th>
                <th className="py-2 px-3 border-r border-slate-200">Método de Pagamento</th>
                <th className="py-2 px-3 border-r border-slate-200">Identificador / Comprovativo</th>
                <th className="py-2 px-3 text-right border-r border-slate-200">Valor (€)</th>
                <th className="py-2 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {paymentsGroupedByMonth.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    Sem registos de pagamentos para o período selecionado.
                  </td>
                </tr>
              ) : (
                paymentsGroupedByMonth.map((group) => (
                  <React.Fragment key={group.key}>
                    {/* Linha de Cabeçalho do Mês */}
                    <tr className="bg-slate-100/90 border-t-2 border-b border-slate-300 text-[11px] font-black text-slate-900">
                      <td colSpan={4} className="py-2 px-3 border-r border-slate-200">
                        <span className="text-purple-950 uppercase font-black tracking-wide">
                          Mês: {group.label}
                        </span>
                        <span className="text-[10px] font-normal text-slate-600 ml-2">
                          ({group.payments.length} transação{group.payments.length > 1 ? 'ões' : ''})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 border-r border-slate-200">
                        {group.totalValidated.toFixed(2)} €
                      </td>
                      <td className="py-2 px-3 text-center text-[10px] font-bold">
                        {group.totalPending > 0 ? (
                          <span className="text-amber-800">{group.totalPending.toFixed(2)} € pendente</span>
                        ) : (
                          <span className="text-emerald-800">Regularizado</span>
                        )}
                      </td>
                    </tr>

                    {/* Transações discriminadas com data exata */}
                    {group.payments.map((p) => {
                      const paymentDate = p.data
                        ? new Date(p.data).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—';
                      return (
                        <tr key={p.id} className="border-b border-slate-200 text-[11px] hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">
                            {paymentDate}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">
                            {group.label}
                          </td>
                          <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                            {p.metodo === 'transferencia' ? 'Transferência Bancária' : 'MB Way'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-600 border-r border-slate-200">
                            {p.comprovativo_ref || 'Ref. Padrão'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-200">
                            {(Number(p.valor) || 0).toFixed(2)} €
                          </td>
                          <td className="py-2 px-3 text-center">
                            {p.estado === 'validado' ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Validado
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-xs text-slate-900">
                  <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider border-r border-slate-200">
                    Total Geral Liquidado ({filteredPayments.filter((p) => p.estado === 'validado').length} pagamentos validados)
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm text-emerald-800 border-r border-slate-200">
                    {totalPaidFiltered.toFixed(2)} €
                  </td>
                  <td className="py-2.5 px-3 text-center text-[10px]">
                    {totalPendingFiltered > 0 ? (
                      <span className="text-amber-800 font-bold">+{totalPendingFiltered.toFixed(2)} € Pendente</span>
                    ) : (
                      <span className="text-emerald-800 font-bold">Regularizado</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Rodapé Formal com Observações e Espaço para Carimbo / Assinatura */}
        <div className="pt-4 border-t border-slate-300 mt-6 flex items-end justify-between text-[10px] text-slate-500">
          <div className="max-w-md space-y-1">
            <p className="font-bold text-slate-700 uppercase tracking-wider">
              Conformidade e Registo:
            </p>
            <p className="leading-snug">
              Este extrato comprova os pagamentos associados à licença de utilização do software SaaS de gestão de salão de cabeleireiro.
              Documento processado por computador com autenticação digital de registos.
            </p>
          </div>

          <div className="text-center w-64 pt-6 border-t border-slate-400">
            <p className="text-[10px] font-bold text-slate-700">Assinatura / Carimbo do Salão</p>
            <p className="text-[9px] text-slate-400 mt-1">Data: ____ / ____ / {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </>
  );
};
