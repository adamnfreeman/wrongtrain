// Five tabs (Nov 24): Today, Plan, Map, Wallet and Group. The other pages live inside them, picked
// at the top of the page; Phrases is a tool on Today. Opens a page by the name it had as a tab.
const IN = {
  Days: ['days', 'days'], Essentials: ['days', 'essentials'], Bookings: ['days', 'essentials'],
  Map: ['map', 'map'], Places: ['map', 'places'],
  Trip: ['trip', 'trip'], 'To do': ['trip', 'prep'], Photos: ['trip', 'photos'], Notes: ['trip', 'notes'],
  Today: ['today'], Wallet: ['wallet'],
};
export async function openTab(page, name) {
  /* a tool open over the page (Phrases, say) is closed first */
  const done = page.locator('.sheet-wrap:has(.toolbody) .sheet-bar .linkbtn');
  if (await done.count()) await done.first().click();
  if (name === 'Phrases') {
    await page.click('.tabs-in .tab[data-tab="today"]');
    await page.click('#view .tool:has-text("Phrases")');
    return page.waitForTimeout(400);
  }
  const [tab, sub] = IN[name] || [name.toLowerCase()];
  await page.click(`.tabs-in .tab[data-tab="${tab}"]`);
  /* only when another page is open in it (a banner across the top can cover the row) */
  const btn = page.locator(`.pane[data-tab="${tab}"] .subtabs button[data-sub="${sub}"]`);
  if (sub && (await btn.getAttribute('aria-selected')) !== 'true') await btn.click();
  await page.waitForTimeout(400);
}
