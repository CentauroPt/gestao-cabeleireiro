import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Salon,
  User,
  Service,
  Client,
  Appointment,
  SubscriptionPayment,
  BillingConfig,
} from '../types';

export const SUPABASE_STORAGE_KEYS = {
  URL: 'salao_app_supabase_url',
  ANON_KEY: 'salao_app_supabase_anon_key',
} as const;

/**
 * Obtém as credenciais ativas do Supabase:
 * 1. Prioriza configuração salva localmente (se inserida na consola)
 * 2. Em alternativa, usa as variáveis de ambiente (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 */
export function getActiveSupabaseCredentials(): { url: string; anonKey: string } {
  let customUrl = '';
  let customKey = '';

  if (typeof window !== 'undefined') {
    try {
      customUrl = (localStorage.getItem(SUPABASE_STORAGE_KEYS.URL) || '').trim();
      customKey = (localStorage.getItem(SUPABASE_STORAGE_KEYS.ANON_KEY) || '').trim();
    } catch {}
  }

  const envUrl = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

  const url = customUrl || envUrl;
  const anonKey = customKey || envKey;

  return { url, anonKey };
}

/**
 * Verifica se o Supabase está configurado com valores válidos
 */
export function checkIsSupabaseConfigured(): boolean {
  const { url, anonKey } = getActiveSupabaseCredentials();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('placeholder') &&
    !url.includes('o-seu-projeto') &&
    anonKey.length > 20
  );
}

export let isSupabaseConfigured = checkIsSupabaseConfigured();

/**
 * Cria ou recria o cliente Supabase com as credenciais ativas
 */
function initSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getActiveSupabaseCredentials();
  isSupabaseConfigured = checkIsSupabaseConfigured();
  if (isSupabaseConfigured) {
    try {
      return createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (e) {
      console.warn('Erro ao inicializar cliente Supabase:', e);
      return null;
    }
  }
  return null;
}

export let supabase: SupabaseClient | null = initSupabaseClient();

/**
 * Serviço de sincronização e persistência na nuvem (Supabase / PostgreSQL).
 * Arquitetura Dual Resiliente:
 * - Se configurado e online: grava e sincroniza tudo na nuvem com Realtime.
 * - Se offline ou sem credenciais: o sistema continua 100% funcional com LocalStorage + IndexedDB.
 */
export class SupabaseService {
  private client: SupabaseClient | null = supabase;

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Atualiza as credenciais do Supabase no navegador e reinicializa a ligação
   */
  public updateCredentials(url: string, anonKey: string): boolean {
    if (typeof window !== 'undefined') {
      const cleanUrl = (url || '').trim();
      const cleanKey = (anonKey || '').trim();
      if (cleanUrl) localStorage.setItem(SUPABASE_STORAGE_KEYS.URL, cleanUrl);
      else localStorage.removeItem(SUPABASE_STORAGE_KEYS.URL);

      if (cleanKey) localStorage.setItem(SUPABASE_STORAGE_KEYS.ANON_KEY, cleanKey);
      else localStorage.removeItem(SUPABASE_STORAGE_KEYS.ANON_KEY);
    }
    this.client = initSupabaseClient();
    supabase = this.client;
    isSupabaseConfigured = checkIsSupabaseConfigured();
    return isSupabaseConfigured;
  }

