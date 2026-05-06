/**
 * Contract every site adapter must implement.
 * To add a new streaming platform, create a class that implements this interface
 * and register it in src/content/index.ts.
 */
export interface SiteAdapter {
  /** Human-readable name shown in logs / future UI. */
  readonly name: string;

  /** Returns true when this adapter should handle the given page URL. */
  matches(url: string): boolean;

  /** Locate the primary <video> element for the current playback session. */
  findVideoElement(): HTMLVideoElement | null;

  /**
   * Locate the container element that YouTube / the platform mutates when
   * subtitle text changes. The content script observes this with MutationObserver.
   */
  findSubtitleContainer(): Element | null;

  /** Extract plain subtitle text from the container at the moment of calling. */
  extractSubtitleText(container: Element): string;

  /** Visually suppress the native subtitle layer (opacity: 0 preferred). */
  hideOriginalSubtitles(): void;

  /** Reverse hideOriginalSubtitles — restores native subtitle visibility. */
  showOriginalSubtitles(): void;

  /**
   * Create (or return existing) overlay <div> positioned over the video.
   * The caller writes translated text into this element.
   */
  createOverlayContainer(video: HTMLVideoElement): HTMLElement;

  /** Remove injected styles and overlay; called on navigation or disable. */
  cleanup(): void;
}
