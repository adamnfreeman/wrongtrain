import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
await p.goto('http://localhost:8095/'); await p.click('text=Explore a sample trip'); await p.waitForSelector('.tabs-in .tab');
for (const t of process.argv.slice(2)) { await p.tap(`.tabs-in .tab[data-tab="${t}"]`); await p.waitForTimeout(700); await p.screenshot({ path: `/private/tmp/claude-501/-Users-adamfreeman-Desktop-wrongtrain--claude-worktrees-wrongtrain-project-50a38d/cf5be49e-d527-404d-843b-2a2570f56a40/scratchpad/${t}.png` }); }
await b.close();
