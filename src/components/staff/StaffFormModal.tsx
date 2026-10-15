import React, { useState } from 'react';
import type { User, Role } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, UserCheck, Mail, Phone, Palette, Shield, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  initialUser?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Azul
  '#EC4899', // Rosa
  '#8B5CF6', // Roxo
  '#10B981', // Verde
  '#F59E0B', // Amarelo
  '#06B6D4', // Ciano
  '#EF4444', // Vermelho
  '#6366F1', // Índigo
];

export const StaffFormModal: React.FC<Props> = ({ initialUser, onClose, onSuccess }) => {
  const { users, currentSalon, addUser, updateUser } = useApp();

  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [role, setRole] = useState<Role>(initialUser?.role || 'COLABORADOR');
  const [password, setPassword] = useState(initialUser?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [color, setColor] = useState(initialUser?.color || PRESET_COLORS[0]);
  const [specialtiesStr, setSpecialtiesStr] = useState(initialUser?.specialties.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do colaborador é obrigatório.');
      return;
    }
    if (!email.trim()) {
      setError('O email do colaborador é obrigatório.');
      return;
    }

    if (initialUser && initialUser.role === 'ADMIN' && role === 'COLABORADOR') {
      const remainingAdmins = users.filter(
        (u) => u.salonId === currentSalon?.id && u.role === 'ADMIN' && u.id !== initialUser.id
      );
      if (remainingAdmins.length === 0) {
        setError('O salão deve manter pelo menos um Administrador. Promova outro membro antes de despromover este utilizador.');
        return;
      }
    }

    const specialties = specialtiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (role === 'ADMIN' && !initialUser?.password && !password.trim()) {
      setError('Por favor defina uma palavra-passe para o Administrador.');
      return;
    }

    const adminPassword = role === 'ADMIN' ? (password.trim() || initialUser?.password) : undefined;

    setIsSubmitting(true);
    let success = false;

    if (initialUser) {
      success = await updateUser(initialUser.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        ...(role === 'ADMIN' ? { password: adminPassword } : {}),
        color,
        specialties,
      });
    } else {
      success = await addUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        ...(role === 'ADMIN' ? { password: adminPassword } : {}),
        color,
        specialties,
        active: true,
      });
    }

    setIsSubmitting(false);

    if (success) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            {initialUser ? 'Editar Colaborador' : 'Novo Colaborador da Equipa'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nome do Colaborador"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rita@salao.pt"
                  className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto Telefónico</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 912..."
                  className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-600" />
              Nível de Permissão (Papel)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white cursor-pointer"
            >
              <option value="COLABORADOR">
                Colaborador (Cria reservas e clientes; sem acesso a estatística nem gestão do salão)
              </option>
              <option value="ADMIN">
                Administrador (Controlo total: gere equipa, personalização e acede à estatística)
              </option>
            </select>
            {role === 'ADMIN' && (
              <p className="text-[11px] text-purple-700 mt-1.5 bg-purple-50 p-2 rounded-lg border border-purple-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
                <span>Este utilizador terá estatuto de Administrador e poderá gerir o salão.</span>
              </p>
            )}
          </div>

          {role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                Palavra-passe de Administrador
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={initialUser?.password ? 'Manter palavra-passe atual ou definir nova' : 'Introduza a palavra-passe'}
                  className="w-full text-xs pl-3 pr-9 py-2 border border-purple-200 bg-purple-50/30 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Necessária para aceder à área de estatística e relatórios.
              </span>
            </div>
          )}

          {/* Seletor de Cor no Calendário */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-500" />
              Cor de Destaque na Agenda
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'ring-2 ring-purple-600 ring-offset-2 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidades (separadas por vírgula)</label>
            <input
              type="text"
              value={specialtiesStr}
              onChange={(e) => setSpecialtiesStr(e.target.value)}
              placeholder="Ex: Balayage, Cortes Degradé, Coloração"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 cursor-pointer transition-all"
            >
              {isSubmitting ? 'A gravar...' : initialUser ? 'Guardar' : 'Adicionar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
