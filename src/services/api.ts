import type {
  Salon,
  SalonStatus,
  User,
  Service,
  Client,
  Appointment,
  SubscriptionPayment,
  PaymentMethod,
  BillingConfig,
  SubscriptionStats,
  SubscriptionStatus,
} from '../types';
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToStorage,
  saveMultipleToStorage,
  syncAndMergeStorage,
  onStorageSync,
  notifyStorageSync,
  idbSet,
} from './storageEngine';
import { supabaseService } from './supabase';

export interface SalonSummary {
  salon: Salon;
  adminUser?: User;
  staffCount: number;
  clientsCount: number;
  appointmentsCount: number;
  totalRevenue: number;
  payments?: SubscriptionPayment[];
  pendingPaymentsCount?: number;
  isSubscriptionBlocked?: boolean;
  subscriptionBlockReason?: string | null;
  daysRemainingInTrial?: number;
}

export class ApiService {
  private salons: Salon[] = [];
  private users: User[] = [];
  private services: Service[] = [];
  private clients: Client[] = [];
  private appointments: Appointment[] = [];
  private subscriptionPayments: SubscriptionPayment[] = [];
  private billingConfig: BillingConfig = {
    iban: 'PT50 0033 0000 4523 4567 8901 2',
    numero_mbway: '912 345 678',
    numero_whatsapp: '+351 912 345 678',
    valor_mensal_padrao: 29.00,
  };

  // URL base configurável para o backend no servidor do utilizador
  private baseUrl = import.meta.env?.VITE_API_BASE_URL || '';

  constructor() {
    this.reloadFromStorage();
    // Inicia sincronização e merge de segurança a partir do IndexedDB em segundo plano
    if (typeof window !== 'undefined') {
      syncAndMergeStorage().then((changed) => {
        if (changed) {
          this.reloadFromStorage();
        }
      });
      this.syncWithRemote().then((changed) => {
        if (changed) {
          this.reloadFromStorage();
        }
      });
      // Escutar sincronizações
      onStorageSync(() => {
        this.reloadFromStorage();
      });
    }
  }

