import React, { useState } from 'react';
import type { User } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffFormModal } from './StaffFormModal';
import { UserPlus, Shield, Mail, Phone, Edit2, Trash2, AlertTriangle } from 'lucide-react';

export const StaffList: React.FC = () => {
  const { users, currentUser, currentSalon, deleteUser } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleDelete = async (user: User) => {
    if (!isAdmin) {
      alert('Acesso negado: Apenas o Administrador do salão pode remover colaboradores.');
      return;
    }
    if (user.id === currentUser.id) {
      alert('Não pode remover a sua própria conta de Administrador ativa.');
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
            Gestão dos profissionais de {currentSalon?.name || 'Salão'}, perfis e cores da agenda.
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

      {/* Alerta de Perfil se for Colaborador */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Encontra-se com sessão de <strong>Colaborador</strong>. Pode consultar a equipa para criar marcações em nome
            de qualquer colega, mas a edição de perfis está reservada ao Administrador.
          </span>
        </div>
      )}

      {/* Cartões de Colaboradores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((colab) => {
          return (
            <div
              key={colab.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all relative overflow-hidden"
            >
              {/* Faixa com a cor da agenda */}
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: colab.color }} />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs"
                    style={{ backgroundColor: colab.color }}
                  >
                    {colab.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{colab.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          colab.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {colab.role}
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
                    {colab.id !== currentUser?.id && (
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
          );
        })}
      </div>

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
    </div>
  );
};
