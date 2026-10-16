import type { Appointment } from '../types';

/**
 * Converte string de hora "HH:mm" em número de minutos desde a meia-noite
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte número de minutos desde a meia-noite para "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calcula a hora final de acordo com a hora inicial e a duração total em minutos
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMin = timeToMinutes(startTime);
  const endMin = Math.min(23 * 60 + 59, startMin + durationMinutes);
  return minutesToTime(Math.max(startMin + 5, endMin));
}

/**
 * Calcula a duração em minutos entre duas horas "HH:mm"
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  return Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
}

/**
 * Adiciona ou subtrai minutos a uma hora "HH:mm" (ex: saltos de 10 min)
 */
export function addMinutesToTime(time: string, deltaMinutes: number): string {
  const mins = Math.max(0, Math.min(23 * 60 + 50, timeToMinutes(time) + deltaMinutes));
  return minutesToTime(mins);
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  hasOverlap?: boolean;
  message?: string;
  conflictingAppointment?: Appointment;
}

/**
 * Verificador de horários para o colaborador.
 * Nota: Cada colaborador PODE ter tarefas que se sobreponham a outras já existentes desse mesmo colaborador.
 * Apenas valida se a hora de fim é posterior à hora de início e informa se existe sobreposição.
 */
export function checkAppointmentConflict(params: {
  appointments: Appointment[];
  date: string; // "YYYY-MM-DD"
  userId: string; // ID do profissional designado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  excludeAppointmentId?: string; // Para quando estamos a editar uma reserva existente
}): ConflictCheckResult {
  const { appointments, date, userId, startTime, endTime, excludeAppointmentId } = params;

  const newStartMin = timeToMinutes(startTime);
  const newEndMin = timeToMinutes(endTime);

  if (newEndMin <= newStartMin) {
    return {
      hasConflict: true,
      message: 'A hora de fim tem de ser posterior à hora de início.',
    };
  }

  // Filtrar apenas marcações ativas do mesmo profissional na mesma data
  const relevantAppointments = appointments.filter((apt) => {
    if (apt.date !== date) return false;
    if (apt.userId !== userId) return false;
    if (apt.status === 'CANCELADA') return false;
    if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
    return true;
  });

  for (const existing of relevantAppointments) {
    const existingStartMin = timeToMinutes(existing.startTime);
    const existingEndMin = timeToMinutes(existing.endTime);

    const isOverlapping = newStartMin < existingEndMin && newEndMin > existingStartMin;

    if (isOverlapping) {
      return {
        hasConflict: false,
        hasOverlap: true,
        conflictingAppointment: existing,
        message: `Nota: Este colaborador tem outra tarefa neste horário ("${existing.clientName}", ${existing.startTime} às ${existing.endTime}). A sobreposição é permitida.`,
      };
    }
  }

  return { hasConflict: false, hasOverlap: false };
}

/**
 * Verifica se uma reserva é considerada passada.
 * Regra:
 * - Se a data for anterior ao dia de hoje -> Passada (não pode ser apagada por ninguém)
 * - Se a data for posterior ao dia de hoje -> Não é passada
 * - Se for no dia de hoje: se o horário for anterior ao horário que decorre no momento -> Passada (não pode ser apagada por ninguém)
 */
export function isPastAppointment(apt: { date: string; startTime?: string; endTime?: string }): boolean {
  if (!apt || !apt.date) return false;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (apt.date < todayStr) return true;
  if (apt.date > todayStr) return false;

  const currentH = String(now.getHours()).padStart(2, '0');
  const currentM = String(now.getMinutes()).padStart(2, '0');
  const nowTime = `${currentH}:${currentM}`;

  const aptTime = apt.startTime || apt.endTime || '00:00';
  return aptTime < nowTime;
}
