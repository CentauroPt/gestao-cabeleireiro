import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Unlock,
  ShieldAlert,
  TrendingUp,
  Users,
  Calendar,
  UserCheck,
  Search,
  Printer,
  ChevronDown,
  ChevronRight,
  Euro,
  Scissors,
  CheckCircle2,
  CalendarDays,
  BarChart3,
  Award,
  LogOut,
  Sparkles,
  Filter,
  RotateCcw,
  Eye,
  EyeOff,
  Palette,
  ShieldCheck,
  CreditCard,
  Monitor,
  FileText,
  X,
} from 'lucide-react';
import { SalonCustomizationModal } from '../salon/SalonCustomizationModal';
import { MyPaymentsView } from '../subscription/MyPaymentsView';
import { SalonAdminsView } from './SalonAdminsView';
import { BookingStatsView } from './BookingStatsView';

type ReportTab = 'clients' | 'daily' | 'monthly' | 'staff';

const MONTHS_PT = [
  { value: '01', label: 'Janeiro', name: 'Janeiro' },
  { value: '02', label: 'Fevereiro', name: 'Fevereiro' },
  { value: '03', label: 'Março', name: 'Março' },
  { value: '04', label: 'Abril', name: 'Abril' },
  { value: '05', label: 'Maio', name: 'Maio' },
  { value: '06', label: 'Junho', name: 'Junho' },
  { value: '07', label: 'Julho', name: 'Julho' },
  { value: '08', label: 'Agosto', name: 'Agosto' },
  { value: '09', label: 'Setembro', name: 'Setembro' },
  { value: '10', label: 'Outubro', name: 'Outubro' },
  { value: '11', label: 'Novembro', name: 'Novembro' },
  { value: '12', label: 'Dezembro', name: 'Dezembro' },
];

const DAYS_LIST = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

interface SalesTransaction {
  id: string;
  clientId: string;
  clientName: string;
  date: string; // YYYY-MM-DD ou ISO
  dateStr: string; // YYYY-MM-DD
  monthStr: string; // YYYY-MM
  professionalId: string;
  professionalName: string;
  amount: number;
  services: string[];
  notes?: string;
}

interface AdminReportsViewProps {
  initialSection?: 'reports' | 'booking_stats' | 'payments' | 'admins';
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({ initialSection = 'reports' }) => {
  const {
    currentSalon,
    currentUser,
    users,
    staffMembers,
    clients,
    appointments,
    isAdminUnlocked,
    unlockAdmin,
    lockAdmin,
    updateSalonCustomization,
    daysRemainingInTrial,
    isSubscriptionBlocked,
    hasPendingPayment,
    refreshSubscriptionData,
  } = useApp();

  const isTrialActive = currentSalon?.estado_subscricao === 'prova' && !isSubscriptionBlocked;
  const [adminSection, setAdminSection] = useState<'reports' | 'booking_stats' | 'payments' | 'admins'>(initialSection);

  React.useEffect(() => {
    if (initialSection) {
      setAdminSection(initialSection);
    }
  }, [initialSection]);

  // Sincronizar dados de subscrição ao aceder à Área de Administrador
  React.useEffect(() => {
    refreshSubscriptionData();
  }, [refreshSubscriptionData]);

  // Estados de Autenticação
  const salonAdmins = useMemo(() => {
    return users.filter((u) => u.salonId === currentSalon?.id && u.role === 'ADMIN');
  }, [users, currentSalon]);

  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  // Estados para Modal de Opções de Impressão (Ecrã vs Relatório de Estatística)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleExecutePrint = (mode: 'screen' | 'report') => {
    setIsPrintModalOpen(false);
    document.body.setAttribute('data-print-mode', mode);

    const cleanup = () => {
      document.body.removeAttribute('data-print-mode');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Pré-selecionar email do administrador atual se disponível
  React.useEffect(() => {
    if (currentUser?.role === 'ADMIN' && currentUser.email && !inputEmail) {
      setInputEmail(currentUser.email);
    } else if (!inputEmail && salonAdmins.length === 1 && salonAdmins[0].email) {
      setInputEmail(salonAdmins[0].email);
    }
  }, [currentUser, salonAdmins]);

  // Estados dos Relatórios
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('clients');
  const [clientSearch, setClientSearch] = useState('');
  const [clientSort, setClientSort] = useState<'spending_desc' | 'visits_desc' | 'name_asc'>('spending_desc');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dailyFilter, setDailyFilter] = useState<'all' | 'last7' | 'last30'>('all');

  // Estados do Filtro de Período (Dia, Mês e Ano)
  const [filterDay, setFilterDay] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');

  // Compilar todas as transações reais reservadas e faturadas a partir da agenda do salão
  const allSales = useMemo<SalesTransaction[]>(() => {
    const list: SalesTransaction[] = [];

    // As reservas ativas (não canceladas) constituem a fonte única e real de faturação do salão
    appointments.forEach((apt) => {
      if (apt.status !== 'CANCELADA') {
        const prof = users.find((u) => u.id === apt.userId);
        const client = clients.find((c) => c.id === apt.clientId);
        const dateStr = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date.slice(0, 10);
        const monthStr = dateStr.slice(0, 7);

        list.push({
          id: apt.id,
          clientId: apt.clientId,
          clientName: client?.name || apt.clientName || 'Cliente',
          date: apt.date.includes('T') ? apt.date : `${apt.date}T${apt.startTime || '00:00'}:00`,
          dateStr,
          monthStr,
          professionalId: apt.userId,
          professionalName: prof?.name || 'Profissional',
          amount: Number(apt.totalPrice) || 0,
          services: apt.serviceNames || [],
          notes: apt.notes,
        });
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments, clients, users]);

  // Anos disponíveis para filtro
  const availableYears = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    const yearsSet = new Set<string>([currentYear, '2026', '2025', '2024']);
    allSales.forEach((sale) => {
      const y = sale.dateStr.slice(0, 4);
      if (y && y.length === 4) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [allSales]);

  // Transações filtradas por Dia, Mês, Ano, Filtro Rápido (7/30 dias) e Pesquisa de Cliente
  const filteredSales = useMemo<SalesTransaction[]>(() => {
    let cutoffStr = '';
    if (dailyFilter === 'last7') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoffStr = cutoff.toISOString().split('T')[0];
    } else if (dailyFilter === 'last30') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      cutoffStr = cutoff.toISOString().split('T')[0];
    }

    const q = clientSearch.trim().toLowerCase();
    const matchingClientIds = q
      ? new Set(
          clients
            .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
            .map((c) => c.id)
        )
      : null;

    return allSales.filter((sale) => {
      const y = sale.dateStr.slice(0, 4);
      const m = sale.dateStr.slice(5, 7);
      const d = sale.dateStr.slice(8, 10);
      if (filterYear !== 'ALL' && y !== filterYear) return false;
      if (filterMonth !== 'ALL' && m !== filterMonth) return false;
      if (filterDay !== 'ALL' && d !== filterDay) return false;
      if (cutoffStr && sale.dateStr < cutoffStr) return false;
      if (matchingClientIds && !matchingClientIds.has(sale.clientId)) return false;
      return true;
    });
  }, [allSales, filterYear, filterMonth, filterDay, dailyFilter, clientSearch, clients]);

  const isDateFilterActive =
    filterYear !== 'ALL' ||
    filterMonth !== 'ALL' ||
    filterDay !== 'ALL' ||
    dailyFilter !== 'all' ||
    clientSearch.trim() !== '';

  const activeFilterDescription = useMemo(() => {
    const parts: string[] = [];
    if (filterDay !== 'ALL') parts.push(`Dia ${filterDay}`);
    if (filterMonth !== 'ALL') {
      const mObj = MONTHS_PT.find((m) => m.value === filterMonth);
      parts.push(mObj ? mObj.name : `Mês ${filterMonth}`);
    }
    if (filterYear !== 'ALL') parts.push(`Ano ${filterYear}`);
    if (dailyFilter === 'last7') parts.push('Últimos 7 Dias');
    if (dailyFilter === 'last30') parts.push('Últimos 30 Dias');
    if (clientSearch.trim() !== '') parts.push(`Cliente: "${clientSearch.trim()}"`);
    if (parts.length === 0) return 'Todo o Histórico';
    return parts.join(' • ');
  }, [filterDay, filterMonth, filterYear, dailyFilter, clientSearch]);

  // Totais Gerais (baseados em todos os filtros ativos)
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + sale.amount, 0);
  }, [filteredSales]);

