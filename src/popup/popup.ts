import { DEFAULT_SETTINGS, STORAGE_KEY, STATUS_KEY, SUPPORTED_LANGUAGES } from '../shared/config';
import type { ExtensionSettings, TranslationProvider, TranslationStatus } from '../shared/types';

const enabledEl = document.getElementById('enabled') as HTMLInputElement;
const sourceLangEl = document.getElementById('sourceLang') as HTMLSelectElement;
const targetLangEl = document.getElementById('targetLang') as HTMLSelectElement;
const providerEl = document.getElementById('provider') as HTMLSelectElement;
const deeplKeyEl = document.getElementById('deeplApiKey') as HTMLInputElement;
const deeplKeyRow = document.getElementById('deeplKeyRow') as HTMLElement;
const fontSizeEl = document.getElementById('fontSize') as HTMLInputElement;
const vertPosEl = document.getElementById('verticalPosition') as HTMLInputElement;
const fontSizeValEl = document.getElementById('fontSizeVal') as HTMLElement;
const vertPosValEl = document.getElementById('vertPosVal') as HTMLElement;
const statusRow = document.getElementById('statusRow') as HTMLElement;
const statusMsg = document.getElementById('statusMsg') as HTMLElement;

// Populate source language dropdown (auto-detect first, then all languages)
const autoOpt = document.createElement('option');
autoOpt.value = 'auto';
autoOpt.textContent = 'Auto-detect';
sourceLangEl.appendChild(autoOpt);

for (const lang of SUPPORTED_LANGUAGES) {
  const src = document.createElement('option');
  src.value = lang.code;
  src.textContent = lang.name;
  sourceLangEl.appendChild(src);

  const tgt = document.createElement('option');
  tgt.value = lang.code;
  tgt.textContent = lang.name;
  targetLangEl.appendChild(tgt);
}

function syncDeepLVisibility(): void {
  deeplKeyRow.hidden = providerEl.value !== 'deepl';
}

function buildSettings(): ExtensionSettings {
  return {
    enabled: enabledEl.checked,
    sourceLanguage: sourceLangEl.value,
    targetLanguage: targetLangEl.value,
    provider: providerEl.value as TranslationProvider,
    deeplApiKey: deeplKeyEl.value.trim(),
    fontSize: parseInt(fontSizeEl.value, 10),
    verticalPosition: parseInt(vertPosEl.value, 10),
  };
}

function applyToForm(settings: ExtensionSettings): void {
  enabledEl.checked = settings.enabled;
  sourceLangEl.value = settings.sourceLanguage;
  targetLangEl.value = settings.targetLanguage;
  providerEl.value = settings.provider;
  deeplKeyEl.value = settings.deeplApiKey;
  fontSizeEl.value = String(settings.fontSize);
  vertPosEl.value = String(settings.verticalPosition);
  fontSizeValEl.textContent = `${settings.fontSize}px`;
  vertPosValEl.textContent = `${settings.verticalPosition}%`;
  syncDeepLVisibility();
}

function save(): void {
  chrome.storage.sync.set({ [STORAGE_KEY]: buildSettings() });
}

// Load persisted settings on open
chrome.storage.sync.get(STORAGE_KEY, result => {
  applyToForm({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) });
});

enabledEl.addEventListener('change', save);
sourceLangEl.addEventListener('change', save);
targetLangEl.addEventListener('change', save);
providerEl.addEventListener('change', () => { syncDeepLVisibility(); save(); });
deeplKeyEl.addEventListener('change', save);

fontSizeEl.addEventListener('input', () => {
  fontSizeValEl.textContent = `${fontSizeEl.value}px`;
  save();
});

vertPosEl.addEventListener('input', () => {
  vertPosValEl.textContent = `${vertPosEl.value}%`;
  save();
});

// --- Error status panel ---
const ERROR_TTL_MS = 60_000;

function applyStatus(status: TranslationStatus | undefined): void {
  if (!status || Date.now() - status.at > ERROR_TTL_MS) {
    statusRow.hidden = true;
    return;
  }
  statusMsg.textContent = status.error;
  statusRow.hidden = false;
}

chrome.storage.local.get(STATUS_KEY, result => {
  applyStatus(result[STATUS_KEY] as TranslationStatus | undefined);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(STATUS_KEY in changes)) return;
  applyStatus(changes[STATUS_KEY].newValue as TranslationStatus | undefined);
});
