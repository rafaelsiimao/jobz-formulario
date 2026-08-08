# Automação de Abertura de Vagas na Abler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate job vacancy intake via a modern WhatsApp-inspired conversational Web UI (Next.js/React on Vercel), integrating n8n, Agendor CRM, OpenAI/Claude, and Abler API V2.

**Architecture:** A lightweight, mobile-first React/Next.js conversational web application deployed on Vercel. It collects client requests step-by-step (with URL `?cnpj=...` support), calls an n8n webhook for Agendor CRM lookup and AI formatting, creates draft vacancies on Abler API V2, adds raw briefing notes, and alerts internal recruiters.

**Tech Stack:** Next.js (App Router), React, Vanilla CSS / TailwindCSS, n8n, Agendor CRM API, OpenAI API, Abler ATS API V2.

## Global Constraints
- Target platform: Next.js on Vercel + n8n webhook backend.
- Abler API endpoint: `https://hulk-smash.abler.com.br` (Production) / `https://hulk-smash.getabler.com` (Staging).
- Abler Auth header: `X-API-INT-TOKEN`.
- Mobile-first, WhatsApp-style chat aesthetic with typing indicators, audio/PDF upload support, and quick buttons.

---

### Task 1: Web App Scaffolding & Design System (Next.js Conversational UI)

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

**Interfaces:**
- Consumes: Next.js standard project setup.
- Produces: Base layout and WhatsApp dark/light themed styling system.

- [x] **Step 1: Create package.json and Next.js configuration**

```json
{
  "name": "jobz-vagas-chat",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "lucide-react": "^0.378.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

- [x] **Step 2: Create WhatsApp aesthetic CSS styles in globals.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg-chat: #0b141a;
  --bg-header: #202c33;
  --bg-bubble-bot: #202c33;
  --bg-bubble-user: #005c4b;
  --text-main: #e9edef;
  --text-muted: #8696a0;
  --accent-green: #00a884;
}

body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-chat);
  color: var(--text-main);
}
```

- [x] **Step 3: Commit Scaffolding**

```bash
git add package.json src/
git commit -m "feat: scaffold WhatsApp-inspired conversational UI"
```

---

### Task 2: Conversational Chat State Engine & URL Parameter Support

**Files:**
- Create: `src/types/chat.ts`
- Create: `src/hooks/useChatState.ts`
- Create: `src/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: URL query parameter `?cnpj=...` or `?email=...`.
- Produces: Chat message state machine, step controller, attachment handler.

- [x] **Step 1: Define Chat Types in `src/types/chat.ts`**

```typescript
export type MessageSender = 'bot' | 'user';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  options?: { label: string; value: string }[];
  isTyping?: boolean;
}

export type IntakeStep = 
  | 'IDENTIFY_CLIENT' 
  | 'NEW_CLIENT_REGISTER' 
  | 'SELECT_VACANCY_TYPE' 
  | 'VACANCY_METHOD' 
  | 'JOB_PROFILE_INPUT' 
  | 'CONFIRMATION';
```

- [x] **Step 2: Implement Chat State Hook `src/hooks/useChatState.ts`**

```typescript
import { useState, useEffect } from 'react';
import { ChatMessage, IntakeStep } from '../types/chat';

export function useChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<IntakeStep>('IDENTIFY_CLIENT');
  const [clientData, setClientData] = useState<any>(null);

  return { messages, setMessages, step, setStep, clientData, setClientData };
}
```

- [x] **Step 3: Commit Chat Engine**

```bash
git add src/types/ src/hooks/ src/components/
git commit -m "feat: add conversational state engine and chat window"
```

---

### Task 3: n8n Workflow Configuration & Integrations

**Files:**
- Create: `docs/n8n/workflow_abertura_vagas_abler.json`

**Interfaces:**
- Consumes: Frontend Webhook Payload (`/api/v1/abrir-vaga`).
- Produces: Agendor CRM lookup, AI formatting, Abler Vacancy Draft & Timeline Note.

- [x] **Step 1: Document n8n Node Sequence in JSON blueprint**

```json
{
  "name": "Jobz - Automação Abertura de Vagas Abler",
  "nodes": [
    { "name": "Webhook Intake", "type": "n8n-nodes-base.webhook" },
    { "name": "Agendor CNPJ Lookup", "type": "n8n-nodes-base.httpRequest" },
    { "name": "OpenAI Formatter", "type": "n8n-nodes-base.openAi" },
    { "name": "Abler Create Customer (If new)", "type": "n8n-nodes-base.httpRequest" },
    { "name": "Abler Create Vacancy (POST process_data)", "type": "n8n-nodes-base.httpRequest" },
    { "name": "Abler Update Description (PATCH role_description)", "type": "n8n-nodes-base.httpRequest" },
    { "name": "Abler Add Original Briefing (POST add_occurrence)", "type": "n8n-nodes-base.httpRequest" },
    { "name": "Notify Team", "type": "n8n-nodes-base.emailSend" }
  ]
}
```

- [x] **Step 2: Commit n8n Workflow Blueprint**

```bash
git add docs/n8n/
git commit -m "feat: create n8n workflow blueprint for Agendor, OpenAI, and Abler"
```

---

### Task 4: End-to-End Testing & Verification

**Files:**
- Create: `tests/webhook_simulation.test.ts`

- [x] **Step 1: Test Payload Structure against Abler Swagger API**

```typescript
// Test simulation sending mock payload to n8n webhook
const mockPayload = {
  cnpj: "12345678000199",
  vacancyType: "CLT",
  title: "Desenvolvedor Full Stack",
  rawBriefing: "Precisamos de um dev Node.js e React com 2 anos de xp."
};
```

- [x] **Step 2: Verify Draft Vacancy in Abler Staging Environment**

Run manual test calling `POST /api/company/v1/vacancies` on `https://hulk-smash.getabler.com`.
Expected: `201 Created` with status `draft`.

- [x] **Step 3: Final Commit**

```bash
git add tests/
git commit -m "test: verify end-to-end payload mapping for Abler ATS API"
```
