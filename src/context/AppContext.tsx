import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  Salon,
  SalonStatus,
  User,
  Service,
  Client,
  Appointment,
  TabType,
  BillingConfig,
  SubscriptionPayment,
  SubscriptionStats,
  SubscriptionStatus,
  PaymentMethod,
} from '../types';
import { api, type SalonSummary } from '../services/api';
import {
  saveActiveSession,
  loadActiveSession,
  clearActiveSession,
  onStorageSync,
} from '../services/storageEngine';
import {
  calculateEndTime,
  calculateDurationMinutes,
  addMinutesToTime,
} from '../services/conflictValidator';

export type AppMode = 'landing' | 'salon' | 'developer';

interface AppContextType {
  // Navegação Global da Aplicação
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Faturação e Subscrições SaaS (Mensalidades)
  billingConfig: BillingConfig;
  subscriptionPayments: SubscriptionPayment[];
  isSubscriptionBlocked: boolean;
  subscriptionBlockReason: 'prova_expirada' | 'mensalidade_pendente' | 'bloqueado_manual' | null;
  daysRemainingInTrial: number;
  monthlyRate: number;
  hasPendingPayment: boolean;
  createSubscriptionPayment: (params: {
    valor: number;
    metodo: PaymentMethod;
    mes_referencia?: string;
    comprovativo_ref?: string;
  }) => Promise<boolean>;
  validateSubscriptionPayment: (paymentId: string, notasAdmin?: string) => Promise<boolean>;
  updateBillingConfig: (newConfig: Partial<BillingConfig>) => Promise<boolean>;
  updateSalonSubscription: (
    salonId: string,
    updates: { valor_mensal?: number; estado_subscricao?: SubscriptionStatus; fim_prova?: string }
  ) => Promise<boolean>;
  refreshSubscriptionData: () => Promise<void>;
  getSubscriptionStats: () => Promise<SubscriptionStats>;

  // Autenticação de Utilizador do Salão (Login e Logout)
  loginSalonUser: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logoutCurrentSalon: () => void;

  // Controlo do Programador (Super Admin)
  isDevLoggedIn: boolean;
  loginDeveloper: (password?: string) => boolean;
  logoutDeveloper: () => void;
  changeDeveloperPassword: (newPassword: string) => boolean;
  changeSalonPassword: (salonId: string, newPassword: string) => Promise<boolean>;
  updateSalonStatus: (salonId: string, status: SalonStatus, reason?: string) => Promise<boolean>;
  deleteSalon: (salonId: string) => Promise<boolean>;
  isImpersonating: boolean;
  impersonateSalon: (salonId: string) => void;
  returnToDeveloperPortal: () => void;
  allSalonsSummary: SalonSummary[];
  refreshAllSalonsSummary: () => Promise<void>;

  // Estado atual do Salão
  salons: Salon[];
  currentSalon: Salon | null;
  setCurrentSalonId: (id: string) => void;
  users: User[];
  currentUser: User | null;
  setCurrentUserId: (id: string) => void;
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  loading: boolean;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  setNotification: (notif: { type: 'success' | 'error' | 'info'; message: string } | null) => void;

  // Autenticação de Administrador para Relatórios
  isAdminUnlocked: boolean;
  unlockAdmin: (password: string, email?: string) => boolean;
  lockAdmin: () => void;

  // Ações de Reservas (Com Regra Anti-sobreposição e RBAC)
  addAppointment: (data: {
    clientId: string;
    userId: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    endTime?: string;
    customPrice?: number;
    updateBaseServicePrice?: boolean;
    notes?: string;
  }) => Promise<boolean>;
  moveAppointment: (
    appointmentId: string,
    newStartTime: string,
    newUserId: string,
    newDate?: string
  ) => Promise<boolean>;
  nudgeAppointment: (appointmentId: string, deltaMinutes: number) => Promise<boolean>;
  updateAppointmentTimes: (params: {
    appointmentId: string;
    startTime: string;
    endTime: string;
    userId?: string;
    customPrice?: number;
    updateBaseServicePrice?: boolean;
    notes?: string;
    serviceIds?: string[];
  }) => Promise<boolean>;
  deleteAppointment: (id: string) => Promise<boolean>;
  completeAppointment: (id: string) => Promise<boolean>;