  /**
   * Testa a ligação ao Supabase e devolve a contagem das tabelas
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    counts?: {
      saloes: number;
      utilizadores: number;
      servicos: number;
      clientes: number;
      agendamentos: number;
    };
  }> {
    if (!this.client) {
      return {
        success: false,
        message: 'Supabase não está configurado. Insira a URL e a Anon Key.',
      };
    }

    try {
      const [saloesRes, usersRes, servicosRes, clientesRes, aptsRes] = await Promise.all([
        this.client.from('saloes').select('id', { count: 'exact', head: true }),
        this.client.from('utilizadores').select('id', { count: 'exact', head: true }),
        this.client.from('servicos').select('id', { count: 'exact', head: true }),
        this.client.from('clientes').select('id', { count: 'exact', head: true }),
        this.client.from('agendamentos').select('id', { count: 'exact', head: true }),
      ]);

      if (saloesRes.error) {
        return {
          success: false,
          message: `Erro ao aceder à tabela 'saloes': ${saloesRes.error.message}. Verifique se executou o script SQL no Supabase.`,
        };
      }

      return {
        success: true,
        message: 'Ligação à Base de Dados Supabase estabelecida com sucesso!',
        counts: {
          saloes: saloesRes.count || 0,
          utilizadores: usersRes.count || 0,
          servicos: servicosRes.count || 0,
          clientes: clientesRes.count || 0,
          agendamentos: aptsRes.count || 0,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na ligação: ${err?.message || 'Erro de rede ou credenciais inválidas.'}`,
      };
    }
  }

  // ==================== 1. SALÕES ====================

  async fetchSalons(): Promise<Salon[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('saloes').select('*');
      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        address: d.address,
        nif: d.nif || undefined,
        openingTime: d.opening_time || '09:00',
        closingTime: d.closing_time || '20:00',
        slotIntervalMinutes: Number(d.slot_interval_minutes) || 30,
        status: d.status || 'ATIVO',
        createdAt: d.created_at,
        suspensionReason: d.suspension_reason || undefined,
        logoUrl: d.logo_url || undefined,
        primaryColor: d.primary_color || '#8B5CF6',
        startDayOfWeek: d.start_day_of_week !== undefined ? Number(d.start_day_of_week) : 1,
        email: d.email || undefined,
        data_registo: d.data_registo || d.created_at,
        fim_prova: d.fim_prova || undefined,
        valor_mensal: d.valor_mensal !== undefined ? Number(d.valor_mensal) : 29.0,
        estado_subscricao: d.estado_subscricao || 'prova',
        ultimo_mes_pago: d.ultimo_mes_pago || undefined,
      }));
    } catch (err) {
      console.warn('Erro ao carregar salões do Supabase:', err);
      return null;
    }
  }

  async upsertSalon(salon: Salon): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('saloes').upsert({
        id: salon.id,
        name: salon.name,
        phone: salon.phone,
        address: salon.address,
        nif: salon.nif || null,
        opening_time: salon.openingTime || '09:00',
        closing_time: salon.closingTime || '20:00',
        slot_interval_minutes: salon.slotIntervalMinutes || 30,
        status: salon.status || 'ATIVO',
        created_at: salon.createdAt || new Date().toISOString(),
        suspension_reason: salon.suspensionReason || null,
        logo_url: salon.logoUrl || null,
        primary_color: salon.primaryColor || '#8B5CF6',
        start_day_of_week: salon.startDayOfWeek !== undefined ? salon.startDayOfWeek : 1,
        email: salon.email || null,
        data_registo: salon.data_registo || salon.createdAt || new Date().toISOString(),
        fim_prova: salon.fim_prova || null,
        valor_mensal: salon.valor_mensal !== undefined ? Number(salon.valor_mensal) : 29.0,
        estado_subscricao: salon.estado_subscricao || 'prova',
        ultimo_mes_pago: salon.ultimo_mes_pago || null,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  async deleteSalon(salonId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('saloes').delete().eq('id', salonId);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== 2. UTILIZADORES / COLABORADORES ====================

  async fetchUsers(): Promise<User[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('utilizadores').select('*');
      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        salonId: d.salon_id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: d.role,
        isPrimaryAdmin: Boolean(d.is_primary_admin),
        password: d.password || undefined,
        color: d.color || '#3B82F6',
        specialties: Array.isArray(d.specialties) ? d.specialties : [],
        active: d.active !== false,
      }));
    } catch (err) {
      console.warn('Erro ao carregar utilizadores do Supabase:', err);
      return null;
    }
  }

  async upsertUser(user: User): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('utilizadores').upsert({
        id: user.id,
        salon_id: user.salonId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_primary_admin: Boolean(user.isPrimaryAdmin),
        password: user.password || null,
        color: user.color || '#3B82F6',
        specialties: user.specialties || [],
        active: user.active !== undefined ? user.active : true,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('utilizadores').delete().eq('id', userId);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== 3. SERVIÇOS ====================

  async fetchServices(): Promise<Service[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('servicos').select('*');
      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        salonId: d.salon_id,
        name: d.name,
        category: d.category,
        durationMinutes: Number(d.duration_minutes) || 30,
        price: Number(d.price) || 0,
        description: d.description || undefined,
      }));
    } catch (err) {
      console.warn('Erro ao carregar serviços do Supabase:', err);
      return null;
    }
  }

  async upsertService(service: Service): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('servicos').upsert({
        id: service.id,
        salon_id: service.salonId,
        name: service.name,
        category: service.category,
        duration_minutes: service.durationMinutes,
        price: Number(service.price) || 0,
        description: service.description || null,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  async deleteService(serviceId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('servicos').delete().eq('id', serviceId);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== 4. CLIENTES ====================

  async fetchClients(): Promise<Client[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('clientes').select('*');
      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        salonId: d.salon_id,
        name: d.name,
        phone: d.phone,
        email: d.email || undefined,
        preferredUserId: d.preferred_user_id || undefined,
        technicalNotes: d.technical_notes || undefined,
        photoUrl: d.photo_url || undefined,
        createdById: d.created_by_id || 'admin',
        createdAt: d.created_at || new Date().toISOString(),
        totalSpent: Number(d.total_spent) || 0,
        lastVisitDate: d.last_visit_date || undefined,
        visitHistory: Array.isArray(d.visit_history) ? d.visit_history : [],
      }));
    } catch (err) {
      console.warn('Erro ao carregar clientes operacionais do Supabase:', err);
      return null;
    }
  }

  async upsertClient(client: Client): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('clientes').upsert({
        id: client.id,
        salon_id: client.salonId,
        name: client.name,
        phone: client.phone,
        email: client.email || null,
        preferred_user_id: client.preferredUserId || null,
        technical_notes: client.technicalNotes || null,
        photo_url: client.photoUrl || null,
        created_by_id: client.createdById || null,
        created_at: client.createdAt || new Date().toISOString(),
        total_spent: Number(client.totalSpent) || 0,
        last_visit_date: client.lastVisitDate || null,
        visit_history: client.visitHistory || [],
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  async deleteClient(clientId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('clientes').delete().eq('id', clientId);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== 5. AGENDAMENTOS / MARCAÇÕES ====================

  async fetchAppointments(): Promise<Appointment[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('agendamentos').select('*');
      if (error || !data) return null;

      return data.map((d: any) => ({
        id: d.id,
        salonId: d.salon_id,
        clientId: d.client_id,
        clientName: d.client_name,
        clientPhone: d.client_phone,
        userId: d.user_id,
        serviceIds: Array.isArray(d.service_ids) ? d.service_ids : [],
        serviceNames: Array.isArray(d.service_names) ? d.service_names : [],
        date: d.date,
        startTime: d.start_time,
        endTime: d.end_time,
        totalDurationMinutes: Number(d.total_duration_minutes) || 30,
        totalPrice: Number(d.total_price) || 0,
        status: d.status || 'AGENDADA',
        notes: d.notes || undefined,
        createdById: d.created_by_id || 'admin',
        createdAt: d.created_at || new Date().toISOString(),
        bookingChannel: d.booking_channel || 'presencial',
      }));
    } catch (err) {
      console.warn('Erro ao carregar agendamentos do Supabase:', err);
      return null;
    }
  }

  async upsertAppointment(appointment: Appointment): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('agendamentos').upsert({
        id: appointment.id,
        salon_id: appointment.salonId,
        client_id: appointment.clientId,
        client_name: appointment.clientName,
        client_phone: appointment.clientPhone,
        user_id: appointment.userId,
        service_ids: appointment.serviceIds || [],
        service_names: appointment.serviceNames || [],
        date: appointment.date,
        start_time: appointment.startTime,
        end_time: appointment.endTime,
        total_duration_minutes: appointment.totalDurationMinutes,
        total_price: Number(appointment.totalPrice) || 0,
        status: appointment.status,
        notes: appointment.notes || null,
        created_by_id: appointment.createdById || null,
        created_at: appointment.createdAt || new Date().toISOString(),
        booking_channel: appointment.bookingChannel || 'presencial',
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  async deleteAppointment(appointmentId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('agendamentos').delete().eq('id', appointmentId);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== 6. SINCRONIZAÇÃO COMPLETA DA NUVEM ====================

  /**
   * Descarrega todos os dados da nuvem Supabase em paralelo
   */
  async fetchAllFromCloud(): Promise<{
    salons: Salon[];
    users: User[];
    services: Service[];
    clients: Client[];
    appointments: Appointment[];
    config?: BillingConfig;
    payments?: SubscriptionPayment[];
  } | null> {
    if (!this.client) return null;
    try {
      const [salons, users, services, clients, appointments, config, payments] =
        await Promise.all([
          this.fetchSalons(),
          this.fetchUsers(),
          this.fetchServices(),
          this.fetchClients(),
          this.fetchAppointments(),
          this.fetchConfig(),
          this.fetchPayments(),
        ]);

      if (!salons && !clients && !appointments) {
        return null;
      }

      return {
        salons: salons || [],
        users: users || [],
        services: services || [],
        clients: clients || [],
        appointments: appointments || [],
        config: config || undefined,
        payments: payments || [],
      };
    } catch (err) {
      console.warn('Erro ao descarregar base de dados completa do Supabase:', err);
      return null;
    }
  }

