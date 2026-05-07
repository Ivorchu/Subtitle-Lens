import { DEFAULT_SETTINGS, STORAGE_KEY, STREAMING_URL_PATTERNS } from '../shared/config';
import type {
  ExtensionSettings,
  ContentMessage,
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

async function translateMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const src = sourceLang === 'auto' ? 'auto' : toMyMemoryLang(sourceLang);
  const tgt = toMyMemoryLang(targetLang);
  const pair = `${encodeURIComponent(src)}|${encodeURIComponent(tgt)}`;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;

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

async function translateDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new Error('API key is not set. Add it in the extension popup.');

  const params: Record<string, string> = {
    text,
    target_lang: toDeepLLang(targetLang),
  };
  if (sourceLang !== 'auto') {
    params.source_lang = toDeepLLang(sourceLang);
  }

  const resp = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
    },
    body: new URLSearchParams(params),
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

  port.onMessage.addListener((message: TranslateRequest) => {
    if (message.type !== 'TRANSLATE') return;

    const { text, sourceLang, targetLang, provider, deeplApiKey } = message;

    const work =
      provider === 'deepl'
        ? translateDeepL(text, sourceLang, targetLang, deeplApiKey)
        : translateMyMemory(text, sourceLang, targetLang);

    work
      .then(result => port.postMessage({ ok: true, result } satisfies TranslateResponse))
      .catch(err =>
        port.postMessage({
          ok: false,
          error: classifyError(err, provider),
        } satisfies TranslateResponse),
      );
  });
});
