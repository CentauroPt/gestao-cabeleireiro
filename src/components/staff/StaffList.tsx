import React, { useState } from 'react';
import type { User } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffFormModal } from './StaffFormModal';
import {
  UserPlus,
  Shield,
  Mail,
  Phone,
  Edit2,
  AlertTriangle,
} from 'lucide-react';

export const StaffList: React.FC = () => {
  const { users, currentUser, currentSalon } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Apenas colaboradores são exibidos nesta página (o administrador não aparece nesta lista)
  const collaborators = users.filter(
    (u) => u.salonId === currentSalon?.id && u.role !== 'ADMIN'
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Equipa & Colaboradores do Salão
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão dos profissionais e colaboradores de {currentSalon?.name || 'Salão'}, especialidades e cores da agenda.
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

      {/* Lista de Colaboradores ou Estado Vazio */}
      {collaborators.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <UserPlus className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Ainda não existem colaboradores registados
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Adicione os cabeleireiros e profissionais da sua equipa para gerir as suas especialidades, cores da agenda e marcações.
          </p>
          {isAdmin && (
            <button
              onClick={() => {
                setUserToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Primeiro Colaborador
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collaborators.map((colab) => {
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
                        <h3 className="font-bold text-sm text-slate-900">
                          {colab.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            COLABORADOR
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

                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserToEdit(colab);
                        setIsModalOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 text-slate-700 hover:text-purple-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Editar Colaborador</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
};
