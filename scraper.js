const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function scrape() {
    console.log("||PAUSE...|| Initializing Tactical Siphon (V2)...");
    
    try {
        const isLinux = process.platform === 'linux';
        
        const browser = await puppeteer.launch({ 
            executablePath: isLinux 
                ? '/usr/bin/google-chrome' 
                : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] 
        });

        const page = await browser.newPage();
        
        // 1. Siphon Top 100 Rankings
        console.log("||PAUSE...|| Ripping Top 100 Rankings...");
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/rankings/1/', { waitUntil: 'domcontentloaded' });
        
        const teams = await page.evaluate(() => {
            // Target the main ranking table
            const rows = Array.from(document.querySelectorAll('table tbody tr')).slice(0, 100);
            return rows.map((row, index) => {
                const cells = row.querySelectorAll('td');
                return {
                    id: `team_${index + 1}`,
                    rank: index + 1,
                    name: cells[1]?.innerText.trim() || 'Unknown',
                    record: cells[2]?.innerText.trim() || '0-0',
                    points: parseFloat(cells[3]?.innerText.trim() || 0),
                    sos: parseFloat(cells[4]?.innerText.trim() || 0), // Strength of Schedule
                    conference: ['SEC', 'GMC', 'Shore', 'Skyland', 'Big North'][Math.floor(Math.random() * 5)], // Mocked until mapped
                    movement: Math.floor(Math.random() * 5) - 2 // Mocked movement (-2 to +2)
                };
            }).filter(t => t.name !== 'Unknown');
        });

        // 2. Siphon Recent Matches
        console.log("||PAUSE...|| Extracting Match Data...");
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/scores/', { waitUntil: 'domcontentloaded' });
        
        const matches = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.score-row')).slice(0, 15).map((m, i) => {
                const home = m.querySelector('.home-team')?.innerText.trim() || 'TBD';
                const away = m.querySelector('.away-team')?.innerText.trim() || 'TBD';
                const homeScore = m.querySelector('.home-score')?.innerText.trim() || '0';
                const awayScore = m.querySelector('.away-score')?.innerText.trim() || '0';
                return {
                    id: `match_${i}`,
                    date: new Date().toLocaleDateString(),
                    home,
                    away,
                    homeScore: parseInt(homeScore),
                    awayScore: parseInt(awayScore),
                    winner: parseInt(homeScore) > parseInt(awayScore) ? home : away
                };
            });
        });

        const payload = { teams, matches, lastUpdated: new Date().toLocaleString() };
        fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
        
        console.log("||PAUSE...|| Data Cooked and Packaged. Siphon Complete.");
        await browser.close();

    } catch (error) {
        console.error("||PAUSE...|| Siphon Failed:", error.message);
    }
}

scrape();
