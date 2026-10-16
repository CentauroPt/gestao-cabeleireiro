import React, { useState, useMemo, useEffect } from 'react';
import type { Appointment, Client, BookingChannel } from '../../types';
import { useApp } from '../../context/AppContext';
import { ClientFormModal } from '../clients/ClientFormModal';
import {
  checkAppointmentConflict,
  calculateEndTime,
  calculateDurationMinutes,
  isPastAppointment as checkIsPastAppointment,
} from '../../services/conflictValidator';
import {
  X,
  Calendar,
  Clock,
  User,
  UserPlus,
  Search,
  Scissors,
  DollarSign,
  CheckCircle2,
  Trash2,
  UserCheck,
  FileText,
  Plus,
  PlusCircle,
  Save,
  PhoneCall,
  MessageCircle,
  Layers,
} from 'lucide-react';

interface Props {
  initialAppointment?: Appointment | null;
  initialDate?: string;
  initialTime?: string;
  initialUserId?: string;
  initialClient?: Client | null;
  initialBookingChannel?: BookingChannel;
  onClose: () => void;
  onSuccess: () => void;
}

export const AppointmentModal: React.FC<Props> = ({
  initialAppointment,
  initialDate,
  initialTime,
  initialUserId,
  initialClient,
  initialBookingChannel,
  onClose,
  onSuccess,
}) => {
  const {
    clients,
    users,
    staffMembers,
    services,
    appointments,
    addAppointment,
    updateAppointmentTimes,
    deleteAppointment,
    completeAppointment,
    addService,
  } = useApp();

  const isEditing = !!initialAppointment;

  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const isPastAppointment = useMemo(() => {
    return initialAppointment ? checkIsPastAppointment(initialAppointment) : false;
  }, [initialAppointment]);

  // Estados do formulário (quando aberto a partir da ficha de um cliente, o nome do cliente aparece automaticamente)
  const [clientId, setClientId] = useState<string>(
    initialAppointment?.clientId || initialClient?.id || ''
  );
  const [userId, setUserId] = useState<string>(
    initialAppointment?.userId || initialUserId || ''
  );
  const [date, setDate] = useState<string>(
    initialAppointment?.date || (initialDate && initialDate >= todayStr ? initialDate : todayStr)
  );
  const [startTime, setStartTime] = useState<string>(initialAppointment?.startTime || initialTime || '');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initialAppointment?.serviceIds ? initialAppointment.serviceIds : []
  );
  const [notes, setNotes] = useState<string>(initialAppointment?.notes || '');
  const [bookingChannel, setBookingChannel] = useState<BookingChannel>(
    initialAppointment?.bookingChannel || initialBookingChannel || 'presencial'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialBookingChannel && !initialAppointment) {
      setBookingChannel(initialBookingChannel);
    }
  }, [initialBookingChannel, initialAppointment]);

  useEffect(() => {
    if (initialClient && !initialAppointment) {
      setClientId(initialClient.id);
    }
  }, [initialClient, initialAppointment]);

  useEffect(() => {
    if (!isEditing && userId && staffMembers.length > 0) {
      const isProf = staffMembers.some((s) => s.id === userId);
      if (!isProf) {
        setUserId(staffMembers[0].id);
      }
    }
  }, [staffMembers, isEditing, userId]);

  // Estados para pesquisa de cliente e abertura da janela de registo de novo cliente (ClientFormModal)
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [showClientSearchResults, setShowClientSearchResults] = useState<boolean>(false);
  const [isAddingNewClient, setIsAddingNewClient] = useState<boolean>(false);
  const [justCreatedClientName, setJustCreatedClientName] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [clients, clientSearchQuery]);

  useEffect(() => {
    if (justCreatedClientName) {
      const found = [...clients].reverse().find(
        (c) => c.name.toLowerCase() === justCreatedClientName.toLowerCase()
      );
      if (found) {
        setClientId(found.id);
        setJustCreatedClientName(null);
      }
    }
  }, [clients, justCreatedClientName]);

  // Estados para criação rápida de novo serviço no catálogo do salão (sem valores iniciais)
  const [isAddingNewService, setIsAddingNewService] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [isCreatingService, setIsCreatingService] = useState<boolean>(false);

  // Cálculos de serviços selecionados
  const selectedServices = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const defaultDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [selectedServices]);

  // Hora final editável pelo utilizador (vazia até escolher serviço/horário numa nova marcação)
  const [endTime, setEndTime] = useState<string>(() => {
    if (initialAppointment) return initialAppointment.endTime;
    return '';
  });

  // Atualiza endTime quando a hora de início ou o serviço selecionado mudam
  useEffect(() => {
    if (!initialAppointment && startTime && defaultDuration > 0) {
      setEndTime(calculateEndTime(startTime, defaultDuration));
    }
  }, [startTime, defaultDuration, initialAppointment]);

  const effectiveDurationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return calculateDurationMinutes(startTime, endTime);
  }, [startTime, endTime]);

  const defaultTotalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  // Preço da intervenção começa vazio numa nova reserva até o utilizador selecionar um serviço ou digitar
  const [interventionPrice, setInterventionPrice] = useState<string>(() => {
    if (initialAppointment) {
      return String(initialAppointment.totalPrice);
    }
    return '';
  });
  const [updateCatalogSuggestion, setUpdateCatalogSuggestion] = useState<boolean>(false);

  // Verificação informativa de horário (permite tarefas sobrepostas para o mesmo colaborador)
  const conflictCheck = useMemo(() => {
    if (!userId || !date || !startTime || !endTime) {
      return { hasConflict: false, hasOverlap: false };
    }

    return checkAppointmentConflict({
      appointments,
      date,
      userId,
      startTime,
      endTime,
      excludeAppointmentId: initialAppointment?.id,
    });
  }, [appointments, date, userId, startTime, endTime, initialAppointment]);

  const toggleService = (serviceId: string) => {
    if (isPastAppointment) return;
    const chosenService = services.find((s) => s.id === serviceId);
    if (!chosenService) return;

    // Fecha o painel de criação de novo serviço se estiver aberto
    setIsAddingNewService(false);

    // Se clicar num serviço já selecionado, desmarca e limpa o valor; caso contrário seleciona o serviço
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds([]);
      setInterventionPrice('');
      if (!initialAppointment) {
        setEndTime('');
      }
      return;
    }

    // Seleciona diretamente o serviço clicado
    setSelectedServiceIds([serviceId]);

    // Preenche imediatamente o campo Preço desta intervenção com o preço do serviço escolhido
    setInterventionPrice(String(chosenService.price));

    // Atualiza também a hora de fim com base na duração do serviço escolhido
    const dur = chosenService.durationMinutes > 0 ? chosenService.durationMinutes : 30;
    const baseStart = startTime || '09:00';
    if (!startTime) {
      setStartTime(baseStart);
    }
    setEndTime(calculateEndTime(baseStart, dur));
  };

  // Criação de novo serviço instantâneo que fica no catálogo do salão
  const handleCreateNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const createdPrice = Number(newServicePrice) || 0;
    const createdDuration = Number(newServiceDuration) || 30;

    setIsCreatingService(true);
    const success = await addService({
      name: newServiceName.trim(),
      category: 'Cabelo',
      durationMinutes: createdDuration,
      price: createdPrice,
      description: 'Serviço personalizado registado.',
    });
    setIsCreatingService(false);

    if (success) {
      setIsAddingNewService(false);
      setNewServiceName('');
      setNewServiceDuration('');
      setNewServicePrice('');
      setInterventionPrice(String(createdPrice));
      if (createdDuration > 0 && startTime) {
        setEndTime(calculateEndTime(startTime, createdDuration));
      }
    }
  };

  // Submissão de nova reserva (tudo selecionado pelo utilizador; permite sobreposição de tarefas)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (date < todayStr) {
      alert('Não são permitidas marcações para dias anteriores ao dia atual.');
      return;
    }
    if (!clientId) {
      alert('Por favor, selecione o cliente.');
      return;
    }
    if (!userId) {
      alert('Por favor, selecione o profissional.');
      return;
    }
    if (!startTime) {
      alert('Por favor, selecione a hora de início.');
      return;
    }
    if (selectedServiceIds.length === 0) {
      alert('Por favor, selecione um serviço.');
      return;
    }

    const finalEndTime =
      effectiveDurationMinutes > 0 ? endTime : calculateEndTime(startTime, defaultDuration || 30);
    const numericPrice = interventionPrice !== '' ? Number(interventionPrice) : defaultTotalPrice;

    setIsSubmitting(true);
    const success = await addAppointment({
      clientId,
      userId,
      serviceIds: selectedServiceIds,
      date,
      startTime,
      endTime: finalEndTime,
      customPrice: numericPrice,
      updateBaseServicePrice: updateCatalogSuggestion,
      notes: notes.trim() || undefined,
      bookingChannel,
    });
    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  // Atualização de horário, serviço e preço de reserva existente (permite sobreposição)
  const handleUpdateExisting = async () => {
    if (!initialAppointment || isPastAppointment) return;
    if (!userId) {
      alert('Por favor, selecione o profissional.');
      return;
    }
    const finalEndTime =
      effectiveDurationMinutes > 0 ? endTime : calculateEndTime(startTime, defaultDuration || 30);
    const targetServiceIds =
      selectedServiceIds.length > 0 ? selectedServiceIds : initialAppointment.serviceIds;
    const numericPrice = interventionPrice !== '' ? Number(interventionPrice) : defaultTotalPrice;

    setIsSubmitting(true);
    const success = await updateAppointmentTimes({
      appointmentId: initialAppointment.id,
      startTime,
      endTime: finalEndTime,
      userId,
      customPrice: numericPrice,
      updateBaseServicePrice: updateCatalogSuggestion,
      notes: notes.trim() || undefined,
      serviceIds: targetServiceIds,
      bookingChannel,
    });
    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!initialAppointment || isPastAppointment) return;
    if (confirm('Tem a certeza que deseja eliminar esta reserva da agenda?')) {
      const success = await deleteAppointment(initialAppointment.id);
      if (success) {
        onSuccess();
        onClose();
      }
    }
  };

  const handleComplete = async () => {
    if (!initialAppointment) return;
    if (confirm('Marcar serviço como concluído? Isto irá somar o valor à ficha do cliente e atualizar a data da última visita.')) {
      const success = await completeAppointment(initialAppointment.id);
      if (success) {
        onSuccess();
        onClose();
      }
    }
  };

  const selectedProfessional = users.find((u) => u.id === userId);
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              {isPastAppointment
                ? 'Consulta de Reserva (Já Passada)'
                : isEditing
                ? 'Editar Reserva & Horários'
                : 'Nova Marcação'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isPastAppointment
                ? 'As reservas passadas não podem ser eliminadas.'
                : 'Ajuste livre da hora de início e fim (permite tarefas sobrepostas por colaborador).'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {isPastAppointment && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              Esta reserva é passada (horário anterior ao momento atual). As reservas passadas não podem ser eliminadas por nenhum utilizador.
            </div>
          )}

          {/* Tipo de Reserva (Canal de Entrada) */}
          <div className="bg-slate-50 border border-slate-200/90 p-3 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Tipo de Reserva *
              </label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Canal de Entrada
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBookingChannel('presencial')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  bookingChannel === 'presencial'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Presencial</span>
              </button>

              <button
                type="button"
                onClick={() => setBookingChannel('telefone')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  bookingChannel === 'telefone'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                <span>Chamada telefónica</span>
              </button>

              <button
                type="button"
                onClick={() => setBookingChannel('whatsapp')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  bookingChannel === 'whatsapp'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Seletor de Cliente, Pesquisa & Ícone para Registar Novo Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-600" />
                Cliente *
              </label>
              {selectedClient?.technicalNotes && (
                <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                  ⚠️ Tem ficha técnica registada
                </span>
              )}
            </div>

            {!isEditing && (
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setShowClientSearchResults(true);
                  }}
                  onFocus={() => setShowClientSearchResults(true)}
                  placeholder="Pesquisar cliente por nome ou telemóvel..."
                  className="w-full text-xs pl-9 pr-8 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                />
                {clientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchQuery('');
                      setShowClientSearchResults(false);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {showClientSearchResults && clientSearchQuery.trim() !== '' && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 flex items-center justify-between">
                        <span>Nenhum cliente encontrado para &ldquo;{clientSearchQuery}&rdquo;.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowClientSearchResults(false);
                            setIsAddingNewClient(true);
                          }}
                          className="text-purple-600 hover:text-purple-700 font-bold cursor-pointer"
                        >
                          + Registar cliente
                        </button>
                      </div>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClientId(c.id);
                            setClientSearchQuery('');
                            setShowClientSearchResults(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center justify-between transition-colors cursor-pointer ${
                            clientId === c.id ? 'bg-purple-50/80 font-bold text-purple-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {c.photoUrl ? (
                              <img src={c.photoUrl} alt={c.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate">
                              <strong className="text-slate-900">{c.name}</strong> — {c.phone}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-purple-600 shrink-0 ml-2">Selecionar</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                required
                disabled={isEditing}
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setShowClientSearchResults(false);
                }}
                className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white cursor-pointer disabled:bg-slate-100"
              >
                <option value="">Selecione o cliente...</option>
                {selectedClient && !filteredClients.some((c) => c.id === selectedClient.id) && (
                  <option value={selectedClient.id}>
                    {selectedClient.name} — {selectedClient.phone}
                  </option>
                )}
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewClient(true)}
                  className="p-2.5 rounded-xl border bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Registar novo cliente"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Ficha Visual Resumida do Cliente com Foto Quadrada e Esquinas Arredondadas */}
            {selectedClient && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedClient.photoUrl ? (
                    <img
                      src={selectedClient.photoUrl}
                      alt={selectedClient.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedClient.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedClient.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{selectedClient.phone}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full shrink-0">
                  {selectedClient.visitHistory.length} visitas
                </span>
              </div>
            )}

            {isAddingNewClient && !isEditing && (
              <ClientFormModal
                onClose={() => setIsAddingNewClient(false)}
                onSuccess={(createdName) => {
                  if (createdName) {
                    setJustCreatedClientName(createdName);
                  }
                  setIsAddingNewClient(false);
                }}
              />
            )}
          </div>

          {/* Seletor de Colaborador */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Profissional Designado *
              </span>
              <span className="text-[11px] text-slate-400">Permite tarefas sobrepostas</span>
            </label>
            <select
              required
              disabled={isPastAppointment}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione o profissional...</option>
              {staffMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role}) — {u.specialties.join(', ') || 'Geral'}
                </option>
              ))}
            </select>
          </div>

          {/* DURAÇÃO & HORÁRIOS: INÍCIO E FIM TOTALMENTE EDITÁVEIS */}
          <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                Definição de Horário do Serviço
              </span>
              {effectiveDurationMinutes > 0 && (
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  Duração: {effectiveDurationMinutes} minutos
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  required
                  disabled={isEditing}
                  min={!isEditing ? todayStr : undefined}
                  value={date}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (!isEditing && selected && selected < todayStr) {
                      alert('Não são permitidas marcações para dias anteriores ao dia atual.');
                      setDate(todayStr);
                      return;
                    }
                    setDate(selected);
                  }}
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white disabled:bg-slate-100"
                />
              </div>

              {/* Hora de Início Editável */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Início *</label>
                <input
                  type="time"
                  required
                  disabled={isPastAppointment}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  step="300" // 5 min precision
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-bold text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Hora de Fim Editável */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Fim *</label>
                <input
                  type="time"
                  required
                  disabled={isPastAppointment}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  step="300" // 5 min precision
                  className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-bold text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* INFORMAÇÃO DE HORÁRIO (PERMITE TAREFAS SOBREPOSTAS) */}
          {!isPastAppointment && userId && startTime && endTime && (
            conflictCheck.hasOverlap && conflictCheck.conflictingAppointment ? (
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Tarefa em simultâneo permitida:</strong> {selectedProfessional?.name || 'O colaborador'} tem outra tarefa neste horário (
                  <strong>{conflictCheck.conflictingAppointment.clientName}</strong>, {conflictCheck.conflictingAppointment.startTime} às{' '}
                  {conflictCheck.conflictingAppointment.endTime}). Pode confirmar a reserva.
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Horário disponível para {selectedProfessional?.name || 'o profissional'} ({startTime} às {endTime}). Pode confirmar a reserva.
                </span>
              </div>
            )
          )}

          {/* Seleção de Serviços & Criação Instantânea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-purple-600" />
                Serviços do Salão *
              </label>
              <div className="flex items-center gap-2">
                {selectedServices.length > 0 && (
                  <span className="text-xs font-bold text-slate-800">Total Base: {defaultTotalPrice.toFixed(2)}€</span>
                )}
                {!isPastAppointment && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewService(!isAddingNewService)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + Novo Serviço
                  </button>
                )}
              </div>
            </div>

            {/* Painel para digitar novo serviço que constará da lista */}
            {isAddingNewService && !isPastAppointment && (
              <div className="mb-3 p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-in fade-in">
                <p className="text-[11px] font-bold text-purple-900">
                  Digitar Novo Serviço para o Salão (Ficará logo na lista de disponíveis):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do serviço (ex: Botox Capilar)"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg outline-none sm:col-span-1"
                  />
                  <input
                    type="number"
                    placeholder="Minutos (ex: 45)"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Preço € (ex: 30)"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewService(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewService}
                    disabled={isCreatingService}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isCreatingService ? 'A gravar...' : 'Adicionar à Lista'}
                  </button>
                </div>
              </div>
            )}

            {/* Grelha de Serviços Existentes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
              {services.map((serv) => {
                const isSelected = selectedServiceIds.includes(serv.id);
                return (
                  <button
                    key={serv.id}
                    type="button"
                    disabled={isPastAppointment}
                    onClick={() => toggleService(serv.id)}
                    className={`p-2 rounded-lg text-left text-xs flex items-center justify-between transition-all border ${
                      isPastAppointment ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-purple-100/70 border-purple-300 text-purple-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="leading-tight">{serv.name}</p>
                      <p className="text-[10px] text-slate-500 font-normal">{serv.durationMinutes} min</p>
                    </div>
                    <span className="text-xs font-bold shrink-0 ml-2">{serv.price.toFixed(2)}€</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PREÇO DA INTERVENÇÃO & SUGESTÃO DE PREÇO */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Preço Desta Intervenção (€) *
              </label>
              {selectedServices.length > 0 && !isPastAppointment && (
                <button
                  type="button"
                  onClick={() => setInterventionPrice(String(defaultTotalPrice))}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-100/80 hover:bg-emerald-200/90 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  title="Clique para repor preço base do serviço"
                >
                  Preço de catálogo: {defaultTotalPrice.toFixed(2)}€
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  disabled={isPastAppointment}
                  placeholder="Selecione um serviço ou digite o valor"
                  value={interventionPrice}
                  onChange={(e) => setInterventionPrice(e.target.value)}
                  className="w-full text-sm font-bold text-slate-900 pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">€</span>
              </div>
            </div>

            {!isPastAppointment && (
              <label className="flex items-start gap-2 pt-1 cursor-pointer text-xs text-emerald-950 font-medium select-none">
                <input
                  type="checkbox"
                  checked={updateCatalogSuggestion}
                  onChange={(e) => setUpdateCatalogSuggestion(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="leading-tight">
                  Definir este valor{interventionPrice !== '' ? ` (${Number(interventionPrice).toFixed(2)}€)` : ''} como <strong>sugestão de preço no catálogo</strong> para futuros procedimentos iguais
                </span>
              </label>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Observações da Marcação
            </label>
            <input
              type="text"
              disabled={isPastAppointment}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Notas especiais, lavagem com água morna..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Rodapé com Permissões RBAC e Confirmar Reserva */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                {!isPastAppointment && (
                  <button
                    type="button"
                    onClick={handleUpdateExisting}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'A gravar...' : 'Confirmar Reserva'}
                  </button>
                )}

                {/* Concluir Serviço (Permitido mesmo se for reserva passada, desde que ainda não esteja concluída) */}
                {initialAppointment?.status !== 'CONCLUIDA' && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir
                  </button>
                )}

                {/* Eliminar Reserva: Permitido para todos exceto em reservas passadas */}
                {!isPastAppointment ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                    title="Eliminar esta reserva da agenda"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold border border-slate-200 cursor-not-allowed"
                    title="As reservas passadas não podem ser eliminadas."
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    Reserva passada (Bloqueada para eliminação)
                  </span>
                )}
              </>
            )}

            {!isEditing && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'A gravar...' : 'Confirmar Reserva'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
