# Running WrongTrain on your iPhone

The iOS project lives in `ios/`. It is an ordinary Xcode project that shows the web app
(`src/`, built into `dist/`) full screen, using Capacitor. Plugins come in through Swift
Package Manager, so there is no CocoaPods step.

## One-time setup on the Mac

1. **Xcode** from the Mac App Store. Open it once and let it install its components,
   including the iOS platform.
2. **Node.js** LTS from https://nodejs.org.
3. **The code.** In Terminal:

   ```
   git clone https://github.com/adamnfreeman/wrongtrain.git
   cd wrongtrain
   git checkout app
   cd app
   npm install
   ```

## Every time you want a fresh build

```
cd wrongtrain/app
git pull
npm install
npm run ios
```

`npm run ios` builds the web app, copies it into the iOS project and opens Xcode.

## In Xcode

1. In the left sidebar click **App** (the blue icon at the top), then the **App** target,
   then **Signing & Capabilities**.
2. Tick **Automatically manage signing** and pick your **Team**. Before your Apple Developer
   membership is active this can be your personal team ("Adam Freeman (Personal Team)"):
   that runs the app on your own phone for 7 days at a time.
3. Plug in your iPhone (or pick it from the device list at the top of the window if it is on
   the same Wi-Fi). The first time, the phone asks you to trust the Mac and to turn on
   **Developer Mode** (Settings → Privacy & Security → Developer Mode).
4. Press **▶ Run**. With a personal team, the first launch needs one more step on the phone:
   Settings → General → VPN & Device Management → trust your developer certificate.

## Sending it to TestFlight (needs the paid membership)

1. In App Store Connect (https://appstoreconnect.apple.com) create the app:
   **My Apps → + → New App**, platform iOS, name WrongTrain, bundle ID `lol.wrongtrain.app`,
   SKU anything (e.g. `wrongtrain`).
2. In Xcode, set the run destination to **Any iOS Device (arm64)**, then
   **Product → Archive**.
3. When the Organizer window opens, **Distribute App → App Store Connect → Upload**.
4. After processing (10–30 minutes) the build appears under **TestFlight** in App Store
   Connect. Add yourself and the group as testers.

For each new upload, raise the build number: App target → **General** → **Build**.

## Icon and launch screen

Drawn in `assets/icon.svg`, `assets/splash.svg` and `assets/splash-dark.svg`. After changing
them, render the PNGs and regenerate the iOS sizes:

```
node -e "const s=require('sharp');for(const n of ['icon','splash','splash-dark'])s('assets/'+n+'.svg').png().toFile('assets/'+(n==='icon'?'icon-only':n)+'.png')"
npx capacitor-assets generate --ios --iconBackgroundColor '#12201C' --splashBackgroundColor '#EEF1F0' --splashBackgroundColorDark '#0E1412'
```
