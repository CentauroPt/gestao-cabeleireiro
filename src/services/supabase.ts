import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPayment, BillingConfig } from '../types/subscription';
import type { Salon } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://o-seu-projeto.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Serviço de sincronização com Supabase para o sistema de faturação e subscrições SaaS.
 * Funciona de forma resiliente: se o Supabase estiver configurado, envia e lê em tempo real;
 * caso contrário, todo o sistema funciona com LocalStorage e IndexedDB sem qualquer interrupção.
 */
export class SupabaseService {
  /**
   * Sincronizar salão/cliente SaaS com o Supabase
   */
  async syncClient(salon: Salon): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('clientes_saas').upsert({
        id: salon.id,
        nome: salon.name,
        email: salon.email || '',
        telefone: salon.phone,
        data_registo: salon.data_registo || salon.createdAt || new Date().toISOString(),
        fim_prova: salon.fim_prova || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        valor_mensal: salon.valor_mensal || 29.00,
        estado_subscricao: salon.estado_subscricao || 'prova',
        ultimo_mes_pago: salon.ultimo_mes_pago || null,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Aviso: Sincronização de cliente com Supabase falhou (modo offline ativo):', err);
    }
  }

  /**
   * Sincronizar pagamento com o Supabase
   */
  async syncPayment(payment: SubscriptionPayment): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('pagamentos_saas').upsert({
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
    } catch (err) {
      console.warn('Aviso: Sincronização de pagamento com Supabase falhou:', err);
    }
  }

  /**
   * Carregar pagamentos do Supabase
   */
  async fetchPayments(): Promise<SubscriptionPayment[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('pagamentos_saas')
        .select('*')
        .order('data', { ascending: false });

      if (error || !data) return null;
      return data as SubscriptionPayment[];
    } catch {
      return null;
    }
  }

  /**
   * Sincronizar configurações globais com o Supabase
   */
  async syncBillingConfig(config: BillingConfig): Promise<void> {
    return this.syncConfig(config);
  }

  async syncConfig(config: BillingConfig): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('configuracoes_saas').upsert({
        id: 'global_config',
        iban: config.iban,
        numero_mbway: config.numero_mbway,
        numero_whatsapp: config.numero_whatsapp,
        valor_mensal_padrao: config.valor_mensal_padrao,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Aviso: Falha ao sincronizar configurações com Supabase:', err);
    }
  }

  /**
   * Carregar configurações globais do Supabase
   */
  async fetchConfig(): Promise<BillingConfig | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('configuracoes_saas')
        .select('*')
        .eq('id', 'global_config')
        .single();

      if (error || !data) return null;
      return {
        iban: data.iban,
        numero_mbway: data.numero_mbway,
        numero_whatsapp: data.numero_whatsapp,
        valor_mensal_padrao: Number(data.valor_mensal_padrao) || 29.0,
      };
    } catch {
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
