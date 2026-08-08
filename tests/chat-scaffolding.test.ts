// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import ChatPage, { escapeHtml, formatMessageHtml } from '../src/app/page';

describe('Task 1: Web App Scaffolding & Design System', () => {
  const rootDir = process.cwd();

  describe('Static & File System Structure', () => {
    it('should have package.json configured with name jobz-vagas-chat and key dependencies', () => {
      const pkgPath = path.join(rootDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.name).toBe('jobz-vagas-chat');
      expect(pkg.dependencies.next).toBeDefined();
      expect(pkg.dependencies.react).toBeDefined();
      expect(pkg.dependencies['react-dom']).toBeDefined();
      expect(pkg.dependencies['lucide-react']).toBeDefined();
    });

    it('should have globals.css defined with all required Jobz design system CSS variables', () => {
      const cssPath = path.join(rootDir, 'src', 'app', 'globals.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('--color-blue-jobz');
      expect(cssContent).toContain('--color-blue-light');
      expect(cssContent).toContain('--color-black-institutional');
      expect(cssContent).toContain('--color-text-secondary');
      expect(cssContent).toContain('--color-text-tertiary');
      expect(cssContent).toContain('--color-bg-primary');
      expect(cssContent).toContain('--color-surface');
      expect(cssContent).toContain('--color-card');
      expect(cssContent).toContain('--color-line');
      expect(cssContent).toContain('--color-dark');
      expect(cssContent).toContain('--color-dark-surface');
      expect(cssContent).toContain('--effect-focus-ring');
      expect(cssContent).toContain('--effect-blue-glow');
      expect(cssContent).toContain('--font-primary');
      expect(cssContent).toContain('--font-mono');
      expect(cssContent).toContain('.sinal-em-escala');
      expect(cssContent).toContain(':focus-visible');
      expect(cssContent).toContain('min-height: 44px');
    });

    it('should have layout.tsx with correct title and HTML structure', () => {
      const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
      expect(fs.existsSync(layoutPath)).toBe(true);

      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      expect(layoutContent).toContain('Jobz');
      expect(layoutContent).toContain('globals.css');
    });
  });

  describe('Security & XSS Prevention', () => {
    it('should escape HTML characters strictly in escapeHtml helper', () => {
      const unsafeInput = '<script>alert("xss")</script> & \'malicious\'';
      const safeOutput = escapeHtml(unsafeInput);
      expect(safeOutput).not.toContain('<script>');
      expect(safeOutput).toContain('&lt;script&gt;');
      expect(safeOutput).toContain('&quot;xss&quot;');
      expect(safeOutput).toContain('&#039;malicious&#039;');
    });

    it('should safely render markdown bold/italic tags while neutralizing injected HTML tags', () => {
      const unsafeMsg = '<img src=x onerror=alert(1)> **Vaga Urgente**';
      const formatted = formatMessageHtml(unsafeMsg);
      expect(formatted).not.toContain('<img');
      expect(formatted).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(formatted).toContain('<strong>Vaga Urgente</strong>');
    });
  });

  describe('Runtime Component Behavior & Interactions', () => {
    // Mock scrollIntoView for DOM environment
    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn();
    });

    it('renders header, initial welcome messages, and quick action options', () => {
      render(React.createElement(ChatPage));

      expect(screen.getByText('Jobz - Assistente de Vagas')).toBeTruthy();
      expect(screen.getByText(/Seja bem-vindo ao assistente/i)).toBeTruthy();
      expect(screen.getByTestId('option-button-start_vaga')).toBeTruthy();
      expect(screen.getByTestId('option-button-send_briefing')).toBeTruthy();
    });

    it('allows user to type and send messages to update conversation state', async () => {
      render(React.createElement(ChatPage));

      const inputEl = screen.getByTestId('chat-input') as HTMLInputElement;
      const sendBtn = screen.getByTestId('send-button');

      fireEvent.change(inputEl, { target: { value: 'Desenvolvedor Full Stack' } });
      expect(inputEl.value).toBe('Desenvolvedor Full Stack');

      fireEvent.click(sendBtn);

      // Input resets
      expect(inputEl.value).toBe('');

      // User message rendered in stream
      expect(screen.getByText('Desenvolvedor Full Stack')).toBeTruthy();
    });

    it('sends message when clicking quick option buttons', async () => {
      render(React.createElement(ChatPage));

      const startBtn = screen.getByTestId('option-button-start_vaga');
      fireEvent.click(startBtn);

      // Verify that after clicking, multiple elements exist (the option button and the sent message bubble)
      const elements = screen.getAllByText('🚀 Iniciar Abertura de Vaga');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it('handles file attachments when clicking paperclip button and selecting a file', async () => {
      render(React.createElement(ChatPage));

      const paperclipBtn = screen.getByTestId('paperclip-button');
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, 'click');
      fireEvent.click(paperclipBtn);
      expect(clickSpy).toHaveBeenCalled();

      const testFile = new File(['dummy content'], 'briefing-vaga.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      expect(screen.getByText(/briefing-vaga.pdf/i)).toBeTruthy();
    });
  });
});
