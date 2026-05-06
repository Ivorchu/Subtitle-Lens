import type { ExtensionSettings } from '../shared/types';

export class SubtitleOverlay {
  private currentText = '';
  private errorTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly container: HTMLElement) {}

  show(text: string, settings: ExtensionSettings): void {
    if (text === this.currentText) return;
    this.currentText = text;
    this.clearErrorTimer();

    this.container.innerHTML = '';
    if (!text) return;

    const span = document.createElement('span');
    span.style.cssText = [
      'display:inline-block',
      'background:rgba(0,0,0,0.75)',
      'color:#fff',
      'padding:4px 12px',
      'border-radius:3px',
      `font-size:${settings.fontSize}px`,
      'font-family:Arial,Helvetica,sans-serif',
      'line-height:1.5',
      'white-space:pre-wrap',
      'max-width:80%',
    ].join(';');
    span.textContent = text;

    this.container.appendChild(span);
    this.container.style.bottom = `${settings.verticalPosition}%`;
  }

  showError(message: string): void {
    // Reset so the next real subtitle will always re-render.
    this.currentText = '';
    this.clearErrorTimer();

    this.container.innerHTML = '';

    const badge = document.createElement('span');
    badge.style.cssText = [
      'display:inline-block',
      'background:rgba(180,30,30,0.75)',
      'color:rgba(255,200,200,0.95)',
      'padding:3px 10px',
      'border-radius:3px',
      'font-size:13px',
      'font-family:Arial,Helvetica,sans-serif',
      'font-style:italic',
      'max-width:80%',
    ].join(';');
    badge.textContent = `[!] ${message}`;
    this.container.appendChild(badge);

    // Auto-clear after 6 s so it doesn't block subtitles permanently.
    this.errorTimer = setTimeout(() => {
      this.errorTimer = null;
      if (this.container.contains(badge)) badge.remove();
    }, 6000);
  }

  hide(): void {
    this.currentText = '';
    this.clearErrorTimer();
    this.container.innerHTML = '';
  }

  updateSettings(settings: ExtensionSettings): void {
    const span = this.container.querySelector<HTMLElement>('span');
    if (span) span.style.fontSize = `${settings.fontSize}px`;
    this.container.style.bottom = `${settings.verticalPosition}%`;
  }

  destroy(): void {
    this.clearErrorTimer();
    this.container.remove();
  }

  private clearErrorTimer(): void {
    if (this.errorTimer !== null) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
  }
}