  /**
   * Exporta todos os dados locais para a nuvem Supabase (Semeadura / Migração inicial)
   */
  async exportAllToCloud(data: {
    salons: Salon[];
    users: User[];
    services: Service[];
    clients: Client[];
    appointments: Appointment[];
    billingConfig?: BillingConfig;
    payments?: SubscriptionPayment[];
  }): Promise<{
    success: boolean;
    counts: {
      salons: number;
      users: number;
      services: number;
      clients: number;
      appointments: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const counts = {
      salons: 0,
      users: 0,
      services: 0,
      clients: 0,
      appointments: 0,
    };

    if (!this.client) {
      return {
        success: false,
        counts,
        errors: ['Supabase não está configurado com credenciais válidas.'],
      };
    }

    // 1. Salões
    for (const s of data.salons) {
      const ok = await this.upsertSalon(s);
      if (ok) counts.salons++;
      else errors.push(`Salão "${s.name}" falhou.`);
      await this.syncClient(s); // Manter clientes_saas sincronizado
    }

    // 2. Utilizadores
    for (const u of data.users) {
      const ok = await this.upsertUser(u);
      if (ok) counts.users++;
      else errors.push(`Utilizador "${u.name}" falhou.`);
    }

    // 3. Serviços
    for (const s of data.services) {
      const ok = await this.upsertService(s);
      if (ok) counts.services++;
      else errors.push(`Serviço "${s.name}" falhou.`);
    }

    // 4. Clientes
    for (const c of data.clients) {
      const ok = await this.upsertClient(c);
      if (ok) counts.clients++;
      else errors.push(`Cliente "${c.name}" falhou.`);
    }

    // 5. Agendamentos
    for (const a of data.appointments) {
      const ok = await this.upsertAppointment(a);
      if (ok) counts.appointments++;
      else errors.push(`Agendamento "${a.id}" falhou.`);
    }

    // 6. Config e Pagamentos
    if (data.billingConfig) {
      await this.syncBillingConfig(data.billingConfig);
    }
    if (data.payments) {
      for (const p of data.payments) {
        await this.syncPayment(p);
      }
    }

    return {
      success: errors.length === 0,
      counts,
      errors,
    };
  }

  // ==================== 7. SUPABASE REALTIME ====================

  /**
   * Subscreve em tempo real a todas as alterações na base de dados Supabase.
   * Quando outro colaborador ou cliente fizer uma alteração noutro dispositivo,
   * este callback é disparado instantaneamente.
   */
  public subscribeToRealtime(
    onChange: (table: string, eventType: string, record: any) => void
  ): () => void {
    if (!this.client) return () => {};

    try {
      const channel = this.client
        .channel('salaomaster_global_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            const table = payload.table;
            const eventType = payload.eventType;
            const record = payload.new || payload.old;
            onChange(table, eventType, record);
          }
        )
        .subscribe();

      return () => {
        try {
          this.client?.removeChannel(channel);
        } catch {}
      };
    } catch (e) {
      console.warn('Não foi possível subscrever Supabase Realtime:', e);
      return () => {};
    }
  }

