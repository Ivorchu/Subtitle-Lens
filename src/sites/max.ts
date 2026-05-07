import type { SiteAdapter } from './adapter';

export class MaxAdapter implements SiteAdapter {
  readonly name = 'Max';

  private styleEl: HTMLStyleElement | null = null;
  private overlayEl: HTMLElement | null = null;

  matches(url: string): boolean {
    return url.includes('max.com/watch') || url.includes('play.max.com');
  }

  findVideoElement(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video');
  }

  findSubtitleContainer(): Element | null {
    return (
      document.querySelector('.bmpui-ui-subtitle-overlay') ??
      document.querySelector('.subtitle-overlay') ??
      document.querySelector('[class*="subtitle-container"]') ??
      document.querySelector('[class*="captions"]')
    );
  }

  extractSubtitleText(container: Element): string {
    const leaves = Array.from(container.querySelectorAll('p, span')).filter(
      el => el.children.length === 0 && (el.textContent ?? '').trim(),
    );
    if (leaves.length > 0) {
      return leaves.map(el => el.textContent ?? '').join(' ').trim();
    }
    return (container.textContent ?? '').trim();
  }

  hideOriginalSubtitles(): void {
    if (this.styleEl) return;
    const style = document.createElement('style');
    style.id = 'subtitle-lens-hide';
    style.textContent = `
      .bmpui-ui-subtitle-overlay,
      .subtitle-overlay,
      [class*="subtitle-container"],
      [class*="captions"] {
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
      video.closest('.bmpui-container-wrapper') ??
      video.closest('[class*="player"]') ??
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
