import type { TranslationCache } from './cache';
import type { ExtensionSettings, TranslateRequest, TranslateResponse } from './types';

export class Translator {
  constructor(private readonly cache: TranslationCache) {}

  async translate(text: string, settings: ExtensionSettings): Promise<string> {
    const { targetLanguage, provider, deeplApiKey } = settings;

    const cached = this.cache.get(text, targetLanguage);
    if (cached !== undefined) return cached;

    const request: TranslateRequest = {
      type: 'TRANSLATE',
      text,
      targetLang: targetLanguage,
      provider,
      deeplApiKey,
    };

    const response = await new Promise<TranslateResponse>((resolve, reject) => {
      chrome.runtime.sendMessage(request, (resp: TranslateResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(resp);
        }
      });
    });

    if (!response.ok) throw new Error(response.error);

    this.cache.set(text, targetLanguage, response.result);
    return response.result;
  }
}
