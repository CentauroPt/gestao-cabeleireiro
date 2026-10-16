export type Role = 'ADMIN' | 'COLABORADOR';

export type TabType = 'calendar' | 'services' | 'clients' | 'staff' | 'reports' | 'payments';

export type SalonStatus = 'ATIVO' | 'SUSPENSO' | 'CANCELADO';

export type SubscriptionStatus = 'ativo' | 'bloqueado' | 'prova';

export interface Salon {
  id: string;
  name: string;
  phone: string;
  address: string;
  nif?: string;
  openingTime: string; // "09:00"
  closingTime: string; // "20:00"
  slotIntervalMinutes: number; // ex: 30 min
  status: SalonStatus; // 'ATIVO' | 'SUSPENSO' | 'CANCELADO'
  createdAt?: string;
  suspensionReason?: string;
  logoUrl?: string; // Logótipo personalizado do salão
  primaryColor?: string; // Cor principal personalizada do salão (Hex)
  startDayOfWeek?: number; // Dia de início da semana (0 = Domingo, 1 = Segunda, 2 = Terça, ..., 6 = Sábado; padrão: 1)
  
  // Dados de Subscrição SaaS
  email?: string;
  data_registo?: string; // Data de registo do salão (ISO)
  fim_prova?: string; // Data de fim do período de teste de 30 dias (ISO = registo + 30d)
  valor_mensal?: number; // Valor da subscrição mensal em Euros (ex: 29.00)
  estado_subscricao?: SubscriptionStatus; // 'ativo' | 'bloqueado' | 'prova'
  ultimo_mes_pago?: string; // Mês do último pagamento validado (ex: "2026-10")
}

export * from './subscription';

export interface User {
  id: string;
  salonId: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  password?: string;
  color: string; // Hex color for calendar, ex: #3B82F6
  specialties: string[]; // ex: ["Cortes", "Coloração"]
  active: boolean;
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  category: 'Cabelo' | 'Estética' | 'Barba' | 'Tratamento';
  durationMinutes: number; // Duração em minutos
  price: number; // Preço em Euros
  description?: string;
}

export interface VisitHistoryItem {
  id: string;
  appointmentId?: string;
  date: string; // ISO date string (YYYY-MM-DDTHH:mm:ss)
  servicesDone: string[]; // Nomes dos serviços efetuados
  professionalId: string;
  professionalName: string;
  amountSpent: number;
  notes?: string;
}

export interface Client {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  email?: string;
  preferredUserId?: string; // ID do profissional habitual
  technicalNotes?: string; // Ex: "Coloração 6.1 com oxidante 20vol; Alergia leve a amoníaco"
  photoUrl?: string; // Foto do cliente (quadrada com esquinas arredondadas)
  createdById: string;
  createdAt: string;
  totalSpent: number; // Total acumulado gasto no salão
  lastVisitDate?: string; // ISO date string da última visita
  visitHistory: VisitHistoryItem[];
}

export type AppointmentStatus = 'AGENDADA' | 'CONFIRMADA' | 'CONCLUIDA' | 'CANCELADA';

export interface Appointment {
  id: string;
  salonId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  userId: string; // Profissional que vai executar o serviço
  serviceIds: string[]; // Serviços marcados
  serviceNames: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (ex: "10:00")
  endTime: string; // HH:mm (calculado automaticamente com base na duração total)
  totalDurationMinutes: number;
  totalPrice: number;
  status: AppointmentStatus;
  notes?: string;
  createdById: string; // Quem registou a marcação (qualquer colaborador pode registar)
  createdAt: string;
}
