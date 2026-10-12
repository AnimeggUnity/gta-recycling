import type { AssetLoader, AssetSnapshot } from './AssetLoader';

/** Full-screen click target; loading never advances the game's fixed-step clock. */
export class IntroPanel {
  public readonly element = document.createElement('section');
  private hasStarted = false;
  public get started(): boolean { return this.hasStarted; }

  public constructor(onStart: () => void, skip = false, loader?: AssetLoader) {
    if (skip && (!loader || loader.snapshot.ready)) {
      this.hasStarted = true;
      this.element.hidden = true;
      document.body.dataset.intro = 'false';
      onStart();
      return;
    }
    this.element.className = 'intro-panel';
    this.element.tabIndex = 0;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'intro-title');
    this.element.innerHTML = `<div class="intro-card"><div class="eyebrow">TAIWAN RECYCLING RUN / 出車須知</div><h1 id="intro-title">街頭回收隊</h1><p class="intro-objective">安全開完三站，把居民送來的回收物分好！</p><ol><li><b>沿路向上，靠右收運</b><span>依序前往三個收運站，停進道路右側的收運灣。</span></li><li><b>停妥後，動手分類</b><span>把籃子裡的物品拖進對應袋口；衛生紙等不可回收物放到「退回」。也可點物品，再點袋子。</span></li><li><b>分完才可以離站</b><span>等居民交付完、籃子清空，隨車人員整理好並安全就位。</span></li><li><b>注意怒氣與碰撞</b><span>直線不超過 40 km/h，轉彎降至 20 km/h 以下。怒氣到 100%，或撞到汽機車、建築物，立即失敗。</span></li></ol><p class="intro-controls">${document.body.dataset.device === 'mobile' ? '手機：沿方向盤圓周旋轉，放開回正；油門前進，煞車／倒車調整車位。' : '電腦：WASD／方向鍵駕駛，空白鍵緊急煞車。'}</p><p class="intro-start">點畫面任意位置開始<span>也可按 Enter 或空白鍵</span></p></div>`;
    if (skip) this.element.innerHTML = `<div class="intro-card retry-loading"><div class="eyebrow">準備重新出車</div><h1 id="intro-title">素材載入中</h1><p>不重複顯示操作規則，素材準備完成就出發。</p></div>`;
    let requested = skip;
    let unsubscribe = () => {};
    const start = () => {
      if (this.hasStarted) return;
      requested = true;
      if (loader && !loader.snapshot.ready) {
        const prompt = this.element.querySelector('.intro-start');
        if (prompt) prompt.textContent = '正在準備出車，素材載入完成後自動開始';
        return;
      }
      this.hasStarted = true;
      unsubscribe();
      this.element.hidden = true;
      this.element.blur();
      document.body.dataset.intro = 'false';
      onStart();
    };
    this.element.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation(); start();
    });
    this.element.addEventListener('keydown', (event) => {
      if ((event.target as HTMLElement | null)?.classList?.contains('asset-load-retry')) return;
      if (event.key !== 'Enter' && event.code !== 'Space') return;
      event.preventDefault(); event.stopPropagation(); start();
    });
    document.body.dataset.intro = 'true';
    document.body.append(this.element);
    this.element.focus();
    if (loader) {
      const card = this.element.querySelector('.intro-card')!;
      const loading = document.createElement('div');
      loading.className = 'asset-loading';
      loading.innerHTML = `<div class="asset-load-status" role="status" aria-live="polite"></div><progress class="asset-load-progress" aria-label="素材載入進度"></progress><button type="button" class="asset-load-retry" hidden>重新載入素材</button>`;
      card.append(loading);
      const status = loading.querySelector<HTMLElement>('.asset-load-status')!;
      const progress = loading.querySelector<HTMLProgressElement>('progress')!;
      const retry = loading.querySelector<HTMLButtonElement>('button')!;
      retry.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation(); void loader.start();
      });
      const update = (state: AssetSnapshot) => {
        progress.max = state.total; progress.value = state.loaded;
        progress.hidden = state.ready;
        retry.hidden = state.failed === 0 || state.loading;
        status.textContent = state.ready ? '素材已就緒' : state.loading
          ? `準備素材 ${state.loaded} / ${state.total} · 網路較慢時請稍候`
          : `${state.failed} 張素材載入失敗，請確認網路後重試`;
        if (state.ready && requested) start();
      };
      unsubscribe = loader.subscribe(update);
      void loader.start();
    }
  }
}
