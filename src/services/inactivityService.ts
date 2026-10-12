import type { Client } from '../types';

export type InactivityStatus = 'RECENTE' | 'ATENCAO' | 'INATIVO' | 'SEM_VISITAS';

export interface InactivityAnalysis {
  status: InactivityStatus;
  daysSinceLastVisit: number | null;
  label: string;
  badgeColorClass: string;
  badgeBgClass: string;
  badgeBorderClass: string;
  description: string;
}

/**
 * Calcula a análise de inatividade de um cliente com base na data da última visita
 */
export function getClientInactivityAnalysis(client: Client, referenceDate: Date = new Date()): InactivityAnalysis {
  if (!client.lastVisitDate) {
    return {
      status: 'SEM_VISITAS',
      daysSinceLastVisit: null,
      label: 'Novo Cliente',
      badgeColorClass: 'text-slate-700',
      badgeBgClass: 'bg-slate-100',
      badgeBorderClass: 'border-slate-200',
      description: 'Ainda sem visitas concluídas registadas.',
    };
  }

  const lastVisit = new Date(client.lastVisitDate);
  const diffTime = referenceDate.getTime() - lastVisit.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (diffDays <= 29) {
    return {
      status: 'RECENTE',
      daysSinceLastVisit: diffDays,
      label: diffDays === 0 ? 'Visitou hoje' : diffDays === 1 ? 'Visitou ontem' : `Visitou há ${diffDays} dias`,
      badgeColorClass: 'text-emerald-700',
      badgeBgClass: 'bg-emerald-50',
      badgeBorderClass: 'border-emerald-200',
      description: 'Cliente ativo com frequência regular.',
    };
  }

  if (diffDays <= 59) {
    return {
      status: 'ATENCAO',
      daysSinceLastVisit: diffDays,
      label: `Ausente há ${diffDays} dias`,
      badgeColorClass: 'text-amber-800',
      badgeBgClass: 'bg-amber-50',
      badgeBorderClass: 'border-amber-200',
      description: 'Atenção: Cliente já ultrapassou o ciclo mensal habitual.',
    };
  }

  // 60 ou mais dias
  return {
    status: 'INATIVO',
    daysSinceLastVisit: diffDays,
    label: `Alerta: Não vai há ${diffDays} dias`,
    badgeColorClass: 'text-rose-700',
    badgeBgClass: 'bg-rose-50',
    badgeBorderClass: 'border-rose-200',
    description: 'Crítico: Risco de perda de cliente. Recomenda-se contacto de reativação.',
  };
}

/**
 * Gera mensagem rápida de WhatsApp para reativação do cliente
 */
export function generateReactivationWhatsAppUrl(client: Client, salonName: string): string {
  if (!client.phone) return '#';
  const cleanPhone = client.phone.replace(/[^0-9]/g, '');
  const message = encodeURIComponent(
    `Olá ${client.name}! Já temos saudades tuas aqui no ${salonName}. ✨ Está na altura de renovar o teu visual? Diz-nos se gostarias de marcar um horário esta semana!`
  );
  return `https://wa.me/${cleanPhone}?text=${message}`;
}
