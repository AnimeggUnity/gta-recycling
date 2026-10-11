import { SORTING_TARGETS, type SortingTarget } from '../config/sorting';
import type { SortingQueue, PlacementResult } from '../game/SortingQueue';
import type { StationCycle } from '../game/StationCycle';
import { touchInput } from './TouchInputState';

const images = import.meta.glob<string>('../../assets/recycling/samples-v1/*/*.png', { eager: true, query: '?url', import: 'default' });
type Command = { queue: SortingQueue; instanceId: number; target: SortingTarget };

export class SortingPanel {
  public readonly element = document.createElement('section');
  private readonly pile: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly heading: HTMLElement;
  private queue?: SortingQueue;
  private selected?: number;
  private commands: Command[] = [];
  private signature = '';
  private drag?: { pointer: number; card: HTMLButtonElement; x: number; y: number; moved: boolean };
  private suppressClick = false;
  public constructor() {
    this.element.className = 'sorting-panel';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', '車斗回收物分類');
    this.element.innerHTML = `<div class="sorting-workspace"><header><h2>車斗分類</h2><p class="sorting-progress"></p></header><div class="sorting-feedback" role="status">等候居民交付</div><div class="sorting-pile" aria-label="待分類物品"></div><div class="sorting-bins">${Object.entries(SORTING_TARGETS).map(([id, label]) => `<button type="button" data-bin="${id}" class="sorting-bin ${id}"><span class="bag-icon">${id === 'reject' ? '↩' : '▥'}</span>${label}</button>`).join('')}</div><p class="sorting-help">拖進袋子，或點物品再點袋子 · 衛生紙退回</p></div>`;
    this.pile = this.element.querySelector('.sorting-pile')!;
    this.status = this.element.querySelector('.sorting-feedback')!;
    this.heading = this.element.querySelector('.sorting-progress')!;
    for (const button of Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-bin]'))) {
      button.addEventListener('click', () => { if (this.selected !== undefined) this.submit(this.selected, button.dataset.bin as SortingTarget); });
    }
    document.body.append(this.element);
    window.addEventListener('blur', () => this.cancelDrag());
    window.addEventListener('resize', () => this.cancelDrag());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancelDrag(); });
  }
  public takeCommands(): readonly Command[] { const commands = this.commands; this.commands = []; return commands; }
  public feedback(result: PlacementResult): void {
    this.status.textContent = { accepted: '✓ 分類正確，已收進車斗', returned: '↩ 已退回居民', wrong: '放錯了，請換一個袋子', full: '車斗已滿，請放到退回區', missing: '這件物品已處理' }[result];
  }
  public update(cycle?: StationCycle): void {
    const active = Boolean(cycle?.sorting && cycle.departureLocked);
    if (active !== !this.element.hidden) {
      this.cancelDrag(); touchInput.reset(); window.dispatchEvent(new Event('gta-input-reset'));
      document.body.dataset.sorting = String(active);
      this.element.hidden = !active;
      this.selected = undefined; this.signature = ''; this.commands = [];
    }
    if (!active || !cycle?.sorting) { this.queue = undefined; return; }
    if (this.queue !== cycle.sorting) { this.queue = cycle.sorting; this.status.textContent = '等候居民交付，物品可累積後一起分類'; }
    const waiting = cycle.completedDeliveries < cycle.definition.deliveries.length;
    this.heading.textContent = `${cycle.definition.name} · ${waiting ? '居民投遞中' : '居民已交付完'} · 待分類 ${this.queue.pending.length} 件`;
    if (!this.queue.pending.length) this.status.textContent = waiting ? '等候下一位居民交付…' : cycle.getStatusText();
    else if (this.status.textContent?.startsWith('等候')) this.status.textContent = '物品已交付，拖進袋子或點選分類';
    this.renderItems();
  }
  private submit(instanceId: number, target: SortingTarget): void {
    if (!this.queue) return;
    this.commands.push({ queue: this.queue, instanceId, target });
    this.selected = undefined; this.signature = '';
  }
  private renderItems(): void {
    if (!this.queue || this.drag) return;
    const signature = `${this.queue.pending.map((entry) => entry.instanceId).join(',')}:${this.selected}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.pile.replaceChildren();
    this.pile.style.minHeight = `${Math.max(180, Math.ceil(this.queue.pending.length / 4) * 42 + 70)}px`;
    this.queue.pending.forEach((entry, index) => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = `sorting-item ${entry.instanceId === this.selected ? 'selected' : ''}`;
      card.dataset.instance = String(entry.instanceId);
      card.setAttribute('aria-label', `${entry.item.label}，點選或拖曳分類`);
      card.setAttribute('aria-pressed', String(entry.instanceId === this.selected));
      card.style.setProperty('--col', String(index % 4)); card.style.setProperty('--row', String(Math.floor(index / 4)));
      card.innerHTML = `<img alt="" draggable="false" src="${images[`../../assets/recycling/samples-v1/${entry.item.asset}`]}"><small>${entry.item.label}</small>`;
      card.addEventListener('click', () => { if (this.suppressClick) { this.suppressClick = false; return; } this.selected = entry.instanceId; this.signature = ''; });
      card.addEventListener('pointerdown', (event) => {
        if (this.drag || event.button !== 0) return;
        event.preventDefault(); card.focus(); card.setPointerCapture(event.pointerId);
        this.selected = entry.instanceId;
        card.classList.add('selected'); card.style.zIndex = '100';
        this.drag = { pointer: event.pointerId, card, x: event.clientX, y: event.clientY, moved: false };
      });
      card.addEventListener('pointermove', (event) => {
        if (this.drag?.pointer !== event.pointerId) return;
        const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
        this.drag.moved ||= Math.hypot(dx, dy) > 8;
        card.style.transform = `translate(${dx}px,${dy}px)`;
      });
      card.addEventListener('pointerup', (event) => {
        if (this.drag?.pointer !== event.pointerId) return;
        const moved = this.drag.moved;
        const bin = Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-bin]')).find((button) => {
          const bounds = button.getBoundingClientRect();
          return event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        });
        this.cancelDrag();
        if (moved && bin) this.submit(entry.instanceId, bin.dataset.bin as SortingTarget);
        this.suppressClick = moved;
      });
      const cancel = (event: PointerEvent) => { if (this.drag?.pointer === event.pointerId) this.cancelDrag(); };
      card.addEventListener('pointercancel', cancel); card.addEventListener('lostpointercapture', cancel);
      this.pile.append(card);
    });
  }
  private cancelDrag(): void {
    if (this.drag) { this.drag.card.style.transform = ''; this.drag.card.style.zIndex = ''; }
    this.drag = undefined; this.signature = '';
  }
}
