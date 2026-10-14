import { TOSS } from '../config/balance';
import type { StationCycle } from '../game/StationCycle';
import { HAZARD_LABELS, type TossGesture, type TossQueue, type TossStats } from '../game/TossQueue';
import type { CrewDynamics } from '../game/CrewDynamics';
import { FlickGesture } from './FlickGesture';
import { touchInput } from './TouchInputState';
import { bagArt, compactorArt } from './TossArt';
import { gameArt, gameAssets, hazardBagImages } from './GameAssets';

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
  private readonly rejectButton: HTMLButtonElement;
  private readonly crewBar: HTMLElement;
  private renderedArt = '';
  private pendingBagId?: number;
  private readonly gesture = new FlickGesture();
  private queue?: TossQueue;
  private commands: Command[] = [];
  private pending = false;
  private drag?: { pointer: number; x: number; y: number; width: number; height: number; bagId: number };

  public constructor() {
    this.element.className = 'toss-panel';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', '垃圾車投擲作業');
    this.element.innerHTML = `<div class="toss-workspace"><header class="toss-header"><div><span class="eyebrow">GARBAGE RUN / 甩袋收運</span><h2 class="toss-heading"></h2></div><div class="toss-total"></div></header><div class="toss-arena">${compactorArt}<div class="toss-mouth" aria-hidden="true"><span>投入口</span></div><div class="toss-aim" aria-hidden="true">↑<span>朝車尾甩出去</span></div><div class="toss-shadow" aria-hidden="true"></div><button class="toss-bag" type="button">${bagArt}</button><div class="toss-ghost" aria-hidden="true">${bagArt}</div><div class="toss-compression" role="status">壓縮垃圾中…</div></div><footer class="toss-footer"><div class="toss-bag-info"></div><div class="toss-power"><span>落點力道</span><div class="toss-power-track"><i></i></div><span>綠區可入車</span></div><div class="toss-feedback" role="status" aria-live="polite"></div><p class="toss-help">按住垃圾袋，朝投入口滑動後放手 · 每包一次機會</p></footer></div>`;
    this.arena = this.element.querySelector('.toss-arena')!;
    this.bag = this.element.querySelector('.toss-bag')!;
    this.ghost = this.element.querySelector('.toss-ghost')!;
    this.status = this.element.querySelector('.toss-feedback')!;
    this.heading = this.element.querySelector('.toss-heading')!;
    this.counter = this.element.querySelector('.toss-total')!;
    this.bagLabel = this.element.querySelector('.toss-bag-info')!;
    this.meter = this.element.querySelector('.toss-power-track i')!;
    this.crewBar = document.createElement('div');
    this.crewBar.className = 'station-crew-bar';
    this.crewBar.hidden = true;
    this.crewBar.innerHTML = '<span class="crew-mood"></span><progress class="crew-mini-meter" max="100" aria-label="隨車人員怒氣"></progress><span class="crew-anger-num"></span><span class="crew-cause"></span>';
    this.element.querySelector('.toss-header')!.after(this.crewBar);
    this.rejectButton = document.createElement('button');
    this.rejectButton.type = 'button'; this.rejectButton.className = 'toss-reject-btn';
    this.rejectButton.textContent = '⚠ 退回危險袋'; this.rejectButton.hidden = true;
    this.element.querySelector('.toss-bag-info')!.after(this.rejectButton);
    this.rejectButton.addEventListener('click', () => {
      const current = this.queue?.current;
      if (!current?.hazard || !this.queue || this.queue.flight || this.pending) return;
      this.cancel();
      this.submit(current.id, { vx: 0, vy: 1 });
    });
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

  public update(cycle?: StationCycle, total: TossStats = { hits: 0, misses: 0, score: 0 }, crew?: Pick<CrewDynamics, 'anger' | 'reaction' | 'irritationCause'>): void {
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
    this.counter.innerHTML = `<b>${total.score}</b><span>收運分數 · 成功處理 ${total.hits} 包</span>`;
    this.crewBar.hidden = !crew;
    if (crew) {
      this.crewBar.querySelector('.crew-mood')!.textContent = { calm: '🙂 平穩', annoyed: '😒 不耐', angry: '😠 暴躁', furious: '🤬 暴怒' }[crew.reaction];
      this.crewBar.querySelector<HTMLProgressElement>('progress')!.value = crew.anger;
      this.crewBar.querySelector('.crew-anger-num')!.textContent = `${Math.round(crew.anger)} / 100`;
      this.crewBar.querySelector('.crew-cause')!.textContent = crew.irritationCause;
      this.crewBar.dataset.reaction = crew.reaction;
    }
    const organizing = cycle.phase === 'organizing';
    this.element.classList.toggle('compressing', organizing && cycle.workerState === 'organizing');
    this.element.classList.toggle('returning', organizing && cycle.workerState === 'returning');
    const current = queue.current;
    const flight = queue.flight;
    if (flight || !current || current.id !== this.pendingBagId) this.pending = false;
    const hazard = flight?.bag.hazard ?? current?.hazard;
    const artKey = hazard ?? 'normal';
    if (this.renderedArt !== artKey) {
      const url = hazard ? hazardBagImages[hazard] : gameArt.normalBag;
      const art = `<img src="${gameAssets.get(url)?.src ?? url}" alt="" draggable="false">`;
      this.bag.innerHTML = art; this.ghost.innerHTML = art; this.renderedArt = artKey;
    }
    this.bag.classList.toggle('hazard-bag', Boolean(current?.hazard));
    this.ghost.classList.toggle('hazard-bag', Boolean(flight?.bag.hazard));
    this.rejectButton.hidden = !current?.hazard || Boolean(flight) || organizing;
    this.rejectButton.disabled = this.pending;
    this.bag.hidden = !current || Boolean(flight) || organizing;
    this.bag.disabled = this.pending;
    this.ghost.hidden = !flight;
    this.element.querySelector<HTMLElement>('.toss-aim')!.hidden = Boolean(flight) || organizing;
    const label = current ? TOSS.bagSizes[current.size] : undefined;
    if (label) {
      this.bag.style.setProperty('--bag-scale', String(label.scale));
      this.bag.setAttribute('aria-label', current?.hazard ? `內含${HAZARD_LABELS[current.hazard]}，向下滑退回民眾` : `${label.label}垃圾袋，按住向上甩出`);
      this.bagLabel.classList.toggle('hazard-warning', Boolean(current?.hazard));
      this.bagLabel.textContent = current?.hazard ? `⚠ 內含${HAZARD_LABELS[current.hazard]}！向下滑或按鈕退回` : `${label.label} · ${label.weight} kg · ${current!.size === 'small' ? '輕甩即可' : current!.size === 'large' ? '需要較快滑動' : '適中速度'}`;
    } else { this.bagLabel.classList.remove('hazard-warning'); this.bagLabel.textContent = `本站入車 ${queue.hits - queue.returnedHazards} 包 · 退回 ${queue.returnedHazards} 包 · 失敗 ${queue.misses} 包`; }
    const aim = this.element.querySelector('.toss-aim')!;
    aim.innerHTML = current?.hazard ? '↓<span>危險物，往下退回民眾</span>' : '↑<span>朝車尾甩出去</span>';
    this.element.querySelector('.toss-help')!.textContent = current?.hazard
      ? '危險袋向下滑或按鈕退回 · 每包一次機會'
      : '按住垃圾袋，朝投入口滑動後放手 · 每包一次機會';
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
      this.element.dataset.outcome = queue.lastOutcome === 'returned' ? 'returned' : '';
      if (!this.drag && !this.pending) this.meter.style.width = '0%';
    }
    if (organizing) this.status.textContent = cycle.getStatusText();
    else if (queue.lastOutcome) this.status.textContent = {
      hit: `成功入車！+${TOSS.pointsPerBag} 分`, short: '力道不足，落在車前 · 0 分', strong: '力道過強，越過投入口 · 0 分', left: '方向偏左，落在車旁 · 0 分', right: '方向偏右，落在車旁 · 0 分',
      returned: `✓ 已退回危險物！+${TOSS.pointsPerBag} 分`,
      'hazard-exploded': `💥 誤投危險物！扣 ${TOSS.hazardScorePenalty} 分，怒氣 +${TOSS.hazardAngerPenalty}`,
    }[queue.lastOutcome];
    else if (!this.drag) this.status.textContent = current?.hazard ? '危險物不能壓縮，請退回民眾' : '對準投入口，控制滑動速度';
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
    this.updateMeter(this.gesture.velocity());
    this.status.textContent = this.queue?.current?.hazard ? '向下滑，放手退回民眾' : '放手投出！小袋輕甩，大袋加快';
  }
  private release(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer || !this.queue) return;
    event.preventDefault();
    const gesture = this.gesture.release(event.clientX / drag.width, event.clientY / drag.height, event.timeStamp);
    if (gesture) this.updateMeter(gesture);
    this.cancel(Boolean(gesture));
    if (gesture) {
      this.submit(drag.bagId, gesture);
    }
  }
  private submit(bagId: number, gesture: TossGesture): void {
    if (!this.queue) return;
    this.pending = true; this.pendingBagId = bagId;
    this.bag.disabled = true; this.rejectButton.disabled = true;
    this.commands.push({ queue: this.queue, bagId, gesture });
  }
  private updateMeter(gesture: TossGesture): void {
    const mass = this.queue?.current ? TOSS.bagSizes[this.queue.current.size].mass : 1;
    const speed = Math.max(0, Math.min(TOSS.maxLaunchSpeed, -gesture.vy * TOSS.speedGain / Math.sqrt(mass)));
    this.meter.style.width = `${speed / TOSS.maxLaunchSpeed * 100}%`;
  }
  private cancel(keepMeter = false): void {
    const drag = this.drag; this.drag = undefined; this.gesture.cancel();
    if (drag && this.bag.hasPointerCapture(drag.pointer)) this.bag.releasePointerCapture(drag.pointer);
    this.bag.style.translate = ''; this.bag.classList.remove('held');
    if (!keepMeter) this.meter.style.width = '0%';
  }
}
