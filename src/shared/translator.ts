import type { TranslationCache } from './cache';

export class Translator {
  constructor(private readonly cache: TranslationCache) {}

  async translate(text: string, targetLang: string): Promise<string> {
    const cached = this.cache.get(text, targetLang);
    if (cached !== undefined) return cached;

    const translated = await this.mockTranslate(text, targetLang);
    this.cache.set(text, targetLang, translated);
    return translated;
  }

  // Replace this method with a real translation API (e.g. Google Translate, DeepL).
  private async mockTranslate(text: string, targetLang: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 10));
    return `[${targetLang}] ${text}`;
  }
}
