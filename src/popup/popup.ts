import { DEFAULT_SETTINGS, STORAGE_KEY, STATUS_KEY, SUPPORTED_LANGUAGES } from '../shared/config';
import type { ExtensionSettings, TranslationStatus } from '../shared/types';

const enabledEl = document.getElementById('enabled') as HTMLInputElement;
const sourceLangEl = document.getElementById('sourceLang') as HTMLSelectElement;
const targetLangEl = document.getElementById('targetLang') as HTMLSelectElement;
const fontSizeEl = document.getElementById('fontSize') as HTMLInputElement;
const vertPosEl = document.getElementById('verticalPosition') as HTMLInputElement;
const bgOpacityEl = document.getElementById('bgOpacity') as HTMLInputElement;
const textShadowEl = document.getElementById('textShadow') as HTMLInputElement;
const fontSizeValEl = document.getElementById('fontSizeVal') as HTMLElement;
const vertPosValEl = document.getElementById('vertPosVal') as HTMLElement;
const bgOpacityValEl = document.getElementById('bgOpacityVal') as HTMLElement;
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

// Preserve the auto-generated identifier across saves — never shown in UI
let currentMyMemoryEmail = DEFAULT_SETTINGS.myMemoryEmail;

function buildSettings(): ExtensionSettings {
  return {
    enabled: enabledEl.checked,
    sourceLanguage: sourceLangEl.value,
    targetLanguage: targetLangEl.value,
    myMemoryEmail: currentMyMemoryEmail,
    fontSize: parseInt(fontSizeEl.value, 10),
    verticalPosition: parseInt(vertPosEl.value, 10),
    bgOpacity: parseInt(bgOpacityEl.value, 10),
    textShadow: textShadowEl.checked,
  };
}

function applyToForm(settings: ExtensionSettings): void {
  currentMyMemoryEmail = settings.myMemoryEmail;
  enabledEl.checked = settings.enabled;
  sourceLangEl.value = settings.sourceLanguage;
  targetLangEl.value = settings.targetLanguage;
  fontSizeEl.value = String(settings.fontSize);
  vertPosEl.value = String(settings.verticalPosition);
  bgOpacityEl.value = String(settings.bgOpacity);
  textShadowEl.checked = settings.textShadow;
  fontSizeValEl.textContent = `${settings.fontSize}px`;
  vertPosValEl.textContent = `${settings.verticalPosition}%`;
  bgOpacityValEl.textContent = `${settings.bgOpacity}%`;
}

function save(): void {
  chrome.storage.sync.set({ [STORAGE_KEY]: buildSettings() });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveLazy(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; save(); }, 200);
}

// Load persisted settings on open
chrome.storage.sync.get(STORAGE_KEY, result => {
  applyToForm({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) });
});

enabledEl.addEventListener('change', save);
sourceLangEl.addEventListener('change', save);
targetLangEl.addEventListener('change', save);

fontSizeEl.addEventListener('input', () => {
  fontSizeValEl.textContent = `${fontSizeEl.value}px`;
  saveLazy();
});
fontSizeEl.addEventListener('change', save);

vertPosEl.addEventListener('input', () => {
  vertPosValEl.textContent = `${vertPosEl.value}%`;
  saveLazy();
});
vertPosEl.addEventListener('change', save);

bgOpacityEl.addEventListener('input', () => {
  bgOpacityValEl.textContent = `${bgOpacityEl.value}%`;
  saveLazy();
});
bgOpacityEl.addEventListener('change', save);

textShadowEl.addEventListener('change', save);

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
