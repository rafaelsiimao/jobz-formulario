const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();

  // 1. WhatsApp (1080x1080)
  const pageWa = await browser.newPage({ viewport: { width: 1200, height: 1300 }, deviceScaleFactor: 2 });
  const waHtml = path.join(__dirname, 'whatsapp-and-post-exact.html');
  await pageWa.goto(`file://${waHtml}`);
  await pageWa.waitForLoadState('networkidle');
  const waElement = await pageWa.$('#wa-target');
  await waElement.screenshot({ path: path.join(__dirname, 'whatsapp-exact-replica.png') });
  console.log('SUCCESS! WhatsApp (1080x1080) rendered!');

  // 2. Post Feed (1080x1350)
  const pagePost = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 2 });
  await pagePost.goto(`file://${waHtml}`);
  await pagePost.waitForLoadState('networkidle');
  const postElement = await pagePost.$('#post-target');
  await postElement.screenshot({ path: path.join(__dirname, 'post-exact-replica.png') });
  console.log('SUCCESS! Post Feed (1080x1350) rendered!');

  await browser.close();
})();
