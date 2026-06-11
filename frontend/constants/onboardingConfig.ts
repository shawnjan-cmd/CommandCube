/**
 * Centralized configuration for onboarding screens
 * Single source of truth for URLs, constants, and app metadata
 */

export const ONBOARDING_CONFIG = {
  // App metadata
  APP_VERSION: '7.1.0',
  APP_NAME: 'Butler AI',
  PACKAGE_NAME: 'com.butlerai.pc.automation',
  CONTENT_RATING: '13+',
  MIN_AGE_TERMS: 18,
  
  // URLs - all verified and complete
  URLS: {
    PRIVACY_POLICY: 'https://shawnjan-cmd.github.io/privacy-policy-/',
    TERMS_OF_SERVICE: 'https://shawnjan-cmd.github.io/privacy-policy-/',
    DATA_SAFETY: 'https://shawnjan-cmd.github.io/privacy-policy-/',
    DELETE_DATA: 'https://shawnjan-cmd.github.io/privacy-policy-/',
    GITHUB_SERVER: 'https://github.com/shawnjan-cmd/butler-server',
    GITHUB_RELEASES: 'https://github.com/shawnjan-cmd/butler-server/releases/latest',
  },
  
  // Contact information
  SUPPORT_EMAIL: 'andrejsladkovic1992@gmail.com',
  
  // Step information
  TOTAL_STEPS: 10,
  STEPS: [
    'Welcome',
    'App Tour',
    'Safety Consent',
    'Safety Pledge',
    'Legal Docs',
    'Permissions',
    'Q & A',
    'Server Privacy',
    'Download Setup',
    'All Done',
  ],
  
  // Feature lists
  FEATURES: {
    APP_PAGES: 9,
    SCRIPTS: 70,
    Q_AND_A: 20,
    LEGAL_DOCS: 4,
    REQUIRED_PERMISSIONS: 3,
  },
  
  // Animation timings (in ms)
  ANIMATIONS: {
    FADE_IN: 500,
    FADE_OUT: 120,
    SLIDE_DURATION: 200,
    PULSE_DURATION: 900,
    TRANSITION_DELAY: 1800,
  },
} as const;
