import { YouTubeAdapter } from '../sites/youtube';
import { SubtitleOverlay } from './overlay';
import { TranslationCache } from '../shared/cache';
import { Translator } from '../shared/translator';
import { debounce } from '../shared/debounce';
import { DEFAULT_SETTINGS, STORAGE_KEY } from '../shared/config';
import type { ExtensionSettings, RuntimeMessage } from '../shared/types';
import type { SiteAdapter } from '../sites/adapter';

const ADAPTERS: SiteAdapter[] = [new YouTubeAdapter()];

class SubtitleLens {
  private adapter: SiteAdapter | null = null;
  private overlay: SubtitleOverlay | null = null;
  private subtitleObserver: MutationObserver | null = null;
  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
  private readonly cache = new TranslationCache();
  private readonly translator = new Translator(this.cache);
  private lastRawText = '';
  private isSetup = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly handleSubtitleChange = debounce(async (text: string) => {
    try {
      if (!this.settings.enabled || !this.overlay) return;
      if (text === this.lastRawText) return;
      this.lastRawText = text;

      if (!text) {
        this.overlay.hide();
        return;
      }

      const translated = await this.translator.translate(text, this.settings.targetLanguage);
      this.overlay?.show(translated, this.settings);
    } catch (err) {
      console.error('[SubtitleLens] translation error', err);
    }
  }, 120);

  async init(): Promise<void> {
    this.adapter = ADAPTERS.find(a => a.matches(window.location.href)) ?? null;
    if (!this.adapter) return;

    await this.loadSettings();
    this.listenForSettingsChanges();
    this.waitForElements();

    // YouTube fires this event on SPA navigation between videos.
    document.addEventListener('yt-navigate-finish', () => {
      this.adapter = ADAPTERS.find(a => a.matches(window.location.href)) ?? null;
      if (this.adapter) this.restart();
    });
  }

  private restart(): void {
    this.subtitleObserver?.disconnect();
    this.subtitleObserver = null;
    this.overlay?.destroy();
    this.overlay = null;
    this.lastRawText = '';
    this.isSetup = false;
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.waitForElements();
  }

  private waitForElements(attempts = 0): void {
    if (this.isSetup || !this.adapter) return;
    if (attempts > 40) return; // give up after ~20 s

    const video = this.adapter.findVideoElement();
    const subtitleContainer = this.adapter.findSubtitleContainer();

    if (video && subtitleContainer) {
      this.setup(video, subtitleContainer);
    } else {
      this.pollTimer = setTimeout(() => this.waitForElements(attempts + 1), 500);
    }
  }

  private setup(video: HTMLVideoElement, subtitleContainer: Element): void {
    if (this.isSetup) return;
    this.isSetup = true;

    const overlayContainer = this.adapter!.createOverlayContainer(video);
    this.overlay = new SubtitleOverlay(overlayContainer);

    if (this.settings.enabled) {
      this.adapter!.hideOriginalSubtitles();
    }

    this.subtitleObserver = new MutationObserver(() => {
      const text = this.adapter!.extractSubtitleText(subtitleContainer);
      this.handleSubtitleChange(text);
    });

    this.subtitleObserver.observe(subtitleContainer, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private async loadSettings(): Promise<void> {
    return new Promise(resolve => {
      chrome.storage.sync.get(STORAGE_KEY, result => {
        this.settings = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) };
        resolve();
      });
    });
  }

  private listenForSettingsChanges(): void {
    chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        const prev = this.settings;
        this.settings = message.settings;

        if (this.settings.enabled !== prev.enabled) {
          if (this.settings.enabled) {
            this.adapter?.hideOriginalSubtitles();
          } else {
            this.adapter?.showOriginalSubtitles();
            this.overlay?.hide();
          }
        }

        this.overlay?.updateSettings(this.settings);
        sendResponse({ ok: true });
      }
    });
  }

  destroy(): void {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer);
    this.subtitleObserver?.disconnect();
    this.adapter?.cleanup();
    this.overlay?.destroy();
  }
}

const subtitleLens = new SubtitleLens();
subtitleLens.init().catch(console.error);
