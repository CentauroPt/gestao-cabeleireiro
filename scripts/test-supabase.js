import { createClient } from '@supabase/supabase-js';

const url = 'https://ixpislhiomtbapjltahl.supabase.co';
const anonKey = 'sb_publishable_L2qxROhDV4CH6t1mn47B6g_n8d8Kwh0';

console.log('A testar ligação ao Supabase...');
console.log('URL:', url);
console.log('Chave:', anonKey.substring(0, 15) + '...');

const supabase = createClient(url, anonKey);

async function testConnection() {
  try {
    // 1. Tentar ler da tabela saloes
    const { data: saloes, error: saloesError } = await supabase.from('saloes').select('id, nome').limit(5);
    if (saloesError) {
      console.log('⚠️ Tabela saloes:', saloesError.message, '(Código:', saloesError.code, ')');
    } else {
      console.log('✅ Tabela saloes acessível! Registos encontrados:', saloes?.length || 0);
    }

    // 2. Tentar ler da tabela clientes
    const { data: clientes, error: clientesError } = await supabase.from('clientes').select('id, nome').limit(5);
    if (clientesError) {
      console.log('⚠️ Tabela clientes:', clientesError.message, '(Código:', clientesError.code, ')');
    } else {
      console.log('✅ Tabela clientes acessível! Registos encontrados:', clientes?.length || 0);
    }

    // 3. Tentar ler da tabela agendamentos
    const { data: agendamentos, error: agendamentosError } = await supabase.from('agendamentos').select('id, status').limit(5);
    if (agendamentosError) {
      console.log('⚠️ Tabela agendamentos:', agendamentosError.message, '(Código:', agendamentosError.code, ')');
    } else {
      console.log('✅ Tabela agendamentos acessível! Registos encontrados:', agendamentos?.length || 0);
    }

    // 4. Tentar ler da tabela utilizadores
    const { data: utilizadores, error: utilizadoresError } = await supabase.from('utilizadores').select('id, nome').limit(5);
    if (utilizadoresError) {
      console.log('⚠️ Tabela utilizadores:', utilizadoresError.message, '(Código:', utilizadoresError.code, ')');
    } else {
      console.log('✅ Tabela utilizadores acessível! Registos encontrados:', utilizadores?.length || 0);
    }

    // 5. Tentar ler da tabela servicos
    const { data: servicos, error: servicosError } = await supabase.from('servicos').select('id, nome').limit(5);
    if (servicosError) {
      console.log('⚠️ Tabela servicos:', servicosError.message, '(Código:', servicosError.code, ')');
    } else {
      console.log('✅ Tabela servicos acessível! Registos encontrados:', servicos?.length || 0);
    }

  } catch (err) {
    console.error('Erro inesperado na ligação:', err);
  }
}

testConnection();
