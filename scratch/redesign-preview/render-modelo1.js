const { chromium } = require('playwright');
const path = require('path');

async function renderModelo1Reqs() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 2400, height: 4500 },
    deviceScaleFactor: 2,
  });

  const htmlPath = 'file:///' + path.resolve(__dirname, 'modelo1-multiformatos.html').replace(/\\/g, '/');
  await page.goto(htmlPath, { waitUntil: 'networkidle' });

  // 1. WhatsApp SEM Requisitos
  const waOff = await page.$('#wa-off');
  if (waOff) {
    await waOff.screenshot({ path: path.resolve(__dirname, 'wa-sem-requisitos.png') });
  }

  // 2. WhatsApp COM Requisitos
  const waOn = await page.$('#wa-on');
  if (waOn) {
    await waOn.screenshot({ path: path.resolve(__dirname, 'wa-com-requisitos.png') });
  }

  // 3. Story SEM Requisitos
  const storyOff = await page.$('#story-off');
  if (storyOff) {
    await storyOff.screenshot({ path: path.resolve(__dirname, 'story-sem-requisitos.png') });
  }

  // 4. Story COM Requisitos
  const storyOn = await page.$('#story-on');
  if (storyOn) {
    await storyOn.screenshot({ path: path.resolve(__dirname, 'story-com-requisitos.png') });
  }

  await browser.close();
  console.log('SUCCESS! Requirements ON/OFF comparison screenshots rendered!');
}

renderModelo1Reqs().catch(console.error);
