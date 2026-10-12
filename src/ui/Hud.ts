import { ROUTE_STATIONS } from '../config/stations';
import { STREET, TRAFFIC, VEHICLE, WORLD } from '../config/balance';
import type { RoutePoint } from '../game/RoadGraph';
import type { SignalColor } from '../game/TrafficSystem';
import type { StationPhase } from '../game/StationCycle';
import type { MissionFailure } from '../game/RouteMission';
import policeArt from '../../assets/failure/police-v1.png?url';
import angryWorkerArt from '../../assets/failure/angry-worker-v1.png?url';

export class Hud {
  public readonly element: HTMLDivElement;
  private readonly settlement: HTMLDivElement;
  private settlementMarkup = '';

  public constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hud';
    document.body.append(this.element);
    this.settlement = document.createElement('div');
    this.settlement.className = 'settlement';
    this.settlement.hidden = true;
    document.body.append(this.settlement);
  }

  public update(data: Readonly<{
    speed: number;
    lateralSpeed: number;
    distanceMeters: number;
    status: string;
    servicePhase?: StationPhase;
    urgentWarning?: boolean;
    cargoVolume: number;
    maxCargoVolume: number;
    cargoWeight: number;
    maxCargoWeight: number;
    crewAnger: number;
    crewEfficiency: number;
    crewReaction: string;
    angerReason: string;
    stationName: string;
    stationNumber: number;
    stationCount: number;
    etaSeconds: number;
    scheduledTime: string;
    delaySeconds: number;
    vehicleX: number;
    vehicleY: number;
    vehicleRotation: number;
    navigationPath: readonly RoutePoint[];
    signalColor?: SignalColor;
    signalDistance?: number;
    failure?: MissionFailure;
    settlement?: Readonly<{
      score: number;
      totalSeconds: number;
      totalDelaySeconds: number;
      peakAnger: number;
      stationCount: number;
    }>;
  }>): void {
    const handling = Math.abs(data.lateralSpeed) > 14 ? '輪胎滑動' : '抓地正常';
    const angerClass = data.crewAnger >= 50 ? 'danger' : data.crewAnger >= 25 ? 'warning' : 'calm';
    const delay = data.settlement ? '路線完成' : data.delaySeconds > 1 ? `延誤 +${Math.round(data.delaySeconds)}s` : `提早 ${Math.round(Math.abs(data.delaySeconds))}s`;
    const speed = Math.round(data.speed * VEHICLE.kmhPerSpeedUnit);
    const overspeed = data.speed * VEHICLE.kmhPerSpeedUnit > 40;
    const nextPoint = data.navigationPath.find((point) => Math.hypot(point.x - data.vehicleX, point.y - data.vehicleY) > 15);
    const bearing = nextPoint ? Math.atan2(nextPoint.y - data.vehicleY, nextPoint.x - data.vehicleX) - data.vehicleRotation : 0;
    const atStop = data.distanceMeters === 0 && data.navigationPath.length === 0;
    const mobile = document.body.dataset?.device === 'mobile';
    const showService = !data.settlement && (data.urgentWarning || (data.servicePhase && data.servicePhase !== 'approaching'));
    const markup = mobile ? `
      <section class="mobile-speed ${overspeed ? 'speed-warning' : ''}" aria-label="車速"><div class="speed-number">${speed}<small>km/h</small></div></section>
      ${showService ? `<div class="mobile-service" role="status">${data.status}</div>` : ''}` : `
      <section class="nav-panel panel">
        <div class="eyebrow">TAIWAN RECYCLING RUN <span>收運勤務</span></div>
        <div class="brand">街頭回收隊<span class="route-counter">${Math.min(data.stationNumber, data.stationCount)} / ${data.stationCount} 站</span></div>
        <div class="destination"><span class="turn-icon"><i style="transform:rotate(${bearing}rad)">${atStop ? '✓' : '↑'}</i></span><div><small>${atStop ? '目前收運站' : '下一個收運站'}</small><strong>${data.stationName}</strong></div></div>
        <div class="nav-metrics"><div><b>${Math.round(data.distanceMeters)}</b><small>公尺</small></div><div><b>${this.duration(data.etaSeconds)}</b><small>預估抵達 ETA</small></div></div>
        <div class="schedule"><span>預定 ${data.scheduledTime}</span><span class="${data.delaySeconds > 1 ? 'warning' : 'calm'}">${delay}</span></div>
        <div class="traffic-status ${data.signalColor ?? ''}"><i></i>${data.signalColor ? `${{ red: '前方紅燈 · 停止線前停車', yellow: '前方黃燈 · 減速準備停車', green: '前方綠燈 · 留意汽機車' }[data.signalColor]}　${data.signalDistance ?? 0}m` : '靠右停入收運灣 · 車頭朝上 ↑'}</div>
        <div class="hud-status">${data.status}</div>
      </section>
      <section class="map-panel panel"><div class="eyebrow">路線圖 <span>LIVE GPS</span></div>${this.minimap(data)}</section>
      <section class="crew-panel panel">
        <div class="eyebrow">隨車人員 <span>效率 ${Math.round(data.crewEfficiency * 100)}%</span></div>
        <div class="crew-heading"><strong class="${angerClass}">${data.crewReaction}</strong><span class="${angerClass}">怒氣 <b>${Math.round(data.crewAnger)}</b><small> / 100</small></span></div>
        <div class="meter ${angerClass}"><i style="width:${this.percent(data.crewAnger, 100)}%"></i></div>
        <div class="anger-reason">${data.angerReason}</div>
        <div class="cargo-heading"><span>車斗容量</span><span>${data.cargoVolume} / ${data.maxCargoVolume}</span></div>
        <div class="meter cargo-meter"><i style="width:${this.percent(data.cargoVolume, data.maxCargoVolume)}%"></i></div>
        <div class="cargo-legend"><span>■ 紙　<span>■ 塑膠</span>　<span>■ 金屬</span>　<span>■ 玻璃</span></span><span>${data.cargoWeight}/${data.maxCargoWeight} kg</span></div>
      </section>
      <section class="speed-panel panel ${overspeed ? 'speed-warning' : ''}"><div class="eyebrow">${handling}<span>${overspeed ? '超速' : '車速'}</span></div><div class="speed-number">${speed.toString().padStart(2, '0')}<small>km/h</small></div><div class="speed-note">直線 ≤40　轉彎 ≤20</div></section>
      <div class="controls-hint"><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 駕駛 <span>·</span> <kbd>SPACE</kbd> 緊急煞車</div>`;
    if (this.element.innerHTML !== markup) this.element.innerHTML = markup;

    this.settlement.hidden = !data.settlement && !data.failure;
    this.settlement.className = `settlement${data.failure ? ` mission-failed ${data.failure.reason === 'collision' ? 'collision-failed' : 'anger-failed'}` : ''}`;
    if (data.settlement || data.failure) {
      const settlementMarkup = data.failure
        ? `<img class="failure-illustration" src="${data.failure.reason === 'collision' ? policeArt : angryWorkerArt}" alt="${data.failure.reason === 'collision' ? '迎面衝出的警車' : '暴怒收運人員舉起回收籃子'}" draggable="false"><div class="failure-message" role="alertdialog" aria-modal="true" aria-label="任務失敗"><div class="eyebrow">SHIFT FAILED / 收運中止</div><strong>任務失敗</strong><div class="failure-cause">${data.failure.reason === 'collision' ? '發生交通事故' : '隨車人員暴怒！'}</div><p>${data.failure.reason === 'collision' ? `撞到${data.failure.collisionLabel ?? '車輛或建築物'}，本次收運立即中止。` : '隨車人員怒氣達到 100%，拒絕繼續收運。'}</p><div class="report-row"><span>出車時間</span><span>${this.duration(data.failure.totalSeconds)}</span></div><div class="report-row"><span>完成站數</span><span>${data.failure.stationCount} / ${data.stationCount}</span></div><button type="button" id="restart-mission">重新出車 →</button></div>`
        : `<div class="eyebrow">SHIFT COMPLETE / 收運報告</div><strong>辛苦了，收工！</strong><p>三站回收物已完成收運</p><div class="score"><b>${data.settlement!.score}</b><span>勤務評分</span></div><div class="report-row"><span>完成時間</span><span>${this.duration(data.settlement!.totalSeconds)}</span></div><div class="report-row"><span>累計延誤</span><span>${Math.round(data.settlement!.totalDelaySeconds)} 秒</span></div>${mobile ? '' : `<div class="report-row"><span>最高怒氣</span><span>${Math.round(data.settlement!.peakAnger)} / 100</span></div>`}<div class="report-row"><span>完成站數</span><span>${data.settlement!.stationCount} / ${data.stationCount}</span></div><button type="button" id="restart-mission">重新出車 →</button>`;
      if (this.settlementMarkup !== settlementMarkup) {
        this.settlementMarkup = settlementMarkup;
        this.settlement.innerHTML = settlementMarkup;
        this.settlement.querySelector('button')?.addEventListener('click', () => window.location.reload());
      }
    }
  }

  private percent(value: number, maximum: number): number {
    return Math.min(100, Math.max(0, value / maximum * 100));
  }

  private minimap(data: { vehicleX: number; vehicleY: number; vehicleRotation: number; navigationPath: readonly RoutePoint[]; stationNumber: number }): string {
    // Schematic stretches the road vertically so a 6,000px strip stays readable.
    const x = (value: number) => Math.round(value / WORLD.width * 1000);
    const y = (value: number) => Math.round(Math.max(20, Math.min(310, 90 + (value - STREET.top) * 0.45)));
    const points = data.navigationPath.map((point) => `${x(point.x)},${y(point.y)}`).join(' ');
    const stops = ROUTE_STATIONS.map((station, index) => `<circle cx="${x(station.stop.x)}" cy="${y(station.stop.y)}" r="28" fill="${index + 1 < data.stationNumber ? '#7bb997' : index + 1 === data.stationNumber ? '#f1cd7d' : '#82928c'}"/><g transform="translate(${x(station.stop.x)} ${y(station.stop.y)}) rotate(90)"><text y="14" text-anchor="middle" fill="#203739" font-size="42" font-weight="bold">${index + 1}</text></g>`).join('');
    const signals = TRAFFIC.signalXs.map((value) => `<path d="M${x(value)} 90V207" stroke="#cfb990" stroke-width="8"/>`).join('');
    return `<svg viewBox="0 0 340 1000" role="img" aria-label="垂直收運路線：由下往上，三站位於道路右側"><g transform="translate(0 1000) rotate(-90)"><rect width="1000" height="340" fill="#364d48"/><rect y="90" width="1000" height="117" fill="#21363c"/><path d="M0 ${y(STREET.centerY)}H1000" stroke="#a89768" stroke-width="4"/>${signals}<polyline points="${points}" fill="none" stroke="#7ed4b9" stroke-width="12" stroke-linejoin="round"/>${stops}<g transform="translate(${x(data.vehicleX)} ${y(data.vehicleY)}) rotate(${Math.round(data.vehicleRotation * 180 / Math.PI)})"><circle r="32" fill="#dcecd6" fill-opacity=".15"/><path d="M28 0L-20 -18L-13 0L-20 18Z" fill="#f9eee0" stroke="#223d3e" stroke-width="4"/></g></g><text x="170" y="45" text-anchor="middle" fill="#acbca9" font-size="38">前進 ↑</text></svg>`;
  }

  private duration(seconds: number): string {
    const rounded = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    return `${minutes.toString().padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`;
  }
}
