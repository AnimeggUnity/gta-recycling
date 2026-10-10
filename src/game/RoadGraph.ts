export type RoadNode = Readonly<{ id: string; x: number; y: number }>;
export type RoadEdge = Readonly<{ from: string; to: string; cost?: number }>;
export type RoutePoint = Readonly<{ x: number; y: number }>;

export class RoadGraph {
  private readonly nodeById = new Map<string, RoadNode>();
  private readonly neighbors = new Map<string, Readonly<{ id: string; cost: number }>[] >();

  public constructor(public readonly nodes: readonly RoadNode[], edges: readonly RoadEdge[]) {
    for (const node of nodes) {
      this.nodeById.set(node.id, node);
      this.neighbors.set(node.id, []);
    }
    for (const edge of edges) {
      const from = this.requireNode(edge.from);
      const to = this.requireNode(edge.to);
      const cost = edge.cost ?? this.distance(from, to);
      (this.neighbors.get(from.id) as { id: string; cost: number }[]).push({ id: to.id, cost });
      (this.neighbors.get(to.id) as { id: string; cost: number }[]).push({ id: from.id, cost });
    }
  }

  public findPath(from: RoutePoint, to: RoutePoint): readonly RoutePoint[] {
    const start = this.nearestNode(from);
    const goal = this.nearestNode(to);
    const open = new Set<string>([start.id]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[start.id, 0]]);
    const fScore = new Map<string, number>([[start.id, this.distance(start, goal)]]);

    while (open.size > 0) {
      const currentId = [...open].reduce((best, id) => (fScore.get(id) ?? Infinity) < (fScore.get(best) ?? Infinity) ? id : best);
      if (currentId === goal.id) return this.buildPoints(cameFrom, currentId, from, to);
      open.delete(currentId);
      for (const neighbor of this.neighbors.get(currentId) ?? []) {
        const tentative = (gScore.get(currentId) ?? Infinity) + neighbor.cost;
        if (tentative >= (gScore.get(neighbor.id) ?? Infinity)) continue;
        cameFrom.set(neighbor.id, currentId);
        gScore.set(neighbor.id, tentative);
        fScore.set(neighbor.id, tentative + this.distance(this.requireNode(neighbor.id), goal));
        open.add(neighbor.id);
      }
    }
    return [from, to];
  }

  public pathDistance(points: readonly RoutePoint[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) total += this.distance(points[i - 1], points[i]);
    return total;
  }

  private buildPoints(cameFrom: ReadonlyMap<string, string>, currentId: string, from: RoutePoint, to: RoutePoint): readonly RoutePoint[] {
    const ids = [currentId];
    while (cameFrom.has(currentId)) {
      currentId = cameFrom.get(currentId)!;
      ids.unshift(currentId);
    }
    const graphPoints = ids.map((id) => this.requireNode(id));
    return [from, ...graphPoints, to].filter((point, index, points) => index === 0 || this.distance(point, points[index - 1]) > 1);
  }

  private nearestNode(point: RoutePoint): RoadNode {
    return this.nodes.reduce((best, node) => this.distance(node, point) < this.distance(best, point) ? node : best);
  }

  private requireNode(id: string): RoadNode {
    const node = this.nodeById.get(id);
    if (!node) throw new Error(`Unknown road node: ${id}`);
    return node;
  }

  private distance(a: RoutePoint, b: RoutePoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
