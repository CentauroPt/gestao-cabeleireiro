import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import { bankPaymentService } from '../../services/bankPaymentService';
import type { PagamentoBancario, ClienteAcesso } from '../../types/bankPayment';

export const OwnerPaymentsPanel: React.FC = () => {
  const [pagamentos, setPagamentos] = useState<PagamentoBancario[]>([]);
  const [clientes, setClientes] = useState<ClienteAcesso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pago' | 'pendente' | 'falhado'>('ALL');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { pagamentos: pList, clientes: cList } = await bankPaymentService.getAllPayments();
      setPagamentos(pList);
      setClientes(cList);
    } catch (err) {
      console.error('Erro ao carregar dados bancários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Atualização em tempo real quando houver desbloqueio
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('sigec_bank_unlocked', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('sigec_bank_unlocked', handleUpdate);
    };
  }, []);

  const handleSimulateWebhook = async (pagamentoId: string, clienteNome: string) => {
    try {
      const res = await bankPaymentService.processBankWebhookConfirmation(pagamentoId);
      if (res.success) {
        setActionSuccess(`Webhook processado: Pagamento de "${clienteNome}" confirmado e acesso desbloqueado!`);
        await loadData();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      alert(`Erro ao processar webhook: ${err.message}`);
    }
  };

  // Filtragem
  const filteredPagamentos = pagamentos.filter((p) => {
    const cliente = clientes.find((c) => c.id === p.cliente_id);
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (cliente?.nome || '').toLowerCase().includes(q) ||
      (cliente?.email || '').toLowerCase().includes(q) ||
      p.referencia_bancaria.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || p.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPago = pagamentos
    .filter((p) => p.estado === 'pago')
    .reduce((sum, p) => sum + p.valor, 0);

  const totalPendente = pagamentos
    .filter((p) => p.estado === 'pendente')
    .reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner Principal - Design Bancário Sóbrio (Azul-Marinho & Branco) */}
      <div className="bg-[#0F172A] border border-slate-700/80 text-white p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold border border-blue-500/20 mb-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Sistema Integrado de Pagamentos & Desbloqueio Automático</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Painel de Pagamentos Bancários (Dono)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Supervisão em tempo real das liquidações online, confirmação por webhook bancário e estado de desbloqueio imediato dos clientes.
          </p>
        </div>

        {/* Métricas Rápidas */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#1E293B] border border-slate-700 rounded-2xl px-4 py-2.5 text-center">
            <span className="block text-xs uppercase tracking-wider font-bold text-slate-400">Total Liquidado</span>
            <span className="text-xl font-black text-emerald-400">{totalPago.toFixed(2)}€</span>
          </div>

          <div className="bg-[#1E293B] border border-slate-700 rounded-2xl px-4 py-2.5 text-center">
            <span className="block text-xs uppercase tracking-wider font-bold text-slate-400">Pendente Banco</span>
            <span className="text-xl font-black text-amber-400">{totalPendente.toFixed(2)}€</span>
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Atualizar dados bancários"
            className="p-3 bg-[#1E293B] hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por cliente, email ou referência bancária..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#1E293B] border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-[#1E293B] border border-slate-700 rounded-xl text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">Todos os Estados</option>
            <option value="pago">Apenas Pagos (Verde)</option>
            <option value="pendente">Apenas Pendentes (Amarelo)</option>
            <option value="falhado">Apenas Falhados (Vermelho)</option>
          </select>
        </div>
      </div>

      {/* Tabela de Pagamentos e Clientes */}
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/80 bg-[#1E293B]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Cliente / Identificação</th>
                <th className="py-3.5 px-4">Referência Bancária</th>
                <th className="py-3.5 px-4 text-center">Estado do Pagamento</th>
                <th className="py-3.5 px-4 text-center">Estado de Acesso</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4">Data de Criação</th>
                <th className="py-3.5 px-4">Data de Desbloqueio</th>
                <th className="py-3.5 px-4 text-right">Ação / Webhook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredPagamentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Nenhum pagamento localizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredPagamentos.map((p) => {
                  const cliente = clientes.find((c) => c.id === p.cliente_id);
                  const isPago = p.estado === 'pago';
                  const isPendente = p.estado === 'pendente';
                  const isFalhado = p.estado === 'falhado';
                  const isAtivo = cliente?.estado_acesso === 'ativo' || isPago;

                  const dataCriacaoFormatada = new Date(p.data_criacao).toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const dataDesbloqueioFormatada = cliente?.data_desbloqueio || p.data_confirmacao
                    ? new Date(cliente?.data_desbloqueio || p.data_confirmacao!).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  return (
                    <tr key={p.id} className="hover:bg-[#1E293B]/40 transition-colors">
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{cliente?.nome || 'Cliente Desconhecido'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cliente?.email || '—'}</div>
                      </td>

                      {/* Referência Bancária */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        {p.referencia_bancaria}
                      </td>

                      {/* Estado do Pagamento (Verde pago, amarelo pendente, vermelho falhado) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPago
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isPendente
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPago && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {isPendente && <Clock className="w-3 h-3 text-amber-400" />}
                          {isFalhado && <XCircle className="w-3 h-3 text-rose-400" />}
                          <span>{p.estado}</span>
                        </span>
                      </td>

                      {/* Estado de Acesso */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            isAtivo
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {isAtivo ? (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-400" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-400" />
                              <span>Bloqueado</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 text-right font-black text-white">
                        {p.valor.toFixed(2)} {p.moeda}
                      </td>

                      {/* Data de Criação */}
                      <td className="py-3.5 px-4 text-slate-400">{dataCriacaoFormatada}</td>

                      {/* Data de Desbloqueio */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {dataDesbloqueioFormatada}
                      </td>

                      {/* Ação: Simular Webhook do Banco */}
                      <td className="py-3.5 px-4 text-right">
                        {isPendente ? (
                          <button
                            type="button"
                            onClick={() => handleSimulateWebhook(p.id, cliente?.nome || 'Cliente')}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs flex items-center gap-1 ml-auto cursor-pointer"
                            title="Dispara a notificação bancária automática via Webhook para desbloqueio imediato"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>Simular Webhook</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Desbloqueado</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