  const totalProcedures = filteredSales.length;

  const averageTicket = useMemo(() => {
    if (totalProcedures === 0) return 0;
    return totalRevenue / totalProcedures;
  }, [totalRevenue, totalProcedures]);

  const activeClientsInPeriod = useMemo(() => {
    return new Set(filteredSales.map((s) => s.clientId)).size;
  }, [filteredSales]);

  // Agrupar vendas por mês para a Folha Oficial de Impressão Estatística
  const salesGroupedByMonth = useMemo(() => {
    const map = new Map<string, { label: string; sales: SalesTransaction[]; total: number }>();

    filteredSales.forEach((sale) => {
      const monthKey = sale.monthStr || sale.dateStr.slice(0, 7) || 'Geral';
      let label = monthKey;
      if (monthKey.includes('-')) {
        const [y, m] = monthKey.split('-');
        const mObj = MONTHS_PT.find((item) => item.value === m);
        label = `${mObj?.name || m} de ${y}`;
      }

      if (!map.has(monthKey)) {
        map.set(monthKey, { label, sales: [], total: 0 });
      }
      const g = map.get(monthKey)!;
      g.sales.push(sale);
      g.total += sale.amount;
    });

    return Array.from(map.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      sales: data.sales,
      total: data.total,
    }));
  }, [filteredSales]);

  // Resumo de Vendas por Profissional para o Relatório Formal
  const staffSalesSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    filteredSales.forEach((s) => {
      const pName = s.professionalName || 'Profissional';
      if (!map.has(pName)) {
        map.set(pName, { name: pName, count: 0, total: 0 });
      }
      const entry = map.get(pName)!;
      entry.count += 1;
      entry.total += s.amount;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Funções auxiliares de filtro rápido
  const handleSelectToday = () => {
    const now = new Date();
    setDailyFilter('all');
    setFilterYear(String(now.getFullYear()));
    setFilterMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setFilterDay(String(now.getDate()).padStart(2, '0'));
  };

  const handleSelectCurrentMonth = () => {
    const now = new Date();
    setDailyFilter('all');
    setFilterYear(String(now.getFullYear()));
    setFilterMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setFilterDay('ALL');
  };

  const handleSelectCurrentYear = () => {
    const now = new Date();
    setDailyFilter('all');
    setFilterYear(String(now.getFullYear()));
    setFilterMonth('ALL');
    setFilterDay('ALL');
  };

  const handleResetDateFilters = () => {
    setFilterYear('ALL');
    setFilterMonth('ALL');
    setFilterDay('ALL');
    setDailyFilter('all');
    setClientSearch('');
  };

  const exactDateValue =
    filterYear !== 'ALL' && filterMonth !== 'ALL' && filterDay !== 'ALL'
      ? `${filterYear}-${filterMonth}-${filterDay}`
      : '';

  const handleExactDateChange = (val: string) => {
    if (!val) {
      handleResetDateFilters();
      return;
    }
    const [y, m, d] = val.split('-');
    if (y && m && d) {
      setDailyFilter('all');
      setFilterYear(y);
      setFilterMonth(m);
      setFilterDay(d);
    }
  };

  // Tratar Autenticação
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const success = unlockAdmin(inputPassword, inputEmail);
    if (!success) {
      setAuthError('Credenciais inválidas. Verifique o e-mail ou a palavra-passe.');
    } else {
      setInputEmail('');
      setInputPassword('');
    }
  };

  // Se não estiver desbloqueado, renderizar portal de autenticação
  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xl text-center">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full mb-3 border border-amber-200/60">
          <ShieldAlert className="w-3.5 h-3.5" /> Acesso Restrito ao Administrador
        </span>

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Administrador
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          Para aceder à área de Administrador de <strong>{currentSalon?.name}</strong>, introduza as credenciais de um administrador do salão.
        </p>

        <form onSubmit={handleLoginSubmit} autoComplete="off" className="mt-6 text-left space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Administrador / E-mail
            </label>
            {salonAdmins.length > 1 ? (
              <select
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium cursor-pointer"
              >
                <option value="">Selecione o Administrador...</option>
                {salonAdmins.map((adm) => (
                  <option key={adm.id} value={adm.email}>
                    {adm.name} ({adm.email})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="email"
                required
                autoComplete="off"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="Introduza o e-mail do administrador..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Palavra-passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="Introduza a palavra-passe..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors"
                title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Unlock className="w-4 h-4" /> Desbloquear Área do Administrador
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-400">
          Proteção de dados com controlo RBAC. Os colaboradores da equipa não possuem permissão de acesso a estes dados.
        </div>
      </div>
    );
  }

  // Se estiver desbloqueado, renderizar o Painel de Relatórios Completo
  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sessão de Administrador Ativa
            </span>
            <span className="text-xs text-slate-400">• {currentUser?.name || salonAdmins[0]?.name || 'Administrador'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Área do Administrador
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestão administrativa, relatórios financeiros e pagamentos do salão <strong>{currentSalon?.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <button
            onClick={() => setIsCustomizationOpen(true)}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Personalizar nome, cores e logótipo do seu salão"
          >
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Personalizar Salão</span>
          </button>
          {adminSection === 'reports' && (
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                title="Opções de impressão: Relatório de Estatística Formal A4 ou Ecrã"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Imprimir Estatística</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          )}
          <button
            onClick={lockAdmin}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200/60"
            title="Bloquear sessão administrativa"
          >
            <LogOut className="w-4 h-4" /> Encerrar Acesso Admin
          </button>
        </div>
      </div>

      {/* Seletor de Módulos da Área do Administrador */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-slate-200 print:hidden">
        <button
          onClick={() => setAdminSection('reports')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            adminSection === 'reports'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>Estatísticas & Relatórios Financeiros</span>
        </button>

        <button
          onClick={() => setAdminSection('booking_stats')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            adminSection === 'booking_stats'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Estatistica de reservas</span>
        </button>

        <button
          onClick={() => setAdminSection('payments')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            adminSection === 'payments'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>Os Meus Pagamentos</span>
          {isTrialActive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
              {daysRemainingInTrial}d prova
            </span>
          )}
          {hasPendingPayment && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
              Pendente
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminSection('admins')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            adminSection === 'admins'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Gestão Administrativa</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
            {salonAdmins.length}
          </span>
        </button>
      </div>

      {adminSection === 'booking_stats' ? (
        <BookingStatsView />
      ) : adminSection === 'payments' ? (
        <MyPaymentsView />
      ) : adminSection === 'admins' ? (
        <SalonAdminsView />
      ) : (
        <>
          {/* Barra Informativa quando em Modo de Pré-visualização do Relatório no Ecrã */}
          {isPreviewMode && (
            <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl print:hidden animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Pré-visualização do Relatório Formal de Estatística</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      Folha A4 Oficial
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Formato idêntico ao extrato de pagamentos: com logótipo, NIF, dados fiscais, indicadores e discriminação por mês/datas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExecutePrint('report')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir Relatório Formal
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
                >
                  Voltar ao Ecrã
                </button>
              </div>
            </div>
          )}

          {/* Contentor Interativo de Ecrã (oculto se o utilizador está em pré-visualização ou imprimindo relatório formal) */}
          <div className={`screen-only-section space-y-6 ${isPreviewMode ? 'hidden' : ''}`}>
            {/* Cartão de Personalização do Salão e Início de Semana na Página do Administrador */}
      <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-slate-50 border border-purple-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {currentSalon?.logoUrl ? (
            <img
              src={currentSalon.logoUrl}
              alt={currentSalon.name}
              className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 shadow-xs p-1 shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: currentSalon?.primaryColor || '#8B5CF6' }}
            >
              <Scissors className="w-6 h-6 transform -rotate-45" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              Configurações & Identidade do Salão ({currentSalon?.name})
              <span
                className="w-3.5 h-3.5 rounded-full inline-block shadow-xs border border-white"
                style={{ backgroundColor: currentSalon?.primaryColor || '#8B5CF6' }}
                title={`Cor principal: ${currentSalon?.primaryColor || '#8B5CF6'}`}
              />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize o nome, logótipo, cores e defina o <strong>dia de início da semana de trabalho</strong> da agenda.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor do Dia de Início da Semana de Trabalho */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                Início da Semana:
              </span>
              <select
                value={currentSalon?.startDayOfWeek !== undefined ? currentSalon.startDayOfWeek : 1}
                onChange={async (e) => {
                  const dayVal = Number(e.target.value);
                  if (currentSalon) {
                    await updateSalonCustomization(currentSalon.id, { startDayOfWeek: dayVal });
                  }
                }}
                className="text-xs font-extrabold text-slate-800 bg-transparent border-none outline-none cursor-pointer p-0"
                title="Escolha o dia em que a semana de trabalho começa na agenda semanal"
              >
                <option value={1}>Segunda-feira (Padrão)</option>
                <option value={2}>Terça-feira (Ideal p/ fecho à 2ª)</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomizationOpen(true)}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-full text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-2 shrink-0"
            title="Personalizar nome, cores, logótipo e semana de trabalho do seu salão"
          >
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Personalizar Salão</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE FILTRO DE VENDAS POR DIA, MÊS E ANO */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                <span>Filtrar Vendas por Dia, Mês e Ano</span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {activeFilterDescription}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Selecione o Dia, Mês ou Ano abaixo para filtrar os relatórios de vendas.
              </p>
            </div>
          </div>

          {/* Atalhos Rápidos de Período */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Atalhos:
            </span>
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterYear('ALL');
                setFilterMonth('ALL');
                setFilterDay('ALL');
                setDailyFilter('last7');
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                dailyFilter === 'last7'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700'
              }`}
            >
              Últimos 7 Dias
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterYear('ALL');
                setFilterMonth('ALL');
                setFilterDay('ALL');
                setDailyFilter('last30');
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                dailyFilter === 'last30'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700'
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              type="button"
              onClick={handleSelectCurrentMonth}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors cursor-pointer"
            >
              Este Mês
            </button>
            <button
              type="button"
              onClick={handleSelectCurrentYear}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors cursor-pointer"
            >
              Este Ano
            </button>
            {isDateFilterActive && (
              <button
                type="button"
                onClick={handleResetDateFilters}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpar Filtro (Ver Tudo)
              </button>
            )}
          </div>
        </div>

        {/* Seletores de Dia, Mês, Ano e Data Exata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtro por Dia */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtrar por Dia
            </label>
            <select
              value={filterDay}
              onChange={(e) => {
                setDailyFilter('all');
                setFilterDay(e.target.value);
              }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl border transition-all outline-none cursor-pointer ${
                filterDay !== 'ALL'
                  ? 'bg-purple-50/70 border-purple-300 text-purple-900 ring-2 ring-purple-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <option value="ALL">Todos os Dias</option>
              {DAYS_LIST.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Mês */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtrar por Mês
            </label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setDailyFilter('all');
                setFilterMonth(e.target.value);
              }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl border transition-all outline-none cursor-pointer ${
                filterMonth !== 'ALL'
                  ? 'bg-purple-50/70 border-purple-300 text-purple-900 ring-2 ring-purple-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <option value="ALL">Todos os Meses</option>
              {MONTHS_PT.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Ano */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtrar por Ano
            </label>
            <select
              value={filterYear}
              onChange={(e) => {
                setDailyFilter('all');
                setFilterYear(e.target.value);
              }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl border transition-all outline-none cursor-pointer ${
                filterYear !== 'ALL'
                  ? 'bg-purple-50/70 border-purple-300 text-purple-900 ring-2 ring-purple-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <option value="ALL">Todos os Anos</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Ano {y}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Data Exata no Calendário */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Escolher Data no Calendário
            </label>
            <input
              type="date"
              value={exactDateValue}
              onChange={(e) => handleExactDateChange(e.target.value)}
              className={`w-full px-3 py-1.5 text-xs font-bold rounded-xl border transition-all outline-none cursor-pointer ${
                exactDateValue
                  ? 'bg-purple-50/70 border-purple-300 text-purple-900 ring-2 ring-purple-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards (Sempre sincronizados com os valores filtrados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print-card break-inside-avoid">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print-card break-inside-avoid">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isDateFilterActive ? 'Faturação Filtrada' : 'Faturação Total'}
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Euro className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalRevenue.toFixed(2)}€
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {isDateFilterActive ? `Período: ${activeFilterDescription}` : 'Receita acumulada no salão'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print-card break-inside-avoid">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Procedimentos Realizados</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Scissors className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalProcedures}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isDateFilterActive ? `Serviços em ${activeFilterDescription}` : 'Intervenções concluídas no histórico'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print-card break-inside-avoid">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ticket Médio</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {averageTicket.toFixed(2)}€
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isDateFilterActive ? `Média em ${activeFilterDescription}` : 'Média gasta por marcação / serviço'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print-card break-inside-avoid">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isDateFilterActive ? 'Clientes no Período' : 'Base de Clientes'}
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {activeClientsInPeriod}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isDateFilterActive
              ? `${activeClientsInPeriod} de ${clients.length} cliente(s) com compras no período`
              : `${activeClientsInPeriod} de ${clients.length} clientes já efetuaram compras`}
          </div>
        </div>
      </div>

      {/* Tabs Selector for the 4 Requested Reports */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveReportTab('clients')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
            activeReportTab === 'clients'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            <span>Vendas por Cliente</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeReportTab === 'clients'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {totalRevenue.toFixed(2)}€
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('daily')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
            activeReportTab === 'daily'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>Vendas Diárias</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeReportTab === 'daily'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {totalRevenue.toFixed(2)}€
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('monthly')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
            activeReportTab === 'monthly'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Vendas Mensais</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeReportTab === 'monthly'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {totalRevenue.toFixed(2)}€
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('staff')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
            activeReportTab === 'staff'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Vendas por Colaborador</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeReportTab === 'staff'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {totalRevenue.toFixed(2)}€
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. RELATÓRIO DE VENDAS POR CLIENTE */}
      {/* ======================================================== */}
      {activeReportTab === 'clients' && (() => {
        const enrichedClients = clients
          .filter((c) => {
            const q = clientSearch.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.phone.includes(q);
          })
          .map((client) => {
            const clientSales = filteredSales.filter((s) => s.clientId === client.id);
            const visitsCount = clientSales.length;
            const spent = clientSales.reduce((sum, s) => sum + s.amount, 0);
            const avg = visitsCount > 0 ? spent / visitsCount : 0;
            return { client, clientSales, visitsCount, spent, avg };
          })
          .sort((a, b) => {
            if (clientSort === 'spending_desc') return b.spent - a.spent;
            if (clientSort === 'visits_desc') return b.visitsCount - a.visitsCount;
            return a.client.name.localeCompare(b.client.name);
          });

        const totalClientsRevenue = enrichedClients.reduce((sum, c) => sum + c.spent, 0);
        const totalClientsVisits = enrichedClients.reduce((sum, c) => sum + c.visitsCount, 0);
        const activeClientsCount = enrichedClients.filter((c) => c.spent > 0).length;
        const avgPerClient = enrichedClients.length > 0 ? totalClientsRevenue / enrichedClients.length : 0;
        const topClient = [...enrichedClients].sort((a, b) => b.spent - a.spent)[0];

        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5 print-card break-inside-avoid">
            {/* Banner de Informação da Faturação — Vendas por Cliente */}
            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-emerald-50/70 border border-purple-200/80 rounded-2xl print-card break-inside-avoid">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Euro className="w-4 h-4 text-purple-600" />
                  Informação de Faturação — Vendas por Cliente ({activeFilterDescription})
                </span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Total Faturado: {totalClientsRevenue.toFixed(2)}€
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 break-inside-avoid">
                <div className="bg-white/90 p-3 rounded-xl border border-purple-100 shadow-2xs print-card break-inside-avoid">
                  <div className="text-[11px] font-semibold text-slate-500">Faturação Total (Clientes)</div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">{totalClientsRevenue.toFixed(2)}€</div>
                  <div className="text-[10px] text-slate-400">{totalClientsVisits} intervenções registadas</div>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-purple-100 shadow-2xs print-card break-inside-avoid">
                  <div className="text-[11px] font-semibold text-slate-500">Clientes Faturados</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {activeClientsCount} <span className="text-xs font-normal text-slate-400">de {enrichedClients.length}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Clientes com histórico de faturação</div>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-purple-100 shadow-2xs print-card break-inside-avoid">
                  <div className="text-[11px] font-semibold text-slate-500">Média por Cliente</div>
                  <div className="text-xl font-black text-purple-700 mt-0.5">{avgPerClient.toFixed(2)}€</div>
                  <div className="text-[10px] text-slate-400">Valor médio gasto por cliente</div>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-purple-100 shadow-2xs print-card break-inside-avoid">
                  <div className="text-[11px] font-semibold text-slate-500">Cliente Maior Faturação</div>
                  <div className="text-sm font-black text-slate-900 mt-1 truncate">
                    {topClient && topClient.spent > 0 ? topClient.client.name : 'Sem vendas'}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600">
                    {topClient && topClient.spent > 0 ? `${topClient.spent.toFixed(2)}€` : '0.00€'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Relatório Detalhado de Vendas por Cliente</h2>
                <p className="text-xs text-slate-500">
                  Histórico detalhado de faturação, ticket médio e procedimentos por cliente.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar cliente..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <select
                  value={clientSort}
                  onChange={(e) => setClientSort(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer"
                >
                  <option value="spending_desc">Maior Faturação (€)</option>
                  <option value="visits_desc">Mais Visitas</option>
                  <option value="name_asc">Nome (A - Z)</option>
                </select>
              </div>
            </div>

            {/* Tabela de Clientes */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Profissional Habitual</th>
                    <th className="py-3 px-3 text-center">Visitas / Serviços</th>
                    <th className="py-3 px-3 text-right">Ticket Médio</th>
                    <th className="py-3 px-3 text-right">Total Faturado (€)</th>
                    <th className="py-3 px-3 text-right print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {enrichedClients.map(({ client, clientSales, visitsCount, spent, avg }) => {
                    const preferredProf = users.find((u) => u.id === client.preferredUserId);
                    const isExpanded = expandedClientId === client.id;
                    const percentageOfSalon = totalRevenue > 0 ? (spent / totalRevenue) * 100 : 0;

                    return (
                      <React.Fragment key={client.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{client.name}</div>
                            <div className="text-[11px] text-slate-400">{client.phone}</div>
                          </td>
                          <td className="py-3 px-3">
                            {preferredProf ? (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: preferredProf.color }}
                                />
                                {preferredProf.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Sem preferência</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            {visitsCount}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {avg.toFixed(2)}€
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-extrabold text-slate-900">{spent.toFixed(2)}€</span>
                            <div className="w-24 ml-auto bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className="bg-purple-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, percentageOfSalon)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{percentageOfSalon.toFixed(1)}% do salão</span>
                          </td>
                          <td className="py-3 px-3 text-right print:hidden">
                            <button
                              onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              {isExpanded ? 'Ocultar' : 'Histórico'}
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>

                        {/* Linha expansível com procedimentos do cliente */}
                        {isExpanded && (
                          <tr className="bg-purple-50/30">
                            <td colSpan={6} className="py-3 px-4">
                              <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                                <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
                                  <span>Registo de Intervenções e Faturação ({client.name})</span>
                                  <span className="text-emerald-700">Total Faturado: {spent.toFixed(2)}€</span>
                                </div>

                                {visitsCount === 0 ? (
                                  <p className="text-xs text-slate-400 italic">Nenhum serviço efetuado até ao momento.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {clientSales.map((sale, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-800">
                                            {sale.services?.join(', ') || 'Procedimento Capilar'}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {new Date(sale.dateStr + 'T12:00:00').toLocaleDateString('pt-PT')} • Profissional: {sale.professionalName}
                                            {sale.notes && ` • Nota: "${sale.notes}"`}
                                          </div>
                                        </div>
                                        <div className="font-bold text-slate-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                                          +{sale.amount.toFixed(2)}€
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-emerald-50/60 font-extrabold text-slate-900 text-xs">
                    <td colSpan={2} className="py-3.5 px-3 uppercase tracking-wider text-emerald-900">
                      Total Faturado (Vendas por Cliente)
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-900">{totalClientsVisits} visitas</td>
                    <td className="py-3.5 px-3 text-right text-emerald-900">
                      {(totalClientsVisits > 0 ? totalClientsRevenue / totalClientsVisits : 0).toFixed(2)}€ (média)
                    </td>
                    <td className="py-3.5 px-3 text-right text-sm text-emerald-700">
                      {totalClientsRevenue.toFixed(2)}€
                    </td>
                    <td className="py-3.5 px-3 print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 2. RELATÓRIO DE VENDAS DIÁRIAS */}
      {/* ======================================================== */}
      {activeReportTab === 'daily' && (() => {
        const daysMap = new Map<string, SalesTransaction[]>();
        filteredSales.forEach((sale) => {
          const d = sale.dateStr;
          if (!daysMap.has(d)) daysMap.set(d, []);
          daysMap.get(d)!.push(sale);
        });

        let daysList = Array.from(daysMap.entries())
          .map(([dateStr, items]) => {
            const total = items.reduce((sum, it) => sum + it.amount, 0);
            const avgTicket = total / items.length;
            return { dateStr, items, total, count: items.length, avgTicket };
          })
          .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

        if (dailyFilter === 'last7') {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          const cutoffStr = cutoff.toISOString().split('T')[0];
          daysList = daysList.filter((d) => d.dateStr >= cutoffStr);
        } else if (dailyFilter === 'last30') {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          const cutoffStr = cutoff.toISOString().split('T')[0];
          daysList = daysList.filter((d) => d.dateStr >= cutoffStr);
        }

        const totalDailyRevenue = daysList.reduce((sum, d) => sum + d.total, 0);
        const totalDailyServices = daysList.reduce((sum, d) => sum + d.count, 0);
        const avgPerDay = daysList.length > 0 ? totalDailyRevenue / daysList.length : 0;
        const bestDay = daysList.reduce(
          (best, d) => (d.total > best.total ? d : best),
          daysList[0] || { dateStr: '-', total: 0, count: 0 }
        );

        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Relatório de Vendas Diárias</h2>
                <p className="text-xs text-slate-500">
                  Faturação agrupada dia a dia com volume financeiro e procedimentos realizados ({activeFilterDescription}).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filtrar:</span>
                <button
                  onClick={() => setDailyFilter('all')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                    dailyFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos os Dias
                </button>
                <button
                  onClick={() => setDailyFilter('last30')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                    dailyFilter === 'last30' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Últimos 30 Dias
                </button>
                <button
                  onClick={() => setDailyFilter('last7')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                    dailyFilter === 'last7' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Últimos 7 Dias
                </button>
              </div>
            </div>

            {/* Painel de Informação de Faturação — Vendas Diárias */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 border border-blue-200/80 rounded-2xl p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Informação de Faturação — Vendas Diárias ({activeFilterDescription})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Faturação Total Diária</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {totalDailyRevenue.toFixed(2)}€
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Em {totalDailyServices} serviço(s) registados
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Dias com Faturação</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {daysList.length} dia(s)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Com intervenções faturadas
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Média de Faturação por Dia</div>
                  <div className="text-xl font-extrabold text-blue-700 mt-0.5">
                    {avgPerDay.toFixed(2)}€
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Receita média diária
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Dia de Maior Faturação</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                    {bestDay.dateStr !== '-'
                      ? new Date(bestDay.dateStr + 'T12:00:00').toLocaleDateString('pt-PT')
                      : 'Sem registos'}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 mt-0.5">
                    {bestDay.total.toFixed(2)}€ ({bestDay.count} serv.)
                  </div>
                </div>
              </div>
            </div>

            {daysList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold">Sem vendas registadas para o período selecionado ({activeFilterDescription}).</p>
                <p className="text-xs text-slate-400 mt-0.5">Altere os filtros de Dia, Mês ou Ano acima ou registe serviços na agenda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {daysList.map((dayData) => {
                  const isExpanded = expandedDay === dayData.dateStr;
                  const dateObj = new Date(dayData.dateStr + 'T12:00:00');
                  const formattedDate = dateObj.toLocaleDateString('pt-PT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={dayData.dateStr}
                      className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                    >
                      <div
                        onClick={() => setExpandedDay(isExpanded ? null : dayData.dateStr)}
                        className="p-4 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex flex-col items-center justify-center font-bold">
                            <span className="text-[10px] uppercase">{dateObj.toLocaleDateString('pt-PT', { month: 'short' })}</span>
                            <span className="text-sm leading-none">{dateObj.getDate()}</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 capitalize">
                              {formattedDate}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{dayData.count} serviço(s)</span>
                              <span>•</span>
                              <span>Ticket Médio: {dayData.avgTicket.toFixed(2)}€</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-base font-extrabold text-emerald-700">
                              {dayData.total.toFixed(2)}€
                            </div>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              Faturação do Dia
                            </div>
                          </div>
                          <span className="text-slate-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </span>
                        </div>
                      </div>

                      {/* Transações desse dia */}
                      {isExpanded && (
                        <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-2">
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Transações Detalhadas de {dayData.dateStr}:
                          </div>
                          <div className="space-y-1.5">
                            {dayData.items.map((sale) => (
                              <div
                                key={sale.id}
                                className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">{sale.clientName}</span>
                                  <span className="text-slate-500 ml-2">({sale.services.join(', ')})</span>
                                  <span className="text-[11px] text-purple-700 font-medium ml-2">
                                    • Atendido por: {sale.professionalName}
                                  </span>
                                </div>
                                <div className="font-bold text-emerald-700">
                                  {sale.amount.toFixed(2)}€
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Barra de Total Geral Diário */}
                <div className="p-4 rounded-xl bg-emerald-50/80 border-2 border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                      Total Acumulado (Vendas Diárias)
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      {daysList.length} dia(s) com faturação • {totalDailyServices} intervenções realizadas
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-emerald-700">
                      {totalDailyRevenue.toFixed(2)}€
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-800">
                      Receita Total do Período
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 3. RELATÓRIO DE VENDAS MENSAIS */}
      {/* ======================================================== */}
      {activeReportTab === 'monthly' && (() => {
        const monthsMap = new Map<string, SalesTransaction[]>();
        filteredSales.forEach((sale) => {
          const m = sale.monthStr;
          if (!monthsMap.has(m)) monthsMap.set(m, []);
          monthsMap.get(m)!.push(sale);
        });

        const monthsList = Array.from(monthsMap.entries())
          .map(([monthStr, items]) => {
            const total = items.reduce((sum, it) => sum + it.amount, 0);
            const count = items.length;
            const avg = total / count;
            const uniqueClients = new Set(items.map((it) => it.clientId)).size;
            return { monthStr, total, count, avg, uniqueClients, items };
          })
          .sort((a, b) => b.monthStr.localeCompare(a.monthStr));

        const totalMonthlyRevenue = monthsList.reduce((sum, m) => sum + m.total, 0);
        const totalMonthlyServices = monthsList.reduce((sum, m) => sum + m.count, 0);
        const avgPerMonth = monthsList.length > 0 ? totalMonthlyRevenue / monthsList.length : 0;
        const bestMonth = monthsList.reduce(
          (best, m) => (m.total > best.total ? m : best),
          monthsList[0] || { monthStr: '-', total: 0, count: 0 }
        );

        const formatMonthLabel = (mStr: string) => {
          if (mStr === '-' || !mStr.includes('-')) return 'Sem registos';
          const [y, m] = mStr.split('-');
          return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-PT', {
            month: 'long',
            year: 'numeric',
          });
        };

        const maxMonthTotal = Math.max(...monthsList.map((m) => m.total), 1);

        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Relatório de Vendas Mensais</h2>
              <p className="text-xs text-slate-500">
                Evolução mensal da receita, volume de serviços e ticket médio por mês ({activeFilterDescription}).
              </p>
            </div>

            {/* Painel de Informação de Faturação — Vendas Mensais */}
            <div className="bg-gradient-to-r from-purple-50 via-fuchsia-50/50 to-emerald-50 border border-purple-200/80 rounded-2xl p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Informação de Faturação — Vendas Mensais ({activeFilterDescription})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3.5 border border-purple-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Faturação Total Mensal</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {totalMonthlyRevenue.toFixed(2)}€
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Em {totalMonthlyServices} procedimento(s)
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-purple-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Meses com Faturação</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {monthsList.length} mês(es)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Períodos mensais ativos
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-purple-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Média Mensal de Faturação</div>
                  <div className="text-xl font-extrabold text-purple-700 mt-0.5">
                    {avgPerMonth.toFixed(2)}€
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Receita média por mês
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-purple-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Mês de Maior Faturação</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 capitalize truncate">
                    {formatMonthLabel(bestMonth.monthStr)}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 mt-0.5">
                    {bestMonth.total.toFixed(2)}€ ({bestMonth.count} serv.)
                  </div>
                </div>
              </div>
            </div>

            {monthsList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold">Sem dados mensais disponíveis para {activeFilterDescription}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Gráfico visual simples de barras */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Comparativo Visual de Faturação Mensal (€)
                  </h3>
                  <div className="space-y-3">
                    {monthsList.map((m) => {
                      const monthName = formatMonthLabel(m.monthStr);
                      const barPercent = (m.total / maxMonthTotal) * 100;

                      return (
                        <div key={m.monthStr} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="capitalize text-slate-700">{monthName}</span>
                            <span className="text-emerald-700 font-extrabold">{m.total.toFixed(2)}€ ({m.count} serviços)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(5, barPercent)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tabela Mensal */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                        <th className="py-3 px-3">Mês / Ano</th>
                        <th className="py-3 px-3 text-center">Procedimentos</th>
                        <th className="py-3 px-3 text-center">Clientes Únicos</th>
                        <th className="py-3 px-3 text-right">Ticket Médio</th>
                        <th className="py-3 px-3 text-right">Faturação Total (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {monthsList.map((m) => {
                        const monthName = formatMonthLabel(m.monthStr);

                        return (
                          <tr key={m.monthStr} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-900 capitalize">
                              {monthName}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold">
                              {m.count}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {m.uniqueClients}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-600">
                              {m.avg.toFixed(2)}€
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                              {m.total.toFixed(2)}€
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-emerald-200 bg-emerald-50/70 text-xs font-extrabold text-slate-900">
                        <td className="py-3.5 px-3 uppercase tracking-wider text-emerald-900">
                          Total Faturado (Vendas Mensais)
                        </td>
                        <td className="py-3.5 px-3 text-center text-emerald-900">
                          {totalMonthlyServices} procedimentos
                        </td>
                        <td className="py-3.5 px-3 text-center text-emerald-900">
                          {monthsList.length} mês(es)
                        </td>
                        <td className="py-3.5 px-3 text-right text-emerald-900">
                          {(totalMonthlyServices > 0 ? totalMonthlyRevenue / totalMonthlyServices : 0).toFixed(2)}€ (média)
                        </td>
                        <td className="py-3.5 px-3 text-right text-sm text-emerald-700">
                          {totalMonthlyRevenue.toFixed(2)}€
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 4. RELATÓRIO DE VENDAS POR COLABORADOR */}
      {/* ======================================================== */}
      {activeReportTab === 'staff' && (() => {
        const staffList = staffMembers.map((user) => {
          const userSales = filteredSales.filter((s) => s.professionalId === user.id);
          const userTotal = userSales.reduce((sum, s) => sum + s.amount, 0);
          const count = userSales.length;
          const avg = count > 0 ? userTotal / count : 0;
          const share = totalRevenue > 0 ? (userTotal / totalRevenue) * 100 : 0;

          return {
            user,
            sales: userSales,
            total: userTotal,
            count,
            avg,
            share,
          };
        }).sort((a, b) => b.total - a.total);

        const totalStaffRevenue = staffList.reduce((sum, s) => sum + s.total, 0);
        const totalStaffServices = staffList.reduce((sum, s) => sum + s.count, 0);
        const activeStaffCount = staffList.filter((s) => s.total > 0).length;
        const avgPerStaff = users.length > 0 ? totalStaffRevenue / users.length : 0;
        const topStaff = staffList[0];

        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Relatório de Vendas por Colaborador</h2>
              <p className="text-xs text-slate-500">
                Desempenho individual, faturação gerada e quota de receita de cada profissional da equipa ({activeFilterDescription}).
              </p>
            </div>

            {/* Painel de Informação de Faturação — Vendas por Colaborador */}
            <div className="bg-gradient-to-r from-amber-50 via-purple-50/50 to-emerald-50 border border-amber-200/80 rounded-2xl p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                Informação de Faturação — Vendas por Colaborador ({activeFilterDescription})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Faturação Total da Equipa</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {totalStaffRevenue.toFixed(2)}€
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Em {totalStaffServices} intervenção(ões)
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Colaboradores com Faturação</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {activeStaffCount} <span className="text-xs font-normal text-slate-400">de {users.length}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Profissionais com vendas ativas
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Média por Colaborador</div>
                  <div className="text-xl font-extrabold text-purple-700 mt-0.5">
                    {avgPerStaff.toFixed(2)}€
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Faturação média por elemento
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Maior Faturação Individual</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                    {topStaff && topStaff.total > 0 ? topStaff.user.name : 'Sem vendas'}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 mt-0.5">
                    {topStaff ? `${topStaff.total.toFixed(2)}€ (${topStaff.share.toFixed(1)}%)` : '0.00€'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Cartões dos Colaboradores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffList.map((item, idx) => (
                  <div
                    key={item.user.id}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all relative overflow-hidden"
                  >
                    {idx === 0 && item.total > 0 && (
                      <div className="absolute top-3 right-3 text-amber-500 flex items-center gap-1 text-[11px] font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Award className="w-3.5 h-3.5" /> Top Faturação
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs"
                        style={{ backgroundColor: item.user.color }}
                      >
                        {item.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{item.user.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{item.user.role}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Faturação Total:</span>
                        <span className="font-extrabold text-emerald-700 text-sm">{item.total.toFixed(2)}€</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Serviços Executados:</span>
                        <span className="font-bold text-slate-800">{item.count}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Ticket Médio:</span>
                        <span className="font-semibold text-slate-700">{item.avg.toFixed(2)}€</span>
                      </div>

                      {/* Barra de Quota de Vendas */}
                      <div className="pt-2">
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Quota da Receita:</span>
                          <span className="font-bold text-purple-700">{item.share.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, item.share)}%`,
                              backgroundColor: item.user.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela Comparativa de Toda a Equipa */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                      <th className="py-3 px-3">Colaborador</th>
                      <th className="py-3 px-3">Especialidades</th>
                      <th className="py-3 px-3 text-center">Intervenções</th>
                      <th className="py-3 px-3 text-right">Ticket Médio</th>
                      <th className="py-3 px-3 text-right">Quota (%)</th>
                      <th className="py-3 px-3 text-right">Total Gerado (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {staffList.map((item) => (
                      <tr key={item.user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.user.color }}
                          />
                          {item.user.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {item.user.specialties?.join(', ') || 'Geral'}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">
                          {item.count}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          {item.avg.toFixed(2)}€
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-purple-700">
                          {item.share.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                          {item.total.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-emerald-200 bg-emerald-50/70 text-xs font-extrabold text-slate-900">
                      <td colSpan={2} className="py-3.5 px-3 uppercase tracking-wider text-emerald-900">
                        Total Faturado pela Equipa (Vendas por Colaborador)
                      </td>
                      <td className="py-3.5 px-3 text-center text-emerald-900">
                        {totalStaffServices} intervenções
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-900">
                        {(totalStaffServices > 0 ? totalStaffRevenue / totalStaffServices : 0).toFixed(2)}€ (média)
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-900">
                        100%
                      </td>
                      <td className="py-3.5 px-3 text-right text-sm text-emerald-700">
                        {totalStaffRevenue.toFixed(2)}€
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
          </div>

          {/* ========================================================
              FOLHA FORMAL DE RELATÓRIO DE ESTATÍSTICA
              Folha A4 formal e discriminada por Mês e por Data, com
              Logótipo do Salão, Dados Fiscais, Indicadores (KPIs),
              Tabela de Vendas e Validação por Carimbo/Assinatura.
              Aparência profissional idêntica ao histórico de pagamentos.
              ======================================================== */}
          <div
            className={`formal-report-section ${
              isPreviewMode
                ? 'preview-mode-active bg-white p-6 sm:p-8 rounded-3xl border border-slate-300 shadow-xl text-slate-900 w-full font-sans text-xs'
                : 'bg-white text-slate-900 w-full font-sans text-xs'
            }`}
          >
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
                  Relatório Oficial
                </span>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Estatística & Faturação
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
                  Doc. Nº:{' '}
                  <strong>
                    EST-
                    {String(currentSalon?.id || '001')
                      .replace(/\D/g, '')
                      .slice(-5) || '1001'}
                    /{new Date().getFullYear()}
                  </strong>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Emitido em: {new Date().toLocaleDateString('pt-PT')} às{' '}
                  {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Quadro Resumo de Indicadores Chave (KPIs) */}
            <div className="grid grid-cols-4 gap-3 mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Faturação Total</span>
                <span className="text-sm font-black text-emerald-700">{totalRevenue.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Intervenções</span>
                <span className="text-sm font-black text-slate-900">{totalProcedures} serviços</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Ticket Médio</span>
                <span className="text-sm font-black text-purple-700">{averageTicket.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Clientes Ativos</span>
                <span className="text-sm font-black text-slate-900">{activeClientsInPeriod} clientes</span>
              </div>
            </div>

            {/* Resumo por Colaborador */}
            {staffSalesSummary.length > 0 && (
              <div className="mb-5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1.5">
                  Desempenho por Colaborador
                </h4>
                <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 font-black uppercase text-slate-700 border-b border-slate-300">
                      <th className="py-1.5 px-2.5 border-r border-slate-200">Colaborador / Profissional</th>
                      <th className="py-1.5 px-2.5 text-center border-r border-slate-200">Serviços Realizados</th>
                      <th className="py-1.5 px-2.5 text-right border-r border-slate-200">Total Faturado</th>
                      <th className="py-1.5 px-2.5 text-right">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSalesSummary.map((staff) => {
                      const pct = totalRevenue > 0 ? (staff.total / totalRevenue) * 100 : 0;
                      return (
                        <tr key={staff.name} className="border-b border-slate-200">
                          <td className="py-1.5 px-2.5 font-bold text-slate-800 border-r border-slate-200">
                            {staff.name}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-semibold text-slate-700 border-r border-slate-200">
                            {staff.count} intervenção{staff.count > 1 ? 'ões' : ''}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-black text-slate-900 border-r border-slate-200">
                            {staff.total.toFixed(2)} €
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-purple-700">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabela Discriminada por Mês e por Data */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Discriminação de Vendas por Período & Datas
                </h3>
                <span className="text-[10px] text-slate-500">
                  Filtro: {activeFilterDescription}
                </span>
              </div>

              <table className="w-full text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 border-b border-slate-300">
                    <th className="py-2 px-3 border-r border-slate-200">Data</th>
                    <th className="py-2 px-3 border-r border-slate-200">Cliente</th>
                    <th className="py-2 px-3 border-r border-slate-200">Profissional</th>
                    <th className="py-2 px-3 border-r border-slate-200">Serviços Executados</th>
                    <th className="py-2 px-3 text-right">Valor (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesGroupedByMonth.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        Sem registos de vendas para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    salesGroupedByMonth.map((group) => (
                      <React.Fragment key={group.key}>
                        {/* Linha de Cabeçalho do Mês */}
                        <tr className="bg-slate-100/90 border-t-2 border-b border-slate-300 text-[11px] font-black text-slate-900">
                          <td colSpan={4} className="py-2 px-3 border-r border-slate-200">
                            <span className="text-purple-950 uppercase font-black tracking-wide">
                              Mês: {group.label}
                            </span>
                            <span className="text-[10px] font-normal text-slate-600 ml-2">
                              ({group.sales.length} intervenção{group.sales.length > 1 ? 'ões' : ''})
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-900">
                            {group.total.toFixed(2)} €
                          </td>
                        </tr>

                        {/* Linhas das Vendas com data exata */}
                        {group.sales.map((s) => {
                          const dateFormatted = s.dateStr
                            ? new Date(s.dateStr).toLocaleDateString('pt-PT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : s.dateStr;
                          return (
                            <tr key={s.id} className="border-b border-slate-200 text-[11px] hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">
                                {dateFormatted}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                                {s.clientName}
                              </td>
                              <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                                {s.professionalName}
                              </td>
                              <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                                {s.services.length > 0 ? s.services.join(', ') : 'Serviço Geral'}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-slate-900">
                                {s.amount.toFixed(2)} €
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
                {filteredSales.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-xs text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider border-r border-slate-200">
                        Total Geral Faturado ({totalProcedures} serviços realizados)
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm text-emerald-800">
                        {totalRevenue.toFixed(2)} €
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
                  Este relatório estatístico e financeiro comprova as receitas e serviços processados na gestão do salão.
                  Documento processado por computador com autenticação digital de registos.
                </p>
              </div>

              <div className="text-center w-64 pt-6 border-t border-slate-400">
                <p className="text-[10px] font-bold text-slate-700">Assinatura / Carimbo do Administrador</p>
                <p className="text-[9px] text-slate-400 mt-1">Data: ____ / ____ / {new Date().getFullYear()}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Escolha de Formato de Impressão */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Imprimir Estatística
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione o formato pretendido para a impressão
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Opção 1: Relatório de Estatística Formal (Aparência do Histórico de Pagamentos) */}
              <div className="p-4.5 rounded-2xl border-2 border-purple-500 bg-purple-50/50 hover:bg-purple-50 transition-all flex flex-col gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        Relatório de Estatística Formal (A4)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-900">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">
                      Formato oficial idêntico ao extrato do histórico de pagamentos: logótipo do salão, identificação fiscal completa, resumo de indicadores (KPIs), desempenho por colaborador, discriminação detalhada por período e datas, totais e espaço para carimbo/assinatura.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-purple-200/60 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintModalOpen(false);
                      setIsPreviewMode(true);
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> Pré-visualizar no Ecrã
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecutePrint('report')}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
                  </button>
                </div>
              </div>

              {/* Opção 2: Imprimir Ecrã (A4 Adaptado) */}
              <div className="p-4.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all flex flex-col gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="font-extrabold text-sm text-slate-900">
                      Imprimir Ecrã Atual (A4 Adaptado)
                    </span>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                      Imprime a vista completa do ecrã ajustada à página A4, mantendo os blocos e cartões intactos sem quebras ou cortes a meio.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleExecutePrint('screen')}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir Ecrã
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalização de Cores e Logótipo do Salão */}
      {isCustomizationOpen && (
        <SalonCustomizationModal onClose={() => setIsCustomizationOpen(false)} />
      )}
    </div>
  );
};
