export const MODES = {
  REMOTE: 'remote',
  MOUSE: 'mouse'
};

const KEY_ALIASES = {
  13: 'Enter',
  27: 'Escape',
  37: 'ArrowLeft',
  38: 'ArrowUp',
  39: 'ArrowRight',
  40: 'ArrowDown',
  10009: 'Back',
  403: 'ColorF0Red',
  415: 'MediaPlay',
  19: 'MediaPause',
  10252: 'MediaPlayPause',
  412: 'MediaRewind',
  417: 'MediaFastForward'
};

export const DIRECTION_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight'
]);

export const MEDIA_KEYS = new Set([
  'MediaPlay',
  'MediaPause',
  'MediaPlayPause',
  'MediaRewind',
  'MediaFastForward'
]);

export function normalizeKey(event) {
  if (event.key && event.key !== 'Unidentified') {
    if (event.key === 'XF86Red') return 'ColorF0Red';
    if (event.key === 'Esc') return 'Escape';
    return event.key;
  }

  return KEY_ALIASES[event.keyCode] || KEY_ALIASES[event.which] || '';
}

export function isModeToggleKey(key) {
  return key === 'ColorF0Red' || key === 'M' || key === 'm';
}

export function isBackKey(key) {
  return key === 'Back' || key === 'BrowserBack' || key === 'Escape';
}

export function isEditableElement(element) {
  if (!element) return false;
  const tagName = element.tagName;
  return element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT';
}
