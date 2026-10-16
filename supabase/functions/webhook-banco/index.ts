// Supabase Edge Function: webhook-banco
// Recebe notificações de checkout bancário (Stripe / Gateway Bancário)
// Valida assinatura criptográfica, garante idempotência e desbloqueia o cliente automaticamente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

interface WebhookBody {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      client_reference_id?: string;
      customer_email?: string;
      payment_status?: string;
      status?: string;
      amount_total?: number;
      currency?: string;
      metadata?: {
        cliente_id?: string;
        pagamento_id?: string;
      };
    };
  };
  // Formato direto de gateway bancário alternativo
  pagamento_id?: string;
  referencia_bancaria?: string;
  estado?: string;
  valor?: number;
}

serve(async (req: Request) => {
  // Tratar pedidos OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature") || req.headers.get("x-signature");
    const rawBody = await req.text();

    // 1. Validação de Assinatura (se configurada em produção)
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      // Validação de assinatura HMAC
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Assinatura do webhook inválida.");
        return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload: WebhookBody = JSON.parse(rawBody);
    console.log("Notificação de pagamento recebida:", payload.type || payload.estado);

    // Identificar ID do pagamento e cliente a partir do evento
    let pagamentoId = payload.data?.object?.metadata?.pagamento_id || payload.pagamento_id;
    const refBancaria = payload.data?.object?.id || payload.referencia_bancaria;
    const clienteId = payload.data?.object?.metadata?.cliente_id || payload.data?.object?.client_reference_id;
    const isPaid =
      payload.type === "checkout.session.completed" ||
      payload.type === "payment_intent.succeeded" ||
      payload.data?.object?.payment_status === "paid" ||
      payload.estado === "pago";

    // 2. Garantir Idempotência: verificar se o evento já foi processado
    const eventId = payload.id || `evt_${refBancaria}_${payload.type || payload.estado}`;
    const { data: existingEvent } = await supabaseClient
      .from("eventos_webhook")
      .select("id, processado")
      .eq("payload->>id", eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processado) {
      console.log(`Evento ${eventId} já processado anteriormente (idempotência garantida).`);
      return new Response(JSON.stringify({ message: "Evento já processado", ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se não tivermos pagamento_id direto, procurar pela referência bancária
    if (!pagamentoId && refBancaria) {
      const { data: pag } = await supabaseClient
        .from("pagamentos")
        .select("id, cliente_id, estado")
        .eq("referencia_bancaria", refBancaria)
        .maybeSingle();
      if (pag) {
        pagamentoId = pag.id;
      }
    }

    // 3. Registar o evento recebido na tabela de auditoria
    const { data: newEvent } = await supabaseClient
      .from("eventos_webhook")
      .insert({
        pagamento_id: pagamentoId || null,
        payload: { ...payload, id: eventId },
        recebido_em: new Date().toISOString(),
        processado: false,
        origem: signature ? "stripe_verified" : "gateway_banco",
      })
      .select("id")
      .single();

    // 4. Executar desbloqueio imediato se o pagamento for confirmado
    if (isPaid && (pagamentoId || clienteId)) {
      const now = new Date().toISOString();

      if (pagamentoId) {
        // Atualizar estado do pagamento para "pago"
        // O trigger SQL atualizará o cliente para "ativo" automaticamente
        await supabaseClient
          .from("pagamentos")
          .update({
            estado: "pago",
            data_confirmacao: now,
          })
          .eq("id", pagamentoId);
      }

      if (clienteId) {
        // Garantir atualização explícita do cliente
        await supabaseClient
          .from("clientes")
          .update({
            estado_acesso: "ativo",
            data_desbloqueio: now,
          })
          .eq("id", clienteId);
      }

      // Marcar evento como processado com sucesso
      if (newEvent?.id) {
        await supabaseClient
          .from("eventos_webhook")
          .update({ processado: true })
          .eq("id", newEvent.id);
      }

      console.log(`Sucesso: Pagamento ${pagamentoId} confirmado e acesso desbloqueado.`);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: isPaid ? "Pagamento confirmado — acesso desbloqueado" : "Notificação registada",
        pagamento_id: pagamentoId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro ao processar webhook bancário:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Função auxiliar simples para validação de assinatura HMAC
async function verifySignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const parts = sigHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) return false;

    const timestamp = timestampPart.replace("t=", "");
    const expectedSignature = signaturePart.replace("v1=", "");
    const signedPayload = `${timestamp}.${payload}`;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const calculatedHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return calculatedHex === expectedSignature;
  } catch {
    return false;
  }
}