  /**
   * Recarrega todos os dados a partir do armazenamento persistente
   * para assegurar que múltiplas abas ou sessões nunca usem cache desatualizada.
   */
  public reloadFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.BILLING_CONFIG);
      if (savedConfig) {
        this.billingConfig = { ...this.billingConfig, ...JSON.parse(savedConfig) };
      }
    } catch {}

    const defaultRate = this.billingConfig.valor_mensal_padrao || 29.00;
    const rawSalons = loadFromLocalStorage<Salon>(STORAGE_KEYS.SALONS, []);
    this.salons = rawSalons.map((s) => {
      const regDate = s.data_registo || s.createdAt || new Date().toISOString();
      const trialEnd = s.fim_prova || new Date(new Date(regDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      return {
        ...s,
        status: s.status || 'ATIVO',
        primaryColor: s.primaryColor || '#8B5CF6',
        createdAt: s.createdAt || regDate,
        startDayOfWeek: s.startDayOfWeek !== undefined ? s.startDayOfWeek : 1,
        data_registo: regDate,
        fim_prova: trialEnd,
        valor_mensal: s.valor_mensal !== undefined ? Number(s.valor_mensal) : defaultRate,
        estado_subscricao: (s.estado_subscricao as SubscriptionStatus) || 'prova',
      };
    });

    this.users = loadFromLocalStorage<User>(STORAGE_KEYS.USERS, []);
    this.services = loadFromLocalStorage<Service>(STORAGE_KEYS.SERVICES, []);
    this.clients = loadFromLocalStorage<Client>(STORAGE_KEYS.CLIENTS, []);
    this.appointments = loadFromLocalStorage<Appointment>(STORAGE_KEYS.APPOINTMENTS, []);
    this.subscriptionPayments = loadFromLocalStorage<SubscriptionPayment>(
      STORAGE_KEYS.SUBSCRIPTION_PAYMENTS,
      []
    );
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ================= SALÕES =================
  async getSalons(): Promise<Salon[]> {
    this.reloadFromStorage();
    return [...this.salons];
  }

  async getSalonById(id: string): Promise<Salon | null> {
    this.reloadFromStorage();
    return this.salons.find((s) => s.id === id) || null;
  }

  async createSalon(salonData: Omit<Salon, 'id'>): Promise<Salon> {
    this.reloadFromStorage();
    const newSalon: Salon = {
      id: `salon-${Date.now()}`,
      ...salonData,
      status: salonData.status || 'ATIVO',
      createdAt: salonData.createdAt || new Date().toISOString(),
    };
    this.salons.push(newSalon);
    saveToStorage(STORAGE_KEYS.SALONS, this.salons);
    return newSalon;
  }

  async updateSalon(salonId: string, updates: Partial<Salon>): Promise<Salon> {
    this.reloadFromStorage();
    const idx = this.salons.findIndex((s) => s.id === salonId);
    if (idx === -1) throw new Error('Salão não encontrado.');
    this.salons[idx] = { ...this.salons[idx], ...updates };
    saveToStorage(STORAGE_KEYS.SALONS, this.salons);
    return this.salons[idx];
  }

  async registerSalon(params: {
    name: string;
    phone: string;
    address: string;
    nif?: string;
    adminName: string;
    adminEmail: string;
    adminPassword?: string;
    openingTime?: string;
    closingTime?: string;
  }): Promise<{ salon: Salon; adminUser: User }> {
    // Sincronizar armazenamento antes de validar e gravar
    await syncAndMergeStorage();
    this.reloadFromStorage();

    const cleanEmail = params.adminEmail.trim().toLowerCase();
    const cleanSalonName = params.name.trim();

    // Validação preventiva: verificar se já existe utilizador com o mesmo e-mail
    const existingUser = this.users.find(
      (u) => (u.email || '').trim().toLowerCase() === cleanEmail
    );
    if (existingUser) {
      throw new Error(
        `Já existe uma conta registada com o e-mail "${cleanEmail}". Pode iniciar sessão diretamente com este e-mail.`
      );
    }

    const salonId = `salon-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const trialEndIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultRate = this.billingConfig.valor_mensal_padrao || 29.0;

    const newSalon: Salon = {
      id: salonId,
      name: cleanSalonName,
      email: cleanEmail,
      phone: params.phone.trim(),
      address: params.address.trim(),
      nif: params.nif?.trim() || '',
      openingTime: params.openingTime || '09:00',
      closingTime: params.closingTime || '20:00',
      slotIntervalMinutes: 10,
      status: 'ATIVO',
      createdAt: nowIso,
      primaryColor: '#8B5CF6',
      startDayOfWeek: 1,
      // Faturação e Subscrição SaaS
      data_registo: nowIso,
      fim_prova: trialEndIso,
      valor_mensal: defaultRate,
      estado_subscricao: 'prova',
    };

    // Criar Administrador Inicial do novo salão
    const adminUser: User = {
      id: `user-${Date.now()}`,
      salonId,
      name: params.adminName.trim(),
      email: cleanEmail,
      phone: params.phone.trim(),
      role: 'ADMIN',
      password: params.adminPassword?.trim() || undefined,
      color: '#8B5CF6',
      specialties: ['Gestão', 'Cortes & Estilo'],
      active: true,
    };

    // Criar serviços base para o novo salão (cada salão gere os seus)
    const initialServices: Service[] = [
      {
        id: `serv-${Date.now()}-1`,
        salonId,
        name: 'Corte de Cabelo',
        category: 'Cabelo',
        durationMinutes: 30,
        price: 20.0,
        description: 'Corte e finalização personalizada.',
      },
      {
        id: `serv-${Date.now()}-2`,
        salonId,
        name: 'Brushing & Lavagem',
        category: 'Cabelo',
        durationMinutes: 30,
        price: 18.0,
      },
      {
        id: `serv-${Date.now()}-3`,
        salonId,
        name: 'Coloração Completa',
        category: 'Cabelo',
        durationMinutes: 60,
        price: 45.0,
      },
    ];

    this.salons.push(newSalon);
    this.users.push(adminUser);
    this.services.push(...initialServices);

    saveMultipleToStorage([
      { key: STORAGE_KEYS.SALONS, data: this.salons },
      { key: STORAGE_KEYS.USERS, data: this.users },
      { key: STORAGE_KEYS.SERVICES, data: this.services },
    ]);

    // Sincronização em segundo plano com o Supabase
    supabaseService.syncClient(newSalon).catch(() => {});

    return { salon: newSalon, adminUser };
  }

  // Suspender ou Cancelar Salão (Função Exclusiva do Programador)
  async updateSalonStatus(salonId: string, status: SalonStatus, reason?: string): Promise<Salon> {
    this.reloadFromStorage();
    const idx = this.salons.findIndex((s) => s.id === salonId);
    if (idx === -1) throw new Error('Salão não encontrado.');

    this.salons[idx] = {
      ...this.salons[idx],
      status,
      suspensionReason: reason || (status === 'ATIVO' ? undefined : this.salons[idx].suspensionReason),
    };
    saveToStorage(STORAGE_KEYS.SALONS, this.salons);
    return this.salons[idx];
  }

  // Eliminar Salão e dados associados (Função Exclusiva do Programador)
  async deleteSalon(salonId: string): Promise<void> {
    this.reloadFromStorage();
    this.salons = this.salons.filter((s) => s.id !== salonId);
    this.users = this.users.filter((u) => u.salonId !== salonId);
    this.services = this.services.filter((s) => s.salonId !== salonId);
    this.clients = this.clients.filter((c) => c.salonId !== salonId);
    this.appointments = this.appointments.filter((a) => a.salonId !== salonId);
    this.subscriptionPayments = this.subscriptionPayments.filter((p) => p.cliente_id !== salonId);

    saveMultipleToStorage([
      { key: STORAGE_KEYS.SALONS, data: this.salons },
      { key: STORAGE_KEYS.USERS, data: this.users },
      { key: STORAGE_KEYS.SERVICES, data: this.services },
      { key: STORAGE_KEYS.CLIENTS, data: this.clients },
      { key: STORAGE_KEYS.APPOINTMENTS, data: this.appointments },
      { key: STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, data: this.subscriptionPayments },
    ], true);
  }

  // Gestão da Palavra-passe do Programador
  getDeveloperPassword(): string | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEV_PASSWORD);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {
      console.error('Erro ao ler palavra-passe de programador:', e);
    }
    return null;
  }

  updateDeveloperPassword(newPassword: string): void {
    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('A nova palavra-passe de programador deve ter pelo menos 4 caracteres.');
    }
    localStorage.setItem(STORAGE_KEYS.DEV_PASSWORD, newPassword.trim());
  }

  // Alterar a Palavra-passe de um Salão Registado (Função do Programador)
  async updateSalonAdminPassword(salonId: string, newPassword: string): Promise<User> {
    await syncAndMergeStorage();
    this.reloadFromStorage();
    const cleanPw = (newPassword || '').trim();
    if (!cleanPw || cleanPw.length < 3) {
      throw new Error('A palavra-passe deve ter pelo menos 3 caracteres.');
    }

    const salon = this.salons.find((s) => s.id === salonId);
    if (!salon) {
      throw new Error('Salão não encontrado.');
    }

    let salonUsers = this.users.filter((u) => u.salonId === salonId);
    let targetAdmin: User;

    if (salonUsers.length === 0) {
      // Criar automaticamente o Administrador caso o salão ainda não tenha nenhum utilizador
      const cleanSlug = salon.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      targetAdmin = {
        id: `user-${Date.now()}`,
        salonId: salon.id,
        name: `Administrador ${salon.name}`,
        email: `admin@${cleanSlug || 'salao'}.pt`,
        phone: salon.phone || '',
        role: 'ADMIN',
        password: cleanPw,
        color: salon.primaryColor || '#8B5CF6',
        specialties: ['Gestão', 'Administração'],
        active: true,
      };
      this.users.push(targetAdmin);
    } else {
      const admins = salonUsers.filter((u) => u.role === 'ADMIN');
      if (admins.length > 0) {
        admins.forEach((adm) => {
          adm.password = cleanPw;
          adm.active = true;
        });
        targetAdmin = admins[0];
      } else {
        salonUsers[0].role = 'ADMIN';
        salonUsers[0].password = cleanPw;
        salonUsers[0].active = true;
        targetAdmin = salonUsers[0];
      }
    }

    saveToStorage(STORAGE_KEYS.USERS, this.users);
    return targetAdmin;
  }

  // Resumo de todos os salões para a Consola do Programador
  async getAllSalonsSummary(): Promise<SalonSummary[]> {
    await syncAndMergeStorage();
    this.reloadFromStorage();
    return this.salons.map((salon) => {
      const salonUsers = this.users.filter((u) => u.salonId === salon.id);
      const salonClients = this.clients.filter((c) => c.salonId === salon.id);
      const salonAppointments = this.appointments.filter((a) => a.salonId === salon.id);
      let adminUser = salonUsers.find((u) => u.role === 'ADMIN');
      if (!adminUser && salonUsers.length > 0) {
        adminUser = salonUsers[0];
      }

      const revenueFromClients = salonClients.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
      const payments = this.subscriptionPayments.filter((p) => p.cliente_id === salon.id);
      const pendingPaymentsCount = payments.filter((p) => p.estado === 'pendente').length;
      const subCheck = this.checkSalonSubscription(salon.id);

      return {
        salon,
        adminUser: adminUser || undefined,
        staffCount: salonUsers.length,
        clientsCount: salonClients.length,
        appointmentsCount: salonAppointments.length,
        totalRevenue: revenueFromClients,
        payments,
        pendingPaymentsCount,
        isSubscriptionBlocked: subCheck.isBlocked,
        subscriptionBlockReason: subCheck.reason,
        daysRemainingInTrial: subCheck.daysRemainingInTrial,
      };
    });
  }

  // Autenticação de Utilizador / Salão (Permite entrar por E-mail, Nome do Salão, Telefone ou Nome do Utilizador)
  async loginUser(identifier: string, password?: string): Promise<{ user: User; salon: Salon }> {
    this.reloadFromStorage();
    const cleanInput = (identifier || '').trim();
    const cleanLower = cleanInput.toLowerCase();
    const cleanDigits = cleanInput.replace(/\D/g, '');
    const inputPassword = (password || '').trim();

    const getCandidates = (): Array<{ user: User; salon: Salon }> => {
      const candidates: Array<{ user: User; salon: Salon }> = [];

      // 1. Procurar por e-mail exato do utilizador
      for (const u of this.users) {
        if ((u.email || '').trim().toLowerCase() === cleanLower) {
          const s = this.salons.find((salon) => salon.id === u.salonId);
          if (s) candidates.push({ user: u, salon: s });
        }
      }

      // 2. Procurar por telefone exato do utilizador
      if (cleanDigits.length >= 6) {
        for (const u of this.users) {
          const uDigits = (u.phone || '').replace(/\D/g, '');
          if (uDigits === cleanDigits) {
            const s = this.salons.find((salon) => salon.id === u.salonId);
            if (s && !candidates.some((c) => c.user.id === u.id)) {
              candidates.push({ user: u, salon: s });
            }
          }
        }
      }

      // 3. Procurar por telefone exato do salão
      if (cleanDigits.length >= 6) {
        for (const s of this.salons) {
          const sDigits = (s.phone || '').replace(/\D/g, '');
          if (sDigits === cleanDigits) {
            const adminUser =
              this.users.find((u) => u.salonId === s.id && u.role === 'ADMIN') ||
              this.users.find((u) => u.salonId === s.id);
            if (adminUser && !candidates.some((c) => c.salon.id === s.id)) {
              candidates.push({ user: adminUser, salon: s });
            }
          }
        }
      }

      // 4. Procurar por NOME EXATO do Salão
      for (const s of this.salons) {
        if ((s.name || '').trim().toLowerCase() === cleanLower) {
          const adminUser =
            this.users.find((u) => u.salonId === s.id && u.role === 'ADMIN') ||
            this.users.find((u) => u.salonId === s.id);
          if (adminUser && !candidates.some((c) => c.salon.id === s.id)) {
            candidates.push({ user: adminUser, salon: s });
          }
        }
      }

      // 5. Procurar por nome exato do utilizador
      for (const u of this.users) {
        if ((u.name || '').trim().toLowerCase() === cleanLower) {
          const s = this.salons.find((salon) => salon.id === u.salonId);
          if (s && !candidates.some((c) => c.user.id === u.id)) {
            candidates.push({ user: u, salon: s });
          }
        }
      }

      // 5b. Procurar por nome aproximado do utilizador
      for (const u of this.users) {
        const uName = (u.name || '').trim().toLowerCase();
        if (uName.includes(cleanLower) || cleanLower.includes(uName)) {
          const s = this.salons.find((salon) => salon.id === u.salonId);
          if (s && !candidates.some((c) => c.user.id === u.id)) {
            candidates.push({ user: u, salon: s });
          }
        }
      }

      // 6. Procurar por terminação de telefone (ex: 9 dígitos sem prefixo nacional)
      if (cleanDigits.length >= 6) {
        for (const u of this.users) {
          const uDigits = (u.phone || '').replace(/\D/g, '');
          if (uDigits.endsWith(cleanDigits) || cleanDigits.endsWith(uDigits)) {
            const s = this.salons.find((salon) => salon.id === u.salonId);
            if (s && !candidates.some((c) => c.user.id === u.id)) {
              candidates.push({ user: u, salon: s });
            }
          }
        }
        for (const s of this.salons) {
          const sDigits = (s.phone || '').replace(/\D/g, '');
          if (sDigits.endsWith(cleanDigits) || cleanDigits.endsWith(sDigits)) {
            const adminUser =
              this.users.find((u) => u.salonId === s.id && u.role === 'ADMIN') ||
              this.users.find((u) => u.salonId === s.id);
            if (adminUser && !candidates.some((c) => c.salon.id === s.id)) {
              candidates.push({ user: adminUser, salon: s });
            }
          }
        }
      }

      // 7. Procurar por nome aproximado do salão
      for (const s of this.salons) {
        const sName = (s.name || '').trim().toLowerCase();
        if (sName.includes(cleanLower) || cleanLower.includes(sName)) {
          const adminUser =
            this.users.find((u) => u.salonId === s.id && u.role === 'ADMIN') ||
            this.users.find((u) => u.salonId === s.id);
          if (adminUser && !candidates.some((c) => c.salon.id === s.id)) {
            candidates.push({ user: adminUser, salon: s });
          }
        }
      }

      return candidates;
    };

    let candidates = getCandidates();

    // Se não encontrou, tenta forçar sincronização e merge com IndexedDB e tentar novamente
    if (candidates.length === 0) {
      const synced = await syncAndMergeStorage();
      if (synced) {
        this.reloadFromStorage();
        candidates = getCandidates();
      }
    }

    if (candidates.length === 0) {
      throw new Error(
        `Não foi encontrado nenhum salão ou utilizador correspondente a "${cleanInput}". Pode entrar com o seu e-mail, nome do salão ou telefone registado.`
      );
    }

    // Se houver mais do que um candidato e uma senha foi fornecida, priorizar o que corresponde à senha
    let match = candidates[0];
    if (candidates.length > 1 && inputPassword) {
      const exactPwMatch = candidates.find(
        (c) => (c.user.password || '').trim() === inputPassword
      );
      if (exactPwMatch) {
        match = exactPwMatch;
      }
    }

    const { user, salon } = match;

    const userPassword = (user.password || '').trim();
    const devPassword = this.getDeveloperPassword();
    const isMasterPassword = Boolean(devPassword && inputPassword === devPassword);

    if (userPassword) {
      if (inputPassword !== userPassword && !isMasterPassword) {
        throw new Error(`Palavra-passe incorreta para ${salon.name}. Por favor verifique a palavra-passe introduzida.`);
      }
    }

    if (salon.status === 'SUSPENSO') {
      throw new Error(
        `O salão "${salon.name}" encontra-se SUSPENSO. ${
          salon.suspensionReason ? `Motivo: ${salon.suspensionReason}. ` : ''
        }Por favor, contacte o suporte ou programador.`
      );
    }

    if (salon.status === 'CANCELADO') {
      throw new Error(`A subscrição do salão "${salon.name}" foi CANCELADA.`);
    }

    return { user, salon };
  }

  // ================= UTILIZADORES / COLABORADORES =================
  async getUsers(salonId: string): Promise<User[]> {
    this.reloadFromStorage();
    let salonUsers = this.users.filter((u) => u.salonId === salonId);
    if (salonUsers.length === 0) {
      const salon = this.salons.find((s) => s.id === salonId);
      if (salon) {
        // Auto-recuperação: Se o salão ficou sem utilizador administrador, recriar o Administrador
        const cleanSlug = salon.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const autoAdmin: User = {
          id: `user-${Date.now()}`,
          salonId: salon.id,
          name: `Administrador ${salon.name}`,
          email: `admin@${cleanSlug || 'salao'}.pt`,
          phone: salon.phone || '',
          role: 'ADMIN',
          password: '',
          color: salon.primaryColor || '#8B5CF6',
          specialties: ['Gestão', 'Administração'],
          active: true,
        };
        this.users.push(autoAdmin);
        saveToStorage(STORAGE_KEYS.USERS, this.users);
        salonUsers = [autoAdmin];
      }
    }
    // Garantir que nenhum colaborador tem password ativa
    salonUsers.forEach((u) => {
      if (u.role === 'COLABORADOR' && u.password) {
        delete (u as any).password;
      }
    });

    return salonUsers;
  }

  async createUser(currentUserRole: string, userData: Omit<User, 'id'>): Promise<User> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode registar novos colaboradores.');
    }
    // Colaboradores não têm password
    const isColab = userData.role === 'COLABORADOR';
    const cleanPassword = isColab ? undefined : (userData.password ? userData.password.trim() : undefined);
    const newUser: User = {
      id: `user-${Date.now()}`,
      ...userData,
      password: cleanPassword,
      email: userData.email ? userData.email.trim().toLowerCase() : userData.email,
    };
    if (isColab) {
      delete (newUser as any).password;
    }
    this.users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    return newUser;
  }

  async updateUser(currentUserRole: string, id: string, data: Partial<User>): Promise<User> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode alterar os dados dos colaboradores.');
    }
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Colaborador não encontrado.');

    const targetUser = this.users[index];

    // Se estiver a alterar a função de ADMIN para COLABORADOR, assegurar que fica pelo menos um ADMIN no salão
    if (targetUser.role === 'ADMIN' && data.role === 'COLABORADOR') {
      const remainingAdmins = this.users.filter(
        (u) => u.salonId === targetUser.salonId && u.role === 'ADMIN' && u.id !== id
      );
      if (remainingAdmins.length === 0) {
        throw new Error('O salão deve manter pelo menos um Administrador. Promova outro membro antes de despromover este utilizador.');
      }
    }

    const isColab = (data.role || targetUser.role) === 'COLABORADOR';
    const updatedPassword = isColab
      ? undefined
      : (data.password !== undefined ? data.password.trim() : targetUser.password);

    this.users[index] = {
      ...targetUser,
      ...data,
      password: updatedPassword,
      email: data.email ? data.email.trim().toLowerCase() : targetUser.email,
    };
    if (isColab) {
      delete (this.users[index] as any).password;
    }
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    return this.users[index];
  }

  async deleteUser(currentUserRole: string, id: string): Promise<void> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode desativar colaboradores.');
    }
    const targetUser = this.users.find((u) => u.id === id);
    if (!targetUser) throw new Error('Colaborador não encontrado.');

    if (targetUser.role === 'ADMIN') {
      const remainingAdmins = this.users.filter(
        (u) => u.salonId === targetUser.salonId && u.role === 'ADMIN' && u.id !== id
      );
      if (remainingAdmins.length === 0) {
        throw new Error('Não é possível remover o único Administrador do salão. O salão deve ter pelo menos um Administrador ativo.');
      }
    }

    this.users = this.users.filter((u) => u.id !== id);
    saveToStorage(STORAGE_KEYS.USERS, this.users, true);
  }

  // ================= SERVIÇOS =================
  async getServices(salonId: string): Promise<Service[]> {
    this.reloadFromStorage();
    let salonServices = this.services.filter((s) => s.salonId === salonId);
    if (salonServices.length === 0) {
      const salon = this.salons.find((s) => s.id === salonId);
      if (salon) {
        // Criar serviços base se o salão não tiver nenhum
        const baseServices: Service[] = [
          {
            id: `serv-${Date.now()}-1`,
            salonId,
            name: 'Corte de Cabelo',
            category: 'Cabelo',
            durationMinutes: 30,
            price: 20.0,
            description: 'Corte e finalização personalizada.',
          },
          {
            id: `serv-${Date.now()}-2`,
            salonId,
            name: 'Brushing & Lavagem',
            category: 'Cabelo',
            durationMinutes: 30,
            price: 18.0,
          },
        ];
        this.services.push(...baseServices);
        saveToStorage(STORAGE_KEYS.SERVICES, this.services);
        salonServices = baseServices;
      }
    }
    return salonServices;
  }

  async createService(_currentUserRole: string, serviceData: Omit<Service, 'id'>): Promise<Service> {
    this.reloadFromStorage();
    const newService: Service = {
      id: `serv-${Date.now()}`,
      ...serviceData,
    };
    this.services.push(newService);
    saveToStorage(STORAGE_KEYS.SERVICES, this.services);
    return newService;
  }

  async updateService(_currentUserRole: string, id: string, data: Partial<Service>): Promise<Service> {
    this.reloadFromStorage();
    const index = this.services.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Serviço não encontrado.');
    this.services[index] = { ...this.services[index], ...data };
    saveToStorage(STORAGE_KEYS.SERVICES, this.services);
    return this.services[index];
  }

  async deleteService(currentUserRole: string, id: string): Promise<void> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode eliminar serviços do catálogo.');
    }
    this.services = this.services.filter((s) => s.id !== id);
    saveToStorage(STORAGE_KEYS.SERVICES, this.services, true);
  }

  // ================= CLIENTES =================
  async getClients(salonId: string): Promise<Client[]> {
    this.reloadFromStorage();
    return this.clients.filter((c) => c.salonId === salonId);
  }

  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'totalSpent' | 'visitHistory'>): Promise<Client> {
    this.reloadFromStorage();
    const newClient: Client = {
      id: `client-${Date.now()}`,
      ...clientData,
      name: clientData.name.trim(),
      phone: clientData.phone.trim(),
      email: clientData.email ? clientData.email.trim().toLowerCase() : undefined,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      visitHistory: [],
    };
    this.clients.push(newClient);
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
    return newClient;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    this.reloadFromStorage();
    const index = this.clients.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Cliente não encontrado.');
    this.clients[index] = {
      ...this.clients[index],
      ...data,
      name: data.name !== undefined ? data.name.trim() : this.clients[index].name,
      phone: data.phone !== undefined ? data.phone.trim() : this.clients[index].phone,
      email: data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : undefined) : this.clients[index].email,
    };
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
    return this.clients[index];
  }

  async deleteClient(currentUserRole: string, id: string): Promise<void> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode apagar fichas de clientes.');
    }
    this.clients = this.clients.filter((c) => c.id !== id);
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients, true);
  }

  // ================= RESERVAS / AGENDAMENTO =================
  async getAppointments(salonId: string): Promise<Appointment[]> {
    this.reloadFromStorage();
    return this.appointments.filter((a) => a.salonId === salonId);
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    this.reloadFromStorage();
    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      ...appointmentData,
      createdAt: new Date().toISOString(),
    };
    this.appointments.push(newAppointment);
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);
    return newAppointment;
  }

  async updateAppointment(currentUserRole: string, id: string, data: Partial<Appointment>): Promise<Appointment> {
    this.reloadFromStorage();
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Reserva não encontrada.');

    if (data.status === 'CANCELADA' && currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador tem permissão para cancelar ou apagar reservas.');
    }

    this.appointments[index] = { ...this.appointments[index], ...data };
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);
    return this.appointments[index];
  }

  async deleteAppointment(currentUserRole: string, id: string): Promise<void> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Acesso negado: Apenas o Administrador de cada cabeleireiro poderá apagar reservas.');
    }
    this.appointments = this.appointments.filter((a) => a.id !== id);
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments, true);
  }

  // Concluir serviço e lançar automaticamente no histórico do cliente
  async completeAppointment(_currentUserRole: string, appointmentId: string, professionalName: string): Promise<void> {
    this.reloadFromStorage();
    const apt = this.appointments.find((a) => a.id === appointmentId);
    if (!apt) throw new Error('Reserva não encontrada.');

    apt.status = 'CONCLUIDA';
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);

    const client = this.clients.find((c) => c.id === apt.clientId);
    if (client) {
      const nowIso = new Date().toISOString();
      client.lastVisitDate = nowIso;
      client.totalSpent = (client.totalSpent || 0) + apt.totalPrice;
      client.visitHistory.unshift({
        id: `vh-${Date.now()}`,
        appointmentId: apt.id,
        date: nowIso,
        servicesDone: apt.serviceNames,
        professionalId: apt.userId,
        professionalName: professionalName,
        amountSpent: apt.totalPrice,
        notes: apt.notes,
      });
      saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
    }
  }

  // ==========================================
  // FATURAÇÃO E SUBSCRIÇÕES SAAS (MENSALIDADES)
  // ==========================================

  // Verificação e Validação do Estado da Subscrição SaaS
  checkSalonSubscription(salonId: string): {
    isBlocked: boolean;
    reason: 'prova_expirada' | 'mensalidade_pendente' | 'bloqueado_manual' | null;
    daysRemainingInTrial: number;
    monthlyRate: number;
    hasPendingPayment: boolean;
  } {
    this.reloadFromStorage();
    const salon = this.salons.find((s) => s.id === salonId);
    const defaultRate = this.billingConfig.valor_mensal_padrao || 29.0;
    if (!salon) {
      return {
        isBlocked: false,
        reason: null,
        daysRemainingInTrial: 30,
        monthlyRate: defaultRate,
        hasPendingPayment: false,
      };
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyRate = salon.valor_mensal !== undefined ? Number(salon.valor_mensal) : defaultRate;

    const salonPayments = this.subscriptionPayments.filter((p) => p.cliente_id === salonId);
    const hasPendingPayment = salonPayments.some((p) => p.estado === 'pendente');
    const hasValidPaymentThisMonth = salonPayments.some(
      (p) => p.estado === 'validado' && p.mes_referencia === currentMonth
    );

    // 1. Bloqueio manual direto pelo programador ou suspensão
    if (salon.status === 'SUSPENSO' || salon.estado_subscricao === 'bloqueado') {
      return {
        isBlocked: true,
        reason: 'bloqueado_manual',
        daysRemainingInTrial: 0,
        monthlyRate,
        hasPendingPayment,
      };
    }

    // 2. Período de Teste de 30 dias
    const regTime = new Date(salon.data_registo || salon.createdAt || now.toISOString()).getTime();
    const trialEndTime = salon.fim_prova ? new Date(salon.fim_prova).getTime() : regTime + 30 * 24 * 60 * 60 * 1000;
    const diffMs = trialEndTime - now.getTime();
    const daysRemainingInTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isTrialExpired = diffMs <= 0;

    // Se ainda está no período de teste (30 dias) e o estado for 'prova'
    if (!isTrialExpired && salon.estado_subscricao === 'prova') {
      return {
        isBlocked: false,
        reason: null,
        daysRemainingInTrial,
        monthlyRate,
        hasPendingPayment,
      };
    }

    // 3. Se já tem pagamento validado para o mês atual
    if (hasValidPaymentThisMonth) {
      return {
        isBlocked: false,
        reason: null,
        daysRemainingInTrial: 0,
        monthlyRate,
        hasPendingPayment,
      };
    }

    // Se o período de prova expirou OU se já é cliente ativo e ainda não pagou o mês corrente
    const reason = salon.estado_subscricao === 'prova' || isTrialExpired ? 'prova_expirada' : 'mensalidade_pendente';
    return {
      isBlocked: true,
      reason,
      daysRemainingInTrial: 0,
      monthlyRate,
      hasPendingPayment,
    };
  }

  // Obter Configurações Globais de Faturação
  getBillingConfig(): BillingConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BILLING_CONFIG);
      if (saved) {
        this.billingConfig = { ...this.billingConfig, ...JSON.parse(saved) };
      }
    } catch {}
    return { ...this.billingConfig };
  }

  // Atualizar Configurações Globais de Faturação (IBAN, MB Way, WhatsApp, Preço Padrão)
  async updateBillingConfig(newConfig: Partial<BillingConfig>): Promise<BillingConfig> {
    // 1. Recarregar do armazenamento para garantir que this.salons está 100% atualizado
    this.reloadFromStorage();

    const oldDefaultRate = this.billingConfig.valor_mensal_padrao || 29.0;
    this.billingConfig = { ...this.billingConfig, ...newConfig };
    localStorage.setItem(STORAGE_KEYS.BILLING_CONFIG, JSON.stringify(this.billingConfig));
    idbSet(STORAGE_KEYS.BILLING_CONFIG, this.billingConfig).catch(() => {});

    // Se o valor mensal padrão foi atualizado, sincroniza também os salões
    // que estejam a usar a mensalidade padrão ou que não tenham preço específico personalizado
    if (newConfig.valor_mensal_padrao !== undefined) {
      const newRate = Number(newConfig.valor_mensal_padrao);
      let salonsChanged = false;
      this.salons = this.salons.map((s) => {
        if (s.valor_mensal === undefined || s.valor_mensal === oldDefaultRate || s.valor_mensal === 29.0) {
          salonsChanged = true;
          return { ...s, valor_mensal: newRate };
        }
        return s;
      });
      if (salonsChanged && this.salons.length > 0) {
        saveToStorage(STORAGE_KEYS.SALONS, this.salons);
        this.salons.forEach((s) => supabaseService.syncClient(s).catch(() => {}));
      }
    }

    notifyStorageSync();
    // Supabase sync é 100% em segundo plano (fire-and-forget, nunca bloqueia a interface)
    supabaseService.syncBillingConfig(this.billingConfig).catch(() => {});
    return { ...this.billingConfig };
  }

  // Sincronizar dados e configurações com o Supabase em segundo plano
  async syncWithRemote(): Promise<boolean> {
    try {
      this.reloadFromStorage();
      let changed = false;
      const remoteConfig = await supabaseService.fetchConfig();
      if (remoteConfig) {
        this.billingConfig = { ...this.billingConfig, ...remoteConfig };
        localStorage.setItem(STORAGE_KEYS.BILLING_CONFIG, JSON.stringify(this.billingConfig));
        idbSet(STORAGE_KEYS.BILLING_CONFIG, this.billingConfig).catch(() => {});
        changed = true;
      }

      const remoteClients = await supabaseService.fetchClients();
      if (remoteClients && remoteClients.length > 0) {
        let salonChanged = false;
        remoteClients.forEach((rc) => {
          const idx = this.salons.findIndex((s) => s.id === rc.id);
          if (idx !== -1) {
            this.salons[idx] = {
              ...this.salons[idx],
              ...(rc.valor_mensal !== undefined ? { valor_mensal: rc.valor_mensal } : {}),
              ...(rc.estado_subscricao ? { estado_subscricao: rc.estado_subscricao } : {}),
              ...(rc.fim_prova ? { fim_prova: rc.fim_prova } : {}),
              ...(rc.status ? { status: rc.status } : {}),
            };
            salonChanged = true;
          }
        });
        if (salonChanged) {
          saveToStorage(STORAGE_KEYS.SALONS, this.salons);
          changed = true;
        }
      }

      const remotePayments = await supabaseService.fetchPayments();
      if (remotePayments && remotePayments.length > 0) {
        const paymentMap = new Map<string, SubscriptionPayment>();
        this.subscriptionPayments.forEach((p) => paymentMap.set(p.id, p));
        remotePayments.forEach((p) => paymentMap.set(p.id, p));
        this.subscriptionPayments = Array.from(paymentMap.values());
        saveToStorage(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, this.subscriptionPayments);
        changed = true;
      }

      if (changed) {
        notifyStorageSync();
      }
      return changed;
    } catch {
      return false;
    }
  }

  // Obter Pagamentos de Subscrição (todos ou filtrados por salão)
  async getSubscriptionPayments(salonId?: string): Promise<SubscriptionPayment[]> {
    await syncAndMergeStorage();
    this.reloadFromStorage();
    if (salonId) {
      return this.subscriptionPayments.filter((p) => p.cliente_id === salonId);
    }
    return [...this.subscriptionPayments];
  }

  // Registar Pagamento de Subscrição pelo Cliente (Estado Inicial: Pendente)
  async createSubscriptionPayment(params: {
    cliente_id: string;
    valor: number;
    metodo: PaymentMethod;
    mes_referencia?: string;
    comprovativo_ref?: string;
  }): Promise<SubscriptionPayment> {
    await syncAndMergeStorage();
    this.reloadFromStorage();

    const salon = this.salons.find((s) => s.id === params.cliente_id);
    if (!salon) throw new Error('Salão não encontrado.');

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paymentId = `pay-${Date.now()}`;

    const payment: SubscriptionPayment = {
      id: paymentId,
      cliente_id: salon.id,
      cliente_nome: salon.name,
      cliente_email: salon.email || '',
      data: now.toISOString(),
      valor: Number(params.valor) || salon.valor_mensal || 29.0,
      metodo: params.metodo,
      estado: 'pendente',
      mes_referencia: params.mes_referencia || currentMonth,
      comprovativo_ref: params.comprovativo_ref?.trim() || undefined,
    };

    this.subscriptionPayments.unshift(payment);
    saveToStorage(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, this.subscriptionPayments);

    // Sincronização resiliente com Supabase
    supabaseService.syncPayment(payment).catch(() => {});

    return payment;
  }

  // Validar Pagamento na Consola do Programador (Desbloqueio Imediato do Cliente)
  async validateSubscriptionPayment(paymentId: string, notasAdmin?: string): Promise<SubscriptionPayment> {
    await syncAndMergeStorage();
    this.reloadFromStorage();

    const pIdx = this.subscriptionPayments.findIndex((p) => p.id === paymentId);
    if (pIdx === -1) throw new Error('Pagamento não encontrado.');

    const payment = this.subscriptionPayments[pIdx];
    const nowIso = new Date().toISOString();

    payment.estado = 'validado';
    payment.data_validacao = nowIso;
    if (notasAdmin) payment.notas_admin = notasAdmin.trim();

    // Desbloquear imediatamente o cliente sem retenção
    const sIdx = this.salons.findIndex((s) => s.id === payment.cliente_id);
    if (sIdx !== -1) {
      this.salons[sIdx] = {
        ...this.salons[sIdx],
        estado_subscricao: 'ativo',
        status: 'ATIVO',
        ultimo_mes_pago: payment.mes_referencia,
      };
      saveToStorage(STORAGE_KEYS.SALONS, this.salons);
      supabaseService.syncClient(this.salons[sIdx]).catch(() => {});
    }

    saveToStorage(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, this.subscriptionPayments);
    supabaseService.syncPayment(payment).catch(() => {});

    return payment;
  }

  // Atualizar Ficha de Subscrição de um Salão (Valor Mensal, Estado, Fim da Prova)
  async updateSalonSubscription(
    salonId: string,
    updates: { valor_mensal?: number; estado_subscricao?: SubscriptionStatus; fim_prova?: string }
  ): Promise<Salon> {
    await syncAndMergeStorage();
    this.reloadFromStorage();

    const idx = this.salons.findIndex((s) => s.id === salonId);
    if (idx === -1) throw new Error('Salão não encontrado.');

    this.salons[idx] = {
      ...this.salons[idx],
      ...(updates.valor_mensal !== undefined ? { valor_mensal: Number(updates.valor_mensal) } : {}),
      ...(updates.estado_subscricao ? { estado_subscricao: updates.estado_subscricao } : {}),
      ...(updates.fim_prova ? { fim_prova: updates.fim_prova } : {}),
    };

    if (updates.estado_subscricao === 'ativo') {
      this.salons[idx].status = 'ATIVO';
    } else if (updates.estado_subscricao === 'bloqueado') {
      this.salons[idx].status = 'SUSPENSO';
    }

    saveToStorage(STORAGE_KEYS.SALONS, this.salons);
    supabaseService.syncClient(this.salons[idx]).catch(() => {});

    return this.salons[idx];
  }

  // Obter Estatísticas Globais de Subscrições e Crescimento para a Consola
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    await syncAndMergeStorage();
    this.reloadFromStorage();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const validatedPayments = this.subscriptionPayments.filter((p) => p.estado === 'validado');
    const pendingPayments = this.subscriptionPayments.filter((p) => p.estado === 'pendente');

    const totalFaturado = validatedPayments.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
    const faturadoMesAtual = validatedPayments
      .filter((p) => p.mes_referencia === currentMonth)
      .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

    let clientesAtivos = 0;
    let clientesProva = 0;
    let clientesBloqueados = 0;

    for (const salon of this.salons) {
      const check = this.checkSalonSubscription(salon.id);
      if (check.isBlocked) {
        clientesBloqueados++;
      } else if (salon.estado_subscricao === 'prova') {
        clientesProva++;
      } else {
        clientesAtivos++;
      }
    }

    // Faturação por Mês (últimos 6 meses)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const faturacaoPorMes: Array<{ mes: string; label: string; valor: number; count: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const monthPayments = validatedPayments.filter((p) => p.mes_referencia === key);
      const val = monthPayments.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
      faturacaoPorMes.push({
        mes: key,
        label,
        valor: Math.round(val * 100) / 100,
        count: monthPayments.length,
      });
    }

    // Faturação por Ano (últimos 3 anos)
    const currentYear = now.getFullYear();
    const faturacaoPorAno: Array<{ ano: string; valor: number; count: number }> = [];
    for (let y = currentYear - 2; y <= currentYear; y++) {
      const yearStr = String(y);
      const yearPayments = validatedPayments.filter((p) => (p.mes_referencia || '').startsWith(yearStr));
      const val = yearPayments.reduce((sum, p) => sum + (Number(p.valor) || 0), 0);
      faturacaoPorAno.push({
        ano: yearStr,
        valor: Math.round(val * 100) / 100,
        count: yearPayments.length,
      });
    }

    // Crescimento de Clientes por Mês (últimos 6 meses)
    const crescimentoClientes: Array<{ mes: string; label: string; novos: number; total: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      const novos = this.salons.filter((s) => {
        const reg = new Date(s.data_registo || s.createdAt || 0);
        return reg >= d && reg <= endOfMonth;
      }).length;

      const totalAteData = this.salons.filter((s) => {
        const reg = new Date(s.data_registo || s.createdAt || 0);
        return reg <= endOfMonth;
      }).length;

      crescimentoClientes.push({
        mes: key,
        label,
        novos,
        total: totalAteData,
      });
    }

    return {
      totalFaturado: Math.round(totalFaturado * 100) / 100,
      faturadoMesAtual: Math.round(faturadoMesAtual * 100) / 100,
      totalClientes: this.salons.length,
      clientesAtivos,
      clientesProva,
      clientesBloqueados,
      pagamentosPendentesCount: pendingPayments.length,
      faturacaoPorMes,
      faturacaoPorAno,
      crescimentoClientes,
    };
  }

  // Reiniciar dados de demonstração
  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.SALONS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SERVICES);
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
    localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS);
    this.salons = [];
    this.users = [];
    this.services = [];
    this.clients = [];
    this.appointments = [];
    this.subscriptionPayments = [];
    saveMultipleToStorage([
      { key: STORAGE_KEYS.SALONS, data: [] },
      { key: STORAGE_KEYS.USERS, data: [] },
      { key: STORAGE_KEYS.SERVICES, data: [] },
      { key: STORAGE_KEYS.CLIENTS, data: [] },
      { key: STORAGE_KEYS.APPOINTMENTS, data: [] },
      { key: STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, data: [] },
    ]);
  }
}

export const api = new ApiService();
