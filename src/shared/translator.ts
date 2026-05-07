import type { TranslationCache } from './cache';
import type { ExtensionSettings, TranslateRequest, TranslateResponse } from './types';

export class Translator {
  constructor(private readonly cache: TranslationCache) {}

  async translate(text: string, settings: ExtensionSettings): Promise<string> {
    const { sourceLanguage, targetLanguage, provider, deeplApiKey } = settings;

    // Include source language in the cache key so switching source invalidates entries.
    const cached = this.cache.get(text, `${sourceLanguage}:${targetLanguage}`);
    if (cached !== undefined) return cached;

    const request: TranslateRequest = {
      type: 'TRANSLATE',
      text,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      provider,
      deeplApiKey,
      myMemoryEmail: settings.myMemoryEmail,
    };

    // Use a port so the service worker stays alive for the duration of the fetch.
    const response = await new Promise<TranslateResponse>((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'translate' });
      port.postMessage(request);
      port.onMessage.addListener((resp: TranslateResponse) => {
        port.disconnect();
        resolve(resp);
      });
      port.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
      });
    });

    if (!response.ok) throw new Error(response.error);

    this.cache.set(text, `${sourceLanguage}:${targetLanguage}`, response.result);
    return response.result;
  }
}
