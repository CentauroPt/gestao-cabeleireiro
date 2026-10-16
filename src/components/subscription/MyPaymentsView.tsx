import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { SubscriptionLockModal } from './SubscriptionLockModal';
import {
  CreditCard,
  Printer,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  Scissors,
  RefreshCw,
} from 'lucide-react';

export const MyPaymentsView: React.FC = () => {
  const {
    currentSalon,
    subscriptionPayments,
    monthlyRate,
    daysRemainingInTrial,
    isSubscriptionBlocked,
    billingConfig,
    refreshSubscriptionData,
    refreshData,
  } = useApp();

  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sincronização em tempo real com as atualizações de preços e dados do programador
  useEffect(() => {
    refreshSubscriptionData();
    if (currentSalon?.id) {
      refreshData(currentSalon.id);
    }
    api.syncWithRemote().then((changed) => {
      if (changed) {
        refreshSubscriptionData();
        if (currentSalon?.id) refreshData(currentSalon.id);
      }
    }).catch(() => {});

    // Sincronizar ao focar a janela ou aba
    const handleFocus = () => {
      refreshSubscriptionData();
      if (currentSalon?.id) {
        refreshData(currentSalon.id);
      }
      api.syncWithRemote().then((changed) => {
        if (changed) {
          refreshSubscriptionData();
          if (currentSalon?.id) refreshData(currentSalon.id);
        }
      }).catch(() => {});
    };

    window.addEventListener('focus', handleFocus);

    // Polling local suave para capturar alterações imediatas de preço feitas pelo programador
    const intervalId = setInterval(() => {
      refreshSubscriptionData();
    }, 2000);

    // Polling remoto via Supabase a cada 6 segundos
    const remoteIntervalId = setInterval(() => {
      api.syncWithRemote().then((changed) => {
        if (changed) {
          refreshSubscriptionData();
          if (currentSalon?.id) refreshData(currentSalon.id);
        }
      }).catch(() => {});
    }, 6000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
      clearInterval(remoteIntervalId);
    };
  }, [currentSalon?.id, refreshSubscriptionData, refreshData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubscriptionData();
      if (currentSalon?.id) {
        await refreshData(currentSalon.id);
      }
      await api.syncWithRemote();
      await refreshSubscriptionData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Preço contratado efetivo: Prioridade para valor_mensal específico do salão ou padrão global
  const effectiveMonthlyRate =
    currentSalon?.valor_mensal !== undefined
      ? Number(currentSalon.valor_mensal)
      : (monthlyRate || billingConfig?.valor_mensal_padrao || 29.0);

  // Anos disponíveis nos pagamentos ou ano atual
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    subscriptionPayments.forEach((p) => {
      if (p.data) {
        years.add(new Date(p.data).getFullYear().toString());
      }
      if (p.mes_referencia && p.mes_referencia.includes('-')) {
        years.add(p.mes_referencia.split('-')[0]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [subscriptionPayments]);

  const monthNames = useMemo(
    () => [
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
    ],
    []
  );

  // Filtrar pagamentos
  const filteredPayments = useMemo(() => {
    return subscriptionPayments.filter((p) => {
      // Filtro por Ano
      if (yearFilter !== 'ALL') {
        const pYear = p.data ? new Date(p.data).getFullYear().toString() : '';
        const refYear = p.mes_referencia?.split('-')[0] || '';
        if (pYear !== yearFilter && refYear !== yearFilter) return false;
      }

      // Filtro por Mês
      if (monthFilter !== 'ALL') {
        const pMonth = p.data
          ? String(new Date(p.data).getMonth() + 1).padStart(2, '0')
          : '';
        const refMonth = p.mes_referencia?.includes('-')
          ? p.mes_referencia.split('-')[1]
          : '';
        if (pMonth !== monthFilter && refMonth !== monthFilter) return false;
      }

      // Filtro por Estado
      if (statusFilter !== 'ALL' && p.estado !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [subscriptionPayments, yearFilter, monthFilter, statusFilter]);

  // Total pago validado nos itens filtrados
  const totalPaidFiltered = useMemo(() => {
    return filteredPayments
      .filter((p) => p.estado === 'validado')
      .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
  }, [filteredPayments]);

  // Total pendente nos itens filtrados
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
        payments: typeof subscriptionPayments;
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
  }, [filteredPayments, monthNames]);

  const handlePrint = () => {
    window.print();
  };

  const isTrialActive = currentSalon?.estado_subscricao === 'prova' && !isSubscriptionBlocked;

  return (
    <>
      {/* 1. Interface Interativa de Ecrã (Oculta na Impressão) */}
      <div className="space-y-6 max-w-7xl mx-auto pb-16 print:hidden">
      {/* Diálogo de Pagamento */}
      {isPaymentModalOpen && (
        <SubscriptionLockModal
          forceOpen={true}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Top Banner / Cabeçalho */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 print:hidden">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Portal do Cliente
              </span>
              <span className="text-xs text-slate-400">• Faturação & Subscrições</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Os meus pagamentos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico detalhado de mensalidades, comprovativos e estado da subscrição de{' '}
              <strong className="text-slate-700">{currentSalon?.name || 'Salão'}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap print:hidden">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200/60 text-[11px] font-bold text-purple-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Preços em tempo real</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Atualizar dados e preços em tempo real"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Efetuar Pagamento</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
            title="Imprimir histórico de pagamentos"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir Histórico</span>
          </button>
        </div>
      </div>

      {/* Cartões Informativos de Estado da Subscrição */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Estado da Subscrição */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Estado da Subscrição</span>
            {isSubscriptionBlocked ? (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            ) : isTrialActive ? (
              <Clock className="w-4 h-4 text-purple-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="mt-2">
            {isSubscriptionBlocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                Bloqueado / Pagamento Pendente
              </span>
            ) : isTrialActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                Período de Teste ({daysRemainingInTrial} dias restantes)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                Subscrição Ativa
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {isSubscriptionBlocked
              ? 'Efetue o pagamento para reativar o acesso total.'
              : isTrialActive
              ? `Teste gratuito de 30 dias ativo.`
              : 'Pagamentos regularizados.'}
          </p>
        </div>

        {/* Valor Mensal Contratado */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Valor Mensal</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {effectiveMonthlyRate.toFixed(2)}€
            </span>
            <span className="text-xs font-bold text-slate-400">/ mês</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Faturação fixa sem fidelização obrigatória.
          </p>
        </div>

        {/* Data de Registo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Data de Registo</span>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {currentSalon?.data_registo
              ? new Date(currentSalon.data_registo).toLocaleDateString('pt-PT')
              : currentSalon?.createdAt
              ? new Date(currentSalon.createdAt).toLocaleDateString('pt-PT')
              : 'N/D'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Início da utilização do software SaaS.
          </p>
        </div>

        {/* Fim do Período de Teste */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Fim do Teste (30 dias)</span>
          <div className="mt-2 text-sm font-bold text-purple-700">
            {currentSalon?.fim_prova
              ? new Date(currentSalon.fim_prova).toLocaleDateString('pt-PT')
              : 'N/D'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Após este dia, entra em vigor o pagamento mensal.
          </p>
        </div>
      </div>

      {/* Mensagem de Sucesso Permanente quando ativo */}
      {!isSubscriptionBlocked && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs sm:text-sm font-bold">
            Pagamento bem-sucedido. Pode continuar a utilizar o programa.
          </p>
        </div>
      )}

      {/* Barra de Filtros e Resumo de Histórico */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Filtros do Histórico
            </h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro por Ano */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600">Ano:</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">Todos os Anos</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Mês */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600">Mês:</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">Todos os Meses</option>
                {monthNames.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600">Estado:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="ALL">Todos</option>
                <option value="validado">Validado</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Histórico de Pagamentos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-black uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-4">Mês de Referência</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Comprovativo / Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-60" />
                    <p className="font-bold text-sm text-slate-600">
                      Nenhum registo de pagamento encontrado.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {subscriptionPayments.length === 0
                        ? 'Assim que efetuar o primeiro pagamento mensal, o histórico será apresentado aqui.'
                        : 'Não existem pagamentos para os filtros de mês/ano selecionados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const paymentDate = p.data
                    ? new Date(p.data).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/D';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors font-medium text-slate-800"
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-600">{paymentDate}</td>
                      <td className="py-3.5 px-4 font-bold text-purple-900">
                        {p.mes_referencia || 'N/D'}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {(Number(p.valor) || 0).toFixed(2)}€
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700">
                          {p.metodo === 'transferencia' ? (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Transferência Bancária</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                              <span>MB Way</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.estado === 'validado' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Validado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pendente de Validação</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {p.comprovativo_ref || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela com Total */}
        {filteredPayments.length > 0 && (
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
            <div>
              A apresentar <strong>{filteredPayments.length}</strong> registo(s)
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Total Validado no Período:</span>
              <span className="text-base font-black text-purple-700">
                {totalPaidFiltered.toFixed(2)}€
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Informação sobre os dados bancários */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            Os dados bancários (IBAN e MB Way) são geridos de forma segura e sem exposição de credenciais.
          </span>
        </div>
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer shrink-0 ml-3"
        >
          Ver dados de pagamento
        </button>
      </div>
    </div>

      {/* ========================================================
          2. FOLHA FORMAL DE EXTRATO DE PAGAMENTOS (APENAS NA IMPRESSÃO)
          Folha A4 formal e discriminada por Mês e por Data, com
          Logótipo do Salão, Dados Fiscais, Totais e Validação.
          ======================================================== */}
      <div className="hidden print:block bg-white text-slate-900 w-full font-sans text-xs">
        {/* Cabeçalho Formal com Logótipo do Salão e Metadados */}
        <div className="border-b-2 border-slate-900 pb-5 mb-5 flex items-start justify-between gap-6">
          {/* Lado Esquerdo: Logótipo e Identificação do Salão */}
          <div className="flex items-center gap-4">
            {currentSalon?.logoUrl ? (
              <img
                src={currentSalon.logoUrl}
                alt={currentSalon.name}
                className="w-16 h-16 object-contain rounded-xl border border-slate-300 p-1 bg-white shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0"
                style={{ backgroundColor: currentSalon?.primaryColor || '#8B5CF6' }}
              >
                <Scissors className="w-8 h-8 -rotate-45" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {currentSalon?.name || 'Salão de Cabeleireiro'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentSalon?.address || 'Morada não especificada'}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                {currentSalon?.nif && (
                  <span>
                    <strong>NIF:</strong> {currentSalon.nif}
                  </span>
                )}
                {currentSalon?.phone && (
                  <span>
                    <strong>Tel:</strong> {currentSalon.phone}
                  </span>
                )}
                {currentSalon?.email && (
                  <span>
                    <strong>Email:</strong> {currentSalon.email}
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
              Doc. Nº: <strong>EXT-{String(currentSalon?.id || '001').replace(/\D/g, '').slice(-5) || '1001'}/{new Date().getFullYear()}</strong>
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
              {isSubscriptionBlocked
                ? 'Bloqueado (Pendente)'
                : isTrialActive
                ? `Período Teste (${daysRemainingInTrial}d restantes)`
                : 'Subscrição Regularizada'}
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