  // Ação de Registo de Salão (Multi-Salão Isolado)
  registerNewSalon: (
    params: {
      name: string;
      phone: string;
      address: string;
      nif?: string;
      adminName: string;
      adminEmail: string;
      adminPassword?: string;
      openingTime?: string;
      closingTime?: string;
    },
    options?: { stayInCurrentMode?: boolean }
  ) => Promise<boolean>;

  // Personalização do Salão (Admin Only - apenas o seu próprio salão)
  updateSalonCustomization: (salonId: string, data: { name?: string; logoUrl?: string; primaryColor?: string; startDayOfWeek?: number }) => Promise<boolean>;

  // Ações de Clientes
  addClient: (data: {
    name: string;
    phone: string;
    email?: string;
    preferredUserId?: string;
    technicalNotes?: string;
    photoUrl?: string;
  }) => Promise<boolean>;
  updateClient: (id: string, data: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;

  // Ações de Colaboradores (Admin Only)
  addUser: (data: Omit<User, 'id' | 'salonId'>) => Promise<boolean>;
  updateUser: (id: string, data: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  // Ações de Serviços
  addService: (data: Omit<Service, 'id' | 'salonId'>) => Promise<boolean>;
  updateService: (id: string, data: Partial<Service>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;

  // Recarregar dados
  refreshData: (targetSalonId?: string, targetUserId?: string) => Promise<void>;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Carregar sessão persistida se existir
  const initialSession = loadActiveSession();

  // Navegação Global da Aplicação
  const [appMode, setAppMode] = useState<AppMode>(initialSession?.appMode || 'landing');
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [isDevLoggedIn, setIsDevLoggedIn] = useState<boolean>(initialSession?.appMode === 'developer');
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [allSalonsSummary, setAllSalonsSummary] = useState<SalonSummary[]>([]);

  const [salons, setSalons] = useState<Salon[]>([]);
  const [currentSalonId, setCurrentSalonIdState] = useState<string>(initialSession?.salonId || '');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserIdState] = useState<string>(initialSession?.userId || '');
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Faturação e Subscrições SaaS
  const [billingConfig, setBillingConfig] = useState<BillingConfig>(api.getBillingConfig());
  const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]);

  const subscriptionStatus = useMemo(() => {
    const activeSalon = salons.find((s) => s.id === currentSalonId);
    const defaultRate = billingConfig.valor_mensal_padrao || 29.0;
    if (!currentSalonId) {
      return {
        isBlocked: false,
        reason: null as 'prova_expirada' | 'mensalidade_pendente' | 'bloqueado_manual' | null,
        daysRemainingInTrial: 30,
        monthlyRate: defaultRate,
        hasPendingPayment: false,
      };
    }
    const check = api.checkSalonSubscription(currentSalonId);
    const effectiveRate = activeSalon?.valor_mensal !== undefined
      ? Number(activeSalon.valor_mensal)
      : (check.monthlyRate || defaultRate);
    return {
      ...check,
      monthlyRate: effectiveRate,
    };
  }, [currentSalonId, salons, subscriptionPayments, billingConfig]);

  const setCurrentSalonId = (id: string) => {
    setCurrentSalonIdState(id);
    if (appMode === 'salon') {
      saveActiveSession({ appMode: 'salon', salonId: id, userId: currentUserId });
    }
  };

