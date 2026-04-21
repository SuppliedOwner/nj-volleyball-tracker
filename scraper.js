const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function scrape() {
    console.log("||PAUSE...|| Initializing Pro-Tier Siphon...");
    
    // 1. LOAD OLD DATA (To calculate Movement)
    let oldData = { teams: [] };
    if (fs.existsSync('data.json')) {
        try {
            oldData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        } catch (e) { console.log("No previous data found. Starting fresh."); }
    }

    try {
        // SMART PATH LOGIC: Fixes the GitHub Actions Error
        const isLinux = process.platform === 'linux';
        const browser = await puppeteer.launch({ 
            executablePath: isLinux 
                ? '/usr/bin/google-chrome' 
                : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // 2. SCRAPE TOP 100 RANKINGS
        console.log("||PAUSE...|| Siphoning Top 100 Teams & SOS...");
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/rankings/', { waitUntil: 'networkidle2' });
        
        const teams = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table tbody tr')).slice(0, 100).map((row, index) => {
                const cells = row.querySelectorAll('td');
                const nameLink = cells[1]?.querySelector('a');
                const logoImg = cells[1]?.querySelector('img');
                
                return {
                    rank: index + 1,
                    name: nameLink?.innerText.trim() || "Unknown Team",
                    url: nameLink?.href || "#",
                    logo: logoImg?.src || '',
                    conference: cells[1]?.querySelector('.conference-name')?.innerText.trim() || "Independent",
                    record: cells[2]?.innerText.trim(),
                    sos: cells[3]?.innerText.trim()
                };
            });
        });

        // Calculate Movement (Up/Down arrows)
        teams.forEach(team => {
            const prev = oldData.teams?.find(t => t.name === team.name);
            team.movement = prev ? prev.rank - team.rank : 0; 
        });

        // 3. SCRAPE STAT LEADERS (Kills, Aces, Blocks)
        const categories = ['kills', 'aces', 'blocks'];
        let playerStats = {};
        for (const cat of categories) {
            console.log(`||PAUSE...|| Siphoning ${cat.toUpperCase()} Leaders...`);
            await page.goto(`https://www.maxpreps.com/nj/volleyball/boys/stat-leaders/${cat}/`, { waitUntil: 'networkidle2' });
            playerStats[cat] = await page.evaluate((c) => {
                return Array.from(document.querySelectorAll('table tbody tr')).slice(0, 12).map(row => {
                    const cells = row.querySelectorAll('td');
                    return {
                        name: cells[1]?.innerText.trim(),
                        school: cells[2]?.innerText.trim(),
                        value: cells[3]?.innerText.trim(),
                        category: c.toUpperCase()
                    };
                });
            }, cat);
        }

        // 4. SCRAPE WEEKLY MATCHES
        console.log("||PAUSE...|| Siphoning Game Center...");
        await page.goto('https://www.maxpreps.com/nj/volleyball/boys/scores/', { waitUntil: 'networkidle2' });
        const matches = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.score-row')).slice(0, 20).map(m => ({
                home: m.querySelector('.home-team')?.innerText.trim(),
                away: m.querySelector('.away-team')?.innerText.trim(),
                status: m.querySelector('.game-status')?.innerText.trim() || 'Final',
                homeScore: m.querySelector('.home-team-score')?.innerText.trim() || '0',
                awayScore: m.querySelector('.away-team-score')?.innerText.trim() || '0'
            }));
        });

        const payload = { 
            teams, 
            playerStats, 
            matches, 
            lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) 
        };

        fs.writeFileSync('data.json', JSON.stringify(payload, null, 2));
        console.log("||PAUSE...|| Siphon Complete. Data Cooked.");
        await browser.close();

    } catch (error) {
        console.error("||PAUSE...|| Siphon Failed:", error.message);
    }
}

scrape();