  // ==================== 8. MÉTODOS SAAS LEGADOS (COMPATIBILIDADE) ====================

  async syncClient(salon: Salon): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('clientes_saas').upsert({
        id: salon.id,
        nome: salon.name,
        email: salon.email || '',
        telefone: salon.phone,
        data_registo: salon.data_registo || salon.createdAt || new Date().toISOString(),
        fim_prova: salon.fim_prova || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        valor_mensal: salon.valor_mensal !== undefined ? Number(salon.valor_mensal) : 29.0,
        estado_subscricao: salon.estado_subscricao || 'prova',
        ultimo_mes_pago: salon.ultimo_mes_pago || null,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }

  async fetchSaasClients(): Promise<Partial<Salon>[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('clientes_saas').select('*');
      if (error || !data) return null;
      return data.map((d: any) => ({
        id: d.id,
        name: d.nome || d.name,
        email: d.email,
        phone: d.telefone || d.phone,
        data_registo: d.data_registo,
        fim_prova: d.fim_prova,
        valor_mensal: d.valor_mensal !== undefined ? Number(d.valor_mensal) : undefined,
        estado_subscricao: d.estado_subscricao,
        ultimo_mes_pago: d.ultimo_mes_pago,
        status: d.estado_subscricao === 'bloqueado' ? 'SUSPENSO' : 'ATIVO',
      }));
    } catch {
      return null;
    }
  }

