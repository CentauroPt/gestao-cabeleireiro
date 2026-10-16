import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { BookingChannel } from '../../types';
import {
  TrendingUp,
  UserCheck,
  PhoneCall,
  MessageCircle,
  Layers,
  Award,
  Search,
} from 'lucide-react';

export const BookingStatsView: React.FC = () => {
  const { appointments, staffMembers, currentSalon } = useApp();

  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'last30'>('all');
  const [channelFilter, setChannelFilter] = useState<'ALL' | BookingChannel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const todayStr = useMemo(() => {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const currentMonthStr = useMemo(() => {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  // Filtrar marcações por período
  const periodFilteredAppointments = useMemo(() => {
    const today = new Date(todayStr);

    return appointments.filter((apt) => {
      if (periodFilter === 'today') {
        return apt.date === todayStr;
      }
      if (periodFilter === 'month') {
        return apt.date.startsWith(currentMonthStr);
      }
      if (periodFilter === 'week') {
        const aptDate = new Date(apt.date);
        const diffDays = (today.getTime() - aptDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= -7 && diffDays <= 7;
      }
      if (periodFilter === 'last30') {
        const aptDate = new Date(apt.date);
        const diffDays = (today.getTime() - aptDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      return true;
    });
  }, [appointments, periodFilter, todayStr, currentMonthStr]);

  // Contagens e Faturação por canal
  const stats = useMemo(() => {
    let presencialCount = 0;
    let presencialRevenue = 0;
    let telefoneCount = 0;
    let telefoneRevenue = 0;
    let whatsappCount = 0;
    let whatsappRevenue = 0;

    periodFilteredAppointments.forEach((apt) => {
      const channel = apt.bookingChannel || 'presencial';
      const price = Number(apt.totalPrice) || 0;

      if (channel === 'presencial') {
        presencialCount++;
        presencialRevenue += price;
      } else if (channel === 'telefone') {
        telefoneCount++;
        telefoneRevenue += price;
      } else if (channel === 'whatsapp') {
        whatsappCount++;
        whatsappRevenue += price;
      }
    });

    const total = periodFilteredAppointments.length;
    const totalRevenue = presencialRevenue + telefoneRevenue + whatsappRevenue;

    const presencialPct = total > 0 ? Math.round((presencialCount / total) * 100) : 0;
    const telefonePct = total > 0 ? Math.round((telefoneCount / total) * 100) : 0;
    const whatsappPct = total > 0 ? Math.round((whatsappCount / total) * 100) : 0;

    // Determinar canal líder
    const channelRank = [
      { id: 'whatsapp' as BookingChannel, name: 'WhatsApp', count: whatsappCount, pct: whatsappPct, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
      { id: 'telefone' as BookingChannel, name: 'Chamada telefónica', count: telefoneCount, pct: telefonePct, color: 'text-blue-700 bg-blue-50 border-blue-300' },
      { id: 'presencial' as BookingChannel, name: 'Presencial', count: presencialCount, pct: presencialPct, color: 'text-purple-700 bg-purple-50 border-purple-300' },
    ].sort((a, b) => b.count - a.count);

    const leader = total > 0 ? channelRank[0] : null;

    return {
      total,
      totalRevenue,
      presencial: { count: presencialCount, pct: presencialPct, revenue: presencialRevenue },
      telefone: { count: telefoneCount, pct: telefonePct, revenue: telefoneRevenue },
      whatsapp: { count: whatsappCount, pct: whatsappPct, revenue: whatsappRevenue },
      leader,
    };
  }, [periodFilteredAppointments]);

  // Lista detalhada com filtro adicional por canal e pesquisa
  const displayList = useMemo(() => {
    return periodFilteredAppointments.filter((apt) => {
      const channel = apt.bookingChannel || 'presencial';
      if (channelFilter !== 'ALL' && channel !== channelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          apt.clientName.toLowerCase().includes(q) ||
          apt.clientPhone.includes(q) ||
          apt.serviceNames.some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    });
  }, [periodFilteredAppointments, channelFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Análise de Origens
            </span>
            <span className="text-xs text-slate-400">• Salão {currentSalon?.name}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            Estatistica de reservas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitorização dos canais de entrada de clientes (Presencial, Chamada telefónica, WhatsApp) para saber por onde entram mais reservas.
          </p>
        </div>

        {/* Filtro Rápido de Período */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs self-start md:self-center">
          <button
            type="button"
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'all' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todo o Histórico
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('month')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'month' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mês
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('last30')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'last30' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 30d
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('week')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'week' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Esta Semana
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'today' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Destaque do Canal Líder (Insight) */}
      {stats.leader && stats.leader.count > 0 && (
        <div className={`p-4 rounded-3xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${stats.leader.color}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center text-xl shrink-0">
              <Award className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80 block">
                Canal com Maior Volume de Entrada
              </span>
              <p className="text-base font-black">
                {stats.leader.name} é o canal por onde entram mais reservas!
              </p>
              <p className="text-xs opacity-90">
                Representa <strong>{stats.leader.pct}%</strong> de todas as reservas registadas no período ({stats.leader.count} marcações).
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-white font-black text-xs rounded-xl shadow-xs self-start sm:self-auto border border-current/20">
            {stats.leader.pct}% do Total
          </span>
        </div>
      )}

      {/* 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Geral */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Reservas
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">
            Faturação estimada: <strong className="text-slate-900">{stats.totalRevenue.toFixed(2)}€</strong>
          </div>
        </div>

        {/* Presencial */}
        <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Presencial
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-purple-900">{stats.presencial.count}</span>
            <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              {stats.presencial.pct}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Receita: <strong className="text-purple-900">{stats.presencial.revenue.toFixed(2)}€</strong>
          </div>
        </div>

        {/* Chamada telefónica */}
        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Chamada telefónica
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-blue-900">{stats.telefone.count}</span>
            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {stats.telefone.pct}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Receita: <strong className="text-blue-900">{stats.telefone.revenue.toFixed(2)}€</strong>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              WhatsApp
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-900">{stats.whatsapp.count}</span>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {stats.whatsapp.pct}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Receita: <strong className="text-emerald-900">{stats.whatsapp.revenue.toFixed(2)}€</strong>
          </div>
        </div>
      </div>

      {/* Gráfico Visual de Distribuição de Percentagens */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <span>Distribuição Percentual de Entrada</span>
        </h3>

        {/* Barra Segmentada */}
        <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
          {stats.presencial.pct > 0 && (
            <div
              style={{ width: `${stats.presencial.pct}%` }}
              className="bg-purple-600 h-full transition-all duration-500"
              title={`Presencial: ${stats.presencial.pct}%`}
            />
          )}
          {stats.telefone.pct > 0 && (
            <div
              style={{ width: `${stats.telefone.pct}%` }}
              className="bg-blue-600 h-full transition-all duration-500"
              title={`Chamada telefónica: ${stats.telefone.pct}%`}
            />
          )}
          {stats.whatsapp.pct > 0 && (
            <div
              style={{ width: `${stats.whatsapp.pct}%` }}
              className="bg-emerald-600 h-full transition-all duration-500"
              title={`WhatsApp: ${stats.whatsapp.pct}%`}
            />
          )}
        </div>

        {/* Legenda com Valores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-600 shrink-0"></span>
            <div>
              <p className="text-xs font-bold text-slate-800">Presencial</p>
              <p className="text-[11px] text-slate-500">
                {stats.presencial.count} reservas ({stats.presencial.pct}%) • {stats.presencial.revenue.toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shrink-0"></span>
            <div>
              <p className="text-xs font-bold text-slate-800">Chamada telefónica</p>
              <p className="text-[11px] text-slate-500">
                {stats.telefone.count} reservas ({stats.telefone.pct}%) • {stats.telefone.revenue.toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0"></span>
            <div>
              <p className="text-xs font-bold text-slate-800">WhatsApp</p>
              <p className="text-[11px] text-slate-500">
                {stats.whatsapp.count} reservas ({stats.whatsapp.pct}%) • {stats.whatsapp.revenue.toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Marcações com Filtro por Canal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Marcações Discriminadas por Canal de Entrada
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {displayList.length} marcações encontradas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor do Canal */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  channelFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('presencial')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  channelFilter === 'presencial' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                Presencial
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('telefone')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  channelFilter === 'telefone' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Telefone
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('whatsapp')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  channelFilter === 'whatsapp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                WhatsApp
              </button>
            </div>

            {/* Pesquisa rápida */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Canal de Entrada</th>
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Profissional</th>
                <th className="py-3 px-4">Serviços</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma marcação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                displayList.map((apt) => {
                  const channel = apt.bookingChannel || 'presencial';
                  const prof = staffMembers.find((s) => s.id === apt.userId);

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold">
                        {channel === 'presencial' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 text-[11px] font-extrabold border border-purple-200">
                            <UserCheck className="w-3 h-3 text-purple-600" />
                            Presencial
                          </span>
                        )}
                        {channel === 'telefone' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 text-[11px] font-extrabold border border-blue-200">
                            <PhoneCall className="w-3 h-3 text-blue-600" />
                            Chamada telefónica
                          </span>
                        )}
                        {channel === 'whatsapp' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            WhatsApp
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div>{apt.date}</div>
                        <div className="text-[10px] text-slate-400">{apt.startTime} às {apt.endTime}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{apt.clientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{apt.clientPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {prof?.name || 'Profissional'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {apt.serviceNames.join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {apt.totalPrice.toFixed(2)}€
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            apt.status === 'CONCLUIDA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
