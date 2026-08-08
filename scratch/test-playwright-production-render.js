import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { generateFeedHtml, generateWhatsappHtml, generateStoryHtml } from '../src/lib/renderer-engine.js';

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

  const feedHtml = generateFeedHtml(sampleCopy);
  const waHtml = generateWhatsappHtml(sampleCopy);
  const storyHtml = generateStoryHtml(sampleCopy);

  console.log('Rendering high-res PNGs via Playwright Headless Chromium...');
  const browser = await chromium.launch();

  const outDir = path.join(__dirname, 'prod-render-test');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Feed
  let page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.setContent(feedHtml, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'feed-prod-playwright.png') });

  // 2. WhatsApp
  page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  await page.setContent(waHtml, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'whatsapp-prod-playwright.png') });

  // 3. Story
  page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.setContent(storyHtml, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'story-prod-playwright.png') });

  await browser.close();
  console.log('SUCCESS! Rendered all 3 production PNGs to scratch/prod-render-test/');
}

main().catch(console.error);
