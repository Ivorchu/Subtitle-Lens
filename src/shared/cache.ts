export class TranslationCache {
  private readonly cache = new Map<string, string>();

  constructor(private readonly maxSize = 500) {}

  get(text: string, targetLang: string): string | undefined {
    return this.cache.get(`${targetLang}:${text}`);
  }

  set(text: string, targetLang: string, translation: string): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(`${targetLang}:${text}`, translation);
  }

  clear(): void {
    this.cache.clear();
  }
}
