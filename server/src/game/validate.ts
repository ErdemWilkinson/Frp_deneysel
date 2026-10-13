import { ROLL_MODES, type RollMode } from '@masa/shared';
import { fail } from './context';

export function int(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    fail(`${label} ${min} ile ${max} arasında bir tam sayı olmalı`);
  }
  return v;
}

export function oneOf<T extends string>(v: unknown, list: readonly T[], label: string): T {
  return typeof v === 'string' && list.includes(v as T) ? (v as T) : fail(`${label} geçersiz`);
}

export function text(v: unknown, max: number, label: string): string {
  const value = typeof v === 'string' ? v.trim() : '';
  return value.length > 0 && value.length <= max ? value : fail(`${label} 1 ile ${max} karakter arasında olmalı`);
}

export const mode = (v: unknown): RollMode => oneOf(v ?? 'normal', ROLL_MODES, 'Zar kipi');
