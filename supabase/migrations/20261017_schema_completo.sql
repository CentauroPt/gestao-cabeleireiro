-- ============================================================
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
END $$;
