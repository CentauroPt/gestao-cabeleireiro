import React, { useState, useMemo, useEffect } from 'react';
import type { Appointment, Client } from '../../types';
import { useApp } from '../../context/AppContext';
import { AppointmentModal } from './AppointmentModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  CheckCircle2,
  LayoutGrid,
  List,
  GripVertical,
  Move,
} from 'lucide-react';

interface Props {
  initialClientToBook?: Client | null;
  onClearInitialClient?: () => void;
}

const ROW_HEIGHT = 64; // Altura em px por bloco de horário na grelha

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface PositionedAppointment {
  apt: Appointment;
  topPx: number;
  heightPx: number;
  colIndex: number;
  totalCols: number;
}

function layoutColumnAppointments(
  apts: Appointment[],
  gridStartMinutes: number,
  slotInterval: number
): PositionedAppointment[] {
  if (apts.length === 0) return [];

  const pxPerMinute = ROW_HEIGHT / slotInterval;

  const sorted = [...apts].sort((a, b) => {
    const startDiff = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    if (startDiff !== 0) return startDiff;
    return parseTimeToMinutes(b.endTime) - parseTimeToMinutes(a.endTime);
  });

  const results: PositionedAppointment[] = [];
  let cluster: { apt: Appointment; startMin: number; endMin: number; colIndex: number }[] = [];
  let clusterMaxEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const colEndTimes: number[] = [];
    for (const item of cluster) {
      let assignedCol = -1;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= item.startMin) {
          assignedCol = c;
          colEndTimes[c] = item.endMin;
          break;
        }
      }
      if (assignedCol === -1) {
        assignedCol = colEndTimes.length;
        colEndTimes.push(item.endMin);
      }
      item.colIndex = assignedCol;
    }
    const totalCols = Math.max(1, colEndTimes.length);
    for (const item of cluster) {
      const topPx = Math.max(0, (item.startMin - gridStartMinutes) * pxPerMinute);
      const durationMin = Math.max(15, item.endMin - item.startMin);
      const heightPx = Math.max(32, durationMin * pxPerMinute);
      results.push({
        apt: item.apt,
        topPx,
        heightPx,
        colIndex: item.colIndex,
        totalCols,
      });
    }
    cluster = [];
    clusterMaxEnd = -1;
  };

  for (const apt of sorted) {
    const startMin = parseTimeToMinutes(apt.startTime);
    const rawEndMin = parseTimeToMinutes(apt.endTime);
    const endMin =
      rawEndMin > startMin ? rawEndMin : startMin + Math.max(15, apt.totalDurationMinutes || 30);

    if (cluster.length > 0 && startMin >= clusterMaxEnd) {
      flushCluster();
    }
    cluster.push({ apt, startMin, endMin, colIndex: 0 });
    if (endMin > clusterMaxEnd) {
      clusterMaxEnd = endMin;
    }
  }
  flushCluster();

  return results;
}

