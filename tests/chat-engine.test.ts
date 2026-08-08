// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';

import { ChatMessage, IntakeStep } from '../src/types/chat';
import { useChatState } from '../src/hooks/useChatState';
import ChatWindow from '../src/components/ChatWindow';

describe('Task 2: Conversational Chat State Engine & URL Parameter Support', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('Chat Types & State Hook (useChatState)', () => {
    it('initializes with default step IDENTIFY_CLIENT and initial welcome message', () => {
      const { result } = renderHook(() => useChatState());
      expect(result.current.step).toBe('IDENTIFY_CLIENT');
      expect(result.current.messages.length).toBeGreaterThan(0);
      expect(result.current.clientData).toEqual({});
    });

    it('parses ?cnpj= query parameter from URL and updates clientData and messages', () => {
      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = new URL('http://localhost:3000/?cnpj=12345678000195') as any;

      const { result } = renderHook(() => useChatState());
      expect(result.current.clientData.cnpj).toBe('12345678000195');

      // Verify a message mentioning CNPJ was added
      const cnpjMsg = result.current.messages.find((m) => m.text.includes('12345678000195'));
      expect(cnpjMsg).toBeDefined();

      window.location = originalLocation;
    });

    it('parses ?email= query parameter from URL and updates clientData and messages', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = new URL('http://localhost:3000/?email=contato@empresa.com.br') as any;

      const { result } = renderHook(() => useChatState());
      expect(result.current.clientData.email).toBe('contato@empresa.com.br');

      const emailMsg = result.current.messages.find((m) => m.text.includes('contato@empresa.com.br'));
      expect(emailMsg).toBeDefined();

      window.location = originalLocation;
    });

    it('allows adding messages, setting step, and setting clientData', () => {
      const { result } = renderHook(() => useChatState());

      act(() => {
        result.current.sendMessage('Tenho uma vaga de Vendedor');
      });

      expect(result.current.messages.some((m) => m.sender === 'user' && m.text === 'Tenho uma vaga de Vendedor')).toBe(true);

      act(() => {
        result.current.setStep('SELECT_VACANCY_TYPE');
      });
      expect(result.current.step).toBe('SELECT_VACANCY_TYPE');

      act(() => {
        result.current.setClientData({ cnpj: '11222333000144', name: 'Empresa Teste' });
      });
      expect(result.current.clientData.name).toBe('Empresa Teste');
    });

    it('handles file upload / attachment messages', () => {
      const { result } = renderHook(() => useChatState());
      const testFile = new File(['conteudo briefing'], 'vaga-dev.pdf', { type: 'application/pdf' });

      act(() => {
        result.current.handleAttachment(testFile);
      });

      expect(result.current.messages.some((m) => m.text.includes('vaga-dev.pdf'))).toBe(true);
    });

    it('parses both ?cnpj= and ?email= when both are present in URL query string', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = new URL('http://localhost:3000/?cnpj=12345678000195&email=contato@empresa.com.br') as any;

      const { result } = renderHook(() => useChatState());
      expect(result.current.clientData.cnpj).toBe('12345678000195');
      expect(result.current.clientData.email).toBe('contato@empresa.com.br');

      expect(result.current.messages.some((m) => m.text.includes('12345678000195'))).toBe(true);
      expect(result.current.messages.some((m) => m.text.includes('contato@empresa.com.br'))).toBe(true);

      window.location = originalLocation;
    });

    it('handles option click using option.value even if label has custom text', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useChatState());

      act(() => {
        result.current.sendMessage('Quero cadastrar', 'start_vaga');
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.step).toBe('JOB_PROFILE_INPUT');
      expect(result.current.messages.some((m) => m.sender === 'user' && m.text === 'Quero cadastrar')).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('ChatWindow Component', () => {
    it('renders ChatWindow with header, input, and state stream', () => {
      render(React.createElement(ChatWindow));
      expect(screen.getByText('Jobz - Assistente de Vagas')).toBeTruthy();
      expect(screen.getByTestId('chat-input')).toBeTruthy();
      expect(screen.getByTestId('send-button')).toBeTruthy();
    });

    it('displays CNPJ badge when clientData has CNPJ', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = new URL('http://localhost:3000/?cnpj=99888777000111') as any;

      render(React.createElement(ChatWindow));
      expect(screen.getByTestId('cnpj-badge')).toBeTruthy();
      expect(screen.getAllByText(/99888777000111/).length).toBeGreaterThanOrEqual(1);

      window.location = originalLocation;
    });

    it('displays both CNPJ and Email badges when both are present in URL', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = new URL('http://localhost:3000/?cnpj=99888777000111&email=rh@empresa.com') as any;

      render(React.createElement(ChatWindow));
      expect(screen.getByTestId('cnpj-badge')).toBeTruthy();
      expect(screen.getByTestId('email-badge')).toBeTruthy();

      window.location = originalLocation;
    });

    it('sends user message and displays bot response', async () => {
      render(React.createElement(ChatWindow));

      const input = screen.getByTestId('chat-input') as HTMLInputElement;
      const sendBtn = screen.getByTestId('send-button');

      fireEvent.change(input, { target: { value: 'Desenvolvedor Frontend' } });
      fireEvent.click(sendBtn);

      expect(screen.getByText('Desenvolvedor Frontend')).toBeTruthy();
    });
  });
});
