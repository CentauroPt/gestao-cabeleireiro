import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { SubscriptionStats } from '../../types';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  Euro,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';

export const SubscriptionStatsPanel: React.FC = () => {
  const { getSubscriptionStats } = useApp();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getSubscriptionStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 mx-auto text-purple-400 animate-spin mb-3" />
        <p className="font-bold text-sm text-slate-300">A carregar estatísticas SaaS...</p>
      </div>
    );
  }

  // Encontrar o valor máximo de faturação por mês para dimensionar as barras
  const maxMonthValue = Math.max(...stats.faturacaoPorMes.map((m) => m.valor), 10);
  // Encontrar o total máximo de clientes para dimensionar o gráfico de crescimento
  const maxClientsValue = Math.max(...stats.crescimentoClientes.map((c) => c.total), 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Painel de Métricas & Faturação SaaS
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento em tempo real de faturação por mês/ano, receita recorrente e crescimento da base de clientes.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Faturado */}
        <div className="bg-slate-800/80 border border-purple-500/30 p-4 rounded-2xl">
          <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Euro className="w-3 h-3" /> Total Faturado
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {stats.totalFaturado.toFixed(2)}€
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Histórico global validado</div>
        </div>

        {/* Faturado Mês Atual */}
        <div className="bg-slate-800/80 border border-emerald-500/30 p-4 rounded-2xl">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Faturação Mês
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {stats.faturadoMesAtual.toFixed(2)}€
          </div>
          <div className="text-[10px] text-emerald-500/70 mt-0.5">Mês corrente</div>
        </div>

        {/* Total Clientes */}
        <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Total Salões
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {stats.totalClientes}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Registados na app</div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-slate-800/80 border border-emerald-500/30 p-4 rounded-2xl">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Clientes Ativos
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {stats.clientesAtivos}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Mensalidade regular</div>
        </div>

        {/* Clientes em Prova (30d) */}
        <div className="bg-slate-800/80 border border-indigo-500/30 p-4 rounded-2xl">
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Em Teste (30d)
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300">
            {stats.clientesProva}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Novos salões em prova</div>
        </div>

        {/* Bloqueados / Pendentes */}
        <div className="bg-slate-800/80 border border-rose-500/30 p-4 rounded-2xl">
          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Bloqueados
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400">
            {stats.clientesBloqueados}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">A aguardar pagamento</div>
        </div>
      </div>

      {/* Gráficos em Grade de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Faturação por Mês (Últimos 6 Meses) */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Faturação Mensal (Últimos 6 Meses)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Valores em Euros (€)</span>
          </div>

          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-3 h-48 border-b border-slate-700 px-2">
              {stats.faturacaoPorMes.map((item) => {
                const heightPercent = Math.max(8, Math.round((item.valor / maxMonthValue) * 100));
                return (
                  <div key={item.mes} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip no hover */}
                    <span className="text-[11px] font-bold text-purple-300 opacity-90 group-hover:opacity-100 transition-opacity">
                      {item.valor.toFixed(0)}€
                    </span>

                    {/* Barra do gráfico */}
                    <div className="w-full max-w-[42px] bg-slate-900 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-500 shadow-md shadow-purple-500/20 group-hover:from-purple-600 group-hover:to-indigo-400"
                      />
                    </div>

                    {/* Rótulo do Mês */}
                    <span className="text-[10px] font-semibold text-slate-400 text-center whitespace-nowrap mt-1">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
            <span>Barras representam o total de mensalidades validadas por mês.</span>
          </div>
        </div>

        {/* Gráfico 2: Crescimento da Base de Clientes (Últimos 6 Meses) */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Crescimento de Clientes
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Salões Totais & Novos</span>
          </div>

          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-3 h-48 border-b border-slate-700 px-2">
              {stats.crescimentoClientes.map((item) => {
                const heightPercent = Math.max(10, Math.round((item.total / maxClientsValue) * 100));
                return (
                  <div key={item.mes} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip com novos e total */}
                    <span className="text-[11px] font-bold text-emerald-300 opacity-90 group-hover:opacity-100 transition-opacity">
                      {item.total} salões
                    </span>

                    {/* Barra do gráfico */}
                    <div className="w-full max-w-[42px] bg-slate-900 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-emerald-700 to-teal-400 rounded-t-lg transition-all duration-500 shadow-md shadow-emerald-500/20 group-hover:from-emerald-600 group-hover:to-teal-300 relative"
                      >
                        {item.novos > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-emerald-500/30 text-emerald-200 px-1 rounded-sm border border-emerald-400/30">
                            +{item.novos}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rótulo do Mês */}
                    <span className="text-[10px] font-semibold text-slate-400 text-center whitespace-nowrap mt-1">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
            <span>Mede o número total acumulado de salões e novas adesões.</span>
          </div>
        </div>

        {/* Gráfico 3: Faturação por Ano */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Faturação Anual Comparativa
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Últimos Anos</span>
          </div>

          <div className="space-y-3 pt-2">
            {stats.faturacaoPorAno.map((item) => {
              const maxYearVal = Math.max(...stats.faturacaoPorAno.map((y) => y.valor), 10);
              const widthPercent = Math.max(5, Math.round((item.valor / maxYearVal) * 100));

              return (
                <div key={item.ano} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="font-mono text-sm">{item.ano}</span>
                    <span className="text-purple-300 font-black text-sm">
                      {item.valor.toFixed(2)}€{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({item.count} pagamentos)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-700/80">
                    <div
                      style={{ width: `${widthPercent}%` }}
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-700 shadow-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
