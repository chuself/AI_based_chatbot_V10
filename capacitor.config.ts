
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c04d5a5f4f7e4fa5a0945c054f5af3d0',
  appName: 'astro-ai-messenger-09',
  webDir: 'dist',
  server: {
    url: 'https://c04d5a5f-4f7e-4fa5-a094-5c054f5af3d0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: null,
      keystoreAlias: null,
      keystorePassword: null,
      keystoreAliasPassword: null,
      releaseType: null,
    }
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#9b87f5',
      backgroundColor: '#FFFFFF',
    },
  }
};

export default config;
