/**
 * Utility functions for Arabic date, time and duration formatting
 */

export function formatArabicDuration(ms: number): string {
  if (ms <= 0) return '0 دقيقة';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    if (hours === 1) parts.push('ساعة واحدة');
    else if (hours === 2) parts.push('ساعتان');
    else if (hours >= 3 && hours <= 10) parts.push(`${hours} ساعات`);
    else parts.push(`${hours} ساعة`);
  }

  if (minutes > 0) {
    if (minutes === 1) parts.push('دقيقة واحدة');
    else if (minutes === 2) parts.push('دقيقتان');
    else if (minutes >= 3 && minutes <= 10) parts.push(`${minutes} دقائق`);
    else parts.push(`${minutes} دقيقة`);
  }

  if (seconds > 0 && hours === 0) {
    if (seconds === 1) parts.push('ثانية واحدة');
    else if (seconds === 2) parts.push('ثانيتان');
    else if (seconds >= 3 && seconds <= 10) parts.push(`${seconds} ثوانٍ`);
    else parts.push(`${seconds} ثانية`);
  }

  return parts.length > 0 ? parts.join(' و ') : 'أقل من ثانية';
}

export function formatCompactDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}س ${minutes}د ${seconds}ث`;
  }
  return `${minutes}د ${seconds}ث`;
}

export function formatArabicTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatArabicDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCountdown(secondsRemaining: number): string {
  const clamped = Math.max(0, Math.floor(secondsRemaining));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
