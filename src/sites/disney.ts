import type { SiteAdapter } from './adapter';

export class DisneyAdapter implements SiteAdapter {
  readonly name = 'Disney+';

  private styleEl: HTMLStyleElement | null = null;
  private overlayEl: HTMLElement | null = null;

  matches(url: string): boolean {
    return url.includes('disneyplus.com/video');
  }

  findVideoElement(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video.clpp-video') ??
      document.querySelector<HTMLVideoElement>('video');
  }

  findSubtitleContainer(): Element | null {
    return document.querySelector('.clpp-subtitles-wrapper') ??
      document.querySelector('.clpp-subtitles');
  }

  extractSubtitleText(container: Element): string {
    return Array.from(container.querySelectorAll('span'))
      .map(el => el.textContent ?? '')
      .join(' ')
      .trim();
  }

  hideOriginalSubtitles(): void {
    if (this.styleEl) return;
    const style = document.createElement('style');
    style.id = 'subtitle-lens-hide';
    style.textContent = `
      .clpp-subtitles-wrapper,
      .clpp-subtitles {
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

    const player =
      video.closest('.clpp-container') ??
      video.closest('.hudson-container') ??
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
