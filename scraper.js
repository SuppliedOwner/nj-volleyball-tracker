const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function scrape() {
  console.log("||PAUSE...|| Initializing Siphon...");
const browser = await puppeteer.launch({ 
  executablePath: '/usr/bin/google-chrome', 
  args: ['--no-sandbox', '--disable-setuid-sandbox'] 
});
  
  // 1. Get Standings/Rankings
  await page.goto('https://www.maxpreps.com/nj/volleyball/boys/rankings/1/', { waitUntil: 'domcontentloaded' });
  const teams = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(row => {
      const cells = row.querySelectorAll('td');
      return {
        name: cells[1]?.innerText.trim(),
        record: cells[2]?.innerText.trim(),
        points: cells[3]?.innerText.trim(),
        sos: cells[4]?.innerText.trim()
      };
    }).filter(t => t.name);
  });

  // 2. Get Scores & Locations
  await page.goto('https://www.maxpreps.com/nj/volleyball/boys/scores/', { waitUntil: 'domcontentloaded' });
  const matches = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.score-row')).map(m => ({
      home: m.querySelector('.home-team')?.innerText.trim(),
      away: m.querySelector('.away-team')?.innerText.trim(),
      time: m.querySelector('.game-time')?.innerText.trim(),
      location: m.querySelector('.game-location')?.innerText.trim() || 'Home Site',
      status: m.querySelector('.game-status')?.innerText.trim()
    }));
  });

  const payload = { teams, matches, lastUpdated: new Date().toLocaleString() };
  fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
  console.log("||PAUSE...|| Data Cooked.");
  await browser.close();
}
scrape();
