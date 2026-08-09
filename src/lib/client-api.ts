/**
 * Client-side API helpers — chamam as rotas nativas do Next.js.
 * Este arquivo NÃO tem "use server" e roda no navegador do usuário.
 */

import { JobzFormData } from '@/types/jobz-form';

export async function lookupCnpjInAgendor(cnpj: string): Promise<{ found: boolean; name?: string }> {
  try {
    const res = await fetch('/api/agendor-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj }),
    });

    if (!res.ok) {
      throw new Error(`Erro na consulta [${res.status}]`);
    }

    return await res.json();
  } catch (error) {
    console.error('Falha ao consultar Agendor:', error);
    return { found: false };
  }
}

export async function submitForm(data: JobzFormData): Promise<void> {
  const res = await fetch('/api/submit-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || `Erro ao enviar formulário [${res.status}]`);
  }
}
