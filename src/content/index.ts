import { YouTubeAdapter } from '../sites/youtube';
import { NetflixAdapter } from '../sites/netflix';
import { DisneyAdapter } from '../sites/disney';
import { PrimeVideoAdapter } from '../sites/primevideo';
import { SubtitleOverlay } from './overlay';
import { TranslationCache } from '../shared/cache';
import { Translator } from '../shared/translator';
import { debounce } from '../shared/debounce';
import { DEFAULT_SETTINGS, STORAGE_KEY, STATUS_KEY } from '../shared/config';
import type { ExtensionSettings, ContentMessage, TranslationStatus } from '../shared/types';
import type { SiteAdapter } from '../sites/adapter';

const ADAPTERS: SiteAdapter[] = [
  new YouTubeAdapter(),
  new NetflixAdapter(),
  new DisneyAdapter(),
  new PrimeVideoAdapter(),
];

class SubtitleLens {
  private adapter: SiteAdapter | null = null;
  private overlay: SubtitleOverlay | null = null;
  private subtitleObserver: MutationObserver | null = null;
  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
  private readonly cache = new TranslationCache();
  private readonly translator = new Translator(this.cache);
  private lastRawText = '';
  private inErrorState = false;
  private isSetup = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUrl = window.location.href;

  private readonly handleSubtitleChange = debounce(async (text: string) => {
    try {
      if (!this.settings.enabled || !this.overlay) return;
      if (text === this.lastRawText) return;
      this.lastRawText = text;

      if (!text) {
        this.overlay.hide();
        return;
      }

      const translated = await this.translator.translate(text, this.settings);
      this.overlay?.show(translated, this.settings);
      if (this.inErrorState) {
        this.inErrorState = false;
        void chrome.storage.local.remove(STATUS_KEY);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SubtitleLens] translation error', message);
      this.overlay?.showError(message);
      if (!this.inErrorState) {
        this.inErrorState = true;
        const status: TranslationStatus = { error: message, at: Date.now() };
        void chrome.storage.local.set({ [STATUS_KEY]: status });
      }
    }
  }, 120);

  async init(): Promise<void> {
    this.adapter = ADAPTERS.find(a => a.matches(window.location.href)) ?? null;
    if (!this.adapter) return;

    await this.loadSettings();
    this.listenForSettingsChanges();
    this.setupNavigationListeners();
    this.waitForElements();
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  private setupNavigationListeners(): void {
    // YouTube fires a custom event after its SPA transition completes.
    document.addEventListener('yt-navigate-finish', () => this.handleNavigation());

    // All other streaming SPAs use the History API. Patch pushState/replaceState
    // so we can detect programmatic URL changes (back/forward is handled by popstate).
    const dispatch = () => window.dispatchEvent(new Event('subtitle-lens:navigate'));

    const origPush = history.pushState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      origPush(...args);
      dispatch();
    };

    const origReplace = history.replaceState.bind(history);
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      origReplace(...args);
      dispatch();
    };

    window.addEventListener('popstate', () => this.handleNavigation());
    window.addEventListener('subtitle-lens:navigate', () => this.handleNavigation());
  }

  private handleNavigation(): void {
    const newUrl = window.location.href;
    if (newUrl === this.currentUrl) return;
    this.currentUrl = newUrl;

    const matched = ADAPTERS.find(a => a.matches(newUrl)) ?? null;
    if (!matched) return;
    this.adapter = matched;
    this.restart();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  private restart(): void {
    this.subtitleObserver?.disconnect();
    this.subtitleObserver = null;
    this.overlay?.destroy();
    this.overlay = null;
    this.lastRawText = '';
    this.inErrorState = false;
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

  // ── Settings ─────────────────────────────────────────────────────────────────

  private async loadSettings(): Promise<void> {
    return new Promise(resolve => {
      chrome.storage.sync.get(STORAGE_KEY, result => {
        this.settings = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ExtensionSettings> ?? {}) };
        resolve();
      });
    });
  }

  private listenForSettingsChanges(): void {
    chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
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
