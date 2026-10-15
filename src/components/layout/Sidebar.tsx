import React from 'react';
import { Calendar, Users, Scissors, UserCheck, AlertCircle, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type TabType = 'calendar' | 'clients' | 'staff' | 'services' | 'reports';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const { clients, currentUser, isAdminUnlocked } = useApp();

  // Conta quantos clientes estão inativos (+60 dias) para mostrar no badge
  const inactiveCount = clients.filter((c) => {
    if (!c.lastVisitDate) return false;
    const diff = Math.floor((new Date().getTime() - new Date(c.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 60;
  }).length;

  const isAdmin = currentUser?.role === 'ADMIN';

  const menuItems = [
    {
      id: 'calendar' as TabType,
      label: 'Agenda de Reservas',
      icon: <Calendar className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'services' as TabType,
      label: 'Catálogo de Serviços',
      icon: <Scissors className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'clients' as TabType,
      label: 'Fichas de Clientes',
      icon: <Users className="w-5 h-5" />,
      badge: inactiveCount > 0 ? `${inactiveCount} alertas` : null,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'staff' as TabType,
      label: 'Equipa & Colaboradores',
      icon: <UserCheck className="w-5 h-5" />,
      badge: !isAdmin ? 'Apenas Admin' : null,
      badgeColor: 'bg-amber-100 text-amber-800 text-[10px]',
    },
    ...(isAdmin
      ? [
          {
            id: 'reports' as TabType,
            label: 'Estatística',
            icon: <BarChart3 className="w-5 h-5" />,
            badge: !isAdminUnlocked ? 'Admin Lock' : 'Liberado',
            badgeColor: !isAdminUnlocked
              ? 'bg-amber-100 text-amber-800 text-[10px]'
              : 'bg-emerald-100 text-emerald-800 text-[10px]',
          },
        ]
      : []),
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0">
      <div className="p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dica de Segurança / RBAC no rodapé */}
      <div className="m-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-700">Regras de Acesso Ativas</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {currentUser?.role === 'ADMIN'
                ? 'Como Administrador, tem controlo total sobre eliminação de reservas e gestão da equipa.'
                : 'Como Colaborador, pode agendar para qualquer colega, mas a eliminação de dados está bloqueada.'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
