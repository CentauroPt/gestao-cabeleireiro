import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scissors,
  Lock,
  Store,
  ArrowRight,
  ShieldAlert,
  Code2,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const {
    loginSalonUser,
    registerNewSalon,
    loginDeveloper,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Estados de Palavra-passe da Área de Programador
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  // Estados de Registo de Novo Salão
  const [regSalonName, setRegSalonName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regNif, setRegNif] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminEmail, setRegAdminEmail] = useState('');
  const [regAdminPassword, setRegAdminPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regOpeningTime, setRegOpeningTime] = useState('09:00');
  const [regClosingTime, setRegClosingTime] = useState('20:00');
  const [isRegistering, setIsRegistering] = useState(false);

  // Estados de Login de Salão Existente
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Submissão do Registo de Novo Salão
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regAdminEmail.trim().toLowerCase();
    const cleanSalonName = regSalonName.trim();
    const cleanAdminName = regAdminName.trim();
    const cleanPhone = regPhone.trim();

    if (!cleanSalonName || !cleanPhone || !cleanAdminName || !cleanEmail || !regAdminPassword.trim()) return;

    setIsRegistering(true);
    const ok = await registerNewSalon({
      name: cleanSalonName,
      phone: cleanPhone,
      address: regAddress.trim() || 'Morada não indicada',
      nif: regNif.trim(),
      adminName: cleanAdminName,
      adminEmail: cleanEmail,
      adminPassword: regAdminPassword.trim(),
      openingTime: regOpeningTime,
      closingTime: regClosingTime,
    });
    setIsRegistering(false);

    if (ok) {
      setRegSalonName('');
      setRegPhone('');
      setRegAddress('');
      setRegNif('');
      setRegAdminName('');
      setRegAdminEmail('');
      setRegAdminPassword('');
    }
  };

  // Submissão do Login de Salão
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const cleanId = loginEmail.trim();
    if (!cleanId) return;

    setIsLoggingIn(true);
    const res = await loginSalonUser(cleanId, loginPassword.trim());
    setIsLoggingIn(false);
    if (!res.success && res.error) {
      setLoginError(res.error);
    }
  };

  // Submissão da Palavra-passe de Programador
  const handleDevSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDevError(null);
    const ok = loginDeveloper(devPassword);
    if (!ok) {
      setDevError('Palavra-passe de programador incorreta.');
    } else {
      setIsDevModalOpen(false);
      setDevPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30 flex flex-col justify-between">
      {/* Topo: Apenas Gestão de Salão de Cabeleireiro */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
              Gestão de Salão de Cabeleireiro
            </h1>
          </div>

          <div className="absolute right-4 sm:right-6 lg:right-8 flex items-center gap-2">
            {/* Botão de Acesso do Programador (Pede palavra-passe) */}
            <button
              onClick={() => {
                setDevError(null);
                setDevPassword('');
                setIsDevModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md"
              title="Aceder à Consola do Programador / Super Admin"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Área do Programador</span>
            </button>
          </div>
        </div>
      </header>

      {/* Centro: Botões de Entrar no meu salão e Registar-me */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row p-4 gap-3 border-b border-slate-200 bg-slate-50/60">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
                activeTab === 'login'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Entrar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2.5 ${
                activeTab === 'register'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Criar conta</span>
            </button>
          </div>

          {/* FORMULÁRIO DE REGISTO DE NOVO SALÃO */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="p-6 sm:p-8 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  Criar Salão Independente
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Os seus dados serão estritamente isolados dos restantes utilizadores.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Salão / Barbearia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Studio Glamour & Estilo"
                    value={regSalonName}
                    onChange={(e) => setRegSalonName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Telefone do Salão *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+351 912 345 678"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      NIF (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="509 123 456"
                      value={regNif}
                      onChange={(e) => setRegNif(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Morada / Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Rua / Avenida, Cidade"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-2">
                    Dados do Administrador do Salão:
                  </span>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nome do Administrador *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ana Silva"
                        value={regAdminName}
                        onChange={(e) => setRegAdminName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          E-mail *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="ana@salao.pt"
                          value={regAdminEmail}
                          onChange={(e) => setRegAdminEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Palavra-passe *
                        </label>
                        <div className="relative">
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••"
                            value={regAdminPassword}
                            onChange={(e) => setRegAdminPassword(e.target.value)}
                            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors"
                            title={showRegPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                          >
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Abertura
                    </label>
                    <input
                      type="time"
                      value={regOpeningTime}
                      onChange={(e) => setRegOpeningTime(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Encerramento
                    </label>
                    <input
                      type="time"
                      value={regClosingTime}
                      onChange={(e) => setRegClosingTime(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>{isRegistering ? 'A criar conta...' : 'Criar conta'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORMULÁRIO DE LOGIN DE SALÃO EXISTENTE */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="p-6 sm:p-8 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  Entrar no meu Salão
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Introduza o seu email e palavra-passe para aceder à aplicação.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Acesso Não Concluído</p>
                    <p className="mt-0.5">{loginError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: contacto@salao.pt"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Palavra-passe *
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors"
                      title={showLoginPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1.5 block">
                    Introduza a palavra-passe definida no registo do salão ou atribuída ao seu utilizador.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>{isLoggingIn ? 'A verificar...' : 'Entrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SalonMaster Pro • Sistema de Cabeleireiros & Estética</span>
          <span>Desenvolvido com arquitetura Multi-Tenant isolada</span>
        </div>
      </footer>

      {/* Modal de Palavra-passe da Área do Programador */}
      {isDevModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 text-center">
            <div className="w-12 h-12 bg-slate-900 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <Code2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">
              Área do Programador
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Introduza a palavra-passe para aceder à consola de gestão (Super Admin).
            </p>

            <form onSubmit={handleDevSubmit} className="mt-5 text-left space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Palavra-passe
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showDevPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Palavra-passe..."
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDevPassword(!showDevPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDevPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {devError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
                  {devError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDevModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Entrar na Consola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
