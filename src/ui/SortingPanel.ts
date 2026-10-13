import { SORTING_ITEMS, SORTING_TARGETS, type SortingTarget } from '../config/sorting';
import type { SortingQueue, PlacementResult } from '../game/SortingQueue';
import type { StationCycle } from '../game/StationCycle';
import { touchInput } from './TouchInputState';
import { sortingScatter } from './SortingScatter';
import { SORTING_DROP_ZONES } from '../config/sortingLayout';
import { gameArt, recyclingImage } from './GameAssets';
import { displayImage } from './SafeImage';
type Command = { queue: SortingQueue; instanceId: number; target: SortingTarget };

export class SortingPanel {
  public readonly element = document.createElement('section');
  private readonly pile: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly heading: HTMLElement;
  private readonly deliveryLabel: HTMLElement;
  private readonly deliveryTime: HTMLElement;
  private readonly deliveryBar: HTMLProgressElement;
  private queue?: SortingQueue;
  private selected?: number;
  private commands: Command[] = [];
  private readonly items = new Map<number, HTMLButtonElement>();
  private drag?: { pointer: number; card: HTMLButtonElement; x: number; y: number; moved: boolean };
  private suppressClick = false;
  private staticImagesBound = false;
  public constructor() {
    this.element.className = 'sorting-panel';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', '車斗回收物分類');
    const bins = Object.entries(SORTING_DROP_ZONES).map(([id, zone]) => {
      const label = SORTING_TARGETS[id as SortingTarget];
      const icon = zone.icon ? `<img alt="" draggable="false" data-asset="${recyclingImage(SORTING_ITEMS[zone.icon].asset)}">` : '';
      return `<button type="button" data-bin="${id}" class="sorting-bin ${id}" style="left:${zone.x}%;top:${zone.y}%;width:${zone.width}%;height:${zone.height}%" aria-label="${id === 'reject' ? '非回收物，退回民眾區' : `${label}收集袋`}"><span class="bag-label">${icon}${id === 'reject' ? '<span class="reject-copy"><span>非回收物</span><span>退回民眾</span></span>' : `<span>${label}</span>`}</span></button>`;
    }).join('');
    this.element.innerHTML = `<div class="sorting-workspace"><header><p class="sorting-progress"></p><div class="sorting-delivery"><div class="sorting-delivery-labels"><span class="delivery-label"></span><span class="delivery-time"></span></div><progress class="delivery-bar" max="1" value="0" aria-label="下一位民眾放入進度"></progress></div></header><div class="sorting-scene"><img class="sorting-background" data-asset="${gameArt.background}" alt="俯視回收車斗，下方籃子與上方四個分類袋口" draggable="false">${bins}<div class="sorting-pile" aria-label="正前方籃子裡的散裝回收物"></div></div><div class="sorting-feedback" role="status">等候居民交付</div><p class="sorting-help">拖進袋口 · 或點物品再點袋子</p></div>`;
    this.pile = this.element.querySelector('.sorting-pile')!;
    this.status = this.element.querySelector('.sorting-feedback')!;
    this.heading = this.element.querySelector('.sorting-progress')!;
    this.deliveryLabel = this.element.querySelector('.delivery-label')!;
    this.deliveryTime = this.element.querySelector('.delivery-time')!;
    this.deliveryBar = this.element.querySelector('.delivery-bar')!;
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
    this.status.textContent = { accepted: '已收進袋子', returned: '已退回民眾', wrong: '這個袋子不收，換個位置試試', full: '車斗已滿，請放到「退回民眾」區', missing: '這件物品已處理' }[result];
  }
  public update(cycle?: StationCycle): void {
    const active = Boolean(cycle?.sorting && cycle.departureLocked);
    if (active && !this.staticImagesBound) {
      this.staticImagesBound = true;
      for (const image of Array.from(this.element.querySelectorAll<HTMLImageElement>('img[data-asset]'))) displayImage(image, image.dataset.asset!);
    }
    if (active !== !this.element.hidden) {
      this.cancelDrag(); touchInput.reset(); window.dispatchEvent(new Event('gta-input-reset'));
      document.body.dataset.sorting = String(active);
      this.element.hidden = !active;
      this.selected = undefined; this.commands = [];
    }
    if (!active || !cycle?.sorting) { this.queue = undefined; return; }
    if (this.queue !== cycle.sorting) {
      this.queue = cycle.sorting; this.status.textContent = '等候居民交付';
      this.items.clear(); this.pile.replaceChildren();
    }
    const waiting = cycle.completedDeliveries < cycle.definition.deliveries.length;
    const delivery = cycle.getDeliveryProgress();
    this.heading.textContent = `${cycle.definition.name} · 已交付 ${delivery.completed} / ${delivery.total} 人`;
    this.deliveryLabel.textContent = delivery.finished ? '✓ 民眾已全部交付完' : `第 ${delivery.nextResident} 位民眾準備放入`;
    this.deliveryTime.textContent = delivery.finished ? '不會再加入物品' : `約 ${delivery.remainingSeconds.toFixed(1)} 秒`;
    this.deliveryBar.value = delivery.progress;
    this.deliveryBar.setAttribute('aria-label', delivery.finished ? '本站民眾已全部交付完' : `第 ${delivery.nextResident} 位民眾放入進度，約 ${delivery.remainingSeconds.toFixed(1)} 秒`);
    this.element.querySelector('.sorting-delivery')!.classList.toggle('complete', delivery.finished);
    if (!this.queue.pending.length) this.status.textContent = waiting ? '等候下一位居民交付…' : cycle.getStatusText();
    else if (this.status.textContent?.startsWith('等候')) this.status.textContent = '一袋物品倒進籃子，拿起來分揀吧';
    this.renderItems();
  }
  private submit(instanceId: number, target: SortingTarget): void {
    if (!this.queue) return;
    this.commands.push({ queue: this.queue, instanceId, target });
    this.selected = undefined;
  }
  private renderItems(): void {
    if (!this.queue) return;
    const ids = new Set(this.queue.pending.map((entry) => entry.instanceId));
    for (const [id, card] of this.items) if (!ids.has(id)) {
      if (this.drag?.card === card) this.cancelDrag();
      card.remove(); this.items.delete(id);
    }
    this.queue.pending.forEach((entry) => {
      const existing = this.items.get(entry.instanceId);
      if (existing) {
        existing.classList.toggle('selected', entry.instanceId === this.selected);
        existing.setAttribute('aria-pressed', String(entry.instanceId === this.selected));
        return;
      }
      const card = document.createElement('button');
      card.type = 'button'; card.className = `sorting-item ${entry.instanceId === this.selected ? 'selected' : ''}`;
      card.dataset.instance = String(entry.instanceId);
      card.setAttribute('aria-label', `${entry.item.label}，點選或拖曳分類`);
      card.setAttribute('aria-pressed', String(entry.instanceId === this.selected));
      const position = sortingScatter(entry.instanceId);
      card.style.setProperty('--pile-x', String(position.x)); card.style.setProperty('--pile-y', String(position.y));
      card.style.setProperty('--rotation', `${position.rotation}deg`); card.style.setProperty('--item-scale', String(position.scale));
      card.style.setProperty('--depth', String(entry.instanceId));
      const image = document.createElement('img'); image.alt = ''; image.draggable = false; card.append(image);
      const loadImage = () => displayImage(image, recyclingImage(entry.item.asset), state => {
        card.dataset.imageState = state; card.disabled = state === 'loading';
        card.setAttribute('aria-label', state === 'error' ? `${entry.item.label}圖片載入失敗，點選重試` : `${entry.item.label}，點選或拖曳分類`);
      });
      loadImage();
      card.addEventListener('click', (event) => {
        if (card.dataset.imageState === 'error') { this.selected = undefined; loadImage(); return; }
        if (card.dataset.imageState !== 'ready') return;
        if (this.suppressClick && event.detail > 0) { this.suppressClick = false; return; } this.selected = entry.instanceId;
      });
      card.addEventListener('pointerdown', (event) => {
        if (card.dataset.imageState !== 'ready' || this.drag || event.button !== 0) return;
        event.preventDefault(); card.focus(); card.setPointerCapture(event.pointerId);
        this.selected = entry.instanceId;
        this.suppressClick = false;
        card.classList.add('selected', 'lifted'); card.style.zIndex = '1000'; card.style.animation = 'none';
        this.drag = { pointer: event.pointerId, card, x: event.clientX, y: event.clientY, moved: false };
      });
      card.addEventListener('pointermove', (event) => {
        if (this.drag?.pointer !== event.pointerId) return;
        const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
        this.drag.moved ||= Math.hypot(dx, dy) > 8;
        card.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(0deg) scale(1.16)`;
        for (const button of Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-bin]'))) {
          button.classList.toggle('drag-over', this.containsPointer(button, event.clientX, event.clientY));
        }
      });
      card.addEventListener('pointerup', (event) => {
        if (this.drag?.pointer !== event.pointerId) return;
        const moved = this.drag.moved;
        const bin = Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-bin]')).find((button) => {
          return this.containsPointer(button, event.clientX, event.clientY);
        });
        this.cancelDrag();
        if (moved && bin) this.submit(entry.instanceId, bin.dataset.bin as SortingTarget);
        this.suppressClick = moved;
      });
      const cancel = (event: PointerEvent) => { if (this.drag?.pointer === event.pointerId) this.cancelDrag(); };
      card.addEventListener('pointercancel', cancel); card.addEventListener('lostpointercapture', cancel);
      this.items.set(entry.instanceId, card);
      this.pile.append(card);
    });
  }
  private containsPointer(button: HTMLButtonElement, x: number, y: number): boolean {
    return [button, button.querySelector('.bag-label')!].some((element) => {
      const bounds = element.getBoundingClientRect();
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    });
  }
  private cancelDrag(): void {
    if (this.drag) {
      const { card, pointer } = this.drag;
      this.drag = undefined;
      if (card.hasPointerCapture(pointer)) card.releasePointerCapture(pointer);
      card.style.transform = ''; card.style.zIndex = ''; card.classList.remove('lifted');
    }
    this.element.querySelectorAll('.drag-over').forEach((bin) => bin.classList.remove('drag-over'));
    this.drag = undefined;
  }
}
