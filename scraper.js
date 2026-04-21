const puppeteer = require('puppeteer-core'); // Using core for speed
const fs = require('fs');

async function scrape() {
  console.log("||PAUSE...|| Initializing Siphon...");
  
  // Launching the browser using the built-in Chrome on the server
const browser = await puppeteer.launch({ 
            // This is the EXACT path for Windows
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });

  // CRITICAL: This is the line that was missing or misplaced
  const page = await browser.newPage();

  try {
    // 1. Get Standings/Rankings
    console.log("||PAUSE...|| Siphoning Rankings...");
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
    console.log("||PAUSE...|| Siphoning Scores...");
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
    
    // Write the data to the file
    fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
    console.log("||PAUSE...|| Data Cooked Successfully.");

  } catch (error) {
    console.error("||PAUSE...|| Siphon Failed:", error);
  } finally {
    await browser.close();
  }
}

// Start the engine
scrape();
