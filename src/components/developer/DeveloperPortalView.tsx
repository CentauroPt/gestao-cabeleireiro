import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { SalonStatus } from '../../types';
import type { SalonSummary } from '../../services/api';
import {
  Code2,
  Store,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  XCircle,
  Trash2,
  Eye,
  LogOut,
  Search,
  Euro,
  Mail,
  MapPin,
  PlusCircle,
  RefreshCw,
  Key,
  Calendar,
} from 'lucide-react';

export const DeveloperPortalView: React.FC = () => {
  const {
    allSalonsSummary,
    refreshAllSalonsSummary,
    updateSalonStatus,
    deleteSalon,
    impersonateSalon,
    logoutDeveloper,
    registerNewSalon,
    changeDeveloperPassword,
    changeSalonPassword,
    resetDemoData,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SalonStatus>('ALL');

  // Modal para suspender com motivo
  const [suspendingSalon, setSuspendingSalon] = useState<SalonSummary | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('Mensalidade ou termos pendentes de regularização');

  // Modal para registar novo salão pelo programador
  const [isNewSalonModalOpen, setIsNewSalonModalOpen] = useState(false);
  const [newSalonName, setNewSalonName] = useState('');
  const [newSalonPhone, setNewSalonPhone] = useState('');
  const [newSalonAddress, setNewSalonAddress] = useState('');
  const [newSalonNif, setNewSalonNif] = useState('');
  const [newSalonAdminName, setNewSalonAdminName] = useState('');
  const [newSalonAdminEmail, setNewSalonAdminEmail] = useState('');

  // Modal para alterar palavra-passe do programador (Master)
  const [isDevPasswordModalOpen, setIsDevPasswordModalOpen] = useState(false);
  const [newDevPassword, setNewDevPassword] = useState('');
  const [confirmDevPassword, setConfirmDevPassword] = useState('');
  const [devPasswordError, setDevPasswordError] = useState('');

  // Modal para alterar palavra-passe do salão
  const [editingSalonPassword, setEditingSalonPassword] = useState<SalonSummary | null>(null);
  const [newSalonPassword, setNewSalonPassword] = useState('');
  const [salonPasswordError, setSalonPasswordError] = useState('');
  const [isSavingSalonPassword, setIsSavingSalonPassword] = useState(false);

  useEffect(() => {
    refreshAllSalonsSummary();
  }, []);

  // Estatísticas Globais
  const totalSalons = allSalonsSummary.length;
  const activeSalonsCount = allSalonsSummary.filter((s) => s.salon.status === 'ATIVO').length;
  const suspendedSalonsCount = allSalonsSummary.filter((s) => s.salon.status === 'SUSPENSO').length;
  const canceledSalonsCount = allSalonsSummary.filter((s) => s.salon.status === 'CANCELADO').length;

  const totalGlobalRevenue = useMemo(() => {
    return allSalonsSummary.reduce((acc, s) => acc + s.totalRevenue, 0);
  }, [allSalonsSummary]);

  const totalGlobalStaff = useMemo(() => {
    return allSalonsSummary.reduce((acc, s) => acc + s.staffCount, 0);
  }, [allSalonsSummary]);

  const totalGlobalClients = useMemo(() => {
    return allSalonsSummary.reduce((acc, s) => acc + s.clientsCount, 0);
  }, [allSalonsSummary]);

  // Lista Filtrada
  const filteredSalons = useMemo(() => {
    return allSalonsSummary.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.salon.name.toLowerCase().includes(q) ||
        item.salon.address.toLowerCase().includes(q) ||
        (item.adminUser?.name || '').toLowerCase().includes(q) ||
        (item.adminUser?.email || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || item.salon.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allSalonsSummary, searchTerm, statusFilter]);

  // Confirmar Suspensão
  const handleConfirmSuspension = async () => {
    if (!suspendingSalon) return;
    await updateSalonStatus(suspendingSalon.salon.id, 'SUSPENSO', suspensionReason);
    setSuspendingSalon(null);
  };

  // Reativar
  const handleReactivate = async (salonId: string) => {
    await updateSalonStatus(salonId, 'ATIVO');
  };

  // Cancelar
  const handleCancel = async (salonId: string) => {
    if (confirm('Tem a certeza de que deseja CANCELAR este salão? Os colaboradores deixarão de conseguir entrar.')) {
      await updateSalonStatus(salonId, 'CANCELADO', 'Subscrição cancelada pelo programador');
    }
  };

  // Eliminar
  const handleDelete = async (salonId: string, salonName: string) => {
    if (confirm(`ATENÇÃO: Deseja ELIMINAR PERMANENTEMENTE o salão "${salonName}" e todos os seus dados? Esta ação não pode ser desfeita.`)) {
      await deleteSalon(salonId);
    }
  };

  // Criar Salão pelo Programador
  const handleCreateSalonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalonName || !newSalonPhone || !newSalonAdminName || !newSalonAdminEmail) return;

    await registerNewSalon(
      {
        name: newSalonName,
        phone: newSalonPhone,
        address: newSalonAddress || 'Morada indicada pelo programador',
        nif: newSalonNif,
        adminName: newSalonAdminName,
        adminEmail: newSalonAdminEmail,
      },
      { stayInCurrentMode: true }
    );

    setIsNewSalonModalOpen(false);
    setNewSalonName('');
    setNewSalonPhone('');
    setNewSalonAddress('');
    setNewSalonNif('');
    setNewSalonAdminName('');
    setNewSalonAdminEmail('');
  };

  // Alterar Palavra-passe Master do Programador
  const handleChangeDevPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setDevPasswordError('');
    if (!newDevPassword || newDevPassword.trim().length < 4) {
      setDevPasswordError('A palavra-passe deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newDevPassword !== confirmDevPassword) {
      setDevPasswordError('As palavras-passe não coincidem.');
      return;
    }
    const success = changeDeveloperPassword(newDevPassword);
    if (success) {
      setIsDevPasswordModalOpen(false);
      setNewDevPassword('');
      setConfirmDevPassword('');
    }
  };

  // Alterar Palavra-passe de Salão pelo Programador
  const handleChangeSalonPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalonPassword) return;
    setSalonPasswordError('');
    if (!newSalonPassword || newSalonPassword.trim().length < 4) {
      setSalonPasswordError('A palavra-passe deve ter pelo menos 4 caracteres.');
      return;
    }
    setIsSavingSalonPassword(true);
    const success = await changeSalonPassword(editingSalonPassword.salon.id, newSalonPassword);
    setIsSavingSalonPassword(false);
    if (success) {
      setEditingSalonPassword(null);
      setNewSalonPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Super Admin
                </span>
                <span className="text-xs text-slate-400">• Painel de Controlo Master</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Consola de Gestão de Salões
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Supervisão de todos os salões registados, estados de atividade, suspensão e cancelamento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => refreshAllSalonsSummary()}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar</span>
            </button>

            <button
              onClick={() => {
                setDevPasswordError('');
                setNewDevPassword('');
                setConfirmDevPassword('');
                setIsDevPasswordModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Alterar palavra-passe master do programador"
            >
              <Key className="w-4 h-4" />
              <span>Alterar Senha Master</span>
            </button>

            <button
              onClick={() => setIsNewSalonModalOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Novo Salão</span>
            </button>

            <button
              onClick={() => {
                if (
                  confirm(
                    'ATENÇÃO: Deseja repor os dados de demonstração de fábrica? Todos os novos salões registados serão eliminados permanentemente.'
                  )
                ) {
                  resetDemoData();
                  refreshAllSalonsSummary();
                }
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Repor dados de fábrica (Apenas para testes)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Repor Demonstração</span>
            </button>

            <button
              onClick={logoutDeveloper}
              className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Consola</span>
            </button>
          </div>
        </div>

        {/* Global KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Salões Registados
            </div>
            <div className="text-2xl font-black text-white">{totalSalons}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total na plataforma</div>
          </div>

          <div className="bg-slate-800/80 border border-emerald-500/30 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Salões Ativos
            </div>
            <div className="text-2xl font-black text-emerald-400">{activeSalonsCount}</div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">Operacionais</div>
          </div>

          <div className="bg-slate-800/80 border border-amber-500/30 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <PauseCircle className="w-3 h-3" /> Suspensos
            </div>
            <div className="text-2xl font-black text-amber-400">{suspendedSalonsCount}</div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">Bloqueados temp.</div>
          </div>

          <div className="bg-slate-800/80 border border-rose-500/30 p-4 rounded-2xl">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Cancelados
            </div>
            <div className="text-2xl font-black text-rose-400">{canceledSalonsCount}</div>
            <div className="text-[11px] text-rose-500/80 mt-0.5">Sem subscrição</div>
          </div>

          <div className="bg-slate-800/80 border border-purple-500/30 p-4 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Euro className="w-3 h-3" /> Faturação Global
            </div>
            <div className="text-2xl font-black text-white">{totalGlobalRevenue.toFixed(2)}€</div>
            <div className="text-[11px] text-purple-300 mt-0.5">{totalGlobalStaff} colaboradores • {totalGlobalClients} clientes</div>
          </div>
        </div>

        {/* Master Salons Management Table */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-400" />
                Gestão Master de Todos os Salões Registados
              </h2>
              <p className="text-xs text-slate-400">
                Pode suspender, reativar, cancelar ou inspecionar cada salão individualmente.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Barra de Pesquisa */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar salão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Filtro de Estado */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">Todos os Estados</option>
                <option value="ATIVO">Apenas Ativos</option>
                <option value="SUSPENSO">Apenas Suspensos</option>
                <option value="CANCELADO">Apenas Cancelados</option>
              </select>
            </div>
          </div>

          {/* Tabela dos Salões */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/40">
                  <th className="py-3 px-3">Salão & Identificação</th>
                  <th className="py-3 px-3">Data de Registo</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Administrador</th>
                  <th className="py-3 px-3 text-center">Colaboradores</th>
                  <th className="py-3 px-3 text-center">Clientes</th>
                  <th className="py-3 px-3 text-right">Faturação Total</th>
                  <th className="py-3 px-3 text-right">Ações do Programador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-xs text-slate-300">
                {filteredSalons.map((item) => {
                  const s = item.salon;
                  const isAtivo = s.status === 'ATIVO';
                  const isSuspenso = s.status === 'SUSPENSO';
                  const isCancelado = s.status === 'CANCELADO';
                  const formattedRegDate = s.createdAt
                    ? new Date(s.createdAt).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={s.id} className="hover:bg-slate-700/30 transition-colors">
                      {/* Salão */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm">{s.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{s.address}</span>
                          {s.nif && <span>• NIF: {s.nif}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          ID: <code className="bg-slate-900 px-1 rounded text-purple-300 font-mono">{s.id}</code>
                        </div>
                      </td>

                      {/* Data de Registo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-slate-200 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{formattedRegDate}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3">
                        {isAtivo && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        )}
                        {isSuspenso && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <PauseCircle className="w-3 h-3" /> Suspenso
                            </span>
                            {s.suspensionReason && (
                              <p className="text-[10px] text-amber-400/80 mt-1 max-w-[180px]">
                                {s.suspensionReason}
                              </p>
                            )}
                          </div>
                        )}
                        {isCancelado && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" /> Cancelado
                          </span>
                        )}
                      </td>

                      {/* Administrador */}
                      <td className="py-3 px-3">
                        {item.adminUser ? (
                          <div>
                            <div className="font-bold text-slate-200">{item.adminUser.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{item.adminUser.email}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Sem administrador</span>
                        )}
                      </td>

                      {/* Colaboradores */}
                      <td className="py-3 px-3 text-center font-bold text-slate-300">
                        {item.staffCount}
                      </td>

                      {/* Clientes */}
                      <td className="py-3 px-3 text-center font-bold text-slate-300">
                        {item.clientsCount}
                      </td>

                      {/* Faturação Total */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-extrabold text-white text-sm">
                          {item.totalRevenue.toFixed(2)}€
                        </span>
                        <div className="text-[10px] text-slate-400">{item.appointmentsCount} marcações</div>
                      </td>

                      {/* Ações do Programador */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Inspecionar / Entrar */}
                          <button
                            onClick={() => impersonateSalon(s.id)}
                            className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-purple-500/30"
                            title="Entrar no salão para inspecionar frontend"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspecionar</span>
                          </button>

                          {/* Suspender se estiver Ativo */}
                          {isAtivo && (
                            <button
                              onClick={() => setSuspendingSalon(item)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-amber-500/30"
                              title="Suspender este salão"
                            >
                              <PauseCircle className="w-3 h-3" />
                              <span>Suspender</span>
                            </button>
                          )}

                          {/* Reativar se estiver Suspenso ou Cancelado */}
                          {(isSuspenso || isCancelado) && (
                            <button
                              onClick={() => handleReactivate(s.id)}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-emerald-500/30"
                              title="Reativar salão para estado Ativo"
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>Reativar</span>
                            </button>
                          )}

                          {/* Alterar Palavra-passe do Salão */}
                          <button
                            onClick={() => {
                              setEditingSalonPassword(item);
                              setNewSalonPassword('');
                              setSalonPasswordError('');
                            }}
                            className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-indigo-500/30"
                            title="Alterar palavra-passe do administrador deste salão"
                          >
                            <Key className="w-3 h-3" />
                            <span>Alterar Senha</span>
                          </button>

                          {/* Cancelar se não estiver Cancelado */}
                          {!isCancelado && (
                            <button
                              onClick={() => handleCancel(s.id)}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-500/30"
                              title="Cancelar salão"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}

                          {/* Eliminar permanentemente */}
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar salão permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Suspensão com Motivo */}
      {suspendingSalon && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PauseCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">
              Suspender Salão "{suspendingSalon.salon.name}"
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              Ao suspender este salão, os seus colaboradores e administradores ficarão impedidos de aceder ao sistema.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Motivo da Suspensão
                </label>
                <textarea
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="Ex: Mensalidade em atraso, verificação de dados..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setSuspendingSalon(null)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSuspension}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirmar Suspensão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Salão pelo Programador */}
      {isNewSalonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-lg font-bold text-white mb-1">
              + Registar Novo Salão (Criado pelo Programador)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              O salão será criado com arquitetura isolada e ficará disponível para o cliente entrar.
            </p>

            <form onSubmit={handleCreateSalonSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome do Salão *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Espaço Beleza & Glamour"
                  value={newSalonName}
                  onChange={(e) => setNewSalonName(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+351 912 345 678"
                    value={newSalonPhone}
                    onChange={(e) => setNewSalonPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    NIF
                  </label>
                  <input
                    type="text"
                    placeholder="509 123 456"
                    value={newSalonNif}
                    onChange={(e) => setNewSalonNif(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Morada
                </label>
                <input
                  type="text"
                  placeholder="Rua, Cidade"
                  value={newSalonAddress}
                  onChange={(e) => setNewSalonAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nome do Administrador *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome"
                    value={newSalonAdminName}
                    onChange={(e) => setNewSalonAdminName(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      E-mail do Admin *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@salao.pt"
                      value={newSalonAdminEmail}
                      onChange={(e) => setNewSalonAdminEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewSalonModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Registar Salão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alterar Palavra-passe do Programador */}
      {isDevPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">
              Alterar Senha do Programador
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              Defina uma nova palavra-passe de acesso a esta Consola Master.
            </p>

            <form onSubmit={handleChangeDevPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nova Palavra-passe *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Mínimo 4 caracteres..."
                  value={newDevPassword}
                  onChange={(e) => setNewDevPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Confirmar Nova Palavra-passe *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repita a palavra-passe..."
                  value={confirmDevPassword}
                  onChange={(e) => setConfirmDevPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {devPasswordError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                  {devPasswordError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDevPasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Guardar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alterar Palavra-passe de Salão */}
      {editingSalonPassword && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100 animate-in fade-in duration-200">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">
              Alterar Palavra-passe do Salão
            </h3>
            <p className="text-sm text-indigo-300 font-semibold text-center mt-1">
              {editingSalonPassword.salon.name}
            </p>
            <p className="text-xs text-slate-400 text-center mt-0.5">
              Administrador: <strong className="text-slate-300">{editingSalonPassword.adminUser?.name || 'Administrador'}</strong> ({editingSalonPassword.adminUser?.email || 'N/A'})
            </p>

            <form onSubmit={handleChangeSalonPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nova Palavra-passe para o Salão *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Introduza a nova palavra-passe (mín. 4 caracteres)..."
                  value={newSalonPassword}
                  onChange={(e) => setNewSalonPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Esta será a nova credencial para o salão aceder. Pode indicar esta palavra-passe diretamente ao proprietário do salão.
                </span>
              </div>

              {salonPasswordError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                  {salonPasswordError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSalonPassword(null)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSalonPassword}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingSalonPassword ? 'A atualizar...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
