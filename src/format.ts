import type { Format } from './cards/types';

/** A figure split into the part set in the display face and a quiet suffix. */
export interface Figure {
  text: string;
  suffix?: string;
}

const group = new Intl.NumberFormat('en-US');

export function formatInteger(value: number): string {
  return group.format(Math.round(value));
}

/** 1380 -> "11 pm". 252 -> "4:12 am". Minutes since midnight, local to the export. */
export function formatClock(minutes: number): Figure {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  const text = minute === 0 ? `${hour}` : `${hour}:${String(minute).padStart(2, '0')}`;
  return { text, suffix };
}

export function formatValue(value: number, format: Format): Figure {
  return format === 'clock' ? formatClock(value) : { text: formatInteger(value) };
}
