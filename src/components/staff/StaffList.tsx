import React, { useState } from 'react';
import type { User } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffFormModal } from './StaffFormModal';
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldOff,
  Mail,
  Phone,
  Edit2,
  Trash2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
} from 'lucide-react';

export const StaffList: React.FC = () => {
  const { users, currentUser, currentSalon, updateUser, deleteUser } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Estados para Modal Rápida de Promoção a Administrador
  const [userToPromote, setUserToPromote] = useState<User | null>(null);
  const [promotePassword, setPromotePassword] = useState('');
  const [showPromotePassword, setShowPromotePassword] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const adminCount = users.filter((u) => u.salonId === currentSalon?.id && u.role === 'ADMIN').length;
  const colabCount = users.filter((u) => u.salonId === currentSalon?.id && u.role === 'COLABORADOR').length;

  const handleOpenPromote = (user: User) => {
    setUserToPromote(user);
    setPromotePassword(user.password || '');
    setShowPromotePassword(false);
  };

  const handleConfirmPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToPromote) return;
    if (!promotePassword.trim()) {
      alert('Por favor introduza uma palavra-passe para o administrador.');
      return;
    }

    setIsPromoting(true);
    await updateUser(userToPromote.id, {
      role: 'ADMIN',
      password: promotePassword.trim(),
    });
    setIsPromoting(false);
    setUserToPromote(null);
  };

  const handleDemote = async (user: User) => {
    if (!isAdmin) {
      alert('Acesso negado: Apenas um Administrador pode alterar papéis da equipa.');
      return;
    }
    if (adminCount <= 1) {
      alert('O salão deve manter pelo menos um Administrador ativo. Não é possível retirar o cargo ao único Administrador.');
      return;
    }
    if (confirm(`Tem a certeza que deseja retirar os privilégios de Administrador a ${user.name}? O utilizador passará a ter a função de Colaborador.`)) {
      await updateUser(user.id, { role: 'COLABORADOR' });
    }
  };

  const handleDelete = async (user: User) => {
    if (!isAdmin) {
      alert('Acesso negado: Apenas o Administrador do salão pode remover colaboradores.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Não pode remover a sua própria conta de Administrador ativa.');
      return;
    }
    if (user.role === 'ADMIN' && adminCount <= 1) {
      alert('Não é possível remover o único Administrador do salão. O salão deve ter pelo menos um Administrador ativo.');
      return;
    }
    if (confirm(`Tem a certeza que deseja remover ${user.name} da equipa do salão?`)) {
      await deleteUser(user.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Equipa & Colaboradores do Salão
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão dos profissionais de {currentSalon?.name || 'Salão'}, permissões de administrador e cores da agenda.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => {
              setUserToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Colaborador
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-500 font-medium">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Apenas Administradores podem gerir a equipa
          </div>
        )}
      </div>

      {/* Painel Informativo de Gestão Multi-Administrador */}
      {isAdmin && (
        <div className="bg-purple-50/70 border border-purple-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                Gestão de Administradores do Salão
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Pode promover outros colaboradores da sua equipa a <strong>Administradores</strong>. Os administradores têm permissões completas de gestão de profissionais, visualização de estatísticas financeiras e personalização do salão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1 bg-purple-100 text-purple-800 rounded-xl border border-purple-200">
              {adminCount} {adminCount === 1 ? 'Administrador' : 'Administradores'}
            </span>
            <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-800 rounded-xl border border-blue-200">
              {colabCount} {colabCount === 1 ? 'Colaborador' : 'Colaboradores'}
            </span>
          </div>
        </div>
      )}

      {/* Alerta de Perfil se for Colaborador */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Encontra-se com sessão de <strong>Colaborador</strong>. Pode consultar a equipa para criar marcações em nome
            de qualquer colega, mas a edição de perfis e atribuição de administradores está reservada ao Administrador.
          </span>
        </div>
      )}

      {/* Cartões de Colaboradores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((colab) => {
          const isUserAdmin = colab.role === 'ADMIN';
          const isCurrentLoggedInUser = colab.id === currentUser?.id;

          return (
            <div
              key={colab.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all relative overflow-hidden flex flex-col justify-between"
            >
              {/* Faixa com a cor da agenda */}
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: colab.color }} />

              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs"
                      style={{ backgroundColor: colab.color }}
                    >
                      {colab.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        {colab.name}
                        {isCurrentLoggedInUser && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            (Você)
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isUserAdmin
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isUserAdmin ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-purple-700" />
                              ADMINISTRADOR
                            </>
                          ) : (
                            'COLABORADOR'
                          )}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setUserToEdit(colab);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isCurrentLoggedInUser && (
                        <button
                          onClick={() => handleDelete(colab)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Contactos */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{colab.email}</span>
                  </div>
                  {colab.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{colab.phone}</span>
                    </div>
                  )}
                </div>

                {/* Especialidades */}
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Especialidades:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {colab.specialties.length > 0 ? (
                      colab.specialties.map((spec, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {spec}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Geral</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação de Administrador */}
              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isUserAdmin ? (
                    isCurrentLoggedInUser ? (
                      <div className="w-full py-2 px-3 bg-purple-50/60 border border-purple-200/60 text-purple-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 select-none">
                        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>A sua conta ativa de Administrador</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDemote(colab)}
                        className="w-full py-2 px-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-[0.99]"
                        title="Retirar estatuto de administrador"
                      >
                        <ShieldOff className="w-4 h-4 text-slate-400 group-hover:text-rose-600 shrink-0" />
                        <span>Alterar para Colaborador</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPromote(colab)}
                      className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 hover:text-purple-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
                      title="Promover a Administrador do salão"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Promover a Administrador</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Criação / Edição de Colaborador */}
      {isModalOpen && (
        <StaffFormModal
          initialUser={userToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setUserToEdit(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setUserToEdit(null);
          }}
        />
      )}

      {/* Modal Rápida de Promoção a Administrador */}
      {userToPromote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
            {/* Cabeçalho */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Promover a Administrador
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Atribuir privilégios totais de gestão do salão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToPromote(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPromote} className="p-6 space-y-4">
              {/* Utilizador Selecionado */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                  style={{ backgroundColor: userToPromote.color }}
                >
                  {userToPromote.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate">{userToPromote.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userToPromote.email}</p>
                </div>
              </div>

              {/* Informação sobre os novos privilégios */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-[11px] text-purple-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-purple-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  O que este utilizador poderá fazer:
                </p>
                <ul className="list-disc list-inside text-purple-700 space-y-0.5 pl-1">
                  <li>Gerir e promover outros colaboradores</li>
                  <li>Aceder à área de estatística e relatórios de faturação</li>
                  <li>Personalizar o salão (cores, nome, logótipo)</li>
                  <li>Eliminar reservas e fichas de clientes</li>
                </ul>
              </div>

              {/* Campo de Palavra-passe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  Palavra-passe de Administrador *
                </label>
                <div className="relative">
                  <input
                    type={showPromotePassword ? 'text' : 'password'}
                    required
                    value={promotePassword}
                    onChange={(e) => setPromotePassword(e.target.value)}
                    placeholder="Introduza a palavra-passe..."
                    className="w-full text-xs pl-3.5 pr-10 py-2.5 border border-purple-200 bg-purple-50/30 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPromotePassword(!showPromotePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    tabIndex={-1}
                  >
                    {showPromotePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Utilizada para desbloquear a estatística e gerir o salão.
                </span>
              </div>

              {/* Botões de Submissão */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUserToPromote(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPromoting}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isPromoting ? 'A promover...' : 'Confirmar e Tornar Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
