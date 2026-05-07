import { TranslationCache } from '../shared/cache';

describe('TranslationCache', () => {
  let cache: TranslationCache;

  beforeEach(() => {
    cache = new TranslationCache();
  });

  it('returns undefined on a miss', () => {
    expect(cache.get('hello', 'auto:es')).toBeUndefined();
  });

  it('returns the stored value after set', () => {
    cache.set('hello', 'auto:es', 'hola');
    expect(cache.get('hello', 'auto:es')).toBe('hola');
  });

  it('treats different lang keys as independent entries', () => {
    cache.set('hello', 'auto:es', 'hola');
    cache.set('hello', 'auto:fr', 'bonjour');
    expect(cache.get('hello', 'auto:es')).toBe('hola');
    expect(cache.get('hello', 'auto:fr')).toBe('bonjour');
  });

  it('treats different source languages as independent entries', () => {
    cache.set('안녕', 'ko:en', 'hello');
    cache.set('안녕', 'auto:en', 'hi');
    expect(cache.get('안녕', 'ko:en')).toBe('hello');
    expect(cache.get('안녕', 'auto:en')).toBe('hi');
  });

  it('returns undefined after clear', () => {
    cache.set('hello', 'auto:es', 'hola');
    cache.clear();
    expect(cache.get('hello', 'auto:es')).toBeUndefined();
  });

  it('evicts the oldest entry when maxSize is reached', () => {
    const small = new TranslationCache(3);
    small.set('a', 'auto:es', 'A');
    small.set('b', 'auto:es', 'B');
    small.set('c', 'auto:es', 'C');
    small.set('d', 'auto:es', 'D'); // evicts 'a'

    expect(small.get('a', 'auto:es')).toBeUndefined();
    expect(small.get('b', 'auto:es')).toBe('B');
    expect(small.get('c', 'auto:es')).toBe('C');
    expect(small.get('d', 'auto:es')).toBe('D');
  });

  it('overwrites an existing entry without growing the cache', () => {
    const small = new TranslationCache(2);
    small.set('a', 'auto:es', 'A');
    small.set('b', 'auto:es', 'B');
    small.set('a', 'auto:es', 'A2'); // overwrite — no eviction expected
    expect(small.get('b', 'auto:es')).toBe('B');
    expect(small.get('a', 'auto:es')).toBe('A2');
  });
});
