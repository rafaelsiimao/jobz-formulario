import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Task 1: Web App Scaffolding & Design System', () => {
  const rootDir = process.cwd();

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

  it('should have globals.css defined with all required WhatsApp design system CSS variables', () => {
    const cssPath = path.join(rootDir, 'src', 'app', 'globals.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('--bg-chat');
    expect(cssContent).toContain('--bg-header');
    expect(cssContent).toContain('--bg-bubble-bot');
    expect(cssContent).toContain('--bg-bubble-user');
    expect(cssContent).toContain('--text-main');
    expect(cssContent).toContain('--text-muted');
    expect(cssContent).toContain('--accent-green');
  });

  it('should have layout.tsx with correct title and HTML structure', () => {
    const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
    expect(fs.existsSync(layoutPath)).toBe(true);

    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    expect(layoutContent).toContain('Jobz');
    expect(layoutContent).toContain('globals.css');
  });

  it('should have page.tsx export default component for WhatsApp conversational UI', () => {
    const pagePath = path.join(rootDir, 'src', 'app', 'page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('export default function');
  });
});
