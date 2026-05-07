import type { SiteAdapter } from './adapter';

export class PrimeVideoAdapter implements SiteAdapter {
  readonly name = 'Prime Video';

  private styleEl: HTMLStyleElement | null = null;
  private overlayEl: HTMLElement | null = null;

  matches(url: string): boolean {
    return url.includes('amazon.com/gp/video') ||
      url.includes('amazon.com/dp') ||
      url.includes('primevideo.com');
  }

  findVideoElement(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video');
  }

  findSubtitleContainer(): Element | null {
    return document.querySelector('.atvwebplayersdk-captions-overlay') ??
      document.querySelector('.timedTextContainer');
  }

  extractSubtitleText(container: Element): string {
    // Prime Video renders text as individual styled spans
    return Array.from(
      container.querySelectorAll('.atvwebplayersdk-captions-text, .atvwebplayersdk-timedtext-text, .timedTextAttributedString'),
    )
      .map(el => el.textContent ?? '')
      .join(' ')
      .trim();
  }

  hideOriginalSubtitles(): void {
    if (this.styleEl) return;
    const style = document.createElement('style');
    style.id = 'subtitle-lens-hide';
    style.textContent = `
      .atvwebplayersdk-captions-overlay,
      .timedTextContainer {
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    this.styleEl = style;
  }

  showOriginalSubtitles(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  createOverlayContainer(video: HTMLVideoElement): HTMLElement {
    const existing = document.getElementById('subtitle-lens-overlay');
    if (existing) return existing;

    const overlay = document.createElement('div');
    overlay.id = 'subtitle-lens-overlay';
    overlay.style.cssText = [
      'position:absolute',
      'left:0',
      'right:0',
      'bottom:10%',
      'text-align:center',
      'pointer-events:none',
      'z-index:10000',
    ].join(';');

    const captionsOverlay = document.querySelector('.atvwebplayersdk-captions-overlay');
    const player =
      captionsOverlay?.parentElement ??
      video.closest('#dv-web-player') ??
      video.closest('.atvwebplayersdk-overlays-container') ??
      video.parentElement;
    player?.appendChild(overlay);
    this.overlayEl = overlay;
    return overlay;
  }

  cleanup(): void {
    this.showOriginalSubtitles();
    this.overlayEl?.remove();
    this.overlayEl = null;
  }
}
