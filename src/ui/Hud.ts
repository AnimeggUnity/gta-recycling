export class Hud {
  public readonly element: HTMLDivElement;
  private readonly settlement: HTMLDivElement;

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
    settlement?: Readonly<{
      score: number;
      totalSeconds: number;
      totalDelaySeconds: number;
      peakAnger: number;
      stationCount: number;
    }>;
  }>): void {
    const handling = Math.abs(data.lateralSpeed) > 14 ? '輪胎滑動' : '抓地正常';
    const angerBlocks = Math.round(data.crewAnger / 10);
    const angerBar = `${'■'.repeat(angerBlocks)}${'□'.repeat(10 - angerBlocks)}`;
    const angerClass = data.crewAnger >= 50 ? 'danger' : data.crewAnger >= 25 ? 'warning' : 'calm';
    const delay = data.delaySeconds > 1 ? `延誤 ${Math.round(data.delaySeconds)} 秒` : `預估提早 ${Math.round(Math.abs(data.delaySeconds))} 秒`;
    this.element.innerHTML = [
      `<strong>第 ${Math.min(data.stationNumber, data.stationCount)}/${data.stationCount} 站：${data.stationName}</strong>`,
      `距離 ${data.distanceMeters} m　ETA ${this.duration(data.etaSeconds)}　預定 ${data.scheduledTime}`,
      `${delay}　車速 ${Math.round(data.speed * 0.35)} km/h　${handling}`,
      `<span class="hud-status">${data.status}</span>`,
      `車斗 ${data.cargoVolume}/${data.maxCargoVolume} 容量　${data.cargoWeight}/${data.maxCargoWeight} kg`,
      `<span class="anger ${angerClass}">怒氣 ${angerBar} ${Math.round(data.crewAnger)}/100　${data.crewReaction}</span>`,
      `<small>怒氣原因：${data.angerReason}</small>`,
      `作業效率 ${Math.round(data.crewEfficiency * 100)}%`,
      '<small>方向鍵／WASD 駕駛　Space 緊急煞車</small>',
    ].join('<br>');

    this.settlement.hidden = !data.settlement;
    if (data.settlement) {
      this.settlement.innerHTML = [
        '<strong>三站收運完成</strong>',
        `<b>${data.settlement.score}</b> 分`,
        `完成時間 ${this.duration(data.settlement.totalSeconds)}`,
        `累計延誤 ${Math.round(data.settlement.totalDelaySeconds)} 秒`,
        `最高怒氣 ${Math.round(data.settlement.peakAnger)}/100`,
        `完成站數 ${data.settlement.stationCount}/${data.stationCount}`,
      ].join('<br>');
    }
  }

  private duration(seconds: number): string {
    const rounded = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    return `${minutes.toString().padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`;
  }
}
