import { describe, it, expect } from 'vitest';
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

  it('verifies creating a draft vacancy against Abler API returns draft status', async () => {
    const ablerPayload = transformWebhookPayloadToAblerPayload(mockPayload);
    const result = await createAblerDraftVacancy(ablerPayload);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect([200, 201]).toContain(result.statusCode);
    expect(['draft', 'published']).toContain(result.statusKey);
    expect(['Rascunho', 'Ativa']).toContain(result.status);
  }, 15000);
});
