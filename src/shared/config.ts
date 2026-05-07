import type { ExtensionSettings } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  fontSize: 20,
  verticalPosition: 10,
  bgOpacity: 75,
  textShadow: false,
  provider: 'mymemory',
  deeplApiKey: '',
  myMemoryEmail: '',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
] as const;

export const STORAGE_KEY = 'subtitleLensSettings';

/** chrome.storage.local key for the last translation error — read by the popup. */
export const STATUS_KEY = 'subtitleLensStatus';

/** URL patterns for all supported streaming sites — kept in sync with manifest.json. */
export const STREAMING_URL_PATTERNS = [
  'https://www.youtube.com/*',
  'https://www.netflix.com/*',
  'https://www.disneyplus.com/*',
  'https://www.amazon.com/*',
  'https://www.primevideo.com/*',
  'https://www.crunchyroll.com/*',
  'https://play.max.com/*',
  'https://www.max.com/*',
];
