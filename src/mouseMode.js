const DEFAULT_SPEED = 34;
const FAST_SPEED = 56;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class MouseMode {
  constructor() {
    this.x = Math.round(window.innerWidth / 2);
    this.y = Math.round(window.innerHeight / 2);
    this.cursor = document.createElement('div');
    this.cursor.className = 'mtvc-cursor is-hidden';
    document.documentElement.appendChild(this.cursor);
    this.render();
  }

  activate() {
    this.cursor.classList.remove('is-hidden');
    this.x = clamp(this.x, 0, window.innerWidth - 1);
    this.y = clamp(this.y, 0, window.innerHeight - 1);
    this.render();
  }

  deactivate() {
    this.cursor.classList.add('is-hidden');
  }

  move(direction, repeated) {
    const speed = repeated ? FAST_SPEED : DEFAULT_SPEED;

    if (direction === 'ArrowUp') this.y -= speed;
    if (direction === 'ArrowDown') this.y += speed;
    if (direction === 'ArrowLeft') this.x -= speed;
    if (direction === 'ArrowRight') this.x += speed;

    this.x = clamp(this.x, 0, window.innerWidth - 1);
    this.y = clamp(this.y, 0, window.innerHeight - 1);
    this.render();
  }

  click() {
    const target = document.elementFromPoint(this.x, this.y);
    if (!target) return false;

    ['mousedown', 'mouseup', 'click'].forEach((type) => {
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
}
