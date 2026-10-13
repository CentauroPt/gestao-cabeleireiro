import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scissors,
  Shield,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Store,
  Eye,
  LogOut,
  ArrowLeft,
  Lock,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentSalon,
    users,
    currentUser,
    setCurrentUserId,
    notification,
    setNotification,
    isImpersonating,
    returnToDeveloperPortal,
    logoutCurrentSalon,
    activeTab,
    setActiveTab,
    isAdminUnlocked,
  } = useApp();

  const handleAdminClick = () => {
    if (currentUser?.role === 'ADMIN') {
      setActiveTab('reports');
      setNotification({
        type: 'info',
        message: isAdminUnlocked
          ? 'Acedendo aos Relatórios de Vendas do Administrador.'
          : 'Área do Administrador: Introduza a sua palavra-passe para aceder aos relatórios financeiros.',
      });
    } else {
      setNotification({
        type: 'info',
        message: 'O operador atual é Colaborador. Para aceder à Área de Administrador, selecione o Administrador no seletor.',
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Banner de Inspeção do Programador */}
      {isImpersonating && (
        <div className="bg-purple-950 text-purple-100 px-4 py-2 text-xs font-bold border-b border-purple-800">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                MODO DE INSPEÇÃO DO PROGRAMADOR — A visualizar salão:{' '}
                <span className="text-white underline">{currentSalon?.name}</span> ({currentSalon?.status})
              </span>
            </div>
            <button
              onClick={returnToDeveloperPortal}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar à Consola
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca (Aparece no início da página do lado esquerdo) */}
          <div className="flex items-center gap-3">
            {currentSalon?.logoUrl ? (
              <img
                src={currentSalon.logoUrl}
                alt={currentSalon.name}
                className="w-11 h-11 rounded-xl object-contain border border-slate-200 bg-white shadow-xs p-1 shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-colors"
                style={{
                  backgroundColor: currentSalon?.primaryColor || '#8B5CF6',
                  boxShadow: `0 4px 6px -1px ${
                    currentSalon?.primaryColor ? currentSalon.primaryColor + '40' : '#8B5CF640'
                  }`,
                }}
              >
                <Scissors className="w-5 h-5 transform -rotate-45" />
              </div>
            )}
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                {currentSalon?.name || 'SalonMaster Pro'}
              </span>
              <p className="text-xs text-slate-500 hidden sm:block">Gestão de Clientes, Reservas & Equipa</p>
            </div>
          </div>

          {/* Salão Ativo (Isolado) & Controlos */}
          <div className="flex items-center gap-3">
            {/* Salão Atual - Apenas mostra o salão em que se encontra */}
            <div className="flex items-center gap-2 bg-purple-50/70 border border-purple-200/80 rounded-xl px-3 py-1.5">
              <Store className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider leading-none">
                  Salão Ativo:
                </span>
                <span className="text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[180px]">
                  {currentSalon?.name || 'O Meu Salão'}
                </span>
              </div>
            </div>

            {/* Alternador de Utilizador do Salão (Admin vs Colaborador) */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <div className="flex items-center gap-1.5 px-2 py-1">
                {currentUser?.role === 'ADMIN' ? (
                  <Shield className="w-4 h-4 text-purple-600" />
                ) : (
                  <UserIcon className="w-4 h-4 text-blue-600" />
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium leading-none">Operador:</span>
                  <select
                    value={currentUser?.id || ''}
                    onChange={(e) => setCurrentUserId(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer p-0"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentUser && (
                <button
                  type="button"
                  onClick={handleAdminClick}
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md tracking-wide flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs ${
                    currentUser.role === 'ADMIN'
                      ? activeTab === 'reports'
                        ? 'bg-purple-600 text-white border border-purple-700 shadow-purple-200'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 hover:border-purple-300'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200'
                  }`}
                  title={
                    currentUser.role === 'ADMIN'
                      ? 'Clique para aceder à Área de Administrador (Relatórios de Vendas)'
                      : 'Perfil de Colaborador (Clique para informação)'
                  }
                >
                  {currentUser.role === 'ADMIN' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-purple-700" />
                      <span>ADMIN</span>
                      {isAdminUnlocked ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Sessão de Administrador Ativa" />
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-purple-600 ml-0.5" />
                      )}
                    </>
                  ) : (
                    <span>{currentUser.role}</span>
                  )}
                </button>
              )}
            </div>

            {/* Botão Sair / Terminar Sessão do Salão */}
            <button
              onClick={logoutCurrentSalon}
              title="Sair do salão e voltar à Página de Entrada"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Notificações / Toasts */}
      {notification && (
        <div
          className={`border-b px-4 py-2 text-xs font-medium flex items-center justify-between transition-all ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
