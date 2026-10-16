import { supabase, isSupabaseConfigured } from './supabase';
import type {
  ClienteAcesso,
  PagamentoBancario,
  EventoWebhook,
  CheckoutSessionResult,
} from '../types/bankPayment';

const STORAGE_KEYS = {
  CLIENTES: 'sigec_banco_clientes',
  PAGAMENTOS: 'sigec_banco_pagamentos',
  WEBHOOKS: 'sigec_banco_webhooks',
};

function loadStorage<T>(key: string, defaultVal: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Erro ao guardar no storage local:', err);
  }
}

export class BankPaymentService {
  /**
   * Obter ou inicializar a ficha de acesso do cliente
   */
  async getClientAccess(clientId: string, defaultEmail?: string, defaultName?: string): Promise<ClienteAcesso> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', clientId)
          .maybeSingle();

        if (data && !error) {
          return {
            id: data.id,
            nome: data.nome,
            email: data.email,
            estado_acesso: data.estado_acesso,
            data_desbloqueio: data.data_desbloqueio,
            telefone: data.telefone,
          };
        }
      } catch (e) {
        console.warn('Supabase offline, recorrendo a storage local:', e);
      }
    }

    const localClientes = loadStorage<ClienteAcesso>(STORAGE_KEYS.CLIENTES, []);
    let cliente = localClientes.find((c) => c.id === clientId);

    if (!cliente) {
      cliente = {
        id: clientId,
        nome: defaultName || 'Cliente Salão',
        email: defaultEmail || `cliente-${clientId.slice(0, 6)}@exemplo.pt`,
        estado_acesso: 'bloqueado',
        data_desbloqueio: null,
      };
      localClientes.push(cliente);
      saveStorage(STORAGE_KEYS.CLIENTES, localClientes);

      // Sincronizar com Supabase se disponível
      if (isSupabaseConfigured && supabase) {
        supabase.from('clientes').upsert(cliente).then();
      }
    }

    return cliente;
  }

  /**
   * Iniciar sessão de Checkout Bancário ("Pagar agora")
   */
  async initiateCheckout(params: {
    clienteId: string;
    nome: string;
    email: string;
    valor: number;
    metodoDetalhe?: string;
  }): Promise<CheckoutSessionResult> {
    const { clienteId, nome, email, valor, metodoDetalhe = 'Stripe (Cartão, Multibanco, MB Way)' } = params;

    // Assegurar que a ficha do cliente existe
    await this.getClientAccess(clienteId, email, nome);

    const pagamentoId = `pag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const referenciaBancaria = `REF-STRIPE-${Math.floor(100000000 + Math.random() * 900000000)}`;

    const novoPagamento: PagamentoBancario = {
      id: pagamentoId,
      cliente_id: clienteId,
      valor: Number(valor.toFixed(2)),
      moeda: 'EUR',
      estado: 'pendente',
      referencia_bancaria: referenciaBancaria,
      data_criacao: new Date().toISOString(),
      data_confirmacao: null,
      metodo_detalhe: metodoDetalhe,
    };

    // Gravar localmente
    const pagamentos = loadStorage<PagamentoBancario>(STORAGE_KEYS.PAGAMENTOS, []);
    pagamentos.unshift(novoPagamento);
    saveStorage(STORAGE_KEYS.PAGAMENTOS, pagamentos);

    // Gravar no Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('pagamentos').insert(novoPagamento);
      } catch (err) {
        console.warn('Aviso ao registar pagamento no Supabase:', err);
      }
    }

    // Gerar URL simulado / de checkout
    const checkoutUrl = `#checkout-bancario?session_id=${referenciaBancaria}&amount=${valor}`;

    return {
      checkoutUrl,
      pagamentoId,
      referenciaBancaria,
    };
  }

  /**
   * Simular receção de Webhook do Banco com confirmação de pagamento
   * (Idempotente e com desbloqueio automático imediato)
   */
  async processBankWebhookConfirmation(pagamentoIdOrRef: string): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString();

    // 1. Procurar pagamento local
    const pagamentos = loadStorage<PagamentoBancario>(STORAGE_KEYS.PAGAMENTOS, []);
    const index = pagamentos.findIndex(
      (p) => p.id === pagamentoIdOrRef || p.referencia_bancaria === pagamentoIdOrRef
    );

    if (index === -1) {
      return { success: false, message: 'Pagamento não localizado para este identificador.' };
    }

    const pagamento = pagamentos[index];

    // Verificar idempotência: se já estava pago, não repete
    if (pagamento.estado === 'pago') {
      return { success: true, message: 'Pagamento já se encontrava confirmado (idempotência garantida).' };
    }

    // 2. Atualizar estado do pagamento para "pago"
    pagamento.estado = 'pago';
    pagamento.data_confirmacao = now;
    pagamentos[index] = pagamento;
    saveStorage(STORAGE_KEYS.PAGAMENTOS, pagamentos);

    // 3. Desbloquear automaticamente o acesso do cliente
    const clientes = loadStorage<ClienteAcesso>(STORAGE_KEYS.CLIENTES, []);
    const cIndex = clientes.findIndex((c) => c.id === pagamento.cliente_id);
    if (cIndex !== -1) {
      clientes[cIndex].estado_acesso = 'ativo';
      clientes[cIndex].data_desbloqueio = now;
      saveStorage(STORAGE_KEYS.CLIENTES, clientes);
    }

    // 3.1 Sincronizar salão e pagamento de subscrição correspondente
    try {
      const salons = loadStorage<any>('salon_master_salons', []);
      const sIndex = salons.findIndex((s: any) => s.id === pagamento.cliente_id);
      if (sIndex !== -1) {
        salons[sIndex].estado_subscricao = 'ativo';
        salons[sIndex].status = 'ATIVO';
        saveStorage('salon_master_salons', salons);
      }

      const subPayments = loadStorage<any>('salon_master_sub_payments', []);
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      subPayments.unshift({
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cliente_id: pagamento.cliente_id,
        valor: pagamento.valor,
        metodo: 'cartao',
        comprovativo_ref: pagamento.referencia_bancaria,
        data_pagamento: now,
        data_validacao: now,
        estado: 'validado',
        mes_referencia: currentMonth,
      });
      saveStorage('salon_master_sub_payments', subPayments);
    } catch (e) {
      console.warn('Erro ao sincronizar registos locais de subscrição:', e);
    }

    // 4. Registar evento de webhook
    const webhooks = loadStorage<EventoWebhook>(STORAGE_KEYS.WEBHOOKS, []);
    webhooks.unshift({
      id: `evt-${Date.now()}`,
      pagamento_id: pagamento.id,
      payload: {
        event: 'checkout.session.completed',
        payment_status: 'paid',
        referencia: pagamento.referencia_bancaria,
        amount: pagamento.valor,
      },
      recebido_em: now,
      processado: true,
      origem: 'stripe_webhook',
    });
    saveStorage(STORAGE_KEYS.WEBHOOKS, webhooks);

    // 5. Sincronizar com Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('pagamentos')
          .update({ estado: 'pago', data_confirmacao: now })
          .eq('id', pagamento.id);

        await supabase
          .from('clientes')
          .update({ estado_acesso: 'ativo', data_desbloqueio: now })
          .eq('id', pagamento.cliente_id);
      } catch (err) {
        console.warn('Erro ao atualizar Supabase via webhook local:', err);
      }
    }

    // Disparar evento personalizado para atualização imediata dos ecrãs em tempo real
    window.dispatchEvent(
      new CustomEvent('sigec_bank_unlocked', {
        detail: { clienteId: pagamento.cliente_id, pagamentoId: pagamento.id },
      })
    );

    return {
      success: true,
      message: 'Pagamento confirmado — acesso desbloqueado com sucesso.',
    };
  }

  /**
   * Obter todos os pagamentos (para o Painel de Pagamentos do Dono)
   */
  async getAllPayments(): Promise<{ pagamentos: PagamentoBancario[]; clientes: ClienteAcesso[] }> {
    let pagamentos = loadStorage<PagamentoBancario>(STORAGE_KEYS.PAGAMENTOS, []);
    let clientes = loadStorage<ClienteAcesso>(STORAGE_KEYS.CLIENTES, []);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbPagamentos } = await supabase
          .from('pagamentos')
          .select('*')
          .order('data_criacao', { ascending: false });

        const { data: dbClientes } = await supabase.from('clientes').select('*');

        if (dbPagamentos && dbPagamentos.length > 0) {
          pagamentos = dbPagamentos;
        }
        if (dbClientes && dbClientes.length > 0) {
          clientes = dbClientes;
        }
      } catch (err) {
        console.warn('Falha ao ler pagamentos do Supabase:', err);
      }
    }

    return { pagamentos, clientes };
  }

  /**
   * Subscrever alterações de estado de acesso em tempo real
   */
  subscribeToAccess(clienteId: string, onStatusChange: (status: 'bloqueado' | 'ativo') => void): () => void {
    const handleStorage = () => {
      this.getClientAccess(clienteId).then((c) => {
        onStatusChange(c.estado_acesso);
      });
    };

    const handleCustom = (e: any) => {
      if (!e.detail || e.detail.clienteId === clienteId) {
        onStatusChange('ativo');
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sigec_bank_unlocked', handleCustom);

    // Se Supabase Realtime estiver ativo
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`public:clientes:id=eq.${clienteId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clientes',
            filter: `id=eq.${clienteId}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.estado_acesso) {
              onStatusChange(payload.new.estado_acesso);
            }
          }
        )
        .subscribe();
    }

    // Retorna função de desinscrição (cleanup)
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sigec_bank_unlocked', handleCustom);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }
}

export const bankPaymentService = new BankPaymentService();
