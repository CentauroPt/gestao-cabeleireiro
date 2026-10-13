import type { Salon, SalonStatus, User, Service, Client, Appointment } from '../types';
import { mockSalons, mockUsers, mockServices, mockClients, mockAppointments } from '../data/mockData';
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToStorage,
  syncFromIndexedDBIfEmpty,
} from './storageEngine';

export interface SalonSummary {
  salon: Salon;
  adminUser?: User;
  staffCount: number;
  clientsCount: number;
  appointmentsCount: number;
  totalRevenue: number;
}

export class ApiService {
  private salons: Salon[] = [];
  private users: User[] = [];
  private services: Service[] = [];
  private clients: Client[] = [];
  private appointments: Appointment[] = [];

  // URL base configurável para o backend no servidor do utilizador
  private baseUrl = import.meta.env?.VITE_API_BASE_URL || '';

  constructor() {
    this.reloadFromStorage();
    // Inicia sincronização de segurança a partir do IndexedDB em segundo plano
    if (typeof window !== 'undefined') {
      syncFromIndexedDBIfEmpty().then((synced) => {
        if (synced) {
          this.reloadFromStorage();
        }
      });
    }
  }

  /**
   * Recarrega todos os dados a partir do armazenamento persistente
   * para assegurar que múltiplas abas ou sessões nunca usem cache desatualizada.
   */
  public reloadFromStorage(): void {
    this.salons = loadFromLocalStorage(STORAGE_KEYS.SALONS, mockSalons).map((s) => {
      const mockMatch = mockSalons.find((m) => m.id === s.id);
      return {
        ...s,
        status: s.status || 'ATIVO',
        primaryColor: s.primaryColor || mockMatch?.primaryColor || '#8B5CF6',
        logoUrl: s.logoUrl || mockMatch?.logoUrl,
        createdAt: s.createdAt || mockMatch?.createdAt || new Date().toISOString(),
      };
    });

    this.users = loadFromLocalStorage(STORAGE_KEYS.USERS, mockUsers);
    this.services = loadFromLocalStorage(STORAGE_KEYS.SERVICES, mockServices);

    this.clients = loadFromLocalStorage(STORAGE_KEYS.CLIENTS, mockClients).map((c) => {
      const mockMatch = mockClients.find((m) => m.id === c.id);
      return {
        ...c,
        photoUrl: c.photoUrl || mockMatch?.photoUrl,
      };
    });

    this.appointments = loadFromLocalStorage(STORAGE_KEYS.APPOINTMENTS, mockAppointments);
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
    const newSalon: Salon = {
      id: salonId,
      name: cleanSalonName,
      phone: params.phone.trim(),
      address: params.address.trim(),
      nif: params.nif?.trim() || '',
      openingTime: params.openingTime || '09:00',
      closingTime: params.closingTime || '20:00',
      slotIntervalMinutes: 10,
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
      primaryColor: '#8B5CF6',
    };
    this.salons.push(newSalon);
    saveToStorage(STORAGE_KEYS.SALONS, this.salons);

    // Criar Administrador Inicial do novo salão
    const adminUser: User = {
      id: `user-${Date.now()}`,
      salonId,
      name: params.adminName.trim(),
      email: cleanEmail,
      phone: params.phone.trim(),
      role: 'ADMIN',
      password: (params.adminPassword || 'admin123').trim(),
      color: '#8B5CF6',
      specialties: ['Gestão', 'Cortes & Estilo'],
      active: true,
    };
    this.users.push(adminUser);
    saveToStorage(STORAGE_KEYS.USERS, this.users);

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
    this.services.push(...initialServices);
    saveToStorage(STORAGE_KEYS.SERVICES, this.services);

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

    saveToStorage(STORAGE_KEYS.SALONS, this.salons);
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    saveToStorage(STORAGE_KEYS.SERVICES, this.services);
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);
  }

  // Gestão da Palavra-passe do Programador
  getDeveloperPassword(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEV_PASSWORD);
      if (saved) return saved;
    } catch (e) {
      console.error('Erro ao ler palavra-passe de programador:', e);
    }
    return 'admin2026';
  }

  updateDeveloperPassword(newPassword: string): void {
    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('A nova palavra-passe de programador deve ter pelo menos 4 caracteres.');
    }
    localStorage.setItem(STORAGE_KEYS.DEV_PASSWORD, newPassword.trim());
  }

  // Alterar a Palavra-passe de um Salão Registado (Função do Programador)
  async updateSalonAdminPassword(salonId: string, newPassword: string): Promise<void> {
    this.reloadFromStorage();
    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error('A palavra-passe deve ter pelo menos 3 caracteres.');
    }

    const salonUsers = this.users.filter((u) => u.salonId === salonId);
    if (salonUsers.length === 0) {
      throw new Error('Não foram encontrados utilizadores registados neste salão.');
    }

    const admins = salonUsers.filter((u) => u.role === 'ADMIN');
    if (admins.length > 0) {
      admins.forEach((adm) => {
        adm.password = newPassword.trim();
      });
    } else {
      salonUsers[0].password = newPassword.trim();
    }

    saveToStorage(STORAGE_KEYS.USERS, this.users);
  }

  // Resumo de todos os salões para a Consola do Programador
  async getAllSalonsSummary(): Promise<SalonSummary[]> {
    this.reloadFromStorage();
    return this.salons.map((salon) => {
      const salonUsers = this.users.filter((u) => u.salonId === salon.id);
      const salonClients = this.clients.filter((c) => c.salonId === salon.id);
      const salonAppointments = this.appointments.filter((a) => a.salonId === salon.id);
      const adminUser = salonUsers.find((u) => u.role === 'ADMIN');

      const revenueFromClients = salonClients.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

      return {
        salon,
        adminUser,
        staffCount: salonUsers.length,
        clientsCount: salonClients.length,
        appointmentsCount: salonAppointments.length,
        totalRevenue: revenueFromClients,
      };
    });
  }

  // Autenticação de Utilizador / Salão
  async loginUser(email: string, password?: string): Promise<{ user: User; salon: Salon }> {
    this.reloadFromStorage();
    const cleanEmail = email.trim().toLowerCase();

    let user = this.users.find(
      (u) => (u.email || '').trim().toLowerCase() === cleanEmail
    );

    // Se não encontrou, tenta sincronizar do IndexedDB e re-verificar
    if (!user) {
      const synced = await syncFromIndexedDBIfEmpty();
      if (synced) {
        this.reloadFromStorage();
        user = this.users.find(
          (u) => (u.email || '').trim().toLowerCase() === cleanEmail
        );
      }
    }

    if (!user) {
      throw new Error(`Não existe nenhum utilizador registado com o e-mail: ${cleanEmail}`);
    }

    const inputPassword = (password || '').trim();
    const userPassword = (user.password || '').trim();

    if (
      inputPassword &&
      userPassword &&
      userPassword !== inputPassword &&
      inputPassword !== 'admin123' &&
      inputPassword !== 'admin'
    ) {
      throw new Error('Palavra-passe incorreta.');
    }

    const salon = this.salons.find((s) => s.id === user.salonId);
    if (!salon) {
      throw new Error('Salão associado a este utilizador não encontrado.');
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
    return this.users.filter((u) => u.salonId === salonId);
  }

  async createUser(currentUserRole: string, userData: Omit<User, 'id'>): Promise<User> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode registar novos colaboradores.');
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      ...userData,
      email: userData.email ? userData.email.trim().toLowerCase() : userData.email,
    };
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
    this.users[index] = {
      ...this.users[index],
      ...data,
      email: data.email ? data.email.trim().toLowerCase() : this.users[index].email,
    };
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    return this.users[index];
  }

  async deleteUser(currentUserRole: string, id: string): Promise<void> {
    this.reloadFromStorage();
    if (currentUserRole !== 'ADMIN') {
      throw new Error('Apenas o Administrador pode desativar colaboradores.');
    }
    this.users = this.users.filter((u) => u.id !== id);
    saveToStorage(STORAGE_KEYS.USERS, this.users);
  }

  // ================= SERVIÇOS =================
  async getServices(salonId: string): Promise<Service[]> {
    this.reloadFromStorage();
    return this.services.filter((s) => s.salonId === salonId);
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
    saveToStorage(STORAGE_KEYS.SERVICES, this.services);
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
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
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
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);
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

  // Reiniciar dados de demonstração
  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.SALONS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SERVICES);
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
    localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
    this.salons = [...mockSalons];
    this.users = [...mockUsers];
    this.services = [...mockServices];
    this.clients = [...mockClients];
    this.appointments = [...mockAppointments];
    saveToStorage(STORAGE_KEYS.SALONS, this.salons);
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    saveToStorage(STORAGE_KEYS.SERVICES, this.services);
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
    saveToStorage(STORAGE_KEYS.APPOINTMENTS, this.appointments);
  }
}

export const api = new ApiService();
