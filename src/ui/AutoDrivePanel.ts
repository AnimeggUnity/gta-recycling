import type { Autopilot } from '../game/Autopilot';

export class AutoDrivePanel {
  private readonly element = document.createElement('div');
  private readonly button: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly keydown: (event: KeyboardEvent) => void;
  private readonly blur: () => void;

  public constructor(private readonly pilot: Autopilot, private readonly available: () => boolean) {
    this.element.className = 'auto-drive-panel';
    this.element.innerHTML = '<span class="auto-drive-status" role="status"></span><button type="button" class="auto-drive-pause">暫停行駛</button>';
    this.button = this.element.querySelector('button')!;
    this.status = this.element.querySelector('span')!;
    const toggle = () => { if (this.available()) { this.pilot.togglePause(); this.update(); } };
    this.button.addEventListener('click', toggle);
    this.keydown = event => {
      if (event.code !== 'Space' || event.repeat || (event.target as HTMLElement)?.closest?.('button, input, textarea, select')) return;
      if (!this.available()) return;
      event.preventDefault(); toggle();
    };
    this.blur = () => { if (this.available()) { this.pilot.paused = true; this.update(); } };
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('blur', this.blur);
    document.body.append(this.element);
    this.update();
  }

  public update(): void {
    this.status.textContent = this.pilot.paused ? '簡單模式 · 已暫停行駛' : `簡單模式 · ${this.pilot.status}`;
    this.button.textContent = this.pilot.paused ? '繼續行駛' : '暫停行駛';
    this.button.setAttribute('aria-pressed', String(this.pilot.paused));
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('blur', this.blur);
    this.element.remove();
  }
}
