import styles from './styles.css';

let styleElement;

export function injectStyles() {
  if (styleElement || document.getElementById('mtvc-styles')) return;

  styleElement = document.createElement('style');
  styleElement.id = 'mtvc-styles';
  styleElement.textContent = styles;
  document.documentElement.appendChild(styleElement);
}

export class Overlay {
  constructor() {
    this.hideTimer = 0;
    this.element = document.createElement('div');
    this.element.className = 'mtvc-overlay';
    this.element.innerHTML = [
      '<div class="mtvc-overlay__mode">Remote Mode</div>',
      '<div class="mtvc-overlay__hint">Red: switch mode</div>'
    ].join('');
    document.documentElement.appendChild(this.element);
  }

  showMode(mode) {
    const label = mode === 'mouse' ? 'Mouse Mode' : 'Remote Mode';
    this.element.querySelector('.mtvc-overlay__mode').textContent = label;
    this.element.classList.add('is-visible');
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.element.classList.remove('is-visible');
    }, 2600);
  }
}
