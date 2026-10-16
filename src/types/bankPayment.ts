export type EstadoAcesso = 'bloqueado' | 'ativo';

export type EstadoPagamento = 'pendente' | 'pago' | 'falhado';

export interface ClienteAcesso {
  id: string; // uuid
  nome: string; // texto
  email: string; // texto
  estado_acesso: EstadoAcesso; // enum: bloqueado | ativo
  data_desbloqueio: string | null; // timestamp ISO
  telefone?: string;
  salon_id?: string;
}

export interface PagamentoBancario {
  id: string; // uuid
  cliente_id: string; // uuid
  valor: number; // decimal (ex: 29.00)
  moeda: string; // texto, 'EUR'
  estado: EstadoPagamento; // enum: pendente | pago | falhado
  referencia_bancaria: string; // texto (ex: chk_sess_xxx, REF-MB-xxx)
  data_criacao: string; // timestamp ISO
  data_confirmacao: string | null; // timestamp ISO
  metodo_detalhe?: string; // ex: 'Stripe (Cartão, Multibanco, MB Way)'
}

export interface EventoWebhook {
  id: string; // uuid
  pagamento_id: string | null; // uuid
  payload: Record<string, any>; // jsonb
  recebido_em: string; // timestamp ISO
  processado: boolean; // boolean
  origem?: string; // ex: 'stripe', 'banco'
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  pagamentoId: string;
  referenciaBancaria: string;
}
