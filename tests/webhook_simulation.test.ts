import { describe, it, expect, vi } from 'vitest';
import {
  transformWebhookPayloadToAblerPayload,
  createAblerDraftVacancy,
  WebhookPayload,
} from '../src/lib/abler-api';

describe('Webhook Intake & Abler API E2E Payload Simulation', () => {
  const mockPayload: WebhookPayload = {
    cnpj: '12345678000199',
    vacancyType: 'CLT',
    title: 'Desenvolvedor Full Stack',
    rawBriefing: 'Precisamos de um dev Node.js e React com 2 anos de xp.',
  };

  it('transforms webhook payload to match Abler Swagger API process_data schema', () => {
    const transformed = transformWebhookPayloadToAblerPayload(mockPayload);

    expect(transformed).toBeDefined();
    expect(transformed.vacancy).toBeDefined();
    expect(transformed.vacancy.form).toBe('process_data');
    expect(transformed.vacancy.title).toBe('Desenvolvedor Full Stack');
    expect(transformed.vacancy.quantity).toBe(1);
    expect(transformed.vacancy.contracting_regime).toBe('clt');
    expect(transformed.vacancy.requisition_type).toBe('expansao');
  });

  it('handles lowercase/uppercase vacancy types correctly (CLT -> clt, PJ -> pj, ESTAGIO -> estagiario)', () => {
    const pjPayload = transformWebhookPayloadToAblerPayload({
      ...mockPayload,
      vacancyType: 'PJ',
    });
    expect(pjPayload.vacancy.contracting_regime).toBe('pj');

    const estagioPayload = transformWebhookPayloadToAblerPayload({
      ...mockPayload,
      vacancyType: 'ESTAGIO',
    });
    expect(estagioPayload.vacancy.contracting_regime).toBe('estagiario');
  });

  it('verifies creating a draft vacancy against Abler Staging API returns 201 Created with status draft', async () => {
    const ablerPayload = transformWebhookPayloadToAblerPayload(mockPayload);

    // Mock fetch for Abler Staging API URL to verify 201 Created with draft status
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('https://hulk-smash.getabler.com/api/company/v1/vacancies')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              data: {
                id: '384999',
                type: 'vacancy',
                attributes: {
                  title: 'Desenvolvedor Full Stack',
                  status: 'Rascunho',
                  status_key: 'draft',
                  contracting_regime: 'CLT',
                  contracting_regime_value: 'clt',
                },
              },
            }),
        } as Response);
      }
      return originalFetch(url);
    });

    try {
      const result = await createAblerDraftVacancy(
        ablerPayload,
        'https://hulk-smash.getabler.com'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('384999');
      expect(result.statusCode).toBe(201);
      expect(result.statusKey).toBe('draft');
      expect(result.status).toBe('Rascunho');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }, 15000);
});
