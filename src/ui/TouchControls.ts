import { touchInput, type TouchAction } from './TouchInputState';
import type { ControlMode } from './DeviceMode';
import { RotarySteering } from './RotarySteering';
import { hornInput } from './HornInput';
import { hornSound } from './HornSound';

export class TouchControls {
  private readonly element = document.createElement('div');
  private readonly toggle = document.createElement('button');
  private readonly wheel: HTMLButtonElement;
  private mode: ControlMode;
  private readonly rotary = new RotarySteering();
  private wheelPointer?: number;
  private wheelCenter = { x: 0, y: 0 };

  public constructor(device: 'mobile' | 'desktop') {
    document.body.dataset.device = device;
    this.mode = device === 'mobile' ? 'touch' : 'keyboard';
    this.element.className = 'touch-controls';
    this.element.innerHTML = `<div class="steering-control"><button type="button" class="touch-wheel" data-action="steering" aria-label="方向盤：按住沿圓周旋轉，順時針右轉、逆時針左轉"><span class="wheel-ring" aria-hidden="true"><i class="wheel-marker"></i><i class="wheel-spoke left"></i><i class="wheel-spoke right"></i><i class="wheel-spoke bottom"></i><i class="wheel-hub"></i></span></button><span class="touch-caption">沿圓周旋轉 · 放開回正</span></div><div class="pedal-controls"><button type="button" class="touch-pedal reverse" data-action="reverse" aria-label="按住倒車">↓<small>倒車</small></button><button type="button" class="touch-pedal brake" data-action="brake" aria-label="按住煞車">■<small>煞車</small></button><button type="button" class="touch-pedal forward" data-action="forward" aria-label="按住油門">↑<small>油門</small></button></div>`;
    this.wheel = this.element.querySelector<HTMLButtonElement>('.touch-wheel')!;
    const horn = document.createElement('button');
    horn.type = 'button'; horn.className = 'touch-horn'; horn.textContent = '📢 喇叭';
    horn.setAttribute('aria-label', '按喇叭驅離收運灣違停車輛');
    const requestHorn = () => { if (this.mode === 'touch') { hornSound.unlock(); hornInput.request(); } };
    horn.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault(); requestHorn();
    });
    horn.addEventListener('click', event => { if (event.detail === 0) requestHorn(); });
    this.element.append(horn);
    this.toggle.className = 'input-mode-toggle';
    this.toggle.type = 'button';
    this.toggle.addEventListener('click', () => this.setMode(this.mode === 'touch' ? 'keyboard' : 'touch'));
    document.body.append(this.element, this.toggle);
    for (const button of Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-action]'))) {
      const action = button.dataset.action as TouchAction;
      button.addEventListener('pointerdown', (event) => {
        if (this.mode !== 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return;
        if (action === 'steering' && this.wheelPointer !== undefined) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        touchInput.press(event.pointerId, action);
        if (action === 'steering') {
          this.wheelPointer = event.pointerId;
          const bounds = this.wheel.getBoundingClientRect();
          this.wheelCenter = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
          this.rotary.begin(event.clientX - this.wheelCenter.x, event.clientY - this.wheelCenter.y, bounds.width);
        }
        this.paint();
      });
      button.addEventListener('pointermove', (event) => {
        if (action === 'steering' && button.hasPointerCapture(event.pointerId)) { this.moveWheel(event); this.paint(); }
      });
      const release = (event: PointerEvent) => {
        touchInput.release(event.pointerId);
        if (this.wheelPointer === event.pointerId) { this.wheelPointer = undefined; this.rotary.reset(); }
        this.paint();
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    }
    window.addEventListener('blur', () => this.reset());
    window.addEventListener('gta-input-reset', () => this.reset());
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
    if (this.wheelPointer !== event.pointerId) return;
    touchInput.steer(event.pointerId, this.rotary.move(event.clientX - this.wheelCenter.x, event.clientY - this.wheelCenter.y));
  }

  private paint(): void {
    this.wheel.style.setProperty('--wheel-angle', `${this.rotary.degrees}deg`);
    for (const button of Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-action]'))) {
      const held = touchInput.isHeld(button.dataset.action as TouchAction);
      button.classList.toggle('held', held);
      button.setAttribute('aria-pressed', String(held));
    }
  }

  private reset(): void {
    const pointer = this.wheelPointer;
    this.wheelPointer = undefined; this.rotary.reset(); touchInput.reset(); hornInput.reset();
    if (pointer !== undefined && this.wheel.hasPointerCapture(pointer)) this.wheel.releasePointerCapture(pointer);
    this.paint();
  }

  private setMode(mode: ControlMode): void {
    this.reset();
    this.mode = mode;
    document.body.dataset.controls = mode;
    this.element.hidden = mode !== 'touch';
    this.toggle.textContent = mode === 'touch' ? '切換鍵盤' : '切換觸控';
    this.toggle.setAttribute('aria-label', mode === 'touch' ? '切換為鍵盤操作' : '切換為觸控操作');
  }
}
