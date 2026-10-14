import { selectDifficulty, type Difficulty } from './Difficulty';
import { selectGameMode, type GameMode } from './GameMode';
import type { AssetLoader, AssetSnapshot } from './AssetLoader';

/** Mode selection and explicit start are separate; loading keeps the clock frozen. */
export class IntroPanel {
  public readonly element = document.createElement('section');
  private hasStarted = false;
  public get started(): boolean { return this.hasStarted; }

  public constructor(onStart: () => void, skip = false, loader?: AssetLoader, mode: GameMode = 'recycling', difficulty: Difficulty = 'normal') {
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
    const garbage = mode === 'garbage';
    const easy = difficulty === 'easy';
    this.element.innerHTML = `<div class="intro-card"><div class="eyebrow">${garbage ? 'TAIWAN GARBAGE RUN' : 'TAIWAN RECYCLING RUN'} / 出車須知</div><h1 id="intro-title">${garbage ? '街頭垃圾車' : '街頭回收隊'}</h1><div class="mode-options" role="group" aria-label="選擇遊戲模式"><button type="button" data-mode="recycling" aria-pressed="${!garbage}">回收車 · 分類</button><button type="button" data-mode="garbage" aria-pressed="${garbage}">垃圾車 · 甩袋</button></div><div class="mode-options difficulty-options" role="group" aria-label="選擇難度"><button type="button" data-difficulty="easy" aria-pressed="${easy}">簡單 · 自動駕駛</button><button type="button" data-difficulty="normal" aria-pressed="${!easy}">一般 · 自行駕駛</button></div><p class="intro-objective">${garbage ? '安全開完三站，把垃圾袋準確甩進壓縮車！' : '安全開完三站，把居民送來的回收物分好！'}</p><ol><li><b>${easy ? '自動開車，專心收運' : '沿路向上，靠右收運'}</b><span>${easy ? '車輛自動前往三站並停靠；完成作業、人員就位後自動離站。分類與甩袋由你操作。' : '依序前往三個收運站，停進道路右側的收運灣。'}</span></li>${garbage ? '<li><b>停妥後，甩袋入車</b><span>每站隨機 3～5 包。按住袋子向投入口滑動後放手；方向要準，小袋輕甩、大袋加快。</span></li>' : '<li><b>停妥後，動手分類</b><span>把籃子裡的物品拖進對應袋口；馬桶蓋、巧拼墊、木頭、鞋子、後背包等不可回收物放到「退回民眾」。也可點物品，再點袋子。</span></li>'}${garbage ? '<li><b>一般袋上甩，危險袋退回</b><span>一般袋入車或危險袋退回 +100 分；危險袋向下滑或點按鈕退回。誤投入車扣 100 分、怒氣 +35。全部處理完，等垃圾壓縮、人員安全就位才能離站，本站完成後怒氣歸零。</span></li>' : '<li><b>分完才可以離站</b><span>等居民交付完、籃子清空，隨車人員整理好並安全就位。本站完成後怒氣歸零。</span></li>'}<li><b>一站違停，按喇叭讓路</b><span>每趟隨機一個收運灣有違停車；按 H 或手機喇叭鈕，等車開走再停靠。簡單模式會自動按喇叭。</span></li><li><b>每站都要停靠</b><span>超過未收運站點 15 公尺會警告，請倒回補停；繼續超過 35 公尺，民眾會暴怒，任務失敗。</span></li><li><b>注意怒氣與碰撞</b><span>最高時速 60 km/h；超過 35 km/h 開始累積怒氣，轉彎降至 20 km/h 以下。駛上人行道會顛簸並快速累積怒氣。怒氣到 100%，或撞到汽機車、建築物，立即失敗。</span></li></ol><p class="intro-controls">${easy ? '按「暫停行駛／繼續行駛」或空白鍵控制自動駕駛；切換視窗後會暫停行駛。' : document.body.dataset.device === 'mobile' ? '手機：沿方向盤圓周旋轉，放開回正；油門前進，煞車／倒車調整車位，倒車最高 12 km/h。' : '電腦：WASD／方向鍵駕駛，空白鍵緊急煞車，倒車最高 12 km/h。'}</p><button type="button" class="intro-start" data-intro-start>${garbage ? '開始垃圾車收運 →' : '開始回收車收運 →'}<span>先選擇車輛與難度，再按此開始 · 也可按 Enter 或空白鍵</span></button></div>`;
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
      const difficultyChoice = (event.target as HTMLElement | null)?.closest?.<HTMLButtonElement>('button[data-difficulty]');
      if (difficultyChoice) {
        event.preventDefault(); event.stopPropagation();
        selectDifficulty(difficultyChoice.dataset.difficulty as Difficulty); return;
      }
      const choice = (event.target as HTMLElement | null)?.closest?.<HTMLButtonElement>('[data-mode]');
      if (choice) {
        event.preventDefault(); event.stopPropagation();
        selectGameMode(choice.dataset.mode as GameMode); return;
      }
      event.preventDefault(); event.stopPropagation();
      if ((event.target as HTMLElement | null)?.closest?.('[data-intro-start]')) start();
    });
    this.element.addEventListener('keydown', (event) => {
      if ((event.target as HTMLElement | null)?.classList?.contains('asset-load-retry') || (event.target as HTMLElement | null)?.closest?.('[data-mode]') || (event.target as HTMLElement | null)?.closest?.('button[data-difficulty]')) return;
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
