import type { ExtensionSettings } from '../shared/types';

export class SubtitleOverlay {
  private currentText = '';

  constructor(private readonly container: HTMLElement) {}

  show(text: string, settings: ExtensionSettings): void {
    if (text === this.currentText) return;
    this.currentText = text;

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

  hide(): void {
    this.currentText = '';
    this.container.innerHTML = '';
  }

  updateSettings(settings: ExtensionSettings): void {
    const span = this.container.querySelector<HTMLElement>('span');
    if (span) span.style.fontSize = `${settings.fontSize}px`;
    this.container.style.bottom = `${settings.verticalPosition}%`;
  }

  destroy(): void {
    this.container.remove();
  }
}
