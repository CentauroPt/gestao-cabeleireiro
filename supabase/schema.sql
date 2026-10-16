-- ============================================================
-- ESQUEMA SQL COMPLETO PARA SUPABASE
-- Sistema de Faturação por Subscrição Mensal (SaaS Cabeleireiros)
-- ============================================================

-- 1. Habilitar UUIDs (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Clientes SaaS (Salões / Contas Subscritoras)
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_saas_email ON clientes_saas (email);
CREATE INDEX IF NOT EXISTS idx_clientes_saas_estado ON clientes_saas (estado_subscricao);

-- 3. Tabela de Pagamentos de Subscrição
CREATE TABLE IF NOT EXISTS pagamentos_saas (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES clientes_saas(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valor NUMERIC(10, 2) NOT NULL,
  metodo TEXT NOT NULL CHECK (metodo IN ('transferencia', 'mbway')),
  estado TEXT NOT NULL CHECK (estado IN ('pendente', 'validado')) DEFAULT 'pendente',
  mes_referencia TEXT NOT NULL,
  comprovativo_ref TEXT,
  data_validacao TIMESTAMPTZ,
  notas_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente_id ON pagamentos_saas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_estado ON pagamentos_saas (estado);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes ON pagamentos_saas (mes_referencia);

-- 4. Tabela de Configurações Globais do Programador / Administrador
CREATE TABLE IF NOT EXISTS configuracoes_saas (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  iban TEXT NOT NULL DEFAULT 'PT50 0000 0000 0000 0000 0000 0',
  numero_mbway TEXT NOT NULL DEFAULT '912 345 678',
  numero_whatsapp TEXT NOT NULL DEFAULT '912 345 678',
  valor_mensal_padrao NUMERIC(10, 2) NOT NULL DEFAULT 29.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial se não existir
INSERT INTO configuracoes_saas (id, iban, numero_mbway, numero_whatsapp, valor_mensal_padrao)
VALUES ('global_config', 'PT50 0033 0000 4523 4567 8901 2', '912 345 678', '912 345 678', 29.00)
ON CONFLICT (id) DO NOTHING;

-- 5. Função e Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_saas_updated_at ON clientes_saas;
CREATE TRIGGER trg_clientes_saas_updated_at
BEFORE UPDATE ON clientes_saas
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_pagamentos_saas_updated_at ON pagamentos_saas;
CREATE TRIGGER trg_pagamentos_saas_updated_at
BEFORE UPDATE ON pagamentos_saas
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 6. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE clientes_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_saas ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas anónimas para ligação de API Key (frontend client)
CREATE POLICY "Permitir leitura pública de configurações" ON configuracoes_saas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura e escrita de clientes" ON clientes_saas FOR ALL USING (true);
CREATE POLICY "Permitir leitura e inserção de pagamentos" ON pagamentos_saas FOR ALL USING (true);
