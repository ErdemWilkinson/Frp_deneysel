import type { Condition } from './types';

export const DEFAULT_SPEED = 30;
export const DEFAULT_REACH = 5;
/** Jetonlar nokta değil pul olduğundan, menzil ölçülürken tanınan pay (ft). */
export const REACH_SLACK = 2.5;

/** Bu durumlardaki bir yaratığın hızı sıfırdır (SRD 5.1). */
const IMMOBILE: readonly Condition[] = ['grappled', 'restrained', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
export const isImmobile = (conditions: readonly Condition[]): boolean => conditions.some((c) => IMMOBILE.includes(c));

/** "30 ft., fly 60 ft." → 60: yaratık en hızlı hareket biçimiyle yol alır. Okunamazsa 30. */
export function bestSpeed(speed: string): number {
  const all = (speed.match(/\d+/g) ?? []).map(Number);
  return all.length > 0 ? Math.max(...all) : DEFAULT_SPEED;
}

export interface Scale { widthFt: number; aspect: number }
interface Point { x: number; y: number }

/** Savaş alanındaki iki nokta arasındaki uzaklık (ft). Konumlar alanın enine ve boyuna oranla verilir. */
export function feetBetween(a: Point, b: Point, scale: Scale): number {
  const feet = Math.hypot((a.x - b.x) * scale.widthFt, (a.y - b.y) * scale.widthFt * scale.aspect);
  return Math.round(feet * 10) / 10;
}

/** Bu turda kalan yürüme mesafesi (ft). Koşu, hızı bir kez daha ekler. */
export function movementLeft(speed: number, turn: { moved: number; dashed: boolean; conditions: readonly Condition[] }): number {
  if (isImmobile(turn.conditions)) return 0;
  return Math.max(0, Math.round((speed * (turn.dashed ? 2 : 1) - turn.moved) * 10) / 10);
}
