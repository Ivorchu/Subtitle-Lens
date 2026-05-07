import { YouTubeAdapter } from '../sites/youtube';
import { NetflixAdapter } from '../sites/netflix';
import { DisneyAdapter } from '../sites/disney';
import { PrimeVideoAdapter } from '../sites/primevideo';

// ── helpers ──────────────────────────────────────────────────────────────────

function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function span(className: string, text: string): HTMLElement {
  const s = el('span', className);
  s.textContent = text;
  return s;
}

// ── YouTubeAdapter ────────────────────────────────────────────────────────────

describe('YouTubeAdapter', () => {
  const adapter = new YouTubeAdapter();

  describe('matches()', () => {
    it('matches a watch URL', () => {
      expect(adapter.matches('https://www.youtube.com/watch?v=abc123')).toBe(true);
    });
    it('does not match the homepage', () => {
      expect(adapter.matches('https://www.youtube.com/')).toBe(false);
    });
    it('does not match other sites', () => {
      expect(adapter.matches('https://www.netflix.com/watch/12345')).toBe(false);
    });
  });

  describe('extractSubtitleText()', () => {
    it('joins multiple caption segments with a space', () => {
      const container = el('div');
      container.appendChild(span('ytp-caption-segment', 'Hello'));
      container.appendChild(span('ytp-caption-segment', 'world'));
      expect(adapter.extractSubtitleText(container)).toBe('Hello world');
    });

    it('returns an empty string when there are no segments', () => {
      expect(adapter.extractSubtitleText(el('div'))).toBe('');
    });

    it('trims leading/trailing whitespace', () => {
      const container = el('div');
      container.appendChild(span('ytp-caption-segment', '  trimmed  '));
      expect(adapter.extractSubtitleText(container)).toBe('trimmed');
    });

    it('ignores elements without the segment class', () => {
      const container = el('div');
      container.appendChild(span('other-class', 'invisible'));
      container.appendChild(span('ytp-caption-segment', 'visible'));
      expect(adapter.extractSubtitleText(container)).toBe('visible');
    });
  });
});

// ── NetflixAdapter ────────────────────────────────────────────────────────────

describe('NetflixAdapter', () => {
  const adapter = new NetflixAdapter();

  describe('matches()', () => {
    it('matches a watch URL', () => {
      expect(adapter.matches('https://www.netflix.com/watch/12345')).toBe(true);
    });
    it('does not match the Netflix homepage', () => {
      expect(adapter.matches('https://www.netflix.com/')).toBe(false);
    });
  });

  describe('extractSubtitleText()', () => {
    it('extracts text from timedtext spans', () => {
      const container = el('div', 'player-timedtext');
      const textDiv = el('div', 'player-timedtext-text-container');
      const s = document.createElement('span');
      s.textContent = 'Netflix subtitle';
      textDiv.appendChild(s);
      container.appendChild(textDiv);

      expect(adapter.extractSubtitleText(container)).toBe('Netflix subtitle');
    });

    it('joins multiple spans', () => {
      const container = el('div', 'player-timedtext');
      const textDiv = el('div', 'player-timedtext-text-container');
      ['Part', 'one'].forEach(t => {
        const s = document.createElement('span');
        s.textContent = t;
        textDiv.appendChild(s);
      });
      container.appendChild(textDiv);

      expect(adapter.extractSubtitleText(container)).toBe('Part one');
    });

    it('returns empty string when container is empty', () => {
      expect(adapter.extractSubtitleText(el('div'))).toBe('');
    });
  });
});

// ── DisneyAdapter ─────────────────────────────────────────────────────────────

describe('DisneyAdapter', () => {
  const adapter = new DisneyAdapter();

  describe('matches()', () => {
    it('matches a video URL', () => {
      expect(adapter.matches('https://www.disneyplus.com/video/12345')).toBe(true);
    });
    it('does not match the homepage', () => {
      expect(adapter.matches('https://www.disneyplus.com/')).toBe(false);
    });
  });

  describe('extractSubtitleText()', () => {
    it('extracts text from subtitle spans', () => {
      const container = el('div', 'clpp-subtitles-wrapper');
      const s = document.createElement('span');
      s.textContent = 'Disney subtitle';
      container.appendChild(s);

      expect(adapter.extractSubtitleText(container)).toBe('Disney subtitle');
    });

    it('returns empty string when container is empty', () => {
      expect(adapter.extractSubtitleText(el('div'))).toBe('');
    });
  });
});

// ── PrimeVideoAdapter ─────────────────────────────────────────────────────────

describe('PrimeVideoAdapter', () => {
  const adapter = new PrimeVideoAdapter();

  describe('matches()', () => {
    it('matches amazon.com/gp/video paths', () => {
      expect(adapter.matches('https://www.amazon.com/gp/video/detail/B09T9TCMZB')).toBe(true);
    });
    it('matches amazon.com/dp paths', () => {
      expect(adapter.matches('https://www.amazon.com/dp/B09T9TCMZB')).toBe(true);
    });
    it('matches primevideo.com', () => {
      expect(adapter.matches('https://www.primevideo.com/detail/B09T9TCMZB')).toBe(true);
    });
    it('does not match the Amazon homepage', () => {
      expect(adapter.matches('https://www.amazon.com/')).toBe(false);
    });
  });

  describe('extractSubtitleText()', () => {
    it('extracts from atvwebplayersdk-timedtext-text elements', () => {
      const container = el('div', 'atvwebplayersdk-captions-overlay');
      container.appendChild(span('atvwebplayersdk-timedtext-text', 'Prime subtitle'));

      expect(adapter.extractSubtitleText(container)).toBe('Prime subtitle');
    });

    it('also extracts from timedTextAttributedString elements', () => {
      const container = el('div');
      container.appendChild(span('timedTextAttributedString', 'Alt selector'));

      expect(adapter.extractSubtitleText(container)).toBe('Alt selector');
    });

    it('joins multiple text elements', () => {
      const container = el('div');
      container.appendChild(span('atvwebplayersdk-timedtext-text', 'Hello'));
      container.appendChild(span('atvwebplayersdk-timedtext-text', 'Prime'));

      expect(adapter.extractSubtitleText(container)).toBe('Hello Prime');
    });

    it('returns empty string when container is empty', () => {
      expect(adapter.extractSubtitleText(el('div'))).toBe('');
    });
  });
});
