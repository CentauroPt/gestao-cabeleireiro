import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { CountryCode, SalonStatus, SubscriptionPayment, SubscriptionStatus } from '../../types';
import type { SalonSummary } from '../../services/api';
import { SpainFlag, PortugalFlag } from '../common/FlagIcons';
import { ClientSubscriptionDrawer } from './ClientSubscriptionDrawer';
import { SubscriptionStatsPanel } from './SubscriptionStatsPanel';
import { BillingConfigModal } from './BillingConfigModal';
import { OwnerPaymentsPanel } from '../subscription/OwnerPaymentsPanel';
import { CloudDatabasePanel } from './CloudDatabasePanel';
import {
  Code2,
  Store,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
  Search,
  Euro,
  Mail,
  MapPin,
  PlusCircle,
  RefreshCw,
  Key,
  Calendar,
  AlertTriangle,
  Info,
  CreditCard,
  Bell,
  Sliders,
  BarChart3,
  Clock,
  X,
  Database,
} from 'lucide-react';

export const DeveloperPortalView: React.FC = () => {
  const {
    allSalonsSummary,
    refreshAllSalonsSummary,
    updateSalonStatus,
    deleteSalon,
    impersonateSalon,
    logoutDeveloper,
    registerNewSalon,
    changeDeveloperPassword,
    changeSalonPassword,
    resetDemoData,
    notification,
    setNotification,
    validateSubscriptionPayment,
    billingConfig,
    currentCountry,
    setCountry,
    setLanguage,
  } = useApp();

  // =========================================================================
  // SELEÇÃO DAS DUAS PÁGINAS DISTINTAS DA CONSOLA (1º ESPANHA 🇪🇸, 2º PORTUGAL 🇵🇹)
  // =========================================================================
  const [devCountry, setDevCountry] = useState<CountryCode>(currentCountry || 'ES');
  const isSpain = devCountry === 'ES';

  const handleSelectCountry = (target: CountryCode) => {
    setDevCountry(target);
    setCountry(target);
    setLanguage(target === 'ES' ? 'es' : 'pt');
  };

  const [devTab, setDevTab] = useState<'salons' | 'stats' | 'bank_payments' | 'cloud_database'>('salons');
  const [selectedSalonForSubscription, setSelectedSalonForSubscription] = useState<SalonSummary | null>(null);
  const [isBillingConfigModalOpen, setIsBillingConfigModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SalonStatus | 'PROVA' | 'BLOQUEADO'>('ALL');

  // Seleção ativa sempre sincronizada com o sumário em tempo real
  const currentSelectedSummary = useMemo(() => {
    if (!selectedSalonForSubscription) return null;
    return (
      allSalonsSummary.find((s) => s.salon.id === selectedSalonForSubscription.salon.id) ||
      selectedSalonForSubscription
    );
  }, [allSalonsSummary, selectedSalonForSubscription]);

  // Modal para suspender com motivo
  const [suspendingSalon, setSuspendingSalon] = useState<SalonSummary | null>(null);
  const [suspensionReason, setSuspensionReason] = useState(
    isSpain ? 'Mensualidad o términos pendientes de regularización' : 'Mensalidade ou termos pendentes de regularização'
  );

  // Modal para registar novo salão pelo programador
  const [isNewSalonModalOpen, setIsNewSalonModalOpen] = useState(false);
  const [newSalonName, setNewSalonName] = useState('');
  const [newSalonPhone, setNewSalonPhone] = useState('');
  const [newSalonAddress, setNewSalonAddress] = useState('');
  const [newSalonNif, setNewSalonNif] = useState('');
  const [newSalonAdminName, setNewSalonAdminName] = useState('');
  const [newSalonAdminEmail, setNewSalonAdminEmail] = useState('');
  const [newSalonAdminPassword, setNewSalonAdminPassword] = useState('');
  const [showNewSalonPassword, setShowNewSalonPassword] = useState(false);
  const defaultGlobalRate =
    billingConfig?.valor_mensal_padrao !== undefined
      ? billingConfig.valor_mensal_padrao
      : 29.0;
  const [newSalonRate, setNewSalonRate] = useState<string>(defaultGlobalRate.toString());
  const [newSalonTrialDays, setNewSalonTrialDays] = useState<string>('30');
  const [newSalonStatus, setNewSalonStatus] = useState<SubscriptionStatus>('prova');
  const [createdSalonCredentials, setCreatedSalonCredentials] = useState<{
    salonName: string;
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    if (billingConfig?.valor_mensal_padrao !== undefined) {
      setNewSalonRate(billingConfig.valor_mensal_padrao.toString());
    }
  }, [billingConfig?.valor_mensal_padrao]);

  // Modal para alterar palavra-passe do programador (Master)
  const [isDevPasswordModalOpen, setIsDevPasswordModalOpen] = useState(false);
  const [newDevPassword, setNewDevPassword] = useState('');
  const [confirmDevPassword, setConfirmDevPassword] = useState('');
  const [devPasswordError, setDevPasswordError] = useState('');

  // Modal para alterar palavra-passe do salão
  const [editingSalonPassword, setEditingSalonPassword] = useState<SalonSummary | null>(null);
  const [newSalonPassword, setNewSalonPassword] = useState('');
  const [showSalonPassword, setShowSalonPassword] = useState(false);
  const [salonPasswordError, setSalonPasswordError] = useState('');
  const [isSavingSalonPassword, setIsSavingSalonPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllSalonsSummary();
      setNotification({
        type: 'success',
        message: isSpain
          ? '¡Datos y peluquerías actualizados con éxito!'
          : 'Dados e salões atualizados com sucesso!',
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: (isSpain ? 'Error al actualizar datos: ' : 'Erro ao atualizar dados: ') + (e?.message || 'Falha de comunicação'),
      });
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  useEffect(() => {
    refreshAllSalonsSummary();
  }, []);

  // =========================================================================
  // DADOS ESPECÍFICOS DO PAÍS SELECIONADO NA CONSOLA
  // =========================================================================
  const countrySalons = useMemo(() => {
    return allSalonsSummary.filter((item) =>
      isSpain ? item.salon.country === 'ES' : (item.salon.country || 'PT') === 'PT'
    );
  }, [allSalonsSummary, isSpain]);

  // Estatísticas no país selecionado
  const totalSalons = countrySalons.length;
  const activeSalonsCount = countrySalons.filter(
    (s) => s.salon.status === 'ATIVO' && !s.isSubscriptionBlocked
  ).length;
  const suspendedSalonsCount = countrySalons.filter(
    (s) => s.salon.status === 'SUSPENSO'
  ).length;
  const canceledSalonsCount = countrySalons.filter(
    (s) => s.salon.status === 'CANCELADO'
  ).length;

  const totalGlobalRevenue = useMemo(() => {
    return countrySalons.reduce((acc, s) => acc + s.totalRevenue, 0);
  }, [countrySalons]);

  const totalGlobalStaff = useMemo(() => {
    return countrySalons.reduce((acc, s) => acc + s.staffCount, 0);
  }, [countrySalons]);

  const totalGlobalClients = useMemo(() => {
    return countrySalons.reduce((acc, s) => acc + s.clientsCount, 0);
  }, [countrySalons]);

  // Pagamentos Pendentes de Validação (Filtrados pelo país do mercado selecionado)
  const allPendingPayments = useMemo(() => {
    const list: Array<{ payment: SubscriptionPayment; salonSummary: SalonSummary }> = [];
    countrySalons.forEach((item) => {
      (item.payments || []).forEach((p) => {
        if (p.estado === 'pendente') {
          list.push({ payment: p, salonSummary: item });
        }
      });
    });
    return list;
  }, [countrySalons]);

  const handleQuickValidate = async (paymentId: string) => {
    try {
      await validateSubscriptionPayment(
        paymentId,
        isSpain ? 'Validado vía Notificación Rápida' : 'Validado via Notificação Rápida'
      );
      await refreshAllSalonsSummary();
      setNotification({
        type: 'success',
        message: isSpain
          ? '¡Pago validado con éxito! La peluquería ha sido desbloqueada inmediatamente.'
          : 'Pagamento validado com sucesso! O salão foi desbloqueado imediatamente sem retenção.',
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: (isSpain ? 'Error al validar pago: ' : 'Erro ao validar pagamento: ') + (e?.message || 'Falha de comunicação'),
      });
    }
  };

  // Lista Filtrada por pesquisa e estado
  const filteredSalons = useMemo(() => {
    return countrySalons.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.salon.name.toLowerCase().includes(q) ||
        item.salon.address.toLowerCase().includes(q) ||
        (item.adminUser?.name || '').toLowerCase().includes(q) ||
        (item.adminUser?.email || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ATIVO' && item.salon.status === 'ATIVO' && !item.isSubscriptionBlocked) ||
        (statusFilter === 'SUSPENSO' && item.salon.status === 'SUSPENSO') ||
        (statusFilter === 'CANCELADO' && item.salon.status === 'CANCELADO') ||
        (statusFilter === 'PROVA' && item.salon.estado_subscricao === 'prova' && !item.isSubscriptionBlocked) ||
        (statusFilter === 'BLOQUEADO' &&
          (item.isSubscriptionBlocked ||
            item.salon.estado_subscricao === 'bloqueado' ||
            item.salon.status === 'SUSPENSO'));

      return matchesSearch && matchesStatus;
    });
  }, [countrySalons, searchTerm, statusFilter]);

  // Confirmar Suspensão
  const handleConfirmSuspension = async () => {
    if (!suspendingSalon) return;
    await updateSalonStatus(suspendingSalon.salon.id, 'SUSPENSO', suspensionReason);
    setSuspendingSalon(null);
  };

  // Reativar
  const handleReactivate = async (salonId: string) => {
    await updateSalonStatus(salonId, 'ATIVO');
  };

  // Cancelar
  const handleCancel = async (salonId: string) => {
    const confirmMsg = isSpain
      ? '¿Está seguro de que desea CANCELAR esta peluquería? Los usuarios ya no podrán acceder.'
      : 'Tem a certeza de que deseja CANCELAR este salão? Os colaboradores deixarão de conseguir entrar.';
    if (confirm(confirmMsg)) {
      await updateSalonStatus(
        salonId,
        'CANCELADO',
        isSpain ? 'Suscripción cancelada por el programador' : 'Subscrição cancelada pelo programador'
      );
    }
  };

  // Eliminar
  const handleDelete = async (salonId: string, salonName: string) => {
    const confirmMsg = isSpain
      ? `ATENCIÓN: ¿Desea ELIMINAR PERMANENTEMENTE la peluquería "${salonName}" y todos sus datos? Esta acción no se puede deshacer.`
      : `ATENÇÃO: Deseja ELIMINAR PERMANENTEMENTE o salão "${salonName}" e todos os seus dados? Esta ação não pode ser desfeita.`;
    if (confirm(confirmMsg)) {
      await deleteSalon(salonId);
    }
  };

  // Criar Salão pelo Programador no mercado ativo
  const handleCreateSalonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalonName || !newSalonPhone || !newSalonAdminName || !newSalonAdminEmail || !newSalonAdminPassword.trim()) {
      alert(
        isSpain
          ? 'Por favor, complete todos los campos obligatorios, incluida la contraseña del administrador.'
          : 'Por favor preencha todos os campos obrigatórios, incluindo a palavra-passe do administrador.'
      );
      return;
    }

    const chosenPassword = newSalonAdminPassword.trim();
    const parsedRate = parseFloat(newSalonRate);
    const validRate = !isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : defaultGlobalRate;
    const parsedDays = parseInt(newSalonTrialDays, 10);
    const validDays = !isNaN(parsedDays) && parsedDays >= 0 ? parsedDays : 30;

    const ok = await registerNewSalon(
      {
        name: newSalonName.trim(),
        phone: newSalonPhone.trim(),
        address:
          newSalonAddress.trim() ||
          (isSpain ? 'Dirección indicada por el programador' : 'Morada indicada pelo programador'),
        nif: newSalonNif.trim(),
        adminName: newSalonAdminName.trim(),
        adminEmail: newSalonAdminEmail.trim().toLowerCase(),
        adminPassword: chosenPassword,
        valor_mensal: validRate,
        trialDays: validDays,
        estado_subscricao: newSalonStatus,
        country: devCountry,
        language: isSpain ? 'es' : 'pt',
      },
      { stayInCurrentMode: true }
    );

    if (ok) {
      setCreatedSalonCredentials({
        salonName: newSalonName.trim(),
        email: newSalonAdminEmail.trim().toLowerCase(),
        password: chosenPassword,
      });
      setIsNewSalonModalOpen(false);
      setNewSalonName('');
      setNewSalonPhone('');
      setNewSalonAddress('');
      setNewSalonNif('');
      setNewSalonAdminName('');
      setNewSalonAdminEmail('');
      setNewSalonAdminPassword('');
      setNewSalonRate(defaultGlobalRate.toString());
      setNewSalonTrialDays('30');
      setNewSalonStatus('prova');
    }
  };

  // Alterar Palavra-passe Master do Programador
  const handleChangeDevPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setDevPasswordError('');
    if (!newDevPassword || newDevPassword.trim().length < 4) {
      setDevPasswordError(
        isSpain
          ? 'La contraseña debe tener al menos 4 caracteres.'
          : 'A palavra-passe deve ter pelo menos 4 caracteres.'
      );
      return;
    }
    if (newDevPassword !== confirmDevPassword) {
      setDevPasswordError(
        isSpain ? 'Las contraseñas no coinciden.' : 'As palavras-passe não coincidem.'
      );
      return;
    }
    const success = changeDeveloperPassword(newDevPassword);
    if (success) {
      setIsDevPasswordModalOpen(false);
      setNewDevPassword('');
      setConfirmDevPassword('');
    }
  };

  // Alterar Palavra-passe de Salão pelo Programador
  const handleChangeSalonPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalonPassword) return;
    setSalonPasswordError('');
    const cleanPw = newSalonPassword.trim();
    if (!cleanPw || cleanPw.length < 3) {
      setSalonPasswordError(
        isSpain
          ? 'Por favor, introduzca una contraseña válida con al menos 3 caracteres.'
          : 'Por favor introduza uma palavra-passe válida com pelo menos 3 caracteres.'
      );
      return;
    }
    setIsSavingSalonPassword(true);
    try {
      const success = await changeSalonPassword(editingSalonPassword.salon.id, cleanPw);
      if (success) {
        setEditingSalonPassword(null);
        setNewSalonPassword('');
        setShowSalonPassword(false);
      } else {
        setSalonPasswordError(
          isSpain
            ? 'No fue posible guardar la contraseña. Por favor, intente de nuevo.'
            : 'Não foi possível gravar a palavra-passe. Por favor tente novamente.'
        );
      }
    } catch (err: any) {
      setSalonPasswordError(err?.message || (isSpain ? 'Error al actualizar contraseña.' : 'Erro ao atualizar palavra-passe.'));
    } finally {
      setIsSavingSalonPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 relative print:min-h-0 print:p-0 print:bg-white print:text-slate-900">
      {/* Notificações no Painel do Programador */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 print:hidden ${
            notification.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : notification.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : 'bg-indigo-950/95 border-indigo-500/50 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-black px-1.5 py-0.5 rounded cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        {/* =========================================================================
            SELETOR PRINCIPAL DE PÁGINAS DA CONSOLA (ESTRITA ORDEM: 1º ESPANHA, 2º PORTUGAL)
            ========================================================================= */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* 1º ESPANHA (PRIMEIRO OBRIGATORIAMENTE) */}
            <button
              type="button"
              onClick={() => handleSelectCountry('ES')}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                isSpain
                  ? 'bg-gradient-to-r from-red-600 via-amber-600 to-yellow-600 text-white shadow-lg ring-2 ring-yellow-400/60 scale-[1.02]'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
              }`}
            >
              <SpainFlag size="lg" />
              <span>Página de España</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black ml-1 ${
                  isSpain ? 'bg-black/35 text-yellow-200' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {allSalonsSummary.filter((s) => s.salon.country === 'ES').length}
              </span>
            </button>

            {/* 2º PORTUGAL (SEGUNDO) */}
            <button
              type="button"
              onClick={() => handleSelectCountry('PT')}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                !isSpain
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-rose-600 text-white shadow-lg ring-2 ring-emerald-400/60 scale-[1.02]'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
              }`}
            >
              <PortugalFlag size="lg" />
              <span>Página de Portugal</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black ml-1 ${
                  !isSpain ? 'bg-black/35 text-emerald-200' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {allSalonsSummary.filter((s) => (s.salon.country || 'PT') === 'PT').length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isSpain
                ? 'Vista Actual: Mercado de España (Idioma Español)'
                : 'Vista Atual: Mercado de Portugal (Português de Portugal)'}
            </span>
          </div>
        </div>

        {/* Top Header */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Super Admin
                </span>
                <span className="text-xs text-slate-400">
                  • {isSpain ? 'Panel de Control Máster' : 'Painel de Controlo Master'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                {isSpain ? 'Consola de Gestión de Peluquerías' : 'Consola de Gestão de Salões'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSpain
                  ? 'Supervisión de todas las peluquerías registradas en España, estados de actividad, suspensión y cancelación.'
                  : 'Supervisão de todos os salões registados em Portugal, estados de atividade, suspensão e cancelamento.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-75 shadow-xs"
              title={isSpain ? 'Actualizar datos de las peluquerías' : 'Atualizar dados de todos os salões'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
              <span>
                {isRefreshing
                  ? isSpain ? 'Actualizando...' : 'A atualizar...'
                  : isSpain ? 'Actualizar' : 'Atualizar'}
              </span>
            </button>

            <button
              onClick={() => {
                setDevPasswordError('');
                setNewDevPassword('');
                setConfirmDevPassword('');
                setIsDevPasswordModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title={isSpain ? 'Cambiar contraseña máster de programador' : 'Alterar palavra-passe master do programador'}
            >
              <Key className="w-4 h-4" />
              <span>{isSpain ? 'Cambiar Contraseña Máster' : 'Alterar Senha Master'}</span>
            </button>

            <button
              onClick={() => {
                setNewSalonRate(defaultGlobalRate.toString());
                setNewSalonTrialDays('30');
                setNewSalonStatus('prova');
                setIsNewSalonModalOpen(true);
              }}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSpain ? '+ Nueva Peluquería' : '+ Novo Salão'}</span>
            </button>

            <button
              onClick={() => {
                const warnMsg = isSpain
                  ? 'ATENCIÓN: ¿Desea limpiar la base de datos local? Todos los datos guardados en caché local se limpiarán.'
                  : 'ATENÇÃO: Deseja limpar a base de dados local? Todos os dados guardados em cache local serão limpos.';
                if (confirm(warnMsg)) {
                  resetDemoData();
                  refreshAllSalonsSummary();
                }
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={isSpain ? 'Limpiar datos locales' : 'Limpar dados locais do sistema'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isSpain ? 'Limpiar Datos' : 'Limpar Dados'}</span>
            </button>

            <button
              onClick={logoutDeveloper}
              className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isSpain ? 'Cerrar Consola' : 'Sair da Consola'}</span>
            </button>
          </div>
        </div>

        {/* Notificação de Novos Pagamentos Recebidos */}
        {allPendingPayments.length > 0 && (
          <div className="bg-gradient-to-r from-amber-950/90 to-amber-900/90 border border-amber-500/50 p-4.5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-200 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-500/40">
                    {isSpain ? 'Notificación de Pago' : 'Notificação de Pagamento'}
                  </span>
                  <span className="text-xs font-black text-white">
                    {allPendingPayments.length} {isSpain ? 'nuevo(s) pago(s) recibido(s)!' : 'novo(s) pagamento(s) recebido(s)!'}
                  </span>
                </div>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  {isSpain
                    ? 'Existen comprobantes enviados por los clientes a la espera de validación para desbloqueo inmediato.'
                    : 'Existem comprovativos enviados pelos clientes a aguardar validação para desbloqueio imediato.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {allPendingPayments.slice(0, 3).map(({ payment, salonSummary }) => (
                <div
                  key={payment.id}
                  className="bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs"
                >
                  <span className="font-bold text-white">{salonSummary.salon.name}</span>
                  <span className="text-amber-400 font-black">{payment.valor.toFixed(2)}€</span>
                  <span className="text-[10px] text-slate-400">
                    ({payment.metodo === 'transferencia' ? 'Transf.' : 'MB Way'})
                  </span>
                  <button
                    onClick={() => handleQuickValidate(payment.id)}
                    className="ml-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg transition-colors cursor-pointer shadow-xs"
                    title={isSpain ? 'Validar y desbloquear inmediatamente' : 'Validar e desbloquear imediatamente'}
                  >
                    {isSpain ? 'Validar' : 'Validar'}
                  </button>
                  <button
                    onClick={() => setSelectedSalonForSubscription(salonSummary)}
                    className="px-2 py-1 text-slate-400 hover:text-white text-[11px] font-bold cursor-pointer"
                    title={isSpain ? 'Abrir ficha de suscripción' : 'Abrir ficha de subscrição'}
                  >
                    {isSpain ? 'Ficha' : 'Ficha'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Navegação entre Separadores da Consola */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDevTab('salons')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                devTab === 'salons'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{isSpain ? 'Peluquerías Registradas' : 'Salões Registados'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-mono">
                {totalSalons}
              </span>
            </button>

            <button
              onClick={() => setDevTab('stats')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                devTab === 'stats'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{isSpain ? 'Panel de Estadísticas SaaS' : 'Painel de Estatísticas SaaS'}</span>
            </button>

            <button
              onClick={() => setDevTab('bank_payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                devTab === 'bank_payments'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{isSpain ? 'Panel de Pagos Bancarios' : 'Painel de Pagamentos Bancários'}</span>
            </button>

            <button
              onClick={() => setDevTab('cloud_database')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                devTab === 'cloud_database'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{isSpain ? 'Base de Datos en la Nube' : 'Base de Dados na Nuvem'}</span>
            </button>
          </div>

          <button
            onClick={() => setIsBillingConfigModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs"
            title={isSpain ? 'Configurar IBAN, MB Way y WhatsApp de facturación' : 'Configurar IBAN, MB Way e WhatsApp de faturação'}
          >
            <Sliders className="w-4 h-4" />
            <span>{isSpain ? 'Configuración Bancaria & Precios' : 'Configuração Bancária & Preços'}</span>
          </button>
        </div>

        {devTab === 'stats' ? (
          <SubscriptionStatsPanel />
        ) : devTab === 'bank_payments' ? (
          <OwnerPaymentsPanel />
        ) : devTab === 'cloud_database' ? (
          <CloudDatabasePanel />
        ) : (
          <>
            {/* Global KPI Metrics Cards Scoped by Country */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isSpain ? 'Peluquerías Registradas' : 'Salões Registados'}
                </div>
                <div className="text-2xl font-black text-white">{totalSalons}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {isSpain ? 'Total en España' : 'Total em Portugal'}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-emerald-500/30 p-4 rounded-2xl">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {isSpain ? 'Peluquerías Activas' : 'Salões Ativos'}
                </div>
                <div className="text-2xl font-black text-emerald-400">{activeSalonsCount}</div>
                <div className="text-[11px] text-emerald-500/80 mt-0.5">
                  {isSpain ? 'Operacionales' : 'Operacionais'}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-amber-500/30 p-4 rounded-2xl">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" /> {isSpain ? 'Suspendidas' : 'Suspensos'}
                </div>
                <div className="text-2xl font-black text-amber-400">{suspendedSalonsCount}</div>
                <div className="text-[11px] text-amber-500/80 mt-0.5">
                  {isSpain ? 'Bloqueadas temp.' : 'Bloqueados temp.'}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-rose-500/30 p-4 rounded-2xl">
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {isSpain ? 'Canceladas' : 'Cancelados'}
                </div>
                <div className="text-2xl font-black text-rose-400">{canceledSalonsCount}</div>
                <div className="text-[11px] text-rose-500/80 mt-0.5">
                  {isSpain ? 'Sin suscripción' : 'Sem subscrição'}
                </div>
              </div>

              <div className="bg-slate-800/80 border border-purple-500/30 p-4 rounded-2xl col-span-2 sm:col-span-1">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Euro className="w-3 h-3" /> {isSpain ? 'Facturación Global' : 'Faturação Global'}
                </div>
                <div className="text-2xl font-black text-white">{totalGlobalRevenue.toFixed(2)}€</div>
                <div className="text-[11px] text-purple-300 mt-0.5">
                  {isSpain
                    ? `${totalGlobalStaff} empleados • ${totalGlobalClients} clientes`
                    : `${totalGlobalStaff} colaboradores • ${totalGlobalClients} clientes`}
                </div>
              </div>
            </div>

            {/* Barra de Pesquisa dos Nomes dos Salões */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 sm:p-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      isSpain
                        ? 'Buscar por nombre de peluquería, correo o móvil en España...'
                        : 'Pesquisar pelo nome do salão, e-mail ou telemóvel em Portugal...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      title={isSpain ? 'Limpiar búsqueda' : 'Limpar pesquisa'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end text-xs text-slate-400">
                  <span>
                    <strong className="text-white font-bold">{filteredSalons.length}</strong>{' '}
                    {filteredSalons.length === 1
                      ? isSpain ? 'peluquería registrada' : 'salão registado'
                      : isSpain ? 'peluquerías registradas' : 'salões registados'}
                  </span>
                  {searchTerm && (
                    <span className="text-purple-300 font-semibold bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded-md">
                      {isSpain ? `Filtrando por: "${searchTerm}"` : `A filtrar por: "${searchTerm}"`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Master Salons Management Table */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-purple-400" />
                    {isSpain
                      ? 'Gestión Máster de Peluquerías en España'
                      : 'Gestão Master de Todos os Salões Registados'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isSpain
                      ? 'Puede gestionar suscripciones, suspender, reactivar, cancelar o inspeccionar cada peluquería individualmente.'
                      : 'Pode gerir subscrições, suspender, reativar, cancelar ou inspecionar cada salão individualmente.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filtro de Estado */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none cursor-pointer hover:border-slate-600 transition-colors"
                  >
                    <option value="ALL">{isSpain ? 'Todos los Estados' : 'Todos os Estados'}</option>
                    <option value="ATIVO">{isSpain ? 'Suscripción Activa' : 'Subscrição Ativa'}</option>
                    <option value="PROVA">{isSpain ? 'En Período de Prueba' : 'Em Período de Teste'}</option>
                    <option value="BLOQUEADO">{isSpain ? 'Bloqueadas / Pago Pendiente' : 'Bloqueados / Pag. Pendente'}</option>
                    <option value="SUSPENSO">{isSpain ? 'Suspendidas Manualmente' : 'Suspensos Manualmente'}</option>
                    <option value="CANCELADO">{isSpain ? 'Canceladas' : 'Cancelados'}</option>
                  </select>
                </div>
              </div>

              {/* Tabela dos Salões */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/40">
                      <th className="py-3 px-3">
                        {isSpain ? 'Peluquería & Identificación' : 'Salão & Identificação'}
                      </th>
                      <th className="py-3 px-3">
                        {isSpain ? 'Fecha de Registro' : 'Data de Registo'}
                      </th>
                      <th className="py-3 px-3">
                        {isSpain ? 'Suscripción & Estado' : 'Subscrição & Estado'}
                      </th>
                      <th className="py-3 px-3">
                        {isSpain ? 'Administrador' : 'Administrador'}
                      </th>
                      <th className="py-3 px-3 text-center">
                        {isSpain ? 'Empleados' : 'Colaboradores'}
                      </th>
                      <th className="py-3 px-3 text-center">
                        {isSpain ? 'Clientes' : 'Clientes'}
                      </th>
                      <th className="py-3 px-3 text-right">
                        {isSpain ? 'Facturación Total' : 'Faturação Total'}
                      </th>
                      <th className="py-3 px-3 text-right">
                        {isSpain ? 'Acciones del Programador' : 'Ações do Programador'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 text-xs text-slate-300">
                    {filteredSalons.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-sm font-medium">
                          {isSpain
                            ? 'No hay peluquerías registradas en España todavía.'
                            : 'Ainda não existem salões registados em Portugal.'}
                        </td>
                      </tr>
                    ) : (
                      filteredSalons.map((item) => {
                        const s = item.salon;
                        const isAtivo = s.status === 'ATIVO';
                        const isSuspenso = s.status === 'SUSPENSO';
                        const isCancelado = s.status === 'CANCELADO';
                        const isBlocked = item.isSubscriptionBlocked;
                        const isTrial = s.estado_subscricao === 'prova';
                        const pendingCount = item.pendingPaymentsCount || 0;
                        const formattedRegDate = s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString(isSpain ? 'es-ES' : 'pt-PT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—';

                        return (
                          <tr key={s.id} className="hover:bg-slate-700/30 transition-colors">
                            {/* Salão */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>{s.name}</span>
                                {s.country === 'ES' ? (
                                  <SpainFlag size="sm" />
                                ) : (
                                  <PortugalFlag size="sm" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span>{s.address}</span>
                                {s.nif && <span>• NIF: {s.nif}</span>}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                ID: <code className="bg-slate-900 px-1 rounded text-purple-300 font-mono">{s.id}</code>
                              </div>
                            </td>

                            {/* Data de Registo */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 text-slate-200 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span>{formattedRegDate}</span>
                              </div>
                            </td>

                            {/* Subscrição & Estado */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                {pendingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                    <Bell className="w-3 h-3 text-amber-400" />
                                    <span>
                                      {pendingCount} {isSpain ? 'Pago Pendiente' : 'Pag. Pendente'}
                                    </span>
                                  </span>
                                )}

                                {isBlocked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    <AlertTriangle className="w-3 h-3 text-rose-400" />{' '}
                                    {isSpain ? 'Bloqueada' : 'Bloqueado'}
                                  </span>
                                ) : isTrial ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    <Clock className="w-3 h-3 text-indigo-400" />{' '}
                                    {isSpain ? 'Prueba' : 'Prova'} ({item.daysRemainingInTrial ?? 0}d) • {(() => {
                                      const rate = s.valor_mensal !== undefined ? Number(s.valor_mensal) : defaultGlobalRate;
                                      return (rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(2)) + (isSpain ? '€/mes' : '€/mês');
                                    })()}
                                  </span>
                                ) : isAtivo ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" /> {isSpain ? 'Activa' : 'Ativo'} • {(() => {
                                      const rate = s.valor_mensal !== undefined ? Number(s.valor_mensal) : defaultGlobalRate;
                                      return (rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(2)) + (isSpain ? '€/mes' : '€/mês');
                                    })()}
                                  </span>
                                ) : isSuspenso ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      <PauseCircle className="w-3 h-3" /> {isSpain ? 'Suspendida' : 'Suspenso'}
                                    </span>
                                    {s.suspensionReason && (
                                      <p className="text-[10px] text-amber-400/80 mt-1 max-w-[180px]">
                                        {s.suspensionReason}
                                      </p>
                                    )}
                                  </div>
                                ) : isCancelado ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    <XCircle className="w-3 h-3" /> {isSpain ? 'Cancelada' : 'Cancelado'}
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Administrador */}
                            <td className="py-3 px-3">
                              {item.adminUser ? (
                                <div>
                                  <div className="font-bold text-slate-200">{item.adminUser.name}</div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    <span>{item.adminUser.email}</span>
                                  </div>
                                  <div className="text-[10px] text-purple-300 font-mono mt-0.5 flex items-center gap-1">
                                    <Key className="w-2.5 h-2.5 text-purple-400" />
                                    <span>
                                      {isSpain ? 'Contraseña: ' : 'Senha: '}
                                      <strong>{item.adminUser.password ? '••••••••' : (isSpain ? 'No definida' : 'Não definida')}</strong>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">
                                  {isSpain ? 'Sin administrador' : 'Sem administrador'}
                                </span>
                              )}
                            </td>

                            {/* Colaboradores / Empleados */}
                            <td className="py-3 px-3 text-center font-bold text-slate-300">
                              {item.staffCount}
                            </td>

                            {/* Clientes */}
                            <td className="py-3 px-3 text-center font-bold text-slate-300">
                              {item.clientsCount}
                            </td>

                            {/* Faturação Total */}
                            <td className="py-3 px-3 text-right">
                              <span className="font-extrabold text-white text-sm">
                                {item.totalRevenue.toFixed(2)}€
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {item.appointmentsCount} {isSpain ? 'citas' : 'marcações'}
                              </div>
                            </td>

                            {/* Ações do Programador */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Inspecionar / Entrar */}
                                <button
                                  onClick={() => impersonateSalon(s.id)}
                                  className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-purple-500/30"
                                  title={isSpain ? 'Inspeccionar peluquería en modo frontend' : 'Entrar no salão para inspecionar frontend'}
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{isSpain ? 'Inspeccionar' : 'Inspecionar'}</span>
                                </button>

                                {/* Suspender se estiver Ativo */}
                                {isAtivo && (
                                  <button
                                    onClick={() => setSuspendingSalon(item)}
                                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-amber-500/30"
                                    title={isSpain ? 'Suspender esta peluquería' : 'Suspender este salão'}
                                  >
                                    <PauseCircle className="w-3 h-3" />
                                    <span>{isSpain ? 'Suspender' : 'Suspender'}</span>
                                  </button>
                                )}

                                {/* Reativar se estiver Suspenso ou Cancelado */}
                                {(isSuspenso || isCancelado) && (
                                  <button
                                    onClick={() => handleReactivate(s.id)}
                                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-emerald-500/30"
                                    title={isSpain ? 'Reactivar peluquería a estado Activo' : 'Reativar salão para estado Ativo'}
                                  >
                                    <PlayCircle className="w-3 h-3" />
                                    <span>{isSpain ? 'Reactivar' : 'Reativar'}</span>
                                  </button>
                                )}

                                {/* Ficha de Subscrição SaaS */}
                                <button
                                  onClick={() => setSelectedSalonForSubscription(item)}
                                  className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-purple-500/40"
                                  title={isSpain ? 'Abrir Ficha de Suscripción del Cliente' : 'Abrir Ficha de Subscrição do Cliente'}
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>{isSpain ? 'Suscripción' : 'Subscrição'}</span>
                                </button>

                                {/* Alterar Palavra-passe do Salão */}
                                <button
                                  onClick={() => {
                                    setEditingSalonPassword(item);
                                    setNewSalonPassword('');
                                    setShowSalonPassword(true);
                                    setSalonPasswordError('');
                                  }}
                                  className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-indigo-500/30"
                                  title={isSpain ? 'Cambiar contraseña de administrador' : 'Alterar palavra-passe do administrador deste salão'}
                                >
                                  <Key className="w-3 h-3" />
                                  <span>{isSpain ? 'Cambiar Contraseña' : 'Alterar Senha'}</span>
                                </button>

                                {/* Cancelar se não estiver Cancelado */}
                                {!isCancelado && (
                                  <button
                                    onClick={() => handleCancel(s.id)}
                                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-500/30"
                                    title={isSpain ? 'Cancelar peluquería' : 'Cancelar salão'}
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </button>
                                )}

                                {/* Eliminar permanentemente */}
                                <button
                                  onClick={() => handleDelete(s.id, s.name)}
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title={isSpain ? 'Eliminar peluquería permanentemente' : 'Eliminar salão permanentemente'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Suspensão com Motivo */}
      {suspendingSalon && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PauseCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">
              {isSpain
                ? `Suspender Peluquería "${suspendingSalon.salon.name}"`
                : `Suspender Salão "${suspendingSalon.salon.name}"`}
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              {isSpain
                ? 'Al suspender esta peluquería, sus empleados y administradores tendrán el acceso bloqueado al sistema.'
                : 'Ao suspender este salão, os seus colaboradores e administradores ficarão impedidos de aceder ao sistema.'}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Motivo de la Suspensión' : 'Motivo da Suspensão'}
                </label>
                <textarea
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder={
                    isSpain
                      ? 'Ej: Mensualidad en mora, comprobación de datos...'
                      : 'Ex: Mensalidade em atraso, verificação de dados...'
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setSuspendingSalon(null)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isSpain ? 'Cancelar' : 'Cancelar'}
                </button>
                <button
                  onClick={handleConfirmSuspension}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isSpain ? 'Confirmar Suspensión' : 'Confirmar Suspensão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Salão pelo Programador no mercado ativo */}
      {isNewSalonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              {isSpain ? <SpainFlag size="md" /> : <PortugalFlag size="md" />}
              <h3 className="text-lg font-bold text-white">
                {isSpain
                  ? '+ Registrar Nueva Peluquería en España'
                  : '+ Registar Novo Salão em Portugal'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {isSpain
                ? 'La peluquería será creada con arquitectura aislada en el mercado de España y estará disponible para el cliente.'
                : 'O salão será criado com arquitetura isolada no mercado de Portugal e ficará disponível para o cliente entrar.'}
            </p>

            <form onSubmit={handleCreateSalonSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Nombre de la Peluquería *' : 'Nome do Salão *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isSpain ? 'Ej: Peluquería Glamour & Estilo' : 'Ex: Espaço Beleza & Glamour'}
                  value={newSalonName}
                  onChange={(e) => setNewSalonName(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {isSpain ? 'Teléfono *' : 'Telemóvel *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isSpain ? '+34 612 345 678' : '+351 912 345 678'}
                    value={newSalonPhone}
                    onChange={(e) => setNewSalonPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {isSpain ? 'NIF / CIF' : 'NIF'}
                  </label>
                  <input
                    type="text"
                    placeholder={isSpain ? 'B12345678' : '509 123 456'}
                    value={newSalonNif}
                    onChange={(e) => setNewSalonNif(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Dirección' : 'Morada'}
                </label>
                <input
                  type="text"
                  placeholder={isSpain ? 'Calle Mayor, 12, Madrid' : 'Rua Principal, 12, Lisboa'}
                  value={newSalonAddress}
                  onChange={(e) => setNewSalonAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {isSpain ? 'Nombre del Administrador *' : 'Nome do Administrador *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isSpain ? 'Carmen García' : 'Nome'}
                    value={newSalonAdminName}
                    onChange={(e) => setNewSalonAdminName(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {isSpain ? 'Correo del Administrador *' : 'E-mail do Admin *'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={isSpain ? 'admin@peluqueria.es' : 'email@salao.pt'}
                    value={newSalonAdminEmail}
                    onChange={(e) => setNewSalonAdminEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Contraseña del Administrador *' : 'Palavra-passe do Administrador *'}
                </label>
                <div className="relative">
                  <input
                    type={showNewSalonPassword ? 'text' : 'password'}
                    required
                    placeholder={isSpain ? 'Contraseña...' : 'Palavra-passe...'}
                    value={newSalonAdminPassword}
                    onChange={(e) => setNewSalonAdminPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewSalonPassword(!showNewSalonPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                    title={
                      showNewSalonPassword
                        ? isSpain ? 'Ocultar contraseña' : 'Ocultar palavra-passe'
                        : isSpain ? 'Mostrar contraseña' : 'Mostrar palavra-passe'
                    }
                  >
                    {showNewSalonPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {isSpain
                    ? 'Defina la contraseña de acceso inicial para el administrador.'
                    : 'Defina a palavra-passe de acesso inicial para o administrador deste salão.'}
                </span>
              </div>

              {/* Condições Contratuais Iniciais (Subscrição Individual) */}
              <div className="p-3.5 bg-slate-900/90 border border-purple-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                    {isSpain ? 'Condiciones Contractuales Iniciales' : 'Condições Contratuais Iniciais'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isSpain ? 'Definido para esta peluquería' : 'Definido individualmente para este salão'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {isSpain ? 'Cuota Mensual (€)' : 'Valor Mensal (€)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newSalonRate}
                        onChange={(e) => setNewSalonRate(e.target.value)}
                        className="w-full pl-3 pr-14 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-purple-500 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none select-none">
                        {isSpain ? '€/mes' : '€/mês'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {isSpain ? `Defecto: ${defaultGlobalRate}€/mes` : `Defeito: ${defaultGlobalRate}€/mês`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {isSpain ? 'Período de Prueba' : 'Período de Teste'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={newSalonTrialDays}
                        onChange={(e) => setNewSalonTrialDays(e.target.value)}
                        className="w-full pl-3 pr-12 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
                        {isSpain ? 'días' : 'dias'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {isSpain ? 'Estado Inicial' : 'Estado Inicial'}
                    </label>
                    <select
                      value={newSalonStatus}
                      onChange={(e) => setNewSalonStatus(e.target.value as any)}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="prova">{isSpain ? 'Período de Prueba' : 'Período de Prova'}</option>
                      <option value="ativo">{isSpain ? 'Activa / Regular' : 'Ativo / Regular'}</option>
                      <option value="bloqueado">{isSpain ? 'Suspendida / Bloqueada' : 'Suspenso / Bloqueado'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewSalonModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isSpain ? 'Cancelar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {isSpain ? 'Registrar Peluquería' : 'Registar Salão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação com Credenciais do Novo Salão */}
      {createdSalonCredentials && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-800 border border-emerald-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {isSpain ? '¡Peluquería Registrada con Éxito!' : 'Salão Registado com Sucesso!'}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {isSpain
                ? 'La peluquería ha sido guardada en el sistema. Guarde las credenciales:'
                : 'O salão foi gravado no sistema. Guarde as credenciais de acesso:'}
            </p>
            <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-700 text-left space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">
                  {isSpain ? 'Peluquería:' : 'Salão:'}
                </span>
                <span className="font-bold text-white">{createdSalonCredentials.salonName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">
                  {isSpain ? 'Correo del Administrador:' : 'E-mail do Administrador:'}
                </span>
                <span className="font-bold text-purple-300">{createdSalonCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">
                  {isSpain ? 'Contraseña Inicial:' : 'Palavra-passe Inicial:'}
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  {createdSalonCredentials.password}
                </span>
              </div>
            </div>
            <button
              onClick={() => setCreatedSalonCredentials(null)}
              className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              {isSpain ? 'Comprendido y Cerrar' : 'Compreendi e Guardei'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Alterar Palavra-passe do Programador */}
      {isDevPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">
              {isSpain ? 'Cambiar Contraseña del Programador' : 'Alterar Senha do Programador'}
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              {isSpain
                ? 'Defina una nueva contraseña de acceso a esta Consola Máster.'
                : 'Defina uma nova palavra-passe de acesso a esta Consola Master.'}
            </p>

            <form onSubmit={handleChangeDevPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Nueva Contraseña *' : 'Nova Palavra-passe *'}
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder={isSpain ? 'Mínimo 4 caracteres...' : 'Mínimo 4 caracteres...'}
                  value={newDevPassword}
                  onChange={(e) => setNewDevPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Confirmar Nueva Contraseña *' : 'Confirmar Nova Palavra-passe *'}
                </label>
                <input
                  type="password"
                  required
                  placeholder={isSpain ? 'Repita la contraseña...' : 'Repita a palavra-passe...'}
                  value={confirmDevPassword}
                  onChange={(e) => setConfirmDevPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {devPasswordError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                  {devPasswordError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDevPasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isSpain ? 'Cancelar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {isSpain ? 'Guardar Contraseña' : 'Guardar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alterar Palavra-passe de Salão */}
      {editingSalonPassword && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">
              {isSpain ? 'Cambiar Contraseña de la Peluquería' : 'Alterar Palavra-passe do Salão'}
            </h3>
            <p className="text-sm text-indigo-300 font-semibold text-center mt-1">
              {editingSalonPassword.salon.name}
            </p>
            <p className="text-xs text-slate-400 text-center mt-0.5">
              {isSpain ? 'Administrador: ' : 'Administrador: '}
              <strong className="text-slate-300">
                {editingSalonPassword.adminUser?.name ||
                  (isSpain ? `Administrador (${editingSalonPassword.salon.name})` : `Administrador (${editingSalonPassword.salon.name})`)}
              </strong>{' '}
              ({editingSalonPassword.adminUser?.email || editingSalonPassword.salon.phone || (isSpain ? 'Sin correo registrado' : 'Sem e-mail registado')})
            </p>

            <form onSubmit={handleChangeSalonPassword} noValidate className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {isSpain ? 'Nueva Contraseña para la Peluquería *' : 'Nova Palavra-passe para o Salão *'}
                </label>
                <div className="relative">
                  <input
                    type={showSalonPassword ? 'text' : 'password'}
                    autoFocus
                    placeholder={
                      isSpain
                        ? 'Introduzca la nueva contraseña (mín. 3 caracteres)...'
                        : 'Introduza a nova palavra-passe (mín. 3 caracteres)...'
                    }
                    value={newSalonPassword}
                    onChange={(e) => {
                      setNewSalonPassword(e.target.value);
                      if (salonPasswordError) setSalonPasswordError('');
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSalonPassword(!showSalonPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                    title={
                      showSalonPassword
                        ? isSpain ? 'Ocultar contraseña' : 'Ocultar palavra-passe'
                        : isSpain ? 'Mostrar contraseña' : 'Mostrar palavra-passe'
                    }
                  >
                    {showSalonPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  {isSpain
                    ? 'Esta será la nueva credencial para que la peluquería acceda al sistema.'
                    : 'Esta será a nova credencial para o salão aceder. Pode indicar esta palavra-passe diretamente ao proprietário do salão.'}
                </span>
              </div>

              {salonPasswordError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-1.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{salonPasswordError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSalonPassword(null)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isSpain ? 'Cancelar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSalonPassword}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50 transition-colors"
                >
                  {isSavingSalonPassword
                    ? isSpain ? 'Actualizando...' : 'A atualizar...'
                    : isSpain ? 'Actualizar Contraseña' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha de Subscrição do Cliente */}
      {currentSelectedSummary && (
        <ClientSubscriptionDrawer
          key={currentSelectedSummary.salon.id}
          salonSummary={currentSelectedSummary}
          onClose={() => setSelectedSalonForSubscription(null)}
        />
      )}

      {/* Modal de Configurações Bancárias de Faturação */}
      {isBillingConfigModalOpen && (
        <BillingConfigModal onClose={() => setIsBillingConfigModalOpen(false)} />
      )}
    </div>
  );
};
