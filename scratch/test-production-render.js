import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderBrandKitPNGs } from '../src/lib/renderer-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sampleCopy = {
    headline: 'DESENVOLVEDOR FULL STACK SENIOR',
    subheadline: 'Vitória - ES | Híbrido',
    highlights: [
      'Híbrido | Vitória / ES',
      'Jornada: Segunda a Sexta • 08h às 17:30h',
      'Salário: R$ 12.000 / mês',
      'Benefícios: Vale Refeição (R$ 35/dia) + Vale Transporte + Plano de Saúde Unimed + Plano Odontológico Bradesco'
    ],
    ctaText: 'Candidate-se Já',
    socialCaption: 'Venha fazer parte do nosso time de tecnologia!',
    contractType: 'CLT',
    showRequirements: true,
    requirementsList: 'Superior Completo em Ciência da Computação ou áreas afins • 5+ anos com React, Node.js, TypeScript & PostgreSQL • Experiência com AWS e Docker',
    candidatureType: 'email',
    candidatureEmail: 'rh@jobz.com.br',
    sourcingProfile: { idealExperience: '1042' }
  };

  console.log('Rendering PNGs using production Satori renderer...');
  const { feed, whatsapp, story } = await renderBrandKitPNGs(sampleCopy);

  const outDir = path.join(__dirname, 'prod-render-test');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'feed-prod.png'), feed);
  fs.writeFileSync(path.join(outDir, 'whatsapp-prod.png'), whatsapp);
  fs.writeFileSync(path.join(outDir, 'story-prod.png'), story);

  console.log('Render complete! Saved PNGs to scratch/prod-render-test/');
}

main().catch(console.error);
