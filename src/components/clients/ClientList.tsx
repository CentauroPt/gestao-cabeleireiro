import React, { useState, useMemo } from 'react';
import type { Client } from '../../types';
import { useApp } from '../../context/AppContext';
import { InactivityBadge } from '../common/InactivityBadge';
import { ClientDetailModal } from './ClientDetailModal';
import { ClientFormModal } from './ClientFormModal';
import { getClientInactivityAnalysis, generateReactivationWhatsAppUrl } from '../../services/inactivityService';
import {
  Search,
  UserPlus,
  Phone,
  UserCheck,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  MessageCircle,
  Filter,
  PlusCircle,
} from 'lucide-react';

interface Props {
  onDirectBook: (client: Client) => void;
}

export const ClientList: React.FC<Props> = ({ onDirectBook }) => {
  const { clients, users, currentUser, currentSalon, deleteClient } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [inactivityFilter, setInactivityFilter] = useState<'ALL' | 'RECENTE' | 'ATENCAO' | 'INATIVO'>('ALL');
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string>('ALL');

  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Filtragem combinada
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Pesquisa por nome, telemóvel ou email
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Filtro por profissional
      if (selectedProfessionalFilter !== 'ALL' && client.preferredUserId !== selectedProfessionalFilter) {
        return false;
      }

      // Filtro por estado de inatividade
      if (inactivityFilter !== 'ALL') {
        const analysis = getClientInactivityAnalysis(client);
        if (analysis.status !== inactivityFilter) return false;
      }

      return true;
    });
  }, [clients, searchTerm, inactivityFilter, selectedProfessionalFilter]);

  // Contadores para as tabs de inatividade
  const counts = useMemo(() => {
    let recente = 0;
    let atencao = 0;
    let inativo = 0;
    clients.forEach((c) => {
      const a = getClientInactivityAnalysis(c);
      if (a.status === 'RECENTE') recente++;
      if (a.status === 'ATENCAO') atencao++;
      if (a.status === 'INATIVO') inativo++;
    });
    return { all: clients.length, recente, atencao, inativo };
  }, [clients]);

  const handleDeleteClient = async (client: Client) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Acesso negado: Apenas o Administrador do salão pode apagar fichas de clientes.');
      return;
    }
    if (confirm(`Tem a certeza que deseja eliminar definitivamente a ficha de ${client.name}?`)) {
      await deleteClient(client.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Secção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Gestão de Clientes & Retenção
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fichas técnicas completas, registo de visitas e alertas inteligentes de inatividade.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingClient(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Registar Novo Cliente
        </button>
      </div>

      {/* Alertas Rápidos de Inatividade (Dashboard de Ausências) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setInactivityFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            inactivityFilter === 'ALL'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total de Clientes</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.all}</p>
        </button>

        <button
          onClick={() => setInactivityFilter('RECENTE')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            inactivityFilter === 'RECENTE'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Ativos (&lt; 30d)</span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{counts.recente}</p>
        </button>

        <button
          onClick={() => setInactivityFilter('ATENCAO')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            inactivityFilter === 'ATENCAO'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Atenção (30-60d)</span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{counts.atencao}</p>
        </button>

        <button
          onClick={() => setInactivityFilter('INATIVO')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            inactivityFilter === 'INATIVO'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Ausentes (+60d)
          </span>
          <p className="text-2xl font-bold text-rose-800 mt-1">{counts.inativo}</p>
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome ou telemóvel..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Profissional Habitual:</span>
          <select
            value={selectedProfessionalFilter}
            onChange={(e) => setSelectedProfessionalFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium cursor-pointer"
          >
            <option value="ALL">Todos os profissionais</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Cliente & Contacto</th>
                <th className="py-3 px-4">Profissional Habitual</th>
                <th className="py-3 px-4">Estado / Ausência</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const preferredUser = users.find((u) => u.id === client.preferredUserId);
                  const analysis = getClientInactivityAnalysis(client);
                  const whatsappUrl = generateReactivationWhatsAppUrl(client, currentSalon?.name || 'Salão');

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nome e Telefone com Foto Quadrada e Esquinas Arredondadas */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {client.photoUrl ? (
                            <img
                              src={client.photoUrl}
                              alt={client.name}
                              className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0 shadow-2xs">
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{client.name}</div>
                            <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {client.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Profissional de Referência */}
                      <td className="py-3.5 px-4">
                        {preferredUser ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-purple-700 bg-purple-50 border border-purple-100 font-medium">
                            <UserCheck className="w-3 h-3" />
                            {preferredUser.name}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem preferência</span>
                        )}
                      </td>

                      {/* Badge de Inatividade & Avisos */}
                      <td className="py-3.5 px-4">
                        <InactivityBadge client={client} showDetails={false} />
                        {analysis.status === 'INATIVO' && (
                          <div className="mt-1">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                            >
                              <MessageCircle className="w-3 h-3" /> Reativar via WhatsApp
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Marcação Rápida */}
                          <button
                            onClick={() => onDirectBook(client)}
                            title="Agendar reserva para este cliente"
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>

                          {/* Ver Ficha Completa */}
                          <button
                            onClick={() => setSelectedClientForDetail(client)}
                            title="Ver ficha técnica e histórico"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => setClientToEdit(client)}
                            title="Editar dados"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Eliminar (apenas visível/permitido se Admin!) */}
                          {currentUser?.role === 'ADMIN' ? (
                            <button
                              onClick={() => handleDeleteClient(client)}
                              title="Eliminar cliente (Apenas Administrador)"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              title="Colaboradores não podem apagar clientes"
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes / Ficha Técnica */}
      {selectedClientForDetail && (
        <ClientDetailModal
          client={selectedClientForDetail}
          onClose={() => setSelectedClientForDetail(null)}
          onBookAppointment={(c) => {
            setSelectedClientForDetail(null);
            onDirectBook(c);
          }}
        />
      )}

      {/* Modal de Criar / Editar Cliente */}
      {(isCreatingClient || clientToEdit) && (
        <ClientFormModal
          initialClient={clientToEdit}
          onClose={() => {
            setIsCreatingClient(false);
            setClientToEdit(null);
          }}
          onSuccess={() => {
            setIsCreatingClient(false);
            setClientToEdit(null);
          }}
        />
      )}
    </div>
  );
};
