import { DEFAULT_SETTINGS, STORAGE_KEY, STREAMING_URL_PATTERNS } from '../shared/config';
import type {
  ExtensionSettings,
  ContentMessage,
  TranslateRequest,
  TranslateResponse,
} from '../shared/types';

// DeepL uses uppercase lang codes; a few need explicit mapping.
const DEEPL_LANG_MAP: Record<string, string> = {
  zh: 'ZH',
  pt: 'PT-BR',
};
function toDeepLLang(code: string): string {
  return DEEPL_LANG_MAP[code] ?? code.toUpperCase();
}

function classifyError(err: unknown, provider: 'mymemory' | 'deepl'): string {
  const msg = String(err);

  if (provider === 'deepl') {
    if (msg.includes('API key is not set')) return 'DeepL API key not configured — add it in the popup';
    if (msg.includes('403'))               return 'Invalid DeepL API key — check the key in the popup';
    if (msg.includes('456'))               return 'DeepL monthly character quota exceeded';
    if (msg.includes('429'))               return 'DeepL rate limit hit — too many requests';
    if (msg.includes('400'))               return 'DeepL rejected the request (unsupported language?)';
  }

  if (provider === 'mymemory') {
    const upper = msg.toUpperCase();
    if (upper.includes('ALL AVAILABLE FREE') || msg.includes('429')) {
      return 'MyMemory daily limit reached — try again tomorrow or switch to DeepL';
    }
    if (upper.includes('QUERY LENGTH')) {
      return 'Subtitle too long for MyMemory free tier';
    }
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

async function translateMyMemory(text: string, targetLang: string): Promise<string> {
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(targetLang)}`;

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

async function translateDeepL(text: string, targetLang: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('API key is not set. Add it in the extension popup.');

  const resp = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
    },
    body: new URLSearchParams({ text, target_lang: toDeepLLang(targetLang) }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`DeepL HTTP ${resp.status}: ${body}`);
  }

  const data = await resp.json() as { translations: Array<{ text: string }> };
  return data.translations[0].text;
}

// Initialise default settings on first install.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(STORAGE_KEY, result => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
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

// Proxy translation requests from content scripts (avoids CORS from page context).
chrome.runtime.onMessage.addListener(
  (message: TranslateRequest, _sender, sendResponse) => {
    if (message.type !== 'TRANSLATE') return;

    const { text, targetLang, provider, deeplApiKey } = message;

    const work =
      provider === 'deepl'
        ? translateDeepL(text, targetLang, deeplApiKey)
        : translateMyMemory(text, targetLang);

    work
      .then(result => sendResponse({ ok: true, result } satisfies TranslateResponse))
      .catch(err =>
        sendResponse({
          ok: false,
          error: classifyError(err, provider),
        } satisfies TranslateResponse),
      );

    return true; // keep channel open for async sendResponse
  },
);