  async syncPayment(payment: SubscriptionPayment): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('pagamentos_saas').upsert({
        id: payment.id,
        cliente_id: payment.cliente_id,
        cliente_nome: payment.cliente_nome,
        cliente_email: payment.cliente_email,
        data: payment.data,
        valor: payment.valor,
        metodo: payment.metodo,
        estado: payment.estado,
        mes_referencia: payment.mes_referencia,
        comprovativo_ref: payment.comprovativo_ref || null,
        data_validacao: payment.data_validacao || null,
        notas_admin: payment.notas_admin || null,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }

  async fetchPayments(): Promise<SubscriptionPayment[] | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('pagamentos_saas')
        .select('*')
        .order('data', { ascending: false });

      if (error || !data) return null;
      return data as SubscriptionPayment[];
    } catch {
      return null;
    }
  }

  async syncBillingConfig(config: BillingConfig): Promise<void> {
    return this.syncConfig(config);
  }

  async syncConfig(config: BillingConfig): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('configuracoes_saas').upsert({
        id: 'global_config',
        iban: config.iban,
        numero_mbway: config.numero_mbway,
        numero_whatsapp: config.numero_whatsapp,
        valor_mensal_padrao: config.valor_mensal_padrao,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }

  async fetchConfig(): Promise<BillingConfig | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('configuracoes_saas')
        .select('*')
        .eq('id', 'global_config')
        .single();

      if (error || !data) return null;
      return {
        iban: data.iban,
        numero_mbway: data.numero_mbway,
        numero_whatsapp: data.numero_whatsapp,
        valor_mensal_padrao:
          data.valor_mensal_padrao !== null && data.valor_mensal_padrao !== undefined
            ? Number(data.valor_mensal_padrao)
            : 29.0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Limpa / esvazia todos os dados operacionais da nuvem (agendamentos, clientes, serviços, utilizadores, salões).
   * Permite ao utilizador reiniciar testes ou limpar a nuvem com total segurança.
   */
  async clearAllCloudData(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Supabase não está configurado.' };
    }
    try {
      // 1. Apagar agendamentos (filho)
      const { error: errApts } = await this.client.from('agendamentos').delete().neq('id', '___none___');
      if (errApts) throw errApts;

      // 2. Apagar clientes (filho)
      const { error: errCli } = await this.client.from('clientes').delete().neq('id', '___none___');
      if (errCli) throw errCli;

      // 3. Apagar serviços (filho)
      const { error: errServ } = await this.client.from('servicos').delete().neq('id', '___none___');
      if (errServ) throw errServ;

      // 4. Apagar utilizadores (filho)
      const { error: errUsers } = await this.client.from('utilizadores').delete().neq('id', '___none___');
      if (errUsers) throw errUsers;

      // 5. Apagar salões (pai)
      const { error: errSaloes } = await this.client.from('saloes').delete().neq('id', '___none___');
      if (errSaloes) throw errSaloes;

      return {
        success: true,
        message: 'Todos os registos operacionais da Nuvem Supabase foram eliminados com sucesso!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao limpar nuvem: ${err?.message || 'Erro de rede ou permissões'}`,
      };
    }
  }
}

export const supabaseService = new SupabaseService();
