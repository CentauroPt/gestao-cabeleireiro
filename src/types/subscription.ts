export type SubscriptionStatus = 'ativo' | 'bloqueado' | 'prova';

export type PaymentMethod = 'transferencia' | 'mbway';

export type PaymentStatus = 'pendente' | 'validado';

export interface SubscriptionPayment {
  id: string;
  cliente_id: string; // ID do salão
  cliente_nome: string;
  cliente_email: string;
  data: string; // ISO date string (YYYY-MM-DDTHH:mm:ss)
  valor: number; // Decimal (ex: 29.00)
  metodo: PaymentMethod;
  estado: PaymentStatus;
  mes_referencia: string; // Formato "YYYY-MM" (ex: "2026-10") ou "Outubro 2026"
  comprovativo_ref?: string; // Número de telefone MB Way ou referência bancária indicada
  data_validacao?: string; // Data em que o administrador validou
  notas_admin?: string;
}

export interface BillingConfig {
  iban: string;
  numero_mbway: string;
  numero_whatsapp: string;
  valor_mensal_padrao: number;
}

export interface SubscriptionStats {
  totalFaturado: number;
  faturadoMesAtual: number;
  totalClientes: number;
  clientesAtivos: number;
  clientesProva: number;
  clientesBloqueados: number;
  pagamentosPendentesCount: number;
  faturacaoPorMes: Array<{ mes: string; label: string; valor: number; count: number }>;
  faturacaoPorAno: Array<{ ano: string; valor: number; count: number }>;
  crescimentoClientes: Array<{ mes: string; label: string; novos: number; total: number }>;
}
