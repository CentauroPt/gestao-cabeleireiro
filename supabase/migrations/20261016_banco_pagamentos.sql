-- ==============================================================================
-- SISTEMA DE PAGAMENTO BANCÁRIO ONLINE COM DESBLOQUEIO AUTOMÁTICO DE ACESSO
-- Tabelas: clientes, pagamentos, eventos_webhook
-- Trigger: Desbloqueio imediato do cliente ao confirmar pagamento
-- ==============================================================================

-- 1. Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tipos Enum
DO $$ BEGIN
  CREATE TYPE estado_acesso_enum AS ENUM ('bloqueado', 'ativo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_pagamento_enum AS ENUM ('pendente', 'pago', 'falhado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  estado_acesso estado_acesso_enum NOT NULL DEFAULT 'bloqueado',
  data_desbloqueio TIMESTAMPTZ,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes (email);
CREATE INDEX IF NOT EXISTS idx_clientes_estado_acesso ON clientes (estado_acesso);

-- 4. Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'EUR',
  estado estado_pagamento_enum NOT NULL DEFAULT 'pendente',
  referencia_bancaria TEXT NOT NULL UNIQUE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_confirmacao TIMESTAMPTZ,
  metodo_detalhe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_cliente_id ON pagamentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_ref_bancaria ON pagamentos (referencia_bancaria);
CREATE INDEX IF NOT EXISTS idx_pagamentos_estado ON pagamentos (estado);

-- 5. Tabela de Eventos Webhook (Idempotência e Auditoria)
CREATE TABLE IF NOT EXISTS eventos_webhook (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pagamento_id UUID REFERENCES pagamentos(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado BOOLEAN NOT NULL DEFAULT false,
  origem TEXT DEFAULT 'stripe'
);

CREATE INDEX IF NOT EXISTS idx_eventos_webhook_pagamento_id ON eventos_webhook (pagamento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_webhook_recebido_em ON eventos_webhook (recebido_em DESC);

-- 6. Função e Trigger para Desbloqueio Automático Imediato
CREATE OR REPLACE FUNCTION fn_processar_desbloqueio_pagamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o estado do pagamento mudou para 'pago' e ainda não tinha confirmação
  IF NEW.estado = 'pago' AND (OLD.estado IS DISTINCT FROM 'pago' OR NEW.data_confirmacao IS NULL) THEN
    -- Define data de confirmação se não fornecida
    IF NEW.data_confirmacao IS NULL THEN
      NEW.data_confirmacao := NOW();
    END IF;

    -- Desbloqueia automaticamente o cliente sem intervenção manual
    UPDATE clientes
    SET 
      estado_acesso = 'ativo',
      data_desbloqueio = NOW(),
      updated_at = NOW()
    WHERE id = NEW.cliente_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_desbloqueio_automatico_pagamento ON pagamentos;

CREATE TRIGGER trg_desbloqueio_automatico_pagamento
BEFORE UPDATE OR INSERT ON pagamentos
FOR EACH ROW
EXECUTE FUNCTION fn_processar_desbloqueio_pagamento();

-- 7. Ativar Realtime para propagação instantânea de desbloqueio
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE pagamentos;
