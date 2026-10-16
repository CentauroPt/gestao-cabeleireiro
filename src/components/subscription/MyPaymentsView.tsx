import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
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
} from 'lucide-react';

export const MyPaymentsView: React.FC = () => {
  const {
    currentSalon,
    subscriptionPayments,
    monthlyRate,
    daysRemainingInTrial,
    isSubscriptionBlocked,
  } = useApp();

  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  const isTrialActive = currentSalon?.estado_subscricao === 'prova' && !isSubscriptionBlocked;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
              {(monthlyRate || 29.0).toFixed(2)}€
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
  );
};
