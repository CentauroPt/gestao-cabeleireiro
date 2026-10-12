import React from 'react';
import { Code2, Server, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';

export const ApiSpecView: React.FC = () => {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sqlSchema = `-- Estrutura de Base de Dados para o seu Servidor Backend (MySQL / PostgreSQL / SQLite)

-- 1. Tabela de Salões (Multi-Salão)
CREATE TABLE salons (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  nif VARCHAR(50),
  opening_time VARCHAR(5) DEFAULT '09:00',
  closing_time VARCHAR(5) DEFAULT '20:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Utilizadores (Colaboradores e Administradores)
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role ENUM('ADMIN', 'COLABORADOR') NOT NULL DEFAULT 'COLABORADOR',
  color VARCHAR(7) DEFAULT '#3B82F6',
  specialties TEXT, -- JSON ou lista separada por vírgulas
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Clientes
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  preferred_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  technical_notes TEXT, -- Fórmulas de coloração, alergias, cortes
  created_by_id VARCHAR(36) REFERENCES users(id),
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  last_visit_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Serviços
CREATE TABLE services (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  duration_minutes INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Reservas / Agendamentos
CREATE TABLE appointments (
  id VARCHAR(36) PRIMARY KEY,
  salon_id VARCHAR(36) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  service_ids TEXT NOT NULL, -- JSON array de IDs
  service_names TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL, -- 'HH:mm'
  end_time VARCHAR(5) NOT NULL,   -- 'HH:mm' (calculado por start_time + soma de durações)
  total_duration_minutes INT NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('AGENDADA', 'CONFIRMADA', 'CONCLUIDA', 'CANCELADA') DEFAULT 'AGENDADA',
  notes TEXT,
  created_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Histórico de Visitas (Lançado quando a reserva é concluída)
CREATE TABLE client_visits (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id VARCHAR(36) REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  services_done TEXT NOT NULL,
  professional_id VARCHAR(36) REFERENCES users(id),
  amount_spent DECIMAL(10, 2) NOT NULL,
  notes TEXT
);`;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Server className="w-6 h-6 text-purple-600" />
          Guia de Ligação ao Servidor Backend
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Como o seu backend no servidor comunicará com esta aplicação de Frontend.
        </p>
      </div>

      {/* Variável de Ambiente */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-purple-600" />
            1. Configuração da Variável de Ambiente (.env)
          </h2>
          <button
            onClick={() => copyToClipboard('VITE_API_BASE_URL=https://o-seu-servidor.pt/api', 'env')}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === 'env' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Copiar .env
          </button>
        </div>
        <p className="text-xs text-slate-600">
          No ficheiro <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-purple-700">.env</code> do
          frontend, indique o endereço da sua API:
        </p>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto">
          VITE_API_BASE_URL=https://o-seu-servidor.pt/api
        </pre>
      </div>

      {/* Endpoints REST */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          2. Endpoints e Contratos de Permissão (RBAC)
        </h2>
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
            <div>
              <span className="font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded mr-2">GET</span>
              <span className="font-mono font-semibold text-slate-800">/api/salons/:salonId/appointments?date=YYYY-MM-DD</span>
              <p className="text-slate-500 mt-1">Devolve reservas do dia para renderização do calendário.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Todos</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
            <div>
              <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded mr-2">POST</span>
              <span className="font-mono font-semibold text-slate-800">/api/salons/:salonId/appointments</span>
              <p className="text-slate-500 mt-1">
                Cria reserva. <strong>Validação anti-sobreposição obrigatória:</strong> o servidor deve rejeitar se o colaborador já tiver marcação no intervalo.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Colaborador ou Admin</span>
          </div>

          <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start justify-between">
            <div>
              <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded mr-2">DELETE</span>
              <span className="font-mono font-semibold text-slate-800">/api/appointments/:id</span>
              <p className="text-rose-700 mt-1 font-medium">
                Eliminar ou cancelar reserva. Se o utilizador autenticado for COLABORADOR, o servidor deve responder com <strong>403 Forbidden</strong>.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">Apenas Administrador</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
            <div>
              <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded mr-2">POST</span>
              <span className="font-mono font-semibold text-slate-800">/api/salons/:salonId/clients</span>
              <p className="text-slate-500 mt-1">Registar cliente com notas técnicas e associação ao profissional habitual.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Colaborador ou Admin</span>
          </div>
        </div>
      </div>

      {/* Esquema SQL para o Servidor */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" />
            3. Esquema SQL para a Base de Dados no seu Servidor
          </h2>
          <button
            onClick={() => copyToClipboard(sqlSchema, 'sql')}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === 'sql' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Copiar Esquema SQL
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Pode executar este script no seu servidor MySQL, PostgreSQL ou SQLite para criar a estrutura completa das tabelas:
        </p>
        <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96">
          {sqlSchema}
        </pre>
      </div>
    </div>
  );
};
