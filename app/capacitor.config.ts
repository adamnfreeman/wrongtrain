import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'lol.wrongtrain.app',
  appName: 'WrongTrain',
  webDir: 'dist',
  ios: {
    /* the page draws under the status bar itself, using the safe-area insets */
    contentInset: 'never',
    backgroundColor: '#EEF1F0',
  },
  plugins: {
    /* hidden by the app once it has drawn (src/native.ts), so there is no blank flash */
    SplashScreen: { launchAutoHide: false, backgroundColor: '#EEF1F0', showSpinner: false },
  },
};

export default config;
