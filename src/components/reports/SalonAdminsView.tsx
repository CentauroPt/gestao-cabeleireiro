import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { User } from '../../types';
import {
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Mail,
  Phone,
  Trash2,
  X,
} from 'lucide-react';

export const SalonAdminsView: React.FC = () => {
  const { currentSalon, currentUser, users, updateUser, deleteUser } = useApp();

  const [userToPromote, setUserToPromote] = useState<User | null>(null);
  const [promotePassword, setPromotePassword] = useState('');
  const [showPromotePassword, setShowPromotePassword] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const salonAdmins = users.filter(
    (u) => u.salonId === currentSalon?.id && u.role === 'ADMIN'
  );
  const salonColabs = users.filter(
    (u) => u.salonId === currentSalon?.id && u.role === 'COLABORADOR'
  );

  const handleOpenPromote = (user: User) => {
    setUserToPromote(user);
    setPromotePassword('');
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
    if (salonAdmins.length <= 1) {
      alert(
        'O salão deve manter pelo menos um Administrador ativo. Não é possível retirar o cargo ao único Administrador.'
      );
      return;
    }
    if (user.id === currentUser?.id) {
      alert('Não pode retirar os privilégios de Administrador à sua própria conta ativa.');
      return;
    }
    if (
      confirm(
        `Tem a certeza que deseja retirar os privilégios de Administrador a ${user.name}? O utilizador passará a ter a função de Colaborador regular.`
      )
    ) {
      await updateUser(user.id, { role: 'COLABORADOR' });
    }
  };

  const handleDeleteCollaborator = async (user: User) => {
    if (
      confirm(
        `Tem a certeza que deseja eliminar permanentemente o colaborador "${user.name}" da equipa do salão?`
      )
    ) {
      await deleteUser(user.id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner de Gestão de Administradores */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold border border-white/15">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Controlo de Privilégios & Gestão Administrativa</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gestão de Administradores do Salão
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-center">
              <span className="block text-xl font-black text-white">{salonAdmins.length}</span>
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                {salonAdmins.length === 1 ? 'Administrador' : 'Administradores'}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-center">
              <span className="block text-xl font-black text-white">{salonColabs.length}</span>
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                {salonColabs.length === 1 ? 'Colaborador' : 'Colaboradores'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECÇÃO 1: Administradores Atuais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              Administradores com Acesso a Esta Área ({salonAdmins.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Utilizadores que têm permissão de acesso à área de Administrador, relatórios e personalização.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salonAdmins.map((adm) => {
            const isCurrentLoggedIn = adm.id === currentUser?.id;
            return (
              <div
                key={adm.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: adm.color }} />

                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs"
                        style={{ backgroundColor: adm.color }}
                      >
                        {adm.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          {adm.name}
                          {isCurrentLoggedIn && (
                            <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                              (Você)
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-purple-700" />
                            ADMINISTRADOR
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contactos */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{adm.email}</span>
                    </div>
                    {adm.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{adm.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isCurrentLoggedIn ? (
                    <div className="w-full py-2 px-3 bg-purple-50/60 border border-purple-200/60 text-purple-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 select-none">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Sessão Atual Ativa</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDemote(adm)}
                      className="w-full py-2 px-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-[0.99]"
                      title="Retirar estatuto de administrador a este utilizador"
                    >
                      <ShieldOff className="w-4 h-4 text-slate-400 group-hover:text-rose-600 shrink-0" />
                      <span>Alterar para Colaborador</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECÇÃO 2: Colaboradores Elegíveis para Promoção */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Gestão de Colaboradores
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione um colaborador da equipa para lhe atribuir privilégios de administrador ou gerir o seu registo.
          </p>
        </div>

        {salonColabs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Não existem colaboradores para promover de momento
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Todos os membros registados já são administradores ou ainda não adicionou colaboradores na página «Equipa & Colaboradores».
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salonColabs.map((colab) => (
              <div
                key={colab.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-purple-200 transition-all"
              >
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
                        <h4 className="font-bold text-sm text-slate-900">{colab.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            COLABORADOR
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCollaborator(colab)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Apagar Colaborador"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                    </button>
                  </div>

                  {/* Contactos */}
                  <div className="mt-4 space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
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
                  {colab.specialties && colab.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {colab.specialties.map((spec, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botão de Promoção a Administrador */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenPromote(colab)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-purple-200 active:scale-[0.99]"
                    title="Promover a Administrador do salão"
                  >
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Promover a Administrador</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Promoção a Administrador */}
      {userToPromote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
            {/* Cabeçalho */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Promover a Administrador
                  </h3>
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

              {/* Informação sobre os privilégios */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-[11px] text-purple-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-purple-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  O que este utilizador poderá fazer:
                </p>
                <ul className="list-disc list-inside text-purple-700 space-y-0.5 pl-1">
                  <li>Aceder a esta área de Administrador e relatórios financeiros</li>
                  <li>Promover outros colaboradores ou gerir administradores</li>
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
                  Utilizada para desbloquear a área de Administrador e relatórios.
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
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer transition-all flex items-center gap-1.5"
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
