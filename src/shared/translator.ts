import type { TranslationCache } from './cache';
import type { ExtensionSettings, TranslateRequest, TranslateResponse } from './types';

export class Translator {
  private port: chrome.runtime.Port | null = null;
  private pendingResolve: ((r: TranslateResponse) => void) | null = null;
  private pendingReject: ((e: Error) => void) | null = null;

  constructor(private readonly cache: TranslationCache) {}

  private getPort(): chrome.runtime.Port {
    if (!this.port) {
      this.port = chrome.runtime.connect({ name: 'translate' });
      this.port.onMessage.addListener((resp: TranslateResponse) => {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        this.pendingReject = null;
        resolve?.(resp);
      });
      this.port.onDisconnect.addListener(() => {
        this.port = null;
        const reject = this.pendingReject;
        this.pendingResolve = null;
        this.pendingReject = null;
        reject?.(new Error(chrome.runtime.lastError?.message ?? 'Port disconnected'));
      });
    }
    return this.port;
  }

  async translate(text: string, settings: ExtensionSettings): Promise<string> {
    const { sourceLanguage, targetLanguage } = settings;

    if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) return text;

    const cached = this.cache.get(text, `${sourceLanguage}:${targetLanguage}`);
    if (cached !== undefined) return cached;

    const request: TranslateRequest = {
      type: 'TRANSLATE',
      text,
      sourceLang: sourceLanguage,
      targetLang: targetLanguage,
      myMemoryEmail: settings.myMemoryEmail,
    };

    const response = await new Promise<TranslateResponse>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      try {
        this.getPort().postMessage(request);
      } catch (e) {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    if (!response.ok) {
      if (sourceLanguage === 'auto') return text;
      throw new Error(response.error);
    }

    if (response.result === text) return text;

    this.cache.set(text, `${sourceLanguage}:${targetLanguage}`, response.result);
    return response.result;
  }

  // Call on SPA navigation to reset session state and detected language cache.
  resetSession(): void {
    this.port?.disconnect();
    this.port = null;
    this.pendingResolve = null;
    this.pendingReject = null;
  }
}
