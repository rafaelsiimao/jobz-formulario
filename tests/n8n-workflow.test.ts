import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('n8n Workflow Blueprint', () => {
  const filePath = path.join(process.cwd(), 'docs', 'n8n', 'workflow_abertura_vagas_abler.json');

  it('file exists', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('contains valid JSON with required name and 8 nodes', () => {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(rawContent);

    expect(json.name).toBe('Jobz - Automação Abertura de Vagas Abler');
    expect(Array.isArray(json.nodes)).toBe(true);
    expect(json.nodes.length).toBe(8);

    const expectedNodes = [
      { name: 'Webhook Intake', type: 'n8n-nodes-base.webhook' },
      { name: 'Agendor CNPJ Lookup', type: 'n8n-nodes-base.httpRequest' },
      { name: 'OpenAI Formatter', type: 'n8n-nodes-base.openAi' },
      { name: 'Abler Create Customer (If new)', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Abler Create Vacancy (POST process_data)', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Abler Update Description (PATCH role_description)', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Abler Add Original Briefing (POST add_occurrence)', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Notify Team', type: 'n8n-nodes-base.emailSend' },
    ];

    expectedNodes.forEach((expected, idx) => {
      expect(json.nodes[idx].name).toBe(expected.name);
      expect(json.nodes[idx].type).toBe(expected.type);
    });
  });
});
