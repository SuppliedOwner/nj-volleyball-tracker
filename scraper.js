const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function scrape() {
    console.log("||PAUSE...|| Initializing Original Design Siphon...");
    let oldData = { teams: [] };
    if (fs.existsSync('data.json')) {
        try { oldData = JSON.parse(fs.readFileSync('data.json', 'utf8')); } catch (e) {}
    }

    try {
        const isLinux = process.platform === 'linux';
        const browser = await puppeteer.launch({ 
            executablePath: isLinux ? '/usr/bin/google-chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // 1. TOP 100 RANKINGS
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/rankings/', { waitUntil: 'networkidle2' });
        const teams = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table tbody tr')).slice(0, 100).map((row, i) => {
                const cells = row.querySelectorAll('td');
                const nameLink = cells[1]?.querySelector('a');
                return {
                    rank: i + 1,
                    name: nameLink?.innerText.trim() || "Unknown",
                    url: nameLink?.href || "#",
                    logo: cells[1]?.querySelector('img')?.src || '',
                    conference: cells[1]?.querySelector('.conference-name')?.innerText.trim() || "Independent",
                    record: cells[2]?.innerText.trim(),
                    sos: cells[3]?.innerText.trim()
                };
            });
        });

        // Calculate Movement
        teams.forEach(t => {
            const prev = oldData.teams?.find(ot => ot.name === t.name);
            t.movement = prev ? prev.rank - t.rank : 0;
        });

        // 2. STATS (Kills, Aces, Blocks)
        const categories = ['kills', 'aces', 'blocks'];
        let playerStats = {};
        for (const cat of categories) {
            await page.goto(`https://www.maxpreps.com/nj/volleyball/boys/stat-leaders/${cat}/`, { waitUntil: 'networkidle2' });
            playerStats[cat] = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('table tbody tr')).slice(0, 10).map(row => {
                    const cells = row.querySelectorAll('td');
                    return { name: cells[1]?.innerText.trim(), school: cells[2]?.innerText.trim(), value: cells[3]?.innerText.trim() };
                });
            });
        }

        // 3. MATCHES
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/scores/', { waitUntil: 'networkidle2' });
        const matches = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.score-row')).slice(0, 15).map(m => ({
                home: m.querySelector('.home-team')?.innerText.trim(),
                away: m.querySelector('.away-team')?.innerText.trim(),
                status: m.querySelector('.game-status')?.innerText.trim() || 'Final',
                homeScore: m.querySelector('.home-team-score')?.innerText.trim() || '0',
                awayScore: m.querySelector('.away-team-score')?.innerText.trim() || '0'
            }));
        });

        const payload = { teams, playerStats, matches, lastUpdated: new Date().toLocaleString() };
        fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
        console.log("||PAUSE...|| Siphon Successful.");
        await browser.close();
    } catch (e) { console.error("Siphon Failed:", e.message); }
}
scrape();
