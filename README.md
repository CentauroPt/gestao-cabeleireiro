# SalonMaster Pro - Gestão & Agendamento para Cabeleireiros (Frontend)

Aplicação web moderna para salões de cabeleireiro desenvolvida em **React 19 + TypeScript + Tailwind CSS**, desenhada com arquitetura **Multi-Salão (Multi-tenant)** e **Controlo de Acessos Baseado em Funções (RBAC)**.

---

## 🌟 Funcionalidades Principais

### 1. Gestão de Clientes & Retenção Inteligente (CRM)
- **Ficha Técnica & Fórmulas:** Registo de fórmulas de coloração, alergias (ex.: sensibilidade a amoníaco/PPD), cortes preferenciais e preferências.
- **Histórico Completo de Visitas:** Registo de serviços realizados, datas e valor pago em cada atendimento.
- **Métricas de Gastos:** Total acumulado (€), número de visitas e ticket médio por visita.
- **Alertas de Inatividade & Ausência:**
  - 🟢 **Recente (< 30 dias):** Cliente ativo com frequência habitual.
  - 🟡 **Atenção (30 a 60 dias):** Ultrapassou o ciclo normal de retorno.
  - 🔴 **Alerta / Ausente (+ 60 dias):** Alerta visual com botão direto para envio de mensagem de reativação via **WhatsApp**.
- **Associação a Profissional:** Possibilidade de fixar o cabeleireiro habitual do cliente.

### 2. Agenda de Reservas & Calendário Inteligente
- **Interface Intuitiva:** Vista de salão em colunas por colaborador (estilo receção) e lista cronológica diária.
- **Regra Anti-Sobreposição Estrita:** O sistema calcula a hora de término com base na duração dos serviços escolhidos e **bloqueia marcações no mesmo horário para o mesmo profissional**, prevenindo colisões de agenda.
- **Colaboração Aberta:** Qualquer colaborador pode marcar serviços para si ou para outro colega de equipa.

### 3. Perfis e Permissões de Acesso (RBAC)
- **Administrador do Salão:**
  - Pode adicionar, editar e desativar colaboradores.
  - Pode gerir o catálogo de serviços e preços.
  - **Apenas o Administrador pode apagar ou cancelar reservas definitivamente.**
  - Acesso total à gestão de clientes e relatórios.
- **Colaborador / Estilista:**
  - Pode registar novos clientes.
  - Pode marcar reservas para qualquer colaborador.
  - Pode concluir serviços e consultar fichas técnicas.
  - **NÃO pode apagar clientes, reservas ou serviços.** Os controlos de eliminação ficam desativados/bloqueados.

---

## 🚀 Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Compilar para produção
npm run build
```

---

## 🔌 Ligação ao Servidor Backend

O frontend foi desenhado para ligar-se facilmente à sua API REST no seu servidor web.

1. Crie um ficheiro `.env` baseado no `.env.example`:
   ```bash
   VITE_API_BASE_URL=https://o-seu-servidor.pt/api
   ```
2. Caso a variável não esteja configurada ou o servidor esteja temporariamente indisponível, a aplicação ativa automaticamente o modo de cache/armazenamento local com dados realistas demonstrativos em português.
3. Consulte o separador **"Backend & Endpoints"** na aplicação para ver o esquema de tabelas SQL e a especificação dos endpoints REST recomendados.
