/**
 * MiruroTV - Simple wrapper to access miruro.bz on Samsung TV
 * Adds TV remote navigation support only
 */

// Import spatial navigation polyfill for TV remote support
import './spatial-navigation-polyfill.js';

console.log('MiruroTV loaded - initializing spatial navigation...');

function applyPageZoom() {
  if (!document.body) return;
  document.body.style.zoom = '150%';
  document.body.style.transformOrigin = '0 0';
}

const KEY = {
  ENTER: 13,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  BACK: 10009,
  RED: 403
};

let mouseMode = false;
let cursor;
let cursorX = Math.round(window.innerWidth / 2);
let cursorY = Math.round(window.innerHeight / 2);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isTextEditable(element) {
  if (!element) return false;
  const tagName = element.tagName;
  return element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT';
}

function focusForTvKeyboard(element) {
  if (!element) return;

  const editable = isTextEditable(element) ?
    element :
    element.closest && element.closest('input, textarea, select, [contenteditable="true"]');

  if (!editable) return;

  try {
    editable.focus();
  } catch (error) {
    console.warn('Unable to focus editable target', error);
  }
}

function registerExtraKeys() {
  if (!window.tizen || !tizen.tvinputdevice) return;

  try {
    if (typeof tizen.tvinputdevice.registerKeyBatch === 'function') {
      tizen.tvinputdevice.registerKeyBatch(['ColorF0Red']);
      return;
    }
  } catch (error) {
    console.warn('ColorF0Red batch registration failed', error);
  }

  try {
    tizen.tvinputdevice.registerKey('ColorF0Red');
  } catch (error) {
    console.warn('ColorF0Red registration failed', error);
  }
}

function ensureCursor() {
  if (cursor) return cursor;

  cursor = document.createElement('div');
  cursor.id = 'miruro-tv-fake-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.documentElement.appendChild(cursor);
  renderCursor();
  return cursor;
}

function renderCursor() {
  if (!cursor) return;
  cursor.style.transform = 'translate3d(' + cursorX + 'px,' + cursorY + 'px,0)';
}

function setSpatialNavigationEnabled(enabled) {
  if (window.__spatialNavigation__) {
    window.__spatialNavigation__.keyMode = enabled ? 'ARROW' : 'NONE';
  }
}

function showModeToast(text) {
  let toast = document.getElementById('miruro-tv-mode-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'miruro-tv-mode-toast';
    document.documentElement.appendChild(toast);
  }

  toast.textContent = text;
  toast.className = 'visible';
  clearTimeout(showModeToast.timer);
  showModeToast.timer = setTimeout(() => {
    toast.className = '';
  }, 1800);
}

function setMouseMode(enabled) {
  mouseMode = enabled;
  ensureCursor();
  cursor.className = enabled ? 'visible' : '';
  setSpatialNavigationEnabled(!enabled);
  showModeToast(enabled ? 'Mouse Mode' : 'Remote Mode');
}

function toggleMouseMode() {
  setMouseMode(!mouseMode);
}

function moveCursor(keyCode, repeated) {
  const step = repeated ? 48 : 32;

  if (keyCode === KEY.LEFT) cursorX -= step;
  if (keyCode === KEY.RIGHT) cursorX += step;
  if (keyCode === KEY.UP) cursorY -= step;
  if (keyCode === KEY.DOWN) cursorY += step;

  cursorX = clamp(cursorX, 0, window.innerWidth - 1);
  cursorY = clamp(cursorY, 0, window.innerHeight - 1);
  renderCursor();
}

function clickCursorTarget() {
  const target = document.elementFromPoint(cursorX, cursorY);
  if (!target) return;

  focusForTvKeyboard(target);

  ['mousedown', 'mouseup', 'click'].forEach(type => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: cursorX,
      clientY: cursorY,
      button: 0
    });
    target.dispatchEvent(event);
  });

  focusForTvKeyboard(target);
}

function navigateWithRemote(keyCode) {
  if (isTextEditable(document.activeElement)) return false;
  if (typeof window.navigate !== 'function') return false;

  const direction = {
    [KEY.LEFT]: 'left',
    [KEY.RIGHT]: 'right',
    [KEY.UP]: 'up',
    [KEY.DOWN]: 'down'
  }[keyCode];

  if (!direction) return false;

  makeFocusable();
  window.navigate(direction);
  return true;
}