export const CalendarView: React.FC<Props> = ({ initialClientToBook, onClearInitialClient }) => {
  const { appointments, users, currentSalon, moveAppointment, nudgeAppointment } = useApp();

  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  // Por definição, a agenda abre na vista de Semana Completa ('WEEK')
  const [viewMode, setViewMode] = useState<'WEEK' | 'COLUMNS' | 'LIST'>('WEEK');
  const [slotInterval, setSlotInterval] = useState<10 | 15 | 30>(30); // Intervalo na vista semanal

  // Estados para abertura do modal
  const [isModalOpen, setIsModalOpen] = useState(!!initialClientToBook);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [slotToBook, setSlotToBook] = useState<{ time: string; userId: string; dateStr?: string } | null>(null);

  useEffect(() => {
    if (initialClientToBook) {
      setSelectedAppointment(null);
      setSlotToBook(null);
      setIsModalOpen(true);
    }
  }, [initialClientToBook]);

  // Estados para Drag & Drop com o rato
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ time: string; colKey: string } | null>(null);

  // Intervalos de horas do salão
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const openH = currentSalon ? parseInt(currentSalon.openingTime.split(':')[0], 10) : 9;
    const closeH = currentSalon ? parseInt(currentSalon.closingTime.split(':')[0], 10) : 20;

    for (let h = openH; h <= closeH; h++) {
      for (let m = 0; m < 60; m += slotInterval) {
        if (h === closeH && m > 0) break;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, [currentSalon, slotInterval]);

  const gridStartMinutes = useMemo(() => {
    return timeSlots.length > 0 ? parseTimeToMinutes(timeSlots[0]) : 9 * 60;
  }, [timeSlots]);

  // Calcular os 7 dias da semana completa (Segunda-feira a Domingo)
  const weekDays = useMemo(() => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);
    const dayOfWeek = baseDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(y, m - 1, d + diffToMonday);

    const days: {
      dateStr: string;
      dayName: string;
      dayNumber: number;
      monthShort: string;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const dStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        dateStr: dStr,
        dayName: dt.toLocaleDateString('pt-PT', { weekday: 'long' }),
        dayNumber: dt.getDate(),
        monthShort: dt.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', ''),
        isToday: dStr === todayStr,
      });
    }
    return days;
  }, [currentDateStr]);

  // Navegação de semanas ou dias consoante a vista ativa
  const handlePrev = () => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - (viewMode === 'WEEK' ? 7 : 1));
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    setCurrentDateStr(`${yyyy}-${mm}-${dd}`);
  };

  const handleNext = () => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + (viewMode === 'WEEK' ? 7 : 1));
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    setCurrentDateStr(`${yyyy}-${mm}-${dd}`);
  };

  const handleToday = () => {
    setCurrentDateStr(new Date().toISOString().split('T')[0]);
  };

  // Formatação amigável do título (Semana Completa ou Dia)
  const formattedDateTitle = useMemo(() => {
    if (viewMode === 'WEEK' && weekDays.length === 7) {
      const first = weekDays[0];
      const last = weekDays[6];
      const year = last.dateStr.split('-')[0];
      return `Semana de ${first.dayNumber} ${first.monthShort} a ${last.dayNumber} ${last.monthShort} de ${year}`;
    }
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [currentDateStr, viewMode, weekDays]);

  // Filtrar reservas do dia selecionado
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.date === currentDateStr);
  }, [appointments, currentDateStr]);

  // Filtrar reservas da semana completa
  const weekAppointments = useMemo(() => {
    const weekDateSet = new Set(weekDays.map((d) => d.dateStr));
    return appointments.filter((apt) => weekDateSet.has(apt.date));
  }, [appointments, weekDays]);

  // Clique num slot vazio para agendar (não são permitidas marcações para dias anteriores ao dia atual)
  const handleSlotClick = (time: string, userId: string, dateStr?: string) => {
    const targetDate = dateStr || currentDateStr;
    if (targetDate < todayStr) {
      alert('Não são permitidas marcações para dias anteriores ao dia atual.');
      return;
    }
    setSelectedAppointment(null);
    setSlotToBook({ time, userId, dateStr: targetDate });
    setIsModalOpen(true);
  };

  // Clique numa reserva existente para ver / editar horários
  const handleAppointmentClick = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(apt);
    setSlotToBook(null);
    setIsModalOpen(true);
  };

  // Lógica de Soltar (Drop) na vista de colunas por profissional
  const handleDropSlot = async (time: string, userId: string) => {
    if (!draggedAptId) return;
    setDragOverSlot(null);
    await moveAppointment(draggedAptId, time, userId, currentDateStr);
    setDraggedAptId(null);
  };

  // Lógica de Soltar (Drop) na vista de Semana Completa
  const handleDropWeekSlot = async (time: string, targetDateStr: string) => {
    if (!draggedAptId) return;
    setDragOverSlot(null);
    const apt = appointments.find((a) => a.id === draggedAptId);
    if (apt) {
      await moveAppointment(draggedAptId, time, apt.userId, targetDateStr);
    }
    setDraggedAptId(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Controlo do Calendário */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Navegação de Datas / Semana */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {viewMode === 'WEEK' ? 'Esta Semana' : 'Hoje'}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title={viewMode === 'WEEK' ? 'Semana anterior' : 'Dia anterior'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title={viewMode === 'WEEK' ? 'Semana seguinte' : 'Dia seguinte'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 capitalize">{formattedDateTitle}</span>
            <input
              type="date"
              value={currentDateStr}
              onChange={(e) => setCurrentDateStr(e.target.value)}
              className="text-xs p-1 border border-slate-200 rounded-lg outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Alternador de Visão & Botão Nova Reserva */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('WEEK')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'WEEK' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Semana Completa
            </button>
            <button
              onClick={() => setViewMode('COLUMNS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'COLUMNS' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Dia (Profissionais)
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'LIST' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          {/* Seletor de Intervalo (10m, 15m, 30m) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase hidden sm:inline">Intervalo:</span>
            <button
              onClick={() => setSlotInterval(10)}
              className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                slotInterval === 10 ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grelha com saltos de 10 minutos"
            >
              10 min
            </button>
            <button
              onClick={() => setSlotInterval(15)}
              className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                slotInterval === 15 ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grelha com saltos de 15 minutos"
            >
              15 min
            </button>
            <button
              onClick={() => setSlotInterval(30)}
              className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                slotInterval === 30 ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grelha com saltos de 30 minutos"
            >
              30 min
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedAppointment(null);
              setSlotToBook(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Reserva
          </button>
        </div>
      </div>

      {/* Dica Intuitiva de Drag & Drop */}
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50/60 border border-purple-100 rounded-xl text-xs text-purple-800">
        <Move className="w-4 h-4 text-purple-600 shrink-0" />
        <span>
          <strong>Dica Interativa:</strong> Pode <strong>arrastar com o rato</strong> qualquer reserva para outro
          horário ou colega. Clique na marcação para <strong>alterar a hora de início e de fim</strong> livremente.
        </span>
      </div>

      {/* VISTA PADRÃO: SEMANA COMPLETA (Segunda-feira a Domingo) */}
      {viewMode === 'WEEK' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              {/* Cabeçalho das Colunas: Horário + 7 Dias da Semana */}
              <div className="grid grid-cols-[72px_repeat(7,minmax(130px,1fr))] border-b border-slate-200 bg-slate-50/75 sticky top-0 z-10">
                <div className="p-3 text-center text-[11px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider flex items-center justify-center">
                  Hora
                </div>
                {weekDays.map((day) => {
                  const isSelectedDay = day.dateStr === currentDateStr;
                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setCurrentDateStr(day.dateStr)}
                      className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        day.isToday
                          ? 'bg-purple-50/80'
                          : isSelectedDay
                          ? 'bg-slate-100/70'
                          : 'hover:bg-slate-100/40'
                      }`}
                      title="Clique para selecionar este dia"
                    >
                      <span className="text-[11px] font-bold text-slate-500 capitalize">
                        {day.dayName}
                      </span>
                      <span
                        className={`mt-1 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          day.isToday
                            ? 'bg-purple-600 text-white shadow-xs'
                            : isSelectedDay
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-800'
                        }`}
                      >
                        {day.dayNumber} {day.monthShort}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grelha de Intervalos de Horário para os 7 Dias da Semana (ocupação proporcional ao horário) */}
              <div className="grid grid-cols-[72px_repeat(7,minmax(130px,1fr))]">
                {/* Coluna de Horas */}
                <div className="border-r border-slate-200 bg-slate-50/20 divide-y divide-slate-100">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="p-2 text-center text-xs font-semibold text-slate-400 flex items-center justify-center"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Colunas dos 7 Dias da Semana */}
                {weekDays.map((day) => {
                  const dayApts = weekAppointments.filter((a) => a.date === day.dateStr);
                  const positionedApts = layoutColumnAppointments(
                    dayApts,
                    gridStartMinutes,
                    slotInterval
                  );

                  return (
                    <div
                      key={day.dateStr}
                      style={{ height: `${timeSlots.length * ROW_HEIGHT}px` }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = Math.max(0, e.clientY - rect.top);
                        const slotIdx = Math.min(
                          timeSlots.length - 1,
                          Math.floor(relY / ROW_HEIGHT)
                        );
                        const targetTime = timeSlots[slotIdx];
                        if (
                          dragOverSlot?.time !== targetTime ||
                          dragOverSlot?.colKey !== day.dateStr
                        ) {
                          setDragOverSlot({ time: targetTime, colKey: day.dateStr });
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (dragOverSlot?.colKey === day.dateStr) {
                            setDragOverSlot(null);
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = Math.max(0, e.clientY - rect.top);
                        const slotIdx = Math.min(
                          timeSlots.length - 1,
                          Math.floor(relY / ROW_HEIGHT)
                        );
                        const targetTime = timeSlots[slotIdx];
                        handleDropWeekSlot(targetTime, day.dateStr);
                      }}
                      className="relative border-r border-slate-200 last:border-r-0"
                    >
                      {/* Células de fundo de cada intervalo de hora */}
                      <div className="divide-y divide-slate-100">
                        {timeSlots.map((time) => {
                          const isOver =
                            dragOverSlot?.time === time && dragOverSlot?.colKey === day.dateStr;
                          const isPastDay = day.dateStr < todayStr;
                          return (
                            <div
                              key={time}
                              style={{ height: `${ROW_HEIGHT}px` }}
                              onClick={() => handleSlotClick(time, '', day.dateStr)}
                              className={`transition-colors ${
                                isPastDay
                                  ? 'bg-slate-50/40 cursor-not-allowed'
                                  : isOver
                                  ? 'bg-purple-100/90 ring-2 ring-inset ring-purple-500 cursor-pointer'
                                  : day.isToday
                                  ? 'bg-purple-50/10 hover:bg-purple-50/40 cursor-pointer'
                                  : 'hover:bg-purple-50/30 cursor-pointer'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Janelas de marcação dimensionadas para ocupar o horário de início ao fim */}
                      {positionedApts.map(
                        ({ apt: aptAtSlot, topPx, heightPx, colIndex, totalCols }) => {
                          const prof = users.find((u) => u.id === aptAtSlot.userId);
                          const widthPct = 100 / totalCols;
                          const leftPct = colIndex * widthPct;
                          const isLocked = aptAtSlot.status === 'CONCLUIDA' || aptAtSlot.date < todayStr;
                          return (
                            <div
                              key={aptAtSlot.id}
                              draggable={!isLocked}
                              onDragStart={(e) => {
                                if (isLocked) {
                                  e.preventDefault();
                                  return;
                                }
                                e.stopPropagation();
                                e.dataTransfer.setData('text/plain', aptAtSlot.id);
                                setDraggedAptId(aptAtSlot.id);
                              }}
                              onDragEnd={() => {
                                setDraggedAptId(null);
                                setDragOverSlot(null);
                              }}
                              onClick={(e) => handleAppointmentClick(aptAtSlot, e)}
                              title={
                                aptAtSlot.date < todayStr
                                  ? `${aptAtSlot.clientName} (${aptAtSlot.startTime} - ${aptAtSlot.endTime}) — Reserva anterior ao dia atual (apenas consulta)`
                                  : `${aptAtSlot.clientName} (${aptAtSlot.startTime} - ${aptAtSlot.endTime}) — Clique para editar reserva ou arraste para mover`
                              }
                              className={`absolute z-10 p-1.5 rounded-xl text-left shadow-xs border transition-all overflow-hidden flex flex-col justify-between ${
                                isLocked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                              } ${
                                draggedAptId === aptAtSlot.id
                                  ? 'opacity-40 scale-95 border-purple-400'
                                  : ''
                              } ${
                                aptAtSlot.status === 'CONCLUIDA'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                  : 'bg-white border-purple-200 hover:border-purple-400 text-slate-900 hover:z-20 hover:shadow-md'
                              }`}
                              style={{
                                top: `${topPx + 2}px`,
                                height: `${Math.max(heightPx - 4, 30)}px`,
                                left: `calc(${leftPct}% + 3px)`,
                                width: `calc(${widthPct}% - 6px)`,
                                borderLeftWidth: '4px',
                                borderLeftColor: prof?.color || '#8B5CF6',
                              }}
                            >
                              <div className="min-h-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold truncate">
                                    {aptAtSlot.clientName}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1 py-0.2 rounded shrink-0 ${
                                      aptAtSlot.status === 'CONCLUIDA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {aptAtSlot.startTime}-{aptAtSlot.endTime}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {aptAtSlot.serviceNames.join(', ')}
                                </div>
                              </div>
                              <div className="text-[10px] font-semibold text-purple-700 truncate flex items-center justify-between">
                                <span className="truncate">{prof?.name || 'Colaborador'}</span>
                                <span className="text-slate-700 font-bold shrink-0 ml-1">
                                  {aptAtSlot.totalPrice.toFixed(2)}€
                                </span>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'COLUMNS' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Cabeçalho das Colunas: Horário + Colaboradores */}
              <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(200px,1fr))] border-b border-slate-200 bg-slate-50/75 sticky top-0 z-10">
                <div className="p-3 text-center text-[11px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">
                  Horário
                </div>
                {users.map((colab) => (
                  <div
                    key={colab.id}
                    className="p-3 text-center border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: colab.color }}
                      />
                      <span className="text-xs font-bold text-slate-800">{colab.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {colab.specialties.slice(0, 2).join(', ') || colab.role}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grelha de Intervalos de Horário por Colaborador (ocupação proporcional ao horário) */}
              <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(200px,1fr))]">
                {/* Coluna de Horas */}
                <div className="border-r border-slate-200 bg-slate-50/20 divide-y divide-slate-100">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="p-2 text-center text-xs font-semibold text-slate-400 flex items-center justify-center"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Coluna para cada Profissional (Drop Zone) */}
                {users.map((colab) => {
                  const colabApts = dayAppointments.filter((a) => a.userId === colab.id);
                  const positionedApts = layoutColumnAppointments(
                    colabApts,
                    gridStartMinutes,
                    slotInterval
                  );

                  return (
                    <div
                      key={colab.id}
                      style={{ height: `${timeSlots.length * ROW_HEIGHT}px` }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = Math.max(0, e.clientY - rect.top);
                        const slotIdx = Math.min(
                          timeSlots.length - 1,
                          Math.floor(relY / ROW_HEIGHT)
                        );
                        const targetTime = timeSlots[slotIdx];
                        if (
                          dragOverSlot?.time !== targetTime ||
                          dragOverSlot?.colKey !== colab.id
                        ) {
                          setDragOverSlot({ time: targetTime, colKey: colab.id });
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (dragOverSlot?.colKey === colab.id) {
                            setDragOverSlot(null);
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = Math.max(0, e.clientY - rect.top);
                        const slotIdx = Math.min(
                          timeSlots.length - 1,
                          Math.floor(relY / ROW_HEIGHT)
                        );
                        const targetTime = timeSlots[slotIdx];
                        handleDropSlot(targetTime, colab.id);
                      }}
                      className="relative border-r border-slate-200 last:border-r-0"
                    >
                      {/* Células de fundo de cada intervalo de hora */}
                      <div className="divide-y divide-slate-100">
                        {timeSlots.map((time) => {
                          const isOver =
                            dragOverSlot?.time === time && dragOverSlot?.colKey === colab.id;
                          const isPastDay = currentDateStr < todayStr;
                          return (
                            <div
                              key={time}
                              style={{ height: `${ROW_HEIGHT}px` }}
                              onClick={() => handleSlotClick(time, colab.id, currentDateStr)}
                              className={`transition-colors ${
                                isPastDay
                                  ? 'bg-slate-50/40 cursor-not-allowed'
                                  : isOver
                                  ? 'bg-purple-100/90 ring-2 ring-inset ring-purple-500 cursor-pointer'
                                  : 'hover:bg-purple-50/30 cursor-pointer'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Janelas de marcação dimensionadas pelo horário de início e fim */}
                      {positionedApts.map(
                        ({ apt: aptAtSlot, topPx, heightPx, colIndex, totalCols }) => {
                          const widthPct = 100 / totalCols;
                          const leftPct = colIndex * widthPct;
                          const isLocked = aptAtSlot.status === 'CONCLUIDA' || aptAtSlot.date < todayStr;
                          return (
                            <div
                              key={aptAtSlot.id}
                              draggable={!isLocked}
                              onDragStart={(e) => {
                                if (isLocked) {
                                  e.preventDefault();
                                  return;
                                }
                                e.stopPropagation();
                                e.dataTransfer.setData('text/plain', aptAtSlot.id);
                                setDraggedAptId(aptAtSlot.id);
                              }}
                              onDragEnd={() => {
                                setDraggedAptId(null);
                                setDragOverSlot(null);
                              }}
                              onClick={(e) => handleAppointmentClick(aptAtSlot, e)}
                              title={
                                aptAtSlot.date < todayStr
                                  ? `${aptAtSlot.clientName} (${aptAtSlot.startTime} - ${aptAtSlot.endTime}) — Reserva anterior ao dia atual (apenas consulta)`
                                  : `${aptAtSlot.clientName} (${aptAtSlot.startTime} - ${aptAtSlot.endTime}) — Clique para editar horários ou arraste para mover`
                              }
                              className={`absolute z-10 p-2 rounded-xl text-left shadow-xs border transition-all overflow-hidden flex flex-col justify-between ${
                                isLocked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                              } ${
                                draggedAptId === aptAtSlot.id
                                  ? 'opacity-40 scale-95 border-purple-400'
                                  : ''
                              } ${
                                aptAtSlot.status === 'CONCLUIDA'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                  : 'bg-white border-purple-200 hover:border-purple-400 text-slate-900 hover:z-20 hover:shadow-md'
                              }`}
                              style={{
                                top: `${topPx + 2}px`,
                                height: `${Math.max(heightPx - 4, 34)}px`,
                                left: `calc(${leftPct}% + 3px)`,
                                width: `calc(${widthPct}% - 6px)`,
                                borderLeftWidth: '4px',
                                borderLeftColor: colab.color,
                              }}
                            >
                              <div className="min-h-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    {!isLocked && (
                                      <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-xs font-bold truncate">
                                      {aptAtSlot.clientName}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                      aptAtSlot.status === 'CONCLUIDA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {aptAtSlot.startTime} - {aptAtSlot.endTime}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5 pl-4">
                                  {aptAtSlot.serviceNames.join(', ')}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] font-bold text-slate-600 pl-4 flex items-center justify-between">
                                  <span>{aptAtSlot.totalPrice.toFixed(2)}€</span>
                                  {aptAtSlot.status === 'CONCLUIDA' ? (
                                    <span className="text-emerald-700 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3" /> Concluído
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[9px] font-normal">
                                      {aptAtSlot.totalDurationMinutes}m
                                    </span>
                                  )}
                                </div>

                                {!isLocked && heightPx >= 85 && (
                                  <div
                                    className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-100 text-[10px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-slate-400 text-[9px] flex items-center gap-0.5">
                                      <Move className="w-2.5 h-2.5" /> Ajustar:
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => nudgeAppointment(aptAtSlot.id, -10)}
                                        title="Recuar 10 minutos"
                                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 rounded font-semibold transition-colors cursor-pointer"
                                      >
                                        -10m
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => nudgeAppointment(aptAtSlot.id, 10)}
                                        title="Avançar 10 minutos"
                                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 rounded font-semibold transition-colors cursor-pointer"
                                      >
                                        +10m
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA 3: LISTA CRONOLÓGICA DO DIA */
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          {dayAppointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Sem marcações para este dia.</p>
              <p className="text-xs text-slate-400 mt-0.5">Clique em "Nova Reserva" para agendar um cliente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayAppointments
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((apt) => {
                  const prof = users.find((u) => u.id === apt.userId);
                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setIsModalOpen(true);
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 transition-all flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[70px] bg-slate-100 p-2 rounded-lg">
                          <span className="text-xs font-bold text-slate-800">{apt.startTime}</span>
                          <span className="text-[10px] block text-slate-400">{apt.endTime}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{apt.clientName}</span>
                            <span className="text-xs text-slate-400">({apt.clientPhone})</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                            <span className="font-medium">{apt.serviceNames.join(', ')}</span>
                            <span>•</span>
                            <span className="text-purple-700 font-semibold flex items-center gap-1">
                              <User className="w-3 h-3" /> {prof?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {apt.status !== 'CONCLUIDA' && apt.date >= todayStr && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => nudgeAppointment(apt.id, -10)}
                              title="Recuar 10 minutos"
                              className="px-2 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              -10m
                            </button>
                            <button
                              type="button"
                              onClick={() => nudgeAppointment(apt.id, 10)}
                              title="Avançar 10 minutos"
                              className="px-2 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              +10m
                            </button>
                          </div>
                        )}

                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900">{apt.totalPrice.toFixed(2)}€</span>
                          <div className="mt-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                apt.status === 'CONCLUIDA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Reserva (Novo ou Edição com alteração de início e fim) */}
      {isModalOpen && (
        <AppointmentModal
          initialAppointment={selectedAppointment}
          initialDate={slotToBook?.dateStr || currentDateStr}
          initialTime={slotToBook?.time}
          initialUserId={slotToBook?.userId}
          initialClient={initialClientToBook}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAppointment(null);
            setSlotToBook(null);
            if (onClearInitialClient) onClearInitialClient();
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedAppointment(null);
            setSlotToBook(null);
            if (onClearInitialClient) onClearInitialClient();
          }}
        />
      )}
    </div>
  );
};
