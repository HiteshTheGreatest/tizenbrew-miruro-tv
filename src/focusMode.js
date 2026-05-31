const BASE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
  'video',
  '[onclick]',
  '[data-testid]',
  '[class]'
].join(',');

const DYNAMIC_TABINDEX = 'data-mtvc-tabindex';

function isVisible(element) {
  if (!element || element.closest('[aria-hidden="true"], [hidden]')) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= 8 &&
    rect.height >= 8 &&
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth;
}

function isDisabled(element) {
  return element.disabled ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.closest('[disabled], [aria-disabled="true"]');
}

function isClickableByStyle(element) {
  return window.getComputedStyle(element).cursor === 'pointer';
}

function looksLikeContentCard(element) {
  const text = `${element.className || ''} ${element.getAttribute('data-testid') || ''}`.toLowerCase();
  return text.includes('episode') ||
    text.includes('anime') ||
    text.includes('card') ||
    text.includes('result');
}

function elementCenter(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    rect
  };
}

function scoreCandidate(current, candidate, direction) {
  const from = elementCenter(current);
  const to = elementCenter(candidate);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (direction === 'ArrowUp' && dy >= -4) return Number.POSITIVE_INFINITY;
  if (direction === 'ArrowDown' && dy <= 4) return Number.POSITIVE_INFINITY;
  if (direction === 'ArrowLeft' && dx >= -4) return Number.POSITIVE_INFINITY;
  if (direction === 'ArrowRight' && dx <= 4) return Number.POSITIVE_INFINITY;

  const primary = direction === 'ArrowUp' || direction === 'ArrowDown' ? Math.abs(dy) : Math.abs(dx);
  const secondary = direction === 'ArrowUp' || direction === 'ArrowDown' ? Math.abs(dx) : Math.abs(dy);
  const overlapBonus = hasAxisOverlap(from.rect, to.rect, direction) ? -200 : 0;

  return primary * 8 + secondary * 2 + overlapBonus;
}

function hasAxisOverlap(a, b, direction) {
  if (direction === 'ArrowUp' || direction === 'ArrowDown') {
    return a.left < b.right && a.right > b.left;
  }
  return a.top < b.bottom && a.bottom > b.top;
}

function scrollFallback(direction) {
  const amount = Math.round(window.innerHeight * 0.45);
  const top = direction === 'ArrowUp' ? -amount : direction === 'ArrowDown' ? amount : 0;
  const left = direction === 'ArrowLeft' ? -amount : direction === 'ArrowRight' ? amount : 0;

  try {
    window.scrollBy({ top, left, behavior: 'smooth' });
  } catch {
    window.scrollBy(left, top);
  }
}

export class FocusMode {
  constructor() {
    this.items = [];
    this.current = null;
    this.lastRefresh = 0;
    this.refresh = this.refresh.bind(this);
  }

  activate() {
    this.refresh(true);
    if (!this.current || !isVisible(this.current)) {
      this.focus(this.items[0]);
    } else {
      this.applyFocusRing();
    }
  }

  deactivate() {
    this.clearFocusRing();
  }

  refresh(force = false) {
    const now = Date.now();
    if (!force && now - this.lastRefresh < 350) return;
    this.lastRefresh = now;

    const selectorItems = Array.from(document.querySelectorAll(BASE_SELECTOR));
    const pointerItems = Array.from(document.body ? document.body.querySelectorAll('*') : [])
      .filter((element) => element.children.length <= 3 && isClickableByStyle(element));
    const cardItems = selectorItems.filter(looksLikeContentCard);

    this.items = Array.from(new Set([...selectorItems, ...pointerItems, ...cardItems]))
      .filter((element) => !element.classList.contains('mtvc-overlay'))
      .filter((element) => !element.classList.contains('mtvc-cursor'))
      .filter((element) => isVisible(element) && !isDisabled(element));

    if (this.current && !this.items.includes(this.current)) {
      this.current = null;
    }
  }

  move(direction) {
    this.refresh();
    if (this.items.length === 0) {
      scrollFallback(direction);
      return false;
    }

    if (!this.current || !isVisible(this.current)) {
      this.focus(this.items[0]);
      return true;
    }

    const next = this.items
      .filter((item) => item !== this.current)
      .map((item) => ({ item, score: scoreCandidate(this.current, item, direction) }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score)[0];

    if (!next) {
      scrollFallback(direction);
      return false;
    }

    this.focus(next.item);
    return true;
  }

  clickCurrent() {
    if (!this.current || !isVisible(this.current)) {
      this.refresh();
      this.focus(this.items[0]);
    }

    if (!this.current) return false;
    this.current.click();
    return true;
  }

  focus(element) {
    if (!element) return;
    this.clearFocusRing();
    this.current = element;

    if (!element.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|VIDEO)$/.test(element.tagName)) {
      element.setAttribute('tabindex', '-1');
      element.setAttribute(DYNAMIC_TABINDEX, 'true');
    }

    try {
      element.focus({ preventScroll: true });
    } catch {
      try {
        element.focus();
      } catch {
        /* Tizen WebView can reject focus on some custom elements. */
      }
    }

    try {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    } catch {
      element.scrollIntoView(false);
    }
    this.applyFocusRing();
  }

  applyFocusRing() {
    if (!this.current) return;
    this.current.classList.add('mtvc-focus');
    if (this.current.tagName === 'VIDEO') {
      this.current.setAttribute('data-mtvc-focus', 'video');
    }
  }

  clearFocusRing() {
    const focused = document.querySelectorAll('.mtvc-focus');
    focused.forEach((element) => {
      element.classList.remove('mtvc-focus');
      element.removeAttribute('data-mtvc-focus');
    });
  }
}
