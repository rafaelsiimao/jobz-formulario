import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, IntakeStep, ClientData, ChatOption } from '../types/chat';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'bot',
    text: '👋 Olá! Seja bem-vindo ao assistente de **Abertura de Vagas Jobz**.',
    timestamp: formatTime(new Date()),
  },
  {
    id: 'welcome-2',
    sender: 'bot',
    text: 'Estou aqui para te ajudar a cadastrar sua nova vaga na plataforma Abler de forma rápida e automatizada.\n\nComo gostaria de começar?',
    timestamp: formatTime(new Date()),
    options: [
      { label: '🚀 Iniciar Abertura de Vaga', value: 'start_vaga' },
      { label: '📄 Enviar Descrição / Briefing (PDF/Texto)', value: 'send_briefing' },
      { label: '❓ Como funciona?', value: 'help' },
    ],
  },
];

export function useChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [step, setStep] = useState<IntakeStep>('IDENTIFY_CLIENT');
  const [clientData, setClientData] = useState<ClientData>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const cnpjParam = params.get('cnpj');
      const emailParam = params.get('email');

      if (cnpjParam) {
        const safeCnpj = escapeHtml(cnpjParam);
        setClientData((prev) => ({ ...prev, cnpj: safeCnpj }));
        setMessages((prev) => {
          if (prev.some((m) => m.id.startsWith('cnpj-detected-'))) return prev;
          return [
            ...prev,
            {
              id: `cnpj-detected-${Date.now()}`,
              sender: 'bot',
              text: `🏢 **Empresa identificada via CNPJ:** \`${safeCnpj}\`\nBuscando dados cadastrais no Agendor CRM...`,
              timestamp: formatTime(new Date()),
            },
          ];
        });
      }
      if (emailParam) {
        const safeEmail = escapeHtml(emailParam);
        setClientData((prev) => ({ ...prev, email: safeEmail }));
        setMessages((prev) => {
          if (prev.some((m) => m.id.startsWith('email-detected-'))) return prev;
          return [
            ...prev,
            {
              id: `email-detected-${Date.now()}`,
              sender: 'bot',
              text: `📧 **Cliente identificado via Email:** \`${safeEmail}\`\nBuscando dados cadastrais no Agendor CRM...`,
              timestamp: formatTime(new Date()),
            },
          ];
        });
      }
    }
  }, []);

  const sendMessage = useCallback((textToSend: string, optionValue?: string) => {
    const content = textToSend.trim();
    if (!content) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = content.toLowerCase();
      const valueLower = (optionValue || '').toLowerCase();
      let botResponseText = `Recebido: "${content}".\n\nPara prosseguir com o cadastro da vaga, informe o **título da vaga** ou envie o **briefing em texto/PDF**.`;
      let nextOptions: ChatOption[] | undefined;

      if (
        valueLower === 'start_vaga' ||
        lower.includes('iniciar') ||
        lower.includes('vaga') ||
        lower.includes('start_vaga')
      ) {
        botResponseText = 'Perfeito! Vamos começar.\n\n1️⃣ Qual é o **título da vaga**? (Ex: *Assistente Administrativo*, *Desenvolvedor React*)';
        setStep('JOB_PROFILE_INPUT');
      } else if (
        valueLower === 'send_briefing' ||
        lower.includes('briefing') ||
        lower.includes('descrição') ||
        lower.includes('send_briefing')
      ) {
        botResponseText = 'Ótimo! Você pode colar a descrição completa da vaga aqui no chat ou anexar um documento (PDF/Word/Áudio) usando o ícone de clipe 📎.';
        setStep('JOB_PROFILE_INPUT');
      } else if (
        valueLower === 'help' ||
        lower.includes('como funciona') ||
        lower.includes('ajuda') ||
        lower.includes('help')
      ) {
        botResponseText = '💡 **Como Funciona:**\n\n1. Você informa os dados da vaga ou envia um briefing.\n2. Nosso sistema consulta a empresa no Agendor CRM e formata os dados com IA.\n3. Criamos o rascunho da vaga na plataforma Abler.\n4. O recrutador é notificado para publicar!\n\nPronto para tentar?';
        nextOptions = [{ label: '🚀 Iniciar Abertura de Vaga', value: 'start_vaga' }];
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botResponseText,
          timestamp: formatTime(new Date()),
          options: nextOptions,
        },
      ]);
    }, 500);
  }, []);

  const handleAttachment = useCallback((file: File) => {
    const userMsg: ChatMessage = {
      id: `user-file-${Date.now()}`,
      sender: 'user',
      text: `📎 **Anexo enviado:** ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      timestamp: formatTime(new Date()),
      attachments: [{ name: file.name, size: file.size, type: file.type }],
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-file-${Date.now()}`,
          sender: 'bot',
          text: `📄 Recebi o anexo **${file.name}**. Estou extraindo o conteúdo do briefing para cadastrar a vaga...`,
          timestamp: formatTime(new Date()),
        },
      ]);
      setStep('JOB_PROFILE_INPUT');
    }, 500);
  }, []);

  return {
    messages,
    setMessages,
    step,
    setStep,
    clientData,
    setClientData,
    isTyping,
    sendMessage,
    handleAttachment,
  };
}
