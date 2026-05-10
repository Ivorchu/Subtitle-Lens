export interface ExtensionSettings {
  enabled: boolean;
  sourceLanguage: string;   // 'auto' or a BCP-47 code
  targetLanguage: string;
  fontSize: number;
  verticalPosition: number;
  bgOpacity: number;        // 0–100, maps to rgba alpha
  textShadow: boolean;
  myMemoryEmail: string;
}

export interface DailyUsage {
  date: string;   // 'YYYY-MM-DD'
  words: number;
}

export interface TranslationStatus {
  error: string;  // user-friendly message
  at: number;     // Date.now() of when it occurred
}

// background → content scripts (broadcast)
export type ContentMessage = { type: 'SETTINGS_UPDATED'; settings: ExtensionSettings };

// content script → background (request + response via port)
export type TranslateRequest = {
  type: 'TRANSLATE';
  text: string;
  sourceLang: string;
  targetLang: string;
  myMemoryEmail: string;
};

export type TranslateResponse =
  | { ok: true; result: string }
  | { ok: false; error: string };
