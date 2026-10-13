import { TOSS } from '../config/balance';
import type { StationCycle } from '../game/StationCycle';
import type { TossGesture, TossQueue, TossStats } from '../game/TossQueue';
import { FlickGesture } from './FlickGesture';
import { touchInput } from './TouchInputState';
import { bagArt, compactorArt } from './TossArt';

type Command = { queue: TossQueue; bagId: number; gesture: TossGesture };

export class TossPanel {
  public readonly element = document.createElement('section');
  private readonly arena: HTMLElement;
  private readonly bag: HTMLButtonElement;
  private readonly ghost: HTMLElement;
  private readonly status: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly counter: HTMLElement;
  private readonly bagLabel: HTMLElement;
  private readonly meter: HTMLElement;
  private readonly gesture = new FlickGesture();
  private queue?: TossQueue;
  private commands: Command[] = [];
  private pending = false;
  private drag?: { pointer: number; x: number; y: number; width: number; height: number; bagId: number };

  public constructor() {
    this.element.className = 'toss-panel';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', '垃圾車投擲作業');
    this.element.innerHTML = `<div class="toss-workspace"><header class="toss-header"><div><span class="eyebrow">GARBAGE RUN / 甩袋收運</span><h2 class="toss-heading"></h2></div><div class="toss-total"></div></header><div class="toss-arena">${compactorArt}<div class="toss-mouth" aria-hidden="true"><span>投入口</span></div><div class="toss-aim" aria-hidden="true">↑<span>朝車尾甩出去</span></div><div class="toss-shadow" aria-hidden="true"></div><button class="toss-bag" type="button">${bagArt}</button><div class="toss-ghost" aria-hidden="true">${bagArt}</div><div class="toss-compression" role="status">壓縮垃圾中…</div></div><footer class="toss-footer"><div class="toss-bag-info"></div><div class="toss-power"><span>滑動力道</span><div class="toss-power-track"><i></i></div><span>慢 → 快</span></div><div class="toss-feedback" role="status" aria-live="polite"></div><p class="toss-help">按住垃圾袋，朝投入口滑動後放手 · 每包一次機會</p></footer></div>`;
    this.arena = this.element.querySelector('.toss-arena')!;
    this.bag = this.element.querySelector('.toss-bag')!;
    this.ghost = this.element.querySelector('.toss-ghost')!;
    this.status = this.element.querySelector('.toss-feedback')!;
    this.heading = this.element.querySelector('.toss-heading')!;
    this.counter = this.element.querySelector('.toss-total')!;
    this.bagLabel = this.element.querySelector('.toss-bag-info')!;
    this.meter = this.element.querySelector('.toss-power-track i')!;
    this.bag.addEventListener('pointerdown', event => this.begin(event));
    this.bag.addEventListener('pointermove', event => this.move(event));
    this.bag.addEventListener('pointerup', event => this.release(event));
    const cancel = (event: PointerEvent) => { if (this.drag?.pointer === event.pointerId) this.cancel(); };
    this.bag.addEventListener('pointercancel', cancel);
    this.bag.addEventListener('lostpointercapture', cancel);
    for (const name of ['blur', 'resize', 'orientationchange']) window.addEventListener(name, () => this.cancel());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); });
    document.body.append(this.element);
  }

  public takeCommands(): readonly Command[] { const result = this.commands; this.commands = []; return result; }

  public update(cycle?: StationCycle, total: TossStats = { hits: 0, misses: 0, score: 0 }): void {
    const active = Boolean(cycle?.tossing && cycle.departureLocked);
    if (active !== !this.element.hidden) {
      this.cancel(); this.commands = []; this.pending = false;
      touchInput.reset(); window.dispatchEvent(new Event('gta-input-reset'));
      this.element.hidden = !active; document.body.dataset.tossing = String(active);
    }
    if (!active || !cycle?.tossing) { this.queue = undefined; return; }
    if (this.queue !== cycle.tossing) {
      this.cancel(); this.commands = []; this.pending = false; this.queue = cycle.tossing;
      this.status.textContent = '按住垃圾袋，向上甩進車尾';
    }
    const queue = this.queue;
    this.heading.textContent = `${cycle.definition.name} · ${Math.min(queue.processed + 1, queue.bags.length)} / ${queue.bags.length} 包`;
    this.counter.innerHTML = `<b>${total.score}</b><span>投擲分數 · 入車 ${total.hits} 包</span>`;
    const organizing = cycle.phase === 'organizing';
    this.element.classList.toggle('compressing', organizing && cycle.workerState === 'organizing');
    this.element.classList.toggle('returning', organizing && cycle.workerState === 'returning');
    const current = queue.current;
    const flight = queue.flight;
    if (flight || !current) this.pending = false;
    this.bag.hidden = !current || Boolean(flight) || organizing;
    this.bag.disabled = this.pending;
    this.ghost.hidden = !flight;
    this.element.querySelector<HTMLElement>('.toss-aim')!.hidden = Boolean(flight) || organizing;
    const label = current ? TOSS.bagSizes[current.size] : undefined;
    if (label) {
      this.bag.style.setProperty('--bag-scale', String(label.scale));
      this.bag.setAttribute('aria-label', `${label.label}垃圾袋，按住向上甩出`);
      this.bagLabel.textContent = `${label.label} · ${label.weight} kg · ${current!.size === 'small' ? '輕甩即可' : current!.size === 'large' ? '需要較快滑動' : '適中速度'}`;
    } else this.bagLabel.textContent = `本站成功 ${queue.hits} 包 · 失敗 ${queue.misses} 包`;
    if (flight) {
      if (this.drag) this.cancel();
      const x = 50 + flight.x * 58;
      const y = 86 - flight.depth * 32 - flight.height * 44;
      const perspective = 1 / (1 + flight.depth * 0.8);
      this.ghost.style.left = `${x}%`; this.ghost.style.top = `${y}%`;
      this.ghost.style.transform = `translate(-50%, -50%) scale(${TOSS.bagSizes[flight.bag.size].scale * perspective}) rotate(${flight.elapsed * 160}deg)`;
      this.ghost.style.opacity = flight.outcome === 'hit' ? String(Math.max(0, 1 - flight.feedbackElapsed / TOSS.feedbackSeconds)) : '1';
      this.element.dataset.outcome = flight.outcome ?? 'flying';
    } else {
      this.element.dataset.outcome = '';
      if (!this.drag) this.meter.style.width = '0%';
    }
    if (organizing) this.status.textContent = cycle.getStatusText();
    else if (queue.lastOutcome) this.status.textContent = {
      hit: `成功入車！+${TOSS.pointsPerBag} 分`, short: '力道不足，落在車前 · 0 分', strong: '力道過強，越過投入口 · 0 分', left: '方向偏左，落在車旁 · 0 分', right: '方向偏右，落在車旁 · 0 分',
    }[queue.lastOutcome];
    else if (!this.drag) this.status.textContent = '對準投入口，控制滑動速度';
  }

  private begin(event: PointerEvent): void {
    if (event.button !== 0 || this.drag || !this.queue?.current || this.queue.flight || this.pending) return;
    event.preventDefault();
    const bounds = this.arena.getBoundingClientRect();
    this.drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, bagId: this.queue.current.id };
    this.gesture.begin(event.clientX / bounds.width, event.clientY / bounds.height, event.timeStamp);
    this.bag.setPointerCapture(event.pointerId); this.bag.classList.add('held');
  }
  private move(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    event.preventDefault();
    this.gesture.move(event.clientX / drag.width, event.clientY / drag.height, event.timeStamp);
    this.bag.style.translate = `${event.clientX - drag.x}px ${event.clientY - drag.y}px`;
    const speed = Math.max(0, -this.gesture.velocity().vy);
    this.meter.style.width = `${Math.min(100, speed / TOSS.maxLaunchSpeed * 100)}%`;
    this.status.textContent = '放手投出！小袋輕甩，大袋加快';
  }
  private release(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer || !this.queue) return;
    event.preventDefault();
    const gesture = this.gesture.release(event.clientX / drag.width, event.clientY / drag.height, event.timeStamp);
    const queue = this.queue;
    this.cancel();
    if (gesture) {
      this.pending = true; this.bag.disabled = true;
      this.commands.push({ queue, bagId: drag.bagId, gesture });
    }
  }
  private cancel(): void {
    const drag = this.drag; this.drag = undefined; this.gesture.cancel();
    if (drag && this.bag.hasPointerCapture(drag.pointer)) this.bag.releasePointerCapture(drag.pointer);
    this.bag.style.translate = ''; this.bag.classList.remove('held');
    this.meter.style.width = '0%';
  }
}
