import { FocusMode } from './focusMode.js';
import { MouseMode } from './mouseMode.js';
import { Overlay, injectStyles } from './overlay.js';
import { seekBy, togglePlayPause } from './playerControls.js';
import {
  DIRECTION_KEYS,
  MEDIA_KEYS,
  MODES,
  isBackKey,
  isEditableElement,
  isModeToggleKey,
  normalizeKey
} from './keys.js';

const LONG_PRESS_MS = 850;
const REFRESH_INTERVAL_MS = 2500;

class MiruroTvControls {
  constructor() {
    this.mode = '';
    this.focusMode = new FocusMode();
    this.mouseMode = new MouseMode();
    this.overlay = new Overlay();
    this.enterLongPressTimer = 0;
    this.enterLongPressFired = false;
    this.refreshTimer = 0;
    this.pendingRefresh = 0;
    this.observer = null;
    this.lastUrl = location.href;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.refresh = this.refresh.bind(this);
    this.handleRouteChange = this.handleRouteChange.bind(this);
  }

  start() {
    this.registerTizenKeys();
    this.installRouteHooks();
    this.installObservers();

    window.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('keyup', this.handleKeyUp, true);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('popstate', this.handleRouteChange);

    this.setMode(MODES.REMOTE);
    this.refreshTimer = window.setInterval(this.refresh, REFRESH_INTERVAL_MS);
  }

  registerTizenKeys() {
    const inputDevice = window.tizen && window.tizen.tvinputdevice;
    if (!inputDevice || typeof inputDevice.registerKey !== 'function') return;

    [
      'ColorF0Red',
      'MediaPlay',
      'MediaPause',
      'MediaPlayPause',
      'MediaRewind',
      'MediaFastForward'
    ].forEach((key) => {
      try {
        inputDevice.registerKey(key);
      } catch {
        /* Ignore keys unsupported by a specific TV model or firmware. */
      }
    });
  }

  installObservers() {
    this.observer = new MutationObserver(() => {
      window.clearTimeout(this.pendingRefresh);
      this.pendingRefresh = window.setTimeout(this.refresh, 150);
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
    });
  }

  installRouteHooks() {
    ['pushState', 'replaceState'].forEach((method) => {
      const original = history[method];
      if (original.__mtvcWrapped) return;

      const wrapped = (...args) => {
        const result = original.apply(history, args);
        window.setTimeout(this.handleRouteChange, 0);
        return result;
      };

      wrapped.__mtvcWrapped = true;
      history[method] = wrapped;
    });
  }

  handleRouteChange() {
    if (this.lastUrl === location.href) return;
    this.lastUrl = location.href;
      this.focusMode.refresh(true);
    if (this.mode === MODES.REMOTE) {
      this.focusMode.activate();
    }
  }

  refresh() {
    this.focusMode.refresh(true);
    if (this.mode === MODES.MOUSE) {
      this.mouseMode.handleResize();
    }
  }

  handleResize() {
    this.mouseMode.handleResize();
  }

  handleKeyDown(event) {
    const key = normalizeKey(event);
    const editable = isEditableElement(event.target);

    if (isModeToggleKey(key)) {
      this.toggleMode();
      this.consume(event);
      return;
    }

    if (key === 'Enter') {
      this.armEnterLongPress(event);
      this.consume(event);
      return;
    }

    if (MEDIA_KEYS.has(key)) {
      if (this.handleMediaKey(key)) this.consume(event);
      return;
    }

    if (this.mode === MODES.MOUSE) {
      this.handleMouseModeKey(event, key);
      return;
    }

    if (editable && key !== 'Enter' && !isBackKey(key)) return;
    this.handleRemoteModeKey(event, key);
  }

  handleKeyUp(event) {
    const key = normalizeKey(event);
    if (key !== 'Enter') return;

    window.clearTimeout(this.enterLongPressTimer);
    this.enterLongPressTimer = 0;

    if (this.enterLongPressFired) {
      this.enterLongPressFired = false;
      this.consume(event);
      return;
    }

    if (this.mode === MODES.MOUSE) {
      this.mouseMode.click();
      this.consume(event);
      return;
    }

    if (this.focusMode.clickCurrent()) {
      this.consume(event);
    }
  }

  armEnterLongPress(event) {
    if (event.repeat || this.enterLongPressTimer) return;

    this.enterLongPressFired = false;
    this.enterLongPressTimer = window.setTimeout(() => {
      this.enterLongPressTimer = 0;
      this.enterLongPressFired = true;
      this.toggleMode();
    }, LONG_PRESS_MS);
  }

  handleRemoteModeKey(event, key) {
    if (DIRECTION_KEYS.has(key)) {
      this.focusMode.move(key);
      this.consume(event);
      return;
    }

    if (isBackKey(key)) {
      if (this.closeOverlayOrGoBack()) this.consume(event);
    }
  }

  handleMouseModeKey(event, key) {
    if (DIRECTION_KEYS.has(key)) {
      this.mouseMode.move(key, event.repeat);
      this.consume(event);
      return;
    }

    if (isBackKey(key)) {
      this.setMode(MODES.REMOTE);
      this.consume(event);
    }
  }

  handleMediaKey(key) {
    if (key === 'MediaPlay' || key === 'MediaPause' || key === 'MediaPlayPause') {
      return togglePlayPause();
    }

    if (key === 'MediaRewind') return seekBy(-10);
    if (key === 'MediaFastForward') return seekBy(10);
    return false;
  }

  closeOverlayOrGoBack() {
    const closeButton = Array.from(document.querySelectorAll([
      '[aria-label]',
      '[title]',
      '[role="dialog"] button',
      '.modal button',
      '.overlay button'
    ].join(','))).find((element) => {
      const rect = element.getBoundingClientRect();
      const label = `${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
      const hasCloseLabel = label.includes('close') || label.includes('back');
      const isDialogButton = element.tagName === 'BUTTON' && element.closest('[role="dialog"], .modal, .overlay');
      return rect.width > 0 && rect.height > 0 && !element.disabled && (hasCloseLabel || isDialogButton);
    });

    if (closeButton) {
      closeButton.click();
      return true;
    }

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
      return true;
    }

    history.back();
    return true;
  }

  toggleMode() {
    this.setMode(this.mode === MODES.REMOTE ? MODES.MOUSE : MODES.REMOTE);
  }

  setMode(mode) {
    if (this.mode === mode) {
      this.overlay.showMode(mode);
      return;
    }

    this.mode = mode;
    if (mode === MODES.MOUSE) {
      this.focusMode.deactivate();
      this.mouseMode.activate();
    } else {
      this.mouseMode.deactivate();
      this.focusMode.activate();
    }

    this.overlay.showMode(mode);
  }

  consume(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}

function boot() {
  if (window.__MTVC_STARTED__) return;
  window.__MTVC_STARTED__ = true;
  injectStyles();
  const controls = new MiruroTvControls();
  controls.start();
  window.__MTVC__ = controls;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
