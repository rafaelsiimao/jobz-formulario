'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Bot, 
  CheckCheck, 
  Building2, 
  Mail,
  MoreVertical, 
  ShieldCheck 
} from 'lucide-react';

import { ChatOption } from '../types/chat';
import { useChatState, escapeHtml } from '../hooks/useChatState';

export function formatMessageHtml(text: string): string {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-xs">$1</code>');
}

export default function ChatWindow() {
  const {
    messages,
    clientData,
    isTyping,
    sendMessage,
    handleAttachment,
  } = useChatState();

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleOptionClick = (option: ChatOption) => {
    sendMessage(option.label || option.value);
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAttachment(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto border-x border-[#222d34] shadow-2xl bg-[#0b141a] text-[#e9edef]">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        accept=".pdf,.doc,.docx,audio/*,image/*"
        className="hidden"
        data-testid="file-input"
      />

      {/* WhatsApp Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-[#222d34] z-10">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#00a884] text-white font-bold">
            <Bot className="w-6 h-6" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#202c33] rounded-full" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-base leading-tight text-[#e9edef]">Jobz - Assistente de Vagas</h1>
              <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.5 rounded font-mono font-medium">Abler V2</span>
            </div>
            <p className="text-xs text-[#8696a0] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-[#00a884] rounded-full animate-pulse" />
              Online • Resposta Instantânea
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-[#8696a0]">
          {clientData?.cnpj && (
            <div 
              data-testid="cnpj-badge"
              className="hidden sm:flex items-center space-x-1 text-xs bg-[#2a3942] text-[#00a884] px-2.5 py-1 rounded-full border border-[#00a884]/30"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>CNPJ: {clientData.cnpj}</span>
            </div>
          )}
          {clientData?.email && !clientData?.cnpj && (
            <div 
              data-testid="email-badge"
              className="hidden sm:flex items-center space-x-1 text-xs bg-[#2a3942] text-[#00a884] px-2.5 py-1 rounded-full border border-[#00a884]/30"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email: {clientData.email}</span>
            </div>
          )}
          <button title="Suporte Jobz" className="hover:text-[#e9edef] transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </button>
          <button title="Menu" className="hover:text-[#e9edef] transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 whatsapp-bg" data-testid="chat-stream">
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`message-${msg.sender}`}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-lg shadow-sm ${
                msg.sender === 'user'
                  ? 'bubble-user bg-[#005c4b] text-[#e9edef]'
                  : 'bubble-bot bg-[#202c33] text-[#e9edef]'
              }`}
            >
              <div 
                className="text-sm whitespace-pre-wrap leading-relaxed space-y-2"
                data-testid="message-content"
                dangerouslySetInnerHTML={{
                  __html: formatMessageHtml(msg.text)
                }}
              />

              <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-[#8696a0]">
                <span>{msg.timestamp}</span>
                {msg.sender === 'user' && (
                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                )}
              </div>
            </div>

            {/* Quick Action Options */}
            {msg.options && msg.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 max-w-[85%] sm:max-w-[75%]" data-testid="options-container">
                {msg.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt)}
                    className="text-xs bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] font-medium border border-[#00a884]/40 px-3 py-1.5 rounded-full transition-all duration-150 flex items-center space-x-1 shadow-sm active:scale-95"
                    data-testid={`option-button-${opt.value || idx}`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start" data-testid="typing-indicator">
            <div className="bubble-bot bg-[#202c33] px-4 py-3 rounded-lg flex items-center space-x-1.5">
              <span className="w-2 h-2 bg-[#8696a0] rounded-full typing-dot" />
              <span className="w-2 h-2 bg-[#8696a0] rounded-full typing-dot" />
              <span className="w-2 h-2 bg-[#8696a0] rounded-full typing-dot" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* WhatsApp Input Footer */}
      <footer className="p-3 bg-[#202c33] border-t border-[#222d34]">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar documento ou áudio"
            className="p-2.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-full transition-colors"
            data-testid="paperclip-button"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite os dados da vaga ou cole o briefing..."
            className="flex-1 bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent"
            data-testid="chat-input"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-[#00a884] hover:bg-[#008f70] disabled:opacity-40 text-white rounded-full transition-all duration-150 shadow-md flex items-center justify-center"
            data-testid="send-button"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
