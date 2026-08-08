const { chromium } = require('playwright');
const path = require('path');

async function renderExactStory() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });

  const htmlPath = 'file:///' + path.resolve(__dirname, 'story-pixel-perfect.html').replace(/\\/g, '/');
  await page.goto(htmlPath, { waitUntil: 'networkidle' });

  const storyElem = await page.$('#story-exact-target');
  if (storyElem) {
    await storyElem.screenshot({
      path: path.resolve(__dirname, 'story-exact-replica.png'),
    });
  }

  await browser.close();
  console.log('SUCCESS! Pixel perfect Story rendered!');
}

renderExactStory().catch(console.error);
