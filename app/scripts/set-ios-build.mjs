// Sets the iOS build number (CFBundleVersion, Xcode's CURRENT_PROJECT_VERSION) to the same number
// the app shows in Account & settings: the count of commits. TestFlight needs a higher build
// number for every upload, and this way it always is, with nothing to remember.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const n = execSync('git rev-list --count HEAD').toString().trim();
const file = new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url);
const before = readFileSync(file, 'utf8');
const after = before.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${n};`);
if (after !== before) writeFileSync(file, after);
console.log(`iOS build number: ${n}`);
