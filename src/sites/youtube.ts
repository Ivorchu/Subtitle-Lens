import type { SiteAdapter } from './adapter';

export class YouTubeAdapter implements SiteAdapter {
  readonly name = 'YouTube';

  private styleEl: HTMLStyleElement | null = null;
  private overlayEl: HTMLElement | null = null;

  matches(url: string): boolean {
    return url.includes('youtube.com/watch');
  }

  findVideoElement(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video.html5-main-video');
  }

  findSubtitleContainer(): Element | null {
    return document.querySelector('.ytp-caption-window-container');
  }

  extractSubtitleText(container: Element): string {
    return Array.from(container.querySelectorAll('.ytp-caption-segment'))
      .map(el => el.textContent ?? '')
      .join(' ')
      .trim();
  }

  hideOriginalSubtitles(): void {
    if (this.styleEl) return;
    const style = document.createElement('style');
    style.id = 'subtitle-lens-hide';
    style.textContent = `
      .ytp-caption-window-container {
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

    // Attach to the player container so it moves with the video.
    const player = video.closest('.html5-video-player') ?? video.parentElement;
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
