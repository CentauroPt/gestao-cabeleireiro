import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getActiveSupabaseCredentials } from '../../services/supabase';
import {
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Key,
  ExternalLink,
  ShieldCheck,
  Users,
  Scissors,
  Calendar,
  Sparkles,
  Info,
  Server,
} from 'lucide-react';

export const CloudDatabasePanel: React.FC = () => {
  const {
    isCloudConfigured,
    syncCloudNow,
    exportToCloudNow,
    importFromCloudNow,
    testCloudConnection,
    updateCloudCredentials,
    salons,
    users,
    services,
    clients,
    appointments,
  } = useApp();

  const [creds, setCreds] = useState(() => getActiveSupabaseCredentials());
  const [inputUrl, setInputUrl] = useState(creds.url);
  const [inputKey, setInputKey] = useState(creds.anonKey);
  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    counts?: Record<string, number>;
  } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  useEffect(() => {
    const current = getActiveSupabaseCredentials();
    setCreds(current);
    setInputUrl(current.url);
    setInputKey(current.anonKey);
  }, [isCloudConfigured]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testCloudConnection();
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateCloudCredentials(inputUrl.trim(), inputKey.trim());
    setIsEditingCreds(false);
    if (ok) {
      handleTest();
    }
  };

  const handleExport = async () => {
    if (
      !confirm(
        'Deseja enviar TODOS os dados locais deste dispositivo (salões, colaboradores, serviços, clientes e marcações) para o Supabase?\n\nIsto permitirá que o Vercel e outros computadores/telemóveis passem a ver exatamente os mesmos clientes e reservas!'
      )
    ) {
      return;
    }
    setIsExporting(true);
    try {
      await exportToCloudNow();
      handleTest();
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (
      !confirm(
        'ATENÇÃO: Deseja descarregar todos os dados da Nuvem Supabase para este dispositivo?\n\nOs dados da nuvem irão atualizar a cópia local deste navegador.'
      )
    ) {
      return;
    }
    setIsImporting(true);
    try {
      await importFromCloudNow();
    } finally {
      setIsImporting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncCloudNow();
      handleTest();
    } finally {
      setIsSyncing(false);
    }
  };

  const fullSqlScript = `-- ============================================================
-- SALÃOMASTER PRO - ESQUEMA DE BASE DE DADOS COMPLETO SUPABASE
-- Autor e Titular Exclusivo: José Centúrio
-- Compatível com PostgreSQL 14+ / Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE SALÕES (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS saloes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  nif TEXT,
  opening_time TEXT NOT NULL DEFAULT '09:00',
  closing_time TEXT NOT NULL DEFAULT '20:00',
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'SUSPENSO', 'CANCELADO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspension_reason TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  start_day_of_week INTEGER DEFAULT 1,
  email TEXT,
  data_registo TIMESTAMPTZ DEFAULT NOW(),
  fim_prova TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  valor_mensal NUMERIC(10, 2) DEFAULT 29.00,
  estado_subscricao TEXT DEFAULT 'prova' CHECK (estado_subscricao IN ('ativo', 'bloqueado', 'prova')),
  ultimo_mes_pago TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE UTILIZADORES / COLABORADORES
CREATE TABLE IF NOT EXISTS utilizadores (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'COLABORADOR')),
  is_primary_admin BOOLEAN DEFAULT FALSE,
  password TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE SERVIÇOS
CREATE TABLE IF NOT EXISTS servicos (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Cabelo', 'Estética', 'Barba', 'Tratamento')),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_user_id TEXT,
  technical_notes TEXT,
  photo_url TEXT,
  created_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  last_visit_date TIMESTAMPTZ,
  visit_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE AGENDAMENTOS / MARCAÇÕES
CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  user_id TEXT NOT NULL,
  service_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  service_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  total_duration_minutes INTEGER NOT NULL DEFAULT 30,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'CONFIRMADA', 'CONCLUIDA', 'CANCELADA')),
  notes TEXT,
  created_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  booking_channel TEXT DEFAULT 'presencial' CHECK (booking_channel IN ('presencial', 'telefone', 'whatsapp')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELAS DE GESTÃO SAAS E SUBSCRIÇÕES
CREATE TABLE IF NOT EXISTS clientes_saas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT NOT NULL,
  data_registo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fim_prova TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  valor_mensal NUMERIC(10, 2) NOT NULL DEFAULT 29.00,
  estado_subscricao TEXT NOT NULL CHECK (estado_subscricao IN ('ativo', 'bloqueado', 'prova')) DEFAULT 'prova',
  ultimo_mes_pago TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagamentos_saas (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valor NUMERIC(10, 2) NOT NULL,
  metodo TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendente', 'validado')) DEFAULT 'pendente',
  mes_referencia TEXT NOT NULL,
  comprovativo_ref TEXT,
  data_validacao TIMESTAMPTZ,
  notas_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracoes_saas (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  iban TEXT NOT NULL DEFAULT 'PT50 0033 0000 4523 4567 8901 2',
  numero_mbway TEXT NOT NULL DEFAULT '912 345 678',
  numero_whatsapp TEXT NOT NULL DEFAULT '912 345 678',
  valor_mensal_padrao NUMERIC(10, 2) NOT NULL DEFAULT 29.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracoes_saas (id, iban, numero_mbway, numero_whatsapp, valor_mensal_padrao)
VALUES ('global_config', 'PT50 0033 0000 4523 4567 8901 2', '912 345 678', '912 345 678', 29.00)
ON CONFLICT (id) DO NOTHING;

-- 7. ÍNDICES DE PESQUISA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_utilizadores_salon ON utilizadores(salon_id);
CREATE INDEX IF NOT EXISTS idx_utilizadores_email ON utilizadores(email);
CREATE INDEX IF NOT EXISTS idx_servicos_salon ON servicos(salon_id);
CREATE INDEX IF NOT EXISTS idx_clientes_salon ON clientes(salon_id);
CREATE INDEX IF NOT EXISTS idx_clientes_phone ON clientes(phone);
CREATE INDEX IF NOT EXISTS idx_agendamentos_salon ON agendamentos(salon_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_date ON agendamentos(date);
CREATE INDEX IF NOT EXISTS idx_agendamentos_client ON agendamentos(client_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_user ON agendamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente_id ON pagamentos_saas(cliente_id);

-- 8. FUNÇÃO E TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saloes_updated_at ON saloes;
CREATE TRIGGER trg_saloes_updated_at BEFORE UPDATE ON saloes FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_utilizadores_updated_at ON utilizadores;
CREATE TRIGGER trg_utilizadores_updated_at BEFORE UPDATE ON utilizadores FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_servicos_updated_at ON servicos;
CREATE TRIGGER trg_servicos_updated_at BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER trg_agendamentos_updated_at BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_clientes_saas_updated_at ON clientes_saas;
CREATE TRIGGER trg_clientes_saas_updated_at BEFORE UPDATE ON clientes_saas FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_pagamentos_saas_updated_at ON pagamentos_saas;
CREATE TRIGGER trg_pagamentos_saas_updated_at BEFORE UPDATE ON pagamentos_saas FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 9. ATIVAR SEGURANÇA ROW LEVEL SECURITY (RLS) COM POLÍTICAS PERMISSIVAS PARA ANON KEY
ALTER TABLE saloes ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_saas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total publico a saloes" ON saloes;
CREATE POLICY "Acesso total publico a saloes" ON saloes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a utilizadores" ON utilizadores;
CREATE POLICY "Acesso total publico a utilizadores" ON utilizadores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a servicos" ON servicos;
CREATE POLICY "Acesso total publico a servicos" ON servicos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a clientes" ON clientes;
CREATE POLICY "Acesso total publico a clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a agendamentos" ON agendamentos;
CREATE POLICY "Acesso total publico a agendamentos" ON agendamentos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a clientes_saas" ON clientes_saas;
CREATE POLICY "Acesso total publico a clientes_saas" ON clientes_saas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a pagamentos_saas" ON pagamentos_saas;
CREATE POLICY "Acesso total publico a pagamentos_saas" ON pagamentos_saas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total publico a configuracoes_saas" ON configuracoes_saas;
CREATE POLICY "Acesso total publico a configuracoes_saas" ON configuracoes_saas FOR ALL USING (true) WITH CHECK (true);

-- 10. ATIVAR SUPABASE REALTIME EM TODAS AS TABELAS OPERACIONAIS
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE saloes;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE utilizadores;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE servicos;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE agendamentos;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(fullSqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal de Estado */}
      <div
        className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
          isCloudConfigured
            ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-teal-950/70 border-emerald-500/40'
            : 'bg-gradient-to-br from-amber-950/80 via-slate-900/90 to-slate-800/80 border-amber-500/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isCloudConfigured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-500/20'
              }`}
            >
              {isCloudConfigured ? <Cloud className="w-8 h-8 animate-pulse" /> : <Database className="w-8 h-8" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    isCloudConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isCloudConfigured ? 'Base de Dados na Nuvem Ativa' : 'Modo Offline-First (Local)'}
                </span>

                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Sincronização em Tempo Real (Supabase Realtime)
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {isCloudConfigured
                  ? 'Base de Dados PostgreSQL Partilhada em Tempo Real'
                  : 'Ligar Base de Dados Central na Nuvem (Supabase)'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                {isCloudConfigured
                  ? 'Todos os computadores da receção, telemóveis de colaboradores e a versão pública Vercel acedem e gravam instantaneamente na mesma base de dados central.'
                  : 'Atualmente os dados estão gravados na memória local deste navegador. Ligue o Supabase para que os clientes registados apareçam no telemóvel e na versão Vercel!'}
              </p>

              {creds.url && (
                <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <span className="text-slate-500">URL:</span>
                  <span className="text-emerald-400 truncate max-w-xs">{creds.url}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação de Topo */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:border-slate-400 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin text-purple-400' : ''}`} />
              <span>{isTesting ? 'A testar...' : 'Testar Ligação'}</span>
            </button>

            <button
              onClick={() => setIsEditingCreds(!isEditingCreds)}
              className="px-4 py-2.5 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4 text-purple-300" />
              <span>{isEditingCreds ? 'Fechar Credenciais' : 'Configurar Chaves'}</span>
            </button>

            <button
              onClick={() => setShowSqlModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Database className="w-4 h-4" />
              <span>Ver Script SQL</span>
            </button>
          </div>
        </div>

        {/* Mensagem do Resultado do Teste de Ligação */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              testResult.success
                ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>

            {testResult.counts && (
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-emerald-300/90">
                <span>Salões: {testResult.counts.saloes}</span>
                <span>• Clientes: {testResult.counts.clientes}</span>
                <span>• Marcações: {testResult.counts.agendamentos}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulário Colapsável de Credenciais */}
      {isEditingCreds && (
        <form
          onSubmit={handleSaveCredentials}
          className="bg-slate-800/95 border border-purple-500/40 p-6 rounded-3xl shadow-xl space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              <span>Credenciais da Base de Dados Supabase</span>
            </h3>
            <span className="text-xs text-slate-400">
              Guardadas em segurança neste dispositivo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xyzabcdefghijklm.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-400">
              💡 Dica: No Supabase, vá a <b>Project Settings → API</b> para copiar a URL e a chave pública (anon key).
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputUrl('');
                  setInputKey('');
                  updateCloudCredentials('', '');
                  setIsEditingCreds(false);
                }}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Limpar Chaves
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Gravar & Ativar Ligação
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Cartões de Comparação: Dados Locais vs Dados na Nuvem */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-800/80 border border-slate-700/80 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Salões</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{salons.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {testResult?.counts?.saloes !== undefined
              ? `Nuvem: ${testResult.counts.saloes}`
              : 'Nuvem: sincronizado'}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Colaboradores</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{users.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {testResult?.counts?.utilizadores !== undefined
              ? `Nuvem: ${testResult.counts.utilizadores}`
              : 'Nuvem: sincronizado'}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Serviços</span>
            <Scissors className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-white">{services.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {testResult?.counts?.servicos !== undefined
              ? `Nuvem: ${testResult.counts.servicos}`
              : 'Nuvem: sincronizado'}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-4.5 rounded-2xl ring-1 ring-emerald-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Clientes Registados
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{clients.length}</div>
          <div className="text-[11px] text-emerald-400 font-bold mt-1">
            {testResult?.counts?.clientes !== undefined
              ? `Nuvem: ${testResult.counts.clientes}`
              : 'Na cache deste PC'}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-4.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Marcações Agenda</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{appointments.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {testResult?.counts?.agendamentos !== undefined
              ? `Nuvem: ${testResult.counts.agendamentos}`
              : 'Nuvem: sincronizado'}
          </div>
        </div>
      </div>

      {/* Secção de Ações Principais: Semeadura e Migração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cartão 1: Enviar Dados Locais para a Nuvem */}
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Enviar Dados Deste PC para o Supabase (Semear)
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Pega em todos os clientes ({clients.length}), salões, colaboradores e agendamentos existentes neste computador e grava-os na base de dados central na nuvem.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Resolve a falta de clientes no telemóvel e Vercel!</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Ao clicar neste botão, tudo o que tem registado aqui passa a estar disponível imediatamente em qualquer dispositivo conectado.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || !isCloudConfigured}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CloudUpload className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>
              {isExporting
                ? 'A carregar dados para o Supabase...'
                : 'Enviar Todos os Dados Locais para a Nuvem Agora'}
            </span>
          </button>
        </div>

        {/* Cartão 2: Sincronização & Puxar da Nuvem */}
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Sincronizar & Descarregar da Nuvem
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Puxa as últimas marcações e fichas de clientes da nuvem para manter este dispositivo 100% atualizado.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Sincronização Automática Ativa</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              O sistema sincroniza automaticamente em tempo real sempre que há novas marcações, mas pode forçar uma atualização manual se necessário.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSync}
              disabled={isSyncing || !isCloudConfigured}
              className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'A sincronizar...' : 'Sincronizar Agora'}</span>
            </button>

            <button
              onClick={handleImport}
              disabled={isImporting || !isCloudConfigured}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              <CloudDownload className={`w-4 h-4 ${isImporting ? 'animate-bounce' : ''}`} />
              <span>{isImporting ? 'A carregar...' : 'Importar da Nuvem'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guia Passo a Passo de Configuração */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-3xl space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Guia Rápido: Como Criar e Ligar a Base de Dados Supabase (3 Minutos)
              </h3>
              <p className="text-xs text-slate-400">
                Siga estes 3 passos simples para ter a base de dados a funcionar no Vercel e em todos os dispositivos
              </p>
            </div>
          </div>

          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors"
          >
            <span>Abrir Supabase.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-700/60 p-4.5 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-black">
              1
            </div>
            <h4 className="text-xs font-black text-white">Criar Projeto no Supabase</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Aceda a <b>supabase.com</b> (gratuito), crie conta e clique em <b>New Project</b>. Escolha um nome (ex: <code>SalãoMaster</code>) e uma região próxima (ex: Frankfurt).
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 p-4.5 rounded-2xl space-y-2 ring-1 ring-purple-500/30">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
              2
            </div>
            <h4 className="text-xs font-black text-white">Executar o Script SQL</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              No menu lateral do Supabase, clique em <b>SQL Editor</b>. Clique no botão abaixo para copiar o script completo, cole no Supabase e clique em <b>Run</b>.
            </p>
            <button
              onClick={copySqlToClipboard}
              className="mt-2 w-full py-2 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado para a Área de Transferência!' : 'Copiar Script SQL'}</span>
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 p-4.5 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-black">
              3
            </div>
            <h4 className="text-xs font-black text-white">Copiar as Chaves para a Vercel</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vá a <b>Project Settings → API</b> no Supabase. No painel do seu projeto na Vercel (<b>Settings → Environment Variables</b>), adicione:
              <br />
              <code className="text-teal-300 text-[10px]">VITE_SUPABASE_URL</code> e{' '}
              <code className="text-teal-300 text-[10px]">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Modal / Visualizador de Script SQL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Script SQL Completo para o Supabase SQL Editor
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cria as tabelas `saloes`, `utilizadores`, `servicos`, `clientes`, `agendamentos` e ativa Realtime
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copySqlToClipboard}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>

                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/70 select-all">
              <pre className="whitespace-pre-wrap">{fullSqlScript}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
