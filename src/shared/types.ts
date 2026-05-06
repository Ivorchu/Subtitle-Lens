export interface ExtensionSettings {
  enabled: boolean;
  targetLanguage: string;
  fontSize: number;
  verticalPosition: number; // percentage from bottom (e.g. 10 = 10% from bottom)
}

export type RuntimeMessage =
  | { type: 'SETTINGS_UPDATED'; settings: ExtensionSettings }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESPONSE'; settings: ExtensionSettings };
