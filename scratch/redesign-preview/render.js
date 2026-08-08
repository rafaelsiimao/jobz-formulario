const { chromium } = require('playwright');
const path = require('path');

async function renderScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 750 },
    deviceScaleFactor: 2, // Retinal high-res
  });

  const htmlPath = 'file:///' + path.resolve(__dirname, 'preview.html').replace(/\\/g, '/');
  await page.goto(htmlPath, { waitUntil: 'networkidle' });

  // 1. Overview side by side
  await page.screenshot({
    path: path.resolve(__dirname, 'opcoes-cards-overview.png'),
    fullPage: true,
  });

  // 2. Opção 1 - Brandbook Oficial
  const opt1 = await page.$('.card-option-1');
  if (opt1) {
    await opt1.screenshot({
      path: path.resolve(__dirname, 'opcao-1-brandbook.png'),
    });
  }

  // 3. Opção 2 - Editorial Clean
  const opt2 = await page.$('.card-option-2');
  if (opt2) {
    await opt2.screenshot({
      path: path.resolve(__dirname, 'opcao-2-editorial-bento.png'),
    });
  }

  // 4. Opção 3 - Tech Modular
  const opt3 = await page.$('.card-option-3');
  if (opt3) {
    await opt3.screenshot({
      path: path.resolve(__dirname, 'opcao-3-tech-modular.png'),
    });
  }

  await browser.close();
  console.log('SUCCESS! Screenshots rendered to scratch/redesign-preview/');
}

renderScreenshots().catch(console.error);