  const setCurrentUserId = (id: string) => {
    setCurrentUserIdState(id);
    if (appMode === 'salon') {
      saveActiveSession({ appMode: 'salon', salonId: currentSalonId, userId: id });
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const refreshAllSalonsSummary = async () => {
    try {
      const summaries = await api.getAllSalonsSummary();
      setAllSalonsSummary(summaries);
    } catch (e) {
      console.error('Erro ao ler resumo dos salões:', e);
    }
  };

  const refreshSubscriptionData = async () => {
    try {
      const config = api.getBillingConfig();
      setBillingConfig(config);
      const allSalons = await api.getSalons();
      setSalons(allSalons);
      if (currentSalonId) {
        const payments = await api.getSubscriptionPayments(currentSalonId);
        setSubscriptionPayments(payments);
      } else {
        const allPayments = await api.getSubscriptionPayments();
        setSubscriptionPayments(allPayments);
      }
    } catch (e) {
      console.error('Erro ao atualizar dados de subscrição:', e);
    }
  };

  const refreshData = async (targetSalonId?: string, targetUserId?: string) => {
    try {
      setLoading(true);
      const allSalons = await api.getSalons();
      setSalons(allSalons);

      const effectiveSalonId = targetSalonId || currentSalonId;
      const activeSalon = allSalons.find((s) => s.id === effectiveSalonId) || allSalons[0];
      if (activeSalon) {
        const salonId = activeSalon.id;
        if (currentSalonId !== salonId) {
          setCurrentSalonIdState(salonId);
        }
        const [salonUsers, salonServices, salonClients, salonAppointments, salonPayments] = await Promise.all([
          api.getUsers(salonId),
          api.getServices(salonId),
          api.getClients(salonId),
          api.getAppointments(salonId),
          api.getSubscriptionPayments(salonId),
        ]);
        setUsers(salonUsers);
        setServices(salonServices);
        setClients(salonClients);
        setAppointments(salonAppointments);
        setSubscriptionPayments(salonPayments);
        setBillingConfig(api.getBillingConfig());

        const effectiveUserId = targetUserId || currentUserId;
        const matchedUser = salonUsers.find((u) => u.id === effectiveUserId);
        if (matchedUser) {
          if (currentUserId !== matchedUser.id) {
            setCurrentUserIdState(matchedUser.id);
          }
        } else if (salonUsers.length > 0) {
          const adminFirst = salonUsers.find((u) => u.role === 'ADMIN') || salonUsers[0];
          setCurrentUserIdState(adminFirst.id);
        }
      } else {
        setUsers([]);
        setServices([]);
        setClients([]);
        setAppointments([]);
        setSubscriptionPayments([]);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    refreshAllSalonsSummary();

    const handleStorageUpdate = () => {
      refreshData();
      refreshAllSalonsSummary();
    };

    window.addEventListener('storage', handleStorageUpdate);
    const unbind = onStorageSync(handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      unbind();
    };
  }, [currentSalonId]);

  const currentSalon = useMemo(() => {
    return salons.find((s) => s.id === currentSalonId) || null;
  }, [salons, currentSalonId]);

  const currentUser = useMemo(() => {
    const found = users.find((u) => u.id === currentUserId);
    if (found) return found;
    if (users.length > 0) {
      return users.find((u) => u.role === 'ADMIN') || users[0];
    }
    return null;
  }, [users, currentUserId]);

  useEffect(() => {
    if (currentUser && currentUserId !== currentUser.id) {
      setCurrentUserIdState(currentUser.id);
    }
  }, [currentUser, currentUserId]);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  // Garantir que a página de relatórios só é acessível e visível pelo administrador do salão
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      setIsAdminUnlocked(false);
      if (activeTab === 'reports') {
        setActiveTab('calendar');
      }
    }
  }, [currentUser, activeTab]);

