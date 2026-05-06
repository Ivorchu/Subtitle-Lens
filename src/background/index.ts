import { DEFAULT_SETTINGS, STORAGE_KEY } from '../shared/config';
import type { ExtensionSettings, RuntimeMessage } from '../shared/types';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(STORAGE_KEY, result => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
    }
  });
});

// Broadcast settings changes to all active YouTube tabs.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes[STORAGE_KEY]) return;

  const settings = changes[STORAGE_KEY].newValue as ExtensionSettings;
  const message: RuntimeMessage = { type: 'SETTINGS_UPDATED', settings };

  chrome.tabs.query({ url: 'https://www.youtube.com/*' }, tabs => {
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Content script may not be injected on this tab yet — safe to ignore.
        });
      }
    }
  });
});
