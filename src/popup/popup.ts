import { DEFAULT_SETTINGS, STORAGE_KEY, SUPPORTED_LANGUAGES } from '../shared/config';
import type { ExtensionSettings } from '../shared/types';

const enabledEl = document.getElementById('enabled') as HTMLInputElement;
const targetLangEl = document.getElementById('targetLang') as HTMLSelectElement;
const fontSizeEl = document.getElementById('fontSize') as HTMLInputElement;
const vertPosEl = document.getElementById('verticalPosition') as HTMLInputElement;
const fontSizeValEl = document.getElementById('fontSizeVal') as HTMLElement;
const vertPosValEl = document.getElementById('vertPosVal') as HTMLElement;

// Populate language dropdown
for (const lang of SUPPORTED_LANGUAGES) {
  const opt = document.createElement('option');
  opt.value = lang.code;
  opt.textContent = lang.name;
  targetLangEl.appendChild(opt);
}

function buildSettings(): ExtensionSettings {
  return {
    enabled: enabledEl.checked,
    targetLanguage: targetLangEl.value,
    fontSize: parseInt(fontSizeEl.value, 10),
    verticalPosition: parseInt(vertPosEl.value, 10),
  };
}

function applyToForm(settings: ExtensionSettings): void {
  enabledEl.checked = settings.enabled;
  targetLangEl.value = settings.targetLanguage;
  fontSizeEl.value = String(settings.fontSize);
  vertPosEl.value = String(settings.verticalPosition);
  fontSizeValEl.textContent = `${settings.fontSize}px`;
  vertPosValEl.textContent = `${settings.verticalPosition}%`;
}

function save(): void {
  chrome.storage.sync.set({ [STORAGE_KEY]: buildSettings() });
}

// Load persisted settings on open
chrome.storage.sync.get(STORAGE_KEY, result => {
  applyToForm({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) });
});

// Persist on any interaction
enabledEl.addEventListener('change', save);
targetLangEl.addEventListener('change', save);

fontSizeEl.addEventListener('input', () => {
  fontSizeValEl.textContent = `${fontSizeEl.value}px`;
  save();
});

vertPosEl.addEventListener('input', () => {
  vertPosValEl.textContent = `${vertPosEl.value}%`;
  save();
});
