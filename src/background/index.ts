import { DAILY_WORD_LIMIT, DEFAULT_SETTINGS, STORAGE_KEY, STREAMING_URL_PATTERNS, USAGE_KEY } from '../shared/config';
import type {
  ExtensionSettings,
  ContentMessage,
  DailyUsage,
  TranslateRequest,
  TranslateResponse,
} from '../shared/types';

// MyMemory uses locale codes for some languages.
const MYMEMORY_LANG_MAP: Record<string, string> = {
  zh: 'zh-CN',
  pt: 'pt-BR',
};
function toMyMemoryLang(code: string): string {
  return MYMEMORY_LANG_MAP[code] ?? code;
}

function classifyError(err: unknown): string {
  const msg = String(err);
  const upper = msg.toUpperCase();

  if (upper.includes('ALL AVAILABLE FREE') || msg.includes('429')) {
    return 'MyMemory daily limit reached — try again tomorrow or add an email in the popup to raise the limit';
  }
  if (upper.includes('QUERY LENGTH')) {
    return 'Subtitle too long for MyMemory free tier';
  }
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ERR_NETWORK') ||
    msg.includes('net::')
  ) {
    return 'Network error — check your internet connection';
  }

  return `Translation failed: ${msg.slice(0, 120)}`;
}

async function detectSourceLanguage(text: string): Promise<string> {
  const result = await new Promise<chrome.i18n.LanguageDetectionResult>(resolve => {
    chrome.i18n.detectLanguage(text, resolve);
  });
  return result.languages[0]?.language ?? '';
}

async function translateMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string,
  email: string,
): Promise<string> {
  const src = toMyMemoryLang(sourceLang);
  const tgt = toMyMemoryLang(targetLang);
  const pair = `${encodeURIComponent(src)}|${encodeURIComponent(tgt)}`;
  const emailParam = email ? `&de=${encodeURIComponent(email)}` : '';

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}${emailParam}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`MyMemory HTTP ${resp.status}`);

  const data = await resp.json() as {
    responseStatus: number;
    responseData: { translatedText: string };
    responseMessage?: string;
  };
  if (data.responseStatus !== 200) {
    throw new Error(data.responseMessage ?? `MyMemory status ${data.responseStatus}`);
  }
  return data.responseData.translatedText;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function renewIdentifier(): void {
  chrome.storage.sync.get(STORAGE_KEY, result => {
    const settings = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) };
    chrome.storage.sync.set({ [STORAGE_KEY]: { ...settings, myMemoryEmail: randomIdentifier() } });
  });
}

function recordUsage(words: number): void {
  const today = todayDate();
  chrome.storage.local.get(USAGE_KEY, result => {
    const current = result[USAGE_KEY] as DailyUsage | undefined;
    const usage: DailyUsage = current?.date === today
      ? { date: today, words: current.words + words }
      : { date: today, words };
    chrome.storage.local.set({ [USAGE_KEY]: usage });

    const wasBelow = (current?.words ?? 0) < DAILY_WORD_LIMIT * 0.9;
    const isNowAbove = usage.words >= DAILY_WORD_LIMIT * 0.9;
    if (wasBelow && isNowAbove) renewIdentifier();
  });
}

function randomIdentifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const hex = (start: number, len: number) =>
    Array.from(bytes.slice(start, start + len))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  const tlds = ['com', 'net', 'org', 'io', 'co'];
  const tld = tlds[bytes[17] % tlds.length];
  return `${hex(0, 8)}@${hex(8, 5)}.${tld}`;
}

// Initialise default settings on first install.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(STORAGE_KEY, result => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.sync.set({
        [STORAGE_KEY]: { ...DEFAULT_SETTINGS, myMemoryEmail: randomIdentifier() },
      });
    }
  });
});

// Broadcast settings changes to all active streaming tabs.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes[STORAGE_KEY]) return;

  const settings = changes[STORAGE_KEY].newValue as ExtensionSettings;
  const message: ContentMessage = { type: 'SETTINGS_UPDATED', settings };

  void chrome.tabs.query({ url: STREAMING_URL_PATTERNS }).then(tabs => {
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have the content script yet — safe to ignore.
        });
      }
    }
  });
});

// Keyboard shortcut: Alt+S toggles the extension on/off.
chrome.commands.onCommand.addListener(command => {
  if (command !== 'toggle') return;
  chrome.storage.sync.get(STORAGE_KEY, result => {
    const current = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) };
    chrome.storage.sync.set({ [STORAGE_KEY]: { ...current, enabled: !current.enabled } });
  });
});

// Proxy translation requests via a long-lived port so the service worker
// stays alive for the duration of the fetch (avoids MV3 message-channel-closed errors).
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'translate') return;

  // Cache detected source language for the lifetime of this port (one video session).
  // Resets automatically when the content script calls translator.resetSession() on navigation.
  let sessionSourceLang = '';

  port.onMessage.addListener((message: TranslateRequest) => {
    if (message.type !== 'TRANSLATE') return;

    const { text, sourceLang, targetLang, myMemoryEmail } = message;

    const work = async () => {
      let resolvedSource = sourceLang;
      if (sourceLang === 'auto') {
        if (!sessionSourceLang) {
          sessionSourceLang = await detectSourceLanguage(text);
        }
        resolvedSource = sessionSourceLang;
      }

      if (resolvedSource && toMyMemoryLang(resolvedSource) === toMyMemoryLang(targetLang)) {
        return text;
      }

      return translateMyMemory(text, resolvedSource, targetLang, myMemoryEmail);
    };

    work()
      .then(result => {
        recordUsage(countWords(text));
        port.postMessage({ ok: true, result } satisfies TranslateResponse);
      })
      .catch(err =>
        port.postMessage({
          ok: false,
          error: classifyError(err),
        } satisfies TranslateResponse),
      );
  });
});
