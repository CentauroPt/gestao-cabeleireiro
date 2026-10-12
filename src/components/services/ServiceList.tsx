import React, { useState } from 'react';
import type { Service } from '../../types';
import { useApp } from '../../context/AppContext';
import { ServiceFormModal } from './ServiceFormModal';
import { Plus, Clock, DollarSign, Edit2, Trash2 } from 'lucide-react';

export const ServiceList: React.FC = () => {
  const { services, currentUser, currentSalon, deleteService } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleDelete = async (service: Service) => {
    if (!isAdmin) {
      alert('Acesso negado: Apenas o Administrador pode eliminar serviços do catálogo.');
      return;
    }
    if (confirm(`Tem a certeza que deseja eliminar o serviço "${service.name}"?`)) {
      await deleteService(service.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Catálogo de Serviços & Tabela de Preços
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Definição de tempos de atendimento e preços para as reservas de {currentSalon?.name || 'Salão'}.
          </p>
        </div>

        <button
          onClick={() => {
            setServiceToEdit(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Novo Serviço
        </button>
      </div>

      {/* Grelha de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          return (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setServiceToEdit(service);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      title="Editar Serviço"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(service)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Eliminar Serviço"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-2.5">{service.name}</h3>

                {service.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.description}</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {service.durationMinutes} minutos
                </span>
                <span className="font-bold text-base text-slate-900 flex items-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  {service.price.toFixed(2)}€
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <ServiceFormModal
          initialService={serviceToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setServiceToEdit(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setServiceToEdit(null);
          }}
        />
      )}
    </div>
  );
};
