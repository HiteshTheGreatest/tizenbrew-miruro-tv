/* tizenbrew-miruro-tv */
(() => {
  // src/focusMode.js
  var BASE_SELECTOR = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    '[role="button"]',
    '[role="link"]',
    '[tabindex]:not([tabindex="-1"])',
    "video",
    "[onclick]",
    "[data-testid]",
    "[class]"
  ].join(",");
  var DYNAMIC_TABINDEX = "data-mtvc-tabindex";
  function isVisible(element) {
    if (!element || element.closest('[aria-hidden="true"], [hidden]')) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width >= 8 && rect.height >= 8 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
  }
  function isDisabled(element) {
    return element.disabled || element.getAttribute("aria-disabled") === "true" || element.closest('[disabled], [aria-disabled="true"]');
  }
  function isClickableByStyle(element) {
    return window.getComputedStyle(element).cursor === "pointer";
  }
  function looksLikeContentCard(element) {
    const text = `${element.className || ""} ${element.getAttribute("data-testid") || ""}`.toLowerCase();
    return text.includes("episode") || text.includes("anime") || text.includes("card") || text.includes("result");
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
    if (direction === "ArrowUp" && dy >= -4) return Number.POSITIVE_INFINITY;
    if (direction === "ArrowDown" && dy <= 4) return Number.POSITIVE_INFINITY;
    if (direction === "ArrowLeft" && dx >= -4) return Number.POSITIVE_INFINITY;
    if (direction === "ArrowRight" && dx <= 4) return Number.POSITIVE_INFINITY;
    const primary = direction === "ArrowUp" || direction === "ArrowDown" ? Math.abs(dy) : Math.abs(dx);
    const secondary = direction === "ArrowUp" || direction === "ArrowDown" ? Math.abs(dx) : Math.abs(dy);
    const overlapBonus = hasAxisOverlap(from.rect, to.rect, direction) ? -200 : 0;
    return primary * 8 + secondary * 2 + overlapBonus;
  }
  function hasAxisOverlap(a, b, direction) {
    if (direction === "ArrowUp" || direction === "ArrowDown") {
      return a.left < b.right && a.right > b.left;
    }
    return a.top < b.bottom && a.bottom > b.top;
  }
  function scrollFallback(direction) {
    const amount = Math.round(window.innerHeight * 0.45);
    const top = direction === "ArrowUp" ? -amount : direction === "ArrowDown" ? amount : 0;
    const left = direction === "ArrowLeft" ? -amount : direction === "ArrowRight" ? amount : 0;
    try {
      window.scrollBy({ top, left, behavior: "smooth" });
    } catch {
      window.scrollBy(left, top);
    }
  }
  var FocusMode = class {
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
      const pointerItems = Array.from(document.body ? document.body.querySelectorAll("*") : []).filter((element) => element.children.length <= 3 && isClickableByStyle(element));
      const cardItems = selectorItems.filter(looksLikeContentCard);
      this.items = Array.from(/* @__PURE__ */ new Set([...selectorItems, ...pointerItems, ...cardItems])).filter((element) => !element.classList.contains("mtvc-overlay")).filter((element) => !element.classList.contains("mtvc-cursor")).filter((element) => isVisible(element) && !isDisabled(element));
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
      const next = this.items.filter((item) => item !== this.current).map((item) => ({ item, score: scoreCandidate(this.current, item, direction) })).filter((entry) => Number.isFinite(entry.score)).sort((a, b) => a.score - b.score)[0];
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
      if (!element.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|VIDEO)$/.test(element.tagName)) {
        element.setAttribute("tabindex", "-1");
        element.setAttribute(DYNAMIC_TABINDEX, "true");
      }
      try {
        element.focus({ preventScroll: true });
      } catch {
        try {
          element.focus();
        } catch {
        }
      }
      try {
        element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      } catch {
        element.scrollIntoView(false);
      }
      this.applyFocusRing();
    }
    applyFocusRing() {
      if (!this.current) return;
      this.current.classList.add("mtvc-focus");
      if (this.current.tagName === "VIDEO") {
        this.current.setAttribute("data-mtvc-focus", "video");
      }
    }
    clearFocusRing() {
      const focused = document.querySelectorAll(".mtvc-focus");
      focused.forEach((element) => {
        element.classList.remove("mtvc-focus");
        element.removeAttribute("data-mtvc-focus");
      });
    }
  };

  // src/mouseMode.js
  var DEFAULT_SPEED = 34;
  var FAST_SPEED = 56;
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  var MouseMode = class {
    constructor() {
      this.x = Math.round(window.innerWidth / 2);
      this.y = Math.round(window.innerHeight / 2);
      this.cursor = document.createElement("div");
      this.cursor.className = "mtvc-cursor is-hidden";
      document.documentElement.appendChild(this.cursor);
      this.render();
    }
    activate() {
      this.cursor.classList.remove("is-hidden");
      this.x = clamp(this.x, 0, window.innerWidth - 1);
      this.y = clamp(this.y, 0, window.innerHeight - 1);
      this.render();
    }
    deactivate() {
      this.cursor.classList.add("is-hidden");
    }
    move(direction, repeated) {
      const speed = repeated ? FAST_SPEED : DEFAULT_SPEED;
      if (direction === "ArrowUp") this.y -= speed;
      if (direction === "ArrowDown") this.y += speed;
      if (direction === "ArrowLeft") this.x -= speed;
      if (direction === "ArrowRight") this.x += speed;
      this.x = clamp(this.x, 0, window.innerWidth - 1);
      this.y = clamp(this.y, 0, window.innerHeight - 1);
      this.render();
    }
    click() {
      const target = document.elementFromPoint(this.x, this.y);
      if (!target) return false;
      ["mousedown", "mouseup", "click"].forEach((type) => {
        const event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: this.x,
          clientY: this.y,
          button: 0
        });
        target.dispatchEvent(event);
      });
      return true;
    }
    handleResize() {
      this.x = clamp(this.x, 0, window.innerWidth - 1);
      this.y = clamp(this.y, 0, window.innerHeight - 1);
      this.render();
    }
    render() {
      this.cursor.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }
  };

  // src/styles.css
  var styles_default = ":root {\n  --mtvc-ring: #23d18b;\n  --mtvc-ring-shadow: rgba(35, 209, 139, 0.45);\n  --mtvc-panel: rgba(12, 18, 22, 0.92);\n  --mtvc-text: #f5fbff;\n  --mtvc-muted: #b9c8d0;\n}\n\n.mtvc-focus {\n  outline: 4px solid var(--mtvc-ring) !important;\n  outline-offset: 4px !important;\n  box-shadow: 0 0 0 7px var(--mtvc-ring-shadow) !important;\n  border-radius: 8px !important;\n}\n\n.mtvc-focus[data-mtvc-focus='video'] {\n  outline-offset: -6px !important;\n}\n\n.mtvc-cursor {\n  position: fixed;\n  z-index: 2147483647;\n  left: 0;\n  top: 0;\n  width: 28px;\n  height: 28px;\n  pointer-events: none;\n  transform: translate3d(-100px, -100px, 0);\n  transition: transform 90ms linear;\n  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.6));\n}\n\n.mtvc-cursor::before {\n  content: '';\n  position: absolute;\n  left: 2px;\n  top: 1px;\n  width: 0;\n  height: 0;\n  border-top: 22px solid #ffffff;\n  border-right: 14px solid transparent;\n}\n\n.mtvc-cursor::after {\n  content: '';\n  position: absolute;\n  left: 6px;\n  top: 6px;\n  width: 0;\n  height: 0;\n  border-top: 12px solid #111820;\n  border-right: 8px solid transparent;\n}\n\n.mtvc-cursor.is-hidden {\n  display: none;\n}\n\n.mtvc-overlay {\n  position: fixed;\n  z-index: 2147483647;\n  right: 28px;\n  bottom: 28px;\n  min-width: 150px;\n  padding: 12px 14px;\n  color: var(--mtvc-text);\n  background: var(--mtvc-panel);\n  border: 1px solid rgba(255, 255, 255, 0.16);\n  border-radius: 8px;\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);\n  font: 600 16px/1.25 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  opacity: 0;\n  transform: translateY(8px);\n  transition: opacity 180ms ease, transform 180ms ease;\n  pointer-events: none;\n}\n\n.mtvc-overlay.is-visible {\n  opacity: 1;\n  transform: translateY(0);\n}\n\n.mtvc-overlay__mode {\n  white-space: nowrap;\n}\n\n.mtvc-overlay__hint {\n  margin-top: 3px;\n  color: var(--mtvc-muted);\n  font-size: 12px;\n  font-weight: 500;\n  white-space: nowrap;\n}\n";

  // src/overlay.js
  var styleElement;
  function injectStyles() {
    if (styleElement || document.getElementById("mtvc-styles")) return;
    styleElement = document.createElement("style");
    styleElement.id = "mtvc-styles";
    styleElement.textContent = styles_default;
    document.documentElement.appendChild(styleElement);
  }
  var Overlay = class {
    constructor() {
      this.hideTimer = 0;
      this.element = document.createElement("div");
      this.element.className = "mtvc-overlay";
      this.element.innerHTML = [
        '<div class="mtvc-overlay__mode">Remote Mode</div>',
        '<div class="mtvc-overlay__hint">Red: switch mode</div>'
      ].join("");
      document.documentElement.appendChild(this.element);
    }
    showMode(mode) {
      const label = mode === "mouse" ? "Mouse Mode" : "Remote Mode";
      this.element.querySelector(".mtvc-overlay__mode").textContent = label;
      this.element.classList.add("is-visible");
      window.clearTimeout(this.hideTimer);
      this.hideTimer = window.setTimeout(() => {
        this.element.classList.remove("is-visible");
      }, 2600);
    }
  };

  // src/playerControls.js
  function isVisibleVideo(video) {
    if (!video || video.readyState === 0) return false;
    const rect = video.getBoundingClientRect();
    const style = window.getComputedStyle(video);
    return rect.width > 40 && rect.height > 40 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
  }
  function getActiveVideo() {
    const videos = Array.from(document.querySelectorAll("video")).filter(isVisibleVideo);
    if (videos.length === 0) return null;
    const playing = videos.find((video) => !video.paused && !video.ended);
    if (playing) return playing;
    return videos.map((video) => {
      const rect = video.getBoundingClientRect();
      return { video, area: rect.width * rect.height };
    }).sort((a, b) => b.area - a.area)[0].video;
  }
  function togglePlayPause() {
    const video = getActiveVideo();
    if (!video) return false;
    if (video.paused || video.ended) {
      const result = video.play();
      if (result && typeof result.catch === "function") result.catch(() => {
      });
    } else {
      video.pause();
    }
    return true;
  }
  function seekBy(seconds) {
    const video = getActiveVideo();
    if (!video || Number.isNaN(video.duration)) return false;
    const maxTime = Number.isFinite(video.duration) ? video.duration : Number.MAX_SAFE_INTEGER;
    video.currentTime = Math.max(0, Math.min(maxTime, video.currentTime + seconds));
    return true;
  }

  // src/keys.js
  var MODES = {
    REMOTE: "remote",
    MOUSE: "mouse"
  };
  var KEY_ALIASES = {
    13: "Enter",
    27: "Escape",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    10009: "Back",
    403: "ColorF0Red",
    415: "MediaPlay",
    19: "MediaPause",
    10252: "MediaPlayPause",
    412: "MediaRewind",
    417: "MediaFastForward"
  };
  var DIRECTION_KEYS = /* @__PURE__ */ new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight"
  ]);
  var MEDIA_KEYS = /* @__PURE__ */ new Set([
    "MediaPlay",
    "MediaPause",
    "MediaPlayPause",
    "MediaRewind",
    "MediaFastForward"
  ]);
  function normalizeKey(event) {
    if (event.key && event.key !== "Unidentified") {
      if (event.key === "XF86Red") return "ColorF0Red";
      if (event.key === "Esc") return "Escape";
      return event.key;
    }
    return KEY_ALIASES[event.keyCode] || KEY_ALIASES[event.which] || "";
  }
  function isModeToggleKey(key) {
    return key === "ColorF0Red" || key === "M" || key === "m";
  }
  function isBackKey(key) {
    return key === "Back" || key === "BrowserBack" || key === "Escape";
  }
  function isEditableElement(element) {
    if (!element) return false;
    const tagName = element.tagName;
    return element.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
  }

  // src/index.js
  var LONG_PRESS_MS = 850;
  var REFRESH_INTERVAL_MS = 2500;
  var MiruroTvControls = class {
    constructor() {
      this.mode = "";
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
      window.addEventListener("keydown", this.handleKeyDown, true);
      window.addEventListener("keyup", this.handleKeyUp, true);
      window.addEventListener("resize", this.handleResize);
      window.addEventListener("popstate", this.handleRouteChange);
      this.setMode(MODES.REMOTE);
      this.refreshTimer = window.setInterval(this.refresh, REFRESH_INTERVAL_MS);
    }
    registerTizenKeys() {
      const inputDevice = window.tizen && window.tizen.tvinputdevice;
      if (!inputDevice || typeof inputDevice.registerKey !== "function") return;
      [
        "ColorF0Red",
        "MediaPlay",
        "MediaPause",
        "MediaPlayPause",
        "MediaRewind",
        "MediaFastForward"
      ].forEach((key) => {
        try {
          inputDevice.registerKey(key);
        } catch {
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
        attributeFilter: ["class", "style", "hidden", "aria-hidden"]
      });
    }
    installRouteHooks() {
      ["pushState", "replaceState"].forEach((method) => {
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
      if (key === "Enter") {
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
      if (editable && key !== "Enter" && !isBackKey(key)) return;
      this.handleRemoteModeKey(event, key);
    }
    handleKeyUp(event) {
      const key = normalizeKey(event);
      if (key !== "Enter") return;
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
      if (key === "MediaPlay" || key === "MediaPause" || key === "MediaPlayPause") {
        return togglePlayPause();
      }
      if (key === "MediaRewind") return seekBy(-10);
      if (key === "MediaFastForward") return seekBy(10);
      return false;
    }
    closeOverlayOrGoBack() {
      const closeButton = Array.from(document.querySelectorAll([
        "[aria-label]",
        "[title]",
        '[role="dialog"] button',
        ".modal button",
        ".overlay button"
      ].join(","))).find((element) => {
        const rect = element.getBoundingClientRect();
        const label = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`.toLowerCase();
        const hasCloseLabel = label.includes("close") || label.includes("back");
        const isDialogButton = element.tagName === "BUTTON" && element.closest('[role="dialog"], .modal, .overlay');
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
  };
  function boot() {
    if (window.__MTVC_STARTED__) return;
    window.__MTVC_STARTED__ = true;
    injectStyles();
    const controls = new MiruroTvControls();
    controls.start();
    window.__MTVC__ = controls;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
//# sourceMappingURL=index.js.map