  const unlockAdmin = (password: string, email?: string): boolean => {
    const salonAdmins = users.filter((u) => u.salonId === currentSalonId && u.role === 'ADMIN');

    if (salonAdmins.length === 0) {
      showNotification('error', 'Nenhum administrador encontrado para este salão.');
      return false;
    }

    const cleanInputPw = (password || '').trim();

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const matchedAdmin = salonAdmins.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail);
      if (!matchedAdmin) {
        showNotification('error', `O e-mail indicado não corresponde a um administrador registado em ${currentSalon?.name || 'este salão'}.`);
        return false;
      }
      const validPw = (matchedAdmin.password || '').trim();
      if (validPw && cleanInputPw === validPw) {
        setIsAdminUnlocked(true);
        showNotification('success', `Autenticação efetuada com sucesso (${matchedAdmin.name})!`);
        return true;
      } else {
        showNotification('error', 'Palavra-passe de Administrador incorreta.');
        return false;
      }
    }

    // Se nenhum e-mail foi fornecido, verificar se o currentUser é ADMIN
    if (currentUser && currentUser.role === 'ADMIN') {
      const validPw = (currentUser.password || '').trim();
      if (validPw && cleanInputPw === validPw) {
        setIsAdminUnlocked(true);
        showNotification('success', `Autenticação de Administrador efetuada com sucesso (${currentUser.name})!`);
        return true;
      }
    }

    // Verificar se corresponde à palavra-passe de algum dos administradores do salão
    const anyMatchingAdmin = salonAdmins.find((u) => {
      const pw = (u.password || '').trim();
      return pw && cleanInputPw === pw;
    });

    if (anyMatchingAdmin) {
      setIsAdminUnlocked(true);
      showNotification('success', `Autenticação de Administrador efetuada com sucesso (${anyMatchingAdmin.name})!`);
      return true;
    }

    showNotification('error', 'Palavra-passe de Administrador incorreta.');
    return false;
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    showNotification('info', 'Sessão de relatórios encerrada.');
  };

  // ================= AÇÕES DE RESERVAS =================
  const addAppointment = async (data: {
    clientId: string;
    userId: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    endTime?: string;
    customPrice?: number;
    updateBaseServicePrice?: boolean;
    notes?: string;
  }): Promise<boolean> => {
    if (!currentSalon || !currentUser) return false;

    if (data.date < getTodayLocalStr()) {
      showNotification('error', 'Não são permitidas marcações para dias anteriores ao dia atual.');
      return false;
    }

    const client = clients.find((c) => c.id === data.clientId);
    if (!client) {
      showNotification('error', 'Cliente selecionado inválido.');
      return false;
    }

    const selectedServices = services.filter((s) => data.serviceIds.includes(s.id));
    if (selectedServices.length === 0) {
      showNotification('error', 'Selecione pelo menos um serviço.');
      return false;
    }

    const totalDuration = data.endTime
      ? Math.max(5, calculateDurationMinutes(data.startTime, data.endTime))
      : selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0) || 30;
    const calculatedPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalPrice = data.customPrice !== undefined ? Number(data.customPrice) : calculatedPrice;
    const endTime =
      data.endTime && calculateDurationMinutes(data.startTime, data.endTime) > 0
        ? data.endTime
        : calculateEndTime(data.startTime, totalDuration);

    try {
      // Se solicitado, atualiza o preço base no catálogo do salão como sugestão futura
      if (data.updateBaseServicePrice && data.customPrice !== undefined && selectedServices.length === 1) {
        await api.updateService(currentUser.role, selectedServices[0].id, { price: Number(data.customPrice) });
      }

      await api.createAppointment({
        salonId: currentSalon.id,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        userId: data.userId,
        serviceIds: selectedServices.map((s) => s.id),
        serviceNames: selectedServices.map((s) => s.name),
        date: data.date,
        startTime: data.startTime,
        endTime,
        totalDurationMinutes: totalDuration,
        totalPrice,
        status: 'AGENDADA',
        notes: data.notes,
        createdById: currentUser.id,
      });

      await refreshData();
      showNotification('success', 'Reserva confirmada e agendada com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao criar reserva.');
      return false;
    }
  };

  const getTodayLocalStr = (): string => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Mover reserva via Drag & Drop (com granularidade de 10 minutos; permite sobreposição de tarefas)
  const moveAppointment = async (
    appointmentId: string,
    newStartTime: string,
    newUserId: string,
    newDate?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;

    const todayStr = getTodayLocalStr();
    if (apt.date < todayStr) {
      showNotification('error', 'As reservas anteriores ao dia atual não podem ser alteradas.');
      return false;
    }

    const targetDate = newDate || apt.date;
    if (targetDate < todayStr) {
      showNotification('error', 'Não é possível mover reservas para datas anteriores ao dia atual.');
      return false;
    }

    const duration = apt.totalDurationMinutes || 30;
    const newEndTime = calculateEndTime(newStartTime, duration);

    try {
      await api.updateAppointment(currentUser.role, apt.id, {
        date: targetDate,
        startTime: newStartTime,
        endTime: newEndTime,
        userId: newUserId,
      });
      await refreshData();
      showNotification('success', `Reserva de ${apt.clientName} movida para as ${newStartTime}!`);
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao mover reserva.');
      return false;
    }
  };

  // Ajustar horário por períodos de 10 minutos (+10m ou -10m; permite sobreposição de tarefas)
  const nudgeAppointment = async (appointmentId: string, deltaMinutes: number): Promise<boolean> => {
    if (!currentUser) return false;
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;

    const todayStr = getTodayLocalStr();
    if (apt.date < todayStr) {
      showNotification('error', 'As reservas anteriores ao dia atual não podem ser alteradas.');
      return false;
    }

    const newStartTime = addMinutesToTime(apt.startTime, deltaMinutes);
    const newEndTime = calculateEndTime(newStartTime, apt.totalDurationMinutes || 30);

    try {
      await api.updateAppointment(currentUser.role, apt.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
      await refreshData();
      showNotification('success', `Horário ajustado em ${deltaMinutes > 0 ? '+' : ''}${deltaMinutes} min (${newStartTime} às ${newEndTime})`);
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao ajustar horário.');
      return false;
    }
  };

  // Alterar hora de início, fim, serviços e preço de intervenção diretamente (permite sobreposição)
  const updateAppointmentTimes = async (params: {
    appointmentId: string;
    startTime: string;
    endTime: string;
    userId?: string;
    customPrice?: number;
    updateBaseServicePrice?: boolean;
    notes?: string;
    serviceIds?: string[];
  }): Promise<boolean> => {
    if (!currentUser) return false;
    const apt = appointments.find((a) => a.id === params.appointmentId);
    if (!apt) return false;

    const todayStr = getTodayLocalStr();
    if (apt.date < todayStr) {
      showNotification('error', 'As reservas anteriores ao dia atual não podem ser alteradas.');
      return false;
    }

    const targetUserId = params.userId || apt.userId;
    const rawDuration = calculateDurationMinutes(params.startTime, params.endTime);
    const durationMinutes = rawDuration > 0 ? rawDuration : apt.totalDurationMinutes || 30;
    const effectiveEndTime = rawDuration > 0 ? params.endTime : calculateEndTime(params.startTime, durationMinutes);

    try {
      const updateData: Partial<Appointment> = {
        startTime: params.startTime,
        endTime: effectiveEndTime,
        totalDurationMinutes: durationMinutes,
        userId: targetUserId,
        notes: params.notes,
      };

      if (params.serviceIds && params.serviceIds.length > 0) {
        const selectedServices = services.filter((s) => params.serviceIds!.includes(s.id));
        if (selectedServices.length > 0) {
          updateData.serviceIds = selectedServices.map((s) => s.id);
          updateData.serviceNames = selectedServices.map((s) => s.name);
          updateData.totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
        }
      }

      if (params.customPrice !== undefined) {
        updateData.totalPrice = Number(params.customPrice);
      }

      const activeServiceIds = updateData.serviceIds || apt.serviceIds;
      // Se solicitado, atualiza o preço base como nova sugestão no catálogo do salão
      if (params.updateBaseServicePrice && params.customPrice !== undefined && activeServiceIds.length === 1) {
        await api.updateService(currentUser.role, activeServiceIds[0], { price: Number(params.customPrice) });
      }

      await api.updateAppointment(currentUser.role, apt.id, updateData);
      await refreshData();
      showNotification('success', 'Reserva e preços atualizados com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar horário.');
      return false;
    }
  };

  const deleteAppointment = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;
    const apt = appointments.find((a) => a.id === id);
    if (apt && apt.date < getTodayLocalStr()) {
      showNotification('error', 'As reservas anteriores ao dia atual não podem ser apagadas.');
      return false;
    }

    if (currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador do salão pode apagar ou cancelar reservas.');
      return false;
    }

    try {
      await api.deleteAppointment(currentUser.role, id);
      await refreshData();
      showNotification('success', 'Reserva eliminada com sucesso.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao apagar reserva.');
      return false;
    }
  };

  const completeAppointment = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;
    const apt = appointments.find((a) => a.id === id);
    if (apt && apt.date < getTodayLocalStr()) {
      showNotification('error', 'As reservas anteriores ao dia atual não podem ser alteradas.');
      return false;
    }

    try {
      const prof = users.find((u) => u.id === apt?.userId);
      await api.completeAppointment(currentUser.role, id, prof ? prof.name : 'Colaborador');
      await refreshData();
      showNotification('success', 'Serviço concluído e adicionado ao histórico do cliente!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao concluir reserva.');
      return false;
    }
  };

  // Autenticação de Utilizador do Salão (Login na Landing Page)
  const loginSalonUser = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user, salon } = await api.loginUser(email, password);
      setCurrentSalonIdState(salon.id);
      setCurrentUserIdState(user.id);
      setIsImpersonating(false);
      setAppMode('salon');
      saveActiveSession({ appMode: 'salon', salonId: salon.id, userId: user.id });
      await refreshData(salon.id, user.id);
      showNotification('success', `Sessão iniciada no salão "${salon.name}".`);
      return { success: true };
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao iniciar sessão no salão.');
      return { success: false, error: err.message };
    }
  };

  const logoutCurrentSalon = () => {
    setIsAdminUnlocked(false);
    setIsImpersonating(false);
    clearActiveSession();
    setAppMode('landing');
    showNotification('info', 'Sessão encerrada com sucesso.');
  };

  // Controlo do Programador (Super Admin)
  const loginDeveloper = (password?: string): boolean => {
    const currentDevPassword = api.getDeveloperPassword();
    const trimmed = password?.trim() || '';

    // Se ainda não foi definida palavra-passe de programador no sistema, configurar na primeira entrada
    if (!currentDevPassword) {
      if (trimmed.length >= 4) {
        api.updateDeveloperPassword(trimmed);
        setIsDevLoggedIn(true);
        setAppMode('developer');
        saveActiveSession({ appMode: 'developer', salonId: currentSalonId, userId: currentUserId });
        refreshAllSalonsSummary();
        showNotification('success', 'Palavra-passe de programador configurada com sucesso! Acesso autorizado.');
        return true;
      } else {
        showNotification('error', 'Defina uma palavra-passe de programador (mínimo 4 caracteres).');
        return false;
      }
    }

    if (trimmed && trimmed === currentDevPassword) {
      setIsDevLoggedIn(true);
      setAppMode('developer');
      saveActiveSession({ appMode: 'developer', salonId: currentSalonId, userId: currentUserId });
      refreshAllSalonsSummary();
      showNotification('success', 'Acesso à Consola do Programador autorizado!');
      return true;
    } else {
      showNotification('error', 'Palavra-passe de programador incorreta.');
      return false;
    }
  };

  const changeDeveloperPassword = (newPassword: string): boolean => {
    try {
      api.updateDeveloperPassword(newPassword);
      showNotification('success', 'Palavra-passe do programador alterada com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao alterar palavra-passe.');
      return false;
    }
  };

  const changeSalonPassword = async (salonId: string, newPassword: string): Promise<boolean> => {
    try {
      const admin = await api.updateSalonAdminPassword(salonId, newPassword);
      await refreshData();
      await refreshAllSalonsSummary();
      showNotification('success', `Palavra-passe de "${admin.name}" atualizada com sucesso!`);
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar palavra-passe do salão.');
      return false;
    }
  };

  const logoutDeveloper = () => {
    setIsAdminUnlocked(false);
    setIsDevLoggedIn(false);
    setIsImpersonating(false);
    clearActiveSession();
    setAppMode('landing');
    showNotification('info', 'Sessão de programador terminada.');
  };

  const updateSalonStatus = async (salonId: string, status: SalonStatus, reason?: string): Promise<boolean> => {
    try {
      const updated = await api.updateSalonStatus(salonId, status, reason);
      await refreshData();
      await refreshAllSalonsSummary();
      showNotification('success', `Salão "${updated.name}" agora está com estado: ${status}!`);
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar estado do salão.');
      return false;
    }
  };

  const deleteSalon = async (salonId: string): Promise<boolean> => {
    try {
      await api.deleteSalon(salonId);
      await refreshData();
      await refreshAllSalonsSummary();
      showNotification('success', 'Salão e todos os dados associados foram eliminados.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao eliminar salão.');
      return false;
    }
  };

  const impersonateSalon = async (salonId: string) => {
    setCurrentSalonId(salonId);
    setIsImpersonating(true);
    setAppMode('salon');
    await refreshData(salonId);
    showNotification('info', 'A inspecionar salão no modo de programador.');
  };

  const returnToDeveloperPortal = () => {
    setIsImpersonating(false);
    setIsDevLoggedIn(true);
    setAppMode('developer');
    saveActiveSession({ appMode: 'developer', salonId: currentSalonId, userId: currentUserId });
    refreshAllSalonsSummary();
    showNotification('info', 'Regresso à Consola do Programador.');
  };

  // Registo de novo salão isolado
  const registerNewSalon = async (
    params: {
      name: string;
      phone: string;
      address: string;
      nif?: string;
      adminName: string;
      adminEmail: string;
      adminPassword?: string;
      openingTime?: string;
      closingTime?: string;
    },
    options?: { stayInCurrentMode?: boolean }
  ): Promise<boolean> => {
    try {
      const { salon, adminUser } = await api.registerSalon(params);

      if (!options?.stayInCurrentMode && appMode !== 'developer') {
        setCurrentSalonIdState(salon.id);
        setCurrentUserIdState(adminUser.id);
        setAppMode('salon');
        saveActiveSession({ appMode: 'salon', salonId: salon.id, userId: adminUser.id });
        await refreshData(salon.id, adminUser.id);
        await refreshAllSalonsSummary();
        showNotification('success', `Salão "${salon.name}" registado com sucesso! Acedendo como ${adminUser.name}...`);
      } else {
        await refreshData();
        await refreshAllSalonsSummary();
        showNotification('success', `Salão "${salon.name}" registado com sucesso no sistema!`);
      }
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao registar salão.');
      return false;
    }
  };

  // ================= PERSONALIZAÇÃO DO SALÃO (ADMIN ONLY) =================
  const updateSalonCustomization = async (
    salonId: string,
    data: { name?: string; logoUrl?: string; primaryColor?: string; startDayOfWeek?: number }
  ): Promise<boolean> => {
    if (!currentSalon || !currentUser) return false;
    if (currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador pode alterar os dados e a personalização do salão.');
      return false;
    }
    if (currentSalon.id !== salonId) {
      showNotification('error', 'Apenas pode alterar a personalização do seu próprio salão.');
      return false;
    }

    try {
      await api.updateSalon(salonId, data);
      await refreshData();
      await refreshAllSalonsSummary();
      showNotification('success', 'Configurações do salão (nome, cores, logótipo e início da semana) gravadas com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao gravar configurações do salão.');
      return false;
    }
  };

  // ================= AÇÕES DE CLIENTES =================
  const addClient = async (data: {
    name: string;
    phone: string;
    email?: string;
    preferredUserId?: string;
    technicalNotes?: string;
    photoUrl?: string;
  }): Promise<boolean> => {
    if (!currentSalon) {
      showNotification('error', 'Nenhum salão selecionado.');
      return false;
    }

    try {
      const creatorId = currentUser?.id || users[0]?.id || 'admin';
      await api.createClient({
        salonId: currentSalon.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        preferredUserId: data.preferredUserId,
        technicalNotes: data.technicalNotes,
        photoUrl: data.photoUrl,
        createdById: creatorId,
      });
      await refreshData();
      showNotification('success', 'Cliente registado com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao registar cliente.');
      return false;
    }
  };

  const updateClient = async (id: string, data: Partial<Client>): Promise<boolean> => {
    try {
      await api.updateClient(id, data);
      await refreshData();
      showNotification('success', 'Ficha de cliente atualizada com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar cliente.');
      return false;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;
    if (currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador do salão pode apagar fichas de clientes.');
      return false;
    }

    try {
      await api.deleteClient(currentUser.role, id);
      await refreshData();
      showNotification('success', 'Cliente removido com sucesso.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao apagar cliente.');
      return false;
    }
  };

  // ================= AÇÕES DE COLABORADORES =================
  const addUser = async (data: Omit<User, 'id' | 'salonId'>): Promise<boolean> => {
    if (!currentSalon || !currentUser) return false;
    if (currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador pode registar colaboradores.');
      return false;
    }

    try {
      await api.createUser(currentUser.role, {
        ...data,
        salonId: currentSalon.id,
      });
      await refreshData();
      showNotification('success', 'Colaborador adicionado com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao adicionar colaborador.');
      return false;
    }
  };

  const updateUser = async (id: string, data: Partial<User>): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador pode editar colaboradores.');
      return false;
    }

    try {
      await api.updateUser(currentUser.role, id, data);
      await refreshData();
      showNotification('success', 'Colaborador atualizado com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar colaborador.');
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador pode desativar colaboradores.');
      return false;
    }

    try {
      await api.deleteUser(currentUser.role, id);
      await refreshData();
      showNotification('success', 'Colaborador removido da equipa.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao remover colaborador.');
      return false;
    }
  };

  // ================= AÇÕES DE SERVIÇOS =================
  const addService = async (data: Omit<Service, 'id' | 'salonId'>): Promise<boolean> => {
    if (!currentSalon) {
      showNotification('error', 'Nenhum salão selecionado.');
      return false;
    }

    try {
      const role = currentUser?.role || 'ADMIN';
      await api.createService(role, {
        ...data,
        salonId: currentSalon.id,
      });
      await refreshData();
      showNotification('success', `Serviço "${data.name}" registado e adicionado à lista de disponíveis!`);
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao criar serviço.');
      return false;
    }
  };

  const updateService = async (id: string, data: Partial<Service>): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      await api.updateService(currentUser.role, id, data);
      await refreshData();
      showNotification('success', 'Serviço atualizado com sucesso!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar serviço.');
      return false;
    }
  };

  const deleteService = async (id: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      showNotification('error', 'Apenas o Administrador pode apagar serviços.');
      return false;
    }

    try {
      await api.deleteService(currentUser.role, id);
      await refreshData();
      showNotification('success', 'Serviço removido com sucesso.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao remover serviço.');
      return false;
    }
  };

  const resetDemoData = () => {
    api.resetToDefaults();
    refreshData();
    showNotification('info', 'Dados de demonstração restaurados com sucesso.');
  };

  // Ações de Faturação e Subscrição SaaS
  const createSubscriptionPayment = async (params: {
    valor: number;
    metodo: PaymentMethod;
    mes_referencia?: string;
    comprovativo_ref?: string;
  }): Promise<boolean> => {
    if (!currentSalonId) return false;
    try {
      await api.createSubscriptionPayment({
        cliente_id: currentSalonId,
        valor: params.valor,
        metodo: params.metodo,
        mes_referencia: params.mes_referencia,
        comprovativo_ref: params.comprovativo_ref,
      });
      await refreshData();
      await refreshAllSalonsSummary();
      showNotification('success', 'Comprovativo registado com sucesso! A aguardar validação do administrador.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao registar pagamento.');
      return false;
    }
  };

  const validateSubscriptionPayment = async (paymentId: string, notasAdmin?: string): Promise<boolean> => {
    try {
      await api.validateSubscriptionPayment(paymentId, notasAdmin);
      await refreshData(currentSalonId);
      await refreshAllSalonsSummary();
      showNotification('success', 'Pagamento validado com sucesso! O salão foi desbloqueado de imediato.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao validar pagamento.');
      return false;
    }
  };

  const updateBillingConfig = async (newConfig: Partial<BillingConfig>): Promise<boolean> => {
    try {
      const updated = await api.updateBillingConfig(newConfig);
      setBillingConfig(updated);
      refreshAllSalonsSummary().catch(() => {});
      showNotification('success', 'Configurações de faturação atualizadas com sucesso.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar dados de faturação.');
      return false;
    }
  };

  const updateSalonSubscription = async (
    salonId: string,
    updates: { valor_mensal?: number; estado_subscricao?: SubscriptionStatus; fim_prova?: string }
  ): Promise<boolean> => {
    try {
      await api.updateSalonSubscription(salonId, updates);
      await refreshData(currentSalonId || salonId);
      await refreshAllSalonsSummary();
      showNotification('success', 'Ficha de subscrição atualizada com sucesso.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar subscrição.');
      return false;
    }
  };

  const getSubscriptionStats = async (): Promise<SubscriptionStats> => {
    return api.getSubscriptionStats();
  };

  return (
    <AppContext.Provider
      value={{
        appMode,
        setAppMode,
        activeTab,
        setActiveTab,
        billingConfig,
        subscriptionPayments,
        isSubscriptionBlocked: subscriptionStatus.isBlocked,
        subscriptionBlockReason: subscriptionStatus.reason,
        daysRemainingInTrial: subscriptionStatus.daysRemainingInTrial,
        monthlyRate: subscriptionStatus.monthlyRate,
        hasPendingPayment: subscriptionStatus.hasPendingPayment,
        createSubscriptionPayment,
        validateSubscriptionPayment,
        updateBillingConfig,
        updateSalonSubscription,
        refreshSubscriptionData,
        getSubscriptionStats,
        loginSalonUser,
        logoutCurrentSalon,
        isDevLoggedIn,
        loginDeveloper,
        logoutDeveloper,
        changeDeveloperPassword,
        changeSalonPassword,
        updateSalonStatus,
        deleteSalon,
        isImpersonating,
        impersonateSalon,
        returnToDeveloperPortal,
        allSalonsSummary,
        refreshAllSalonsSummary,
        salons,
        currentSalon,
        setCurrentSalonId,
        users,
        currentUser,
        setCurrentUserId,
        services,
        clients,
        appointments,
        loading,
        notification,
        setNotification,
        isAdminUnlocked,
        unlockAdmin,
        lockAdmin,
        addAppointment,
        moveAppointment,
        nudgeAppointment,
        updateAppointmentTimes,
        deleteAppointment,
        completeAppointment,
        registerNewSalon,
        updateSalonCustomization,
        addClient,
        updateClient,
        deleteClient,
        addUser,
        updateUser,
        deleteUser,
        addService,
        updateService,
        deleteService,
        refreshData,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