function handleFakeMouseKeys(event) {
  const keyCode = event.keyCode;

  if (keyCode === KEY.RED) {
    toggleMouseMode();
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  if (!mouseMode) return;

  if (keyCode === KEY.LEFT || keyCode === KEY.RIGHT || keyCode === KEY.UP || keyCode === KEY.DOWN) {
    moveCursor(keyCode, event.repeat);
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  if (keyCode === KEY.ENTER) {
    clickCursorTarget();
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  if (keyCode === KEY.BACK) {
    setMouseMode(false);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

function handleRemoteFallbackKeys(event) {
  if (mouseMode) return;

  const keyCode = event.keyCode;
  if (keyCode !== KEY.LEFT && keyCode !== KEY.RIGHT && keyCode !== KEY.UP && keyCode !== KEY.DOWN) {
    return;
  }

  if (navigateWithRemote(keyCode)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Add basic focus outline so you can see where you are
const style = document.createElement('style');
style.textContent = `
  *:focus {
    outline: 3px solid #0066ff !important;
    outline-offset: 2px !important;
  }

  /* Make common elements focusable */
  a, button, [role="button"], [onclick], input, select, textarea {
    cursor: pointer;
  }

  #miruro-tv-fake-cursor {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2147483647;
    width: 28px;
    height: 28px;
    pointer-events: none;
    display: none;
    transform: translate3d(-100px, -100px, 0);
    transition: transform 80ms linear;
    filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.7));
  }

  #miruro-tv-fake-cursor.visible {
    display: block;
  }

  #miruro-tv-fake-cursor::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 1px;
    width: 0;
    height: 0;
    border-top: 23px solid #ffffff;
    border-right: 15px solid transparent;
  }

  #miruro-tv-fake-cursor::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 7px;
    width: 0;
    height: 0;
    border-top: 11px solid #111111;
    border-right: 7px solid transparent;
  }

  #miruro-tv-mode-toast {
    position: fixed;
    right: 28px;
    bottom: 28px;
    z-index: 2147483647;
    padding: 10px 14px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.82);
    color: #ffffff;
    font: 600 16px/1.2 sans-serif;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 150ms ease, transform 150ms ease;
    pointer-events: none;
  }

  #miruro-tv-mode-toast.visible {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(style);
applyPageZoom();
registerExtraKeys();
window.addEventListener('keydown', handleFakeMouseKeys, true);
window.addEventListener('keydown', handleRemoteFallbackKeys, false);
window.addEventListener('resize', () => {
  cursorX = clamp(cursorX, 0, window.innerWidth - 1);
  cursorY = clamp(cursorY, 0, window.innerHeight - 1);
  renderCursor();
});

// Initialize spatial navigation
function initSpatialNav() {
  console.log('Checking spatial navigation availability...');

  // Check if polyfill loaded
  if (typeof window.navigate === 'function') {
    console.log('✓ Spatial navigation polyfill loaded');

    if (window.__spatialNavigation__) {
      window.__spatialNavigation__.keyMode = 'ARROW';
      console.log('✓ Arrow key mode enabled');
    }

    // Make sure elements are focusable
    makeFocusable();

    console.log('✓ MiruroTV ready - use arrow keys to navigate!');
  } else {
    console.error('✗ Spatial navigation polyfill failed to load');
  }
}

// Make clickable elements focusable if they aren't already
function makeFocusable() {
  // Find all clickable elements without tabindex
  const clickables = document.querySelectorAll('a, button, [role="button"], [onclick], input, select, textarea, [class*="click"]');
  let count = 0;

  clickables.forEach(el => {
    if (!el.hasAttribute('tabindex') && el.tabIndex < 0) {
      el.setAttribute('tabindex', '0');
      count++;
    }
  });

  console.log(`Made ${count} elements focusable`);

  // Re-scan for new elements every 2 seconds
  setTimeout(makeFocusable, 2000);
}

// Wait for polyfill to initialize, then set it up
setTimeout(() => {
  initSpatialNav();
}, 500);

// Also try on page load in case we're early
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyPageZoom();
    setTimeout(initSpatialNav, 500);
  });
}
