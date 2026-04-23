const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function scrape() {
    console.log("||PAUSE...|| Initializing Siphon (PC Edition)...");
    
    try {
const browser = await puppeteer.launch({ 
            // This is the EXACT path for Windows
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });

        // 1. Get Rankings
        console.log("||PAUSE...|| Siphoning Rankings...");
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/rankings/1/', { waitUntil: 'domcontentloaded' });
        
        const teams = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table tbody tr')).slice(0, 15).map(row => {
                const cells = row.querySelectorAll('td');
                return {
                    name: cells[1]?.innerText.trim(),
                    record: cells[2]?.innerText.trim(),
                    points: cells[3]?.innerText.trim()
                };
            }).filter(t => t.name);
        });

        // 2. Get Scores
        console.log("||PAUSE...|| Siphoning Scores...");
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/scores/', { waitUntil: 'domcontentloaded' });
        
        const matches = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.score-row')).slice(0, 10).map(m => ({
                home: m.querySelector('.home-team')?.innerText.trim(),
                away: m.querySelector('.away-team')?.innerText.trim(),
                status: m.querySelector('.game-status')?.innerText.trim()
            }));
        });

        const payload = { teams, matches, lastUpdated: new Date().toLocaleString() };
        fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
        
        console.log("||PAUSE...|| Data Cooked Successfully.");
        await browser.close();

    } catch (error) {
        console.error("||PAUSE...|| Siphon Failed:", error.message);
        console.log("TIP: If it says 'Executable not found', verify Chrome is installed at C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
    }
}

scrape();
