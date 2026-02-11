import { CENTER, OUTER_RADIUS } from './skill-radar-constants';

export function polarToXY(index: number, total: number, normValue: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const r = normValue * OUTER_RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

export interface ImprovementItem {
  name: string;
  diff: number;
  label: string;
  positive: boolean;
}
