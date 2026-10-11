import { touchInput, type TouchAction } from './TouchInputState';
import type { ControlMode } from './DeviceMode';
import { DISPLAY } from '../config/balance';

export class TouchControls {
  private readonly element = document.createElement('div');
  private readonly toggle = document.createElement('button');
  private readonly wheel: HTMLButtonElement;
  private mode: ControlMode;

  public constructor(device: 'mobile' | 'desktop') {
    document.body.dataset.device = device;
    this.mode = device === 'mobile' ? 'touch' : 'keyboard';
    this.element.className = 'touch-controls';
    this.element.innerHTML = `<div class="steering-control"><button type="button" class="touch-wheel" data-action="steering" aria-label="方向盤：按住並左右拖動轉向"><span class="wheel-ring">↔</span><span class="wheel-dot"></span></button><span class="touch-caption">左右拖動轉向</span></div><div class="pedal-controls"><button type="button" class="touch-pedal reverse" data-action="reverse" aria-label="按住倒車">↓<small>倒車</small></button><button type="button" class="touch-pedal brake" data-action="brake" aria-label="按住煞車">■<small>煞車</small></button><button type="button" class="touch-pedal forward" data-action="forward" aria-label="按住油門">↑<small>油門</small></button></div>`;
    this.wheel = this.element.querySelector<HTMLButtonElement>('.touch-wheel')!;
    this.toggle.className = 'input-mode-toggle';
    this.toggle.type = 'button';
    this.toggle.addEventListener('click', () => this.setMode(this.mode === 'touch' ? 'keyboard' : 'touch'));
    document.body.append(this.element, this.toggle);
    for (const button of Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-action]'))) {
      const action = button.dataset.action as TouchAction;
      button.addEventListener('pointerdown', (event) => {
        if (this.mode !== 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        touchInput.press(event.pointerId, action);
        if (action === 'steering') this.moveWheel(event);
        this.paint();
      });
      button.addEventListener('pointermove', (event) => {
        if (action === 'steering' && button.hasPointerCapture(event.pointerId)) { this.moveWheel(event); this.paint(); }
      });
      const release = (event: PointerEvent) => { touchInput.release(event.pointerId); this.paint(); };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    }
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    window.addEventListener('orientationchange', () => this.reset());
    let previousWidth = window.innerWidth;
    window.addEventListener('resize', () => {
      // Address bars can change height while driving; only a width/orientation change cancels input.
      if (window.innerWidth !== previousWidth) this.reset();
      previousWidth = window.innerWidth;
    });
    this.setMode(this.mode);
  }

  private moveWheel(event: PointerEvent): void {
    const bounds = this.wheel.getBoundingClientRect();
    const value = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width * DISPLAY.wheelTravelRatio);
    touchInput.steer(event.pointerId, Math.abs(value) < DISPLAY.wheelDeadZone ? 0 : value);
  }

  private paint(): void {
    const steering = touchInput.read().steering;
    this.wheel.style.setProperty('--steering', String(steering));
    for (const button of Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-action]'))) {
      const held = touchInput.isHeld(button.dataset.action as TouchAction);
      button.classList.toggle('held', held);
      button.setAttribute('aria-pressed', String(held));
    }
  }

  private reset(): void { touchInput.reset(); this.paint(); }

  private setMode(mode: ControlMode): void {
    this.reset();
    this.mode = mode;
    document.body.dataset.controls = mode;
    this.element.hidden = mode !== 'touch';
    this.toggle.textContent = mode === 'touch' ? '切換鍵盤' : '切換觸控';
    this.toggle.setAttribute('aria-label', mode === 'touch' ? '切換為鍵盤操作' : '切換為觸控操作');
  }
}
