import type { ExtensionSettings } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  targetLanguage: 'en',
  fontSize: 20,
  verticalPosition: 10,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
] as const;

export const STORAGE_KEY = 'subtitleLensSettings';
