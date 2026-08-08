# Jobz Carreira - Formulário de Vagas Concluído 🚀

O projeto de migração de chatbot para o novo Formulário Executivo Web foi **100% concluído**. Todo o código foi mesclado com sucesso na branch `main` do seu projeto.

## O que foi construído?

1. **Design System & Tokens (Task 1):** Implementamos o padrão premium de cores, fontes, sombras e anéis de foco (`focus-visible`) que representam a identidade da Jobz (variáveis CSS criadas em `globals.css`).
2. **Tipagem Estrita (Task 2):** Criamos a modelagem de dados sólida em TypeScript (`src/types/jobz-form.ts`), eliminando contratos proibidos ("Temporário", "Associado") direto na raiz do projeto. 
3. **Formulário Multi-Etapas (Task 3):** Substituímos o componente antigo por um assistente moderno (`JobzIntakeForm.tsx`) contendo:
   - Identificação com máscara automática de CNPJ (simulando preenchimento).
   - Cards visuais (estilo Bento) para as modalidades de serviço (CLT/PJ vs Estágio).
   - Condicionais inteligentes para exibir apenas as perguntas necessárias de cada tipo de serviço.
   - Padrão **UI/UX Pro Max** com alvos de clique mínimos de 44px (touch targets) perfeitos para preenchimento via mobile.
4. **Integração com Abler & n8n (Task 4):** Desenvolvemos a ponte de envio (via *Server Actions*) que dispara o payload para o seu webhook e geramos o Blueprint do n8n que vai mapear isso para a Abler e enviar o e-mail de alerta.

## Blueprint do n8n

O arquivo com o fluxo completo do n8n foi salvo dentro do projeto:
[`docs/n8n/workflow_abertura_vagas_abler.json`](file:///c:/Users/Usuario/Desktop/Superpower/docs/n8n/workflow_abertura_vagas_abler.json)

> [!TIP]
> **Como importar no n8n:**
> 1. Abra seu painel do n8n.
> 2. Clique em **Add Workflow**.
> 3. No menu superior direito (três pontinhos), selecione **Import from File**.
> 4. Selecione o arquivo json gerado na pasta `docs/n8n/` do seu projeto.

## Deploy

Para colocar o projeto no ar:
1. Crie um repositório no **GitHub** e suba essa pasta `Superpower`.
2. Conecte o repositório na **Vercel**.
3. Na Vercel, vá em *Environment Variables* e cadastre o link gerado pelo Node de Webhook do n8n (Production URL) na chave `N8N_WEBHOOK_URL`.

A aplicação já pode ir para o ar!
