import { describe, expect, it } from 'vitest';
import { formatRemaining, parseStart, remainingSeconds, timerView } from './operation-timer-panel.js';

describe('GOLGE AI offline timer panel', () => {
  const start = parseStart('2026-11-23T03:00:00Z');

  it('starts at 10/15 minutes without approvals', () => {
    const state = timerView(start, start);
    expect(state.wait).toBe('10:00');
    expect(state.review).toBe('15:00');
    expect(state.automaticApproval).toBe(false);
    expect(state.mergePermitted).toBe(false);
    expect(state.deployPermitted).toBe(false);
  });

  it('transitions at 10 minutes', () => {
    const state = timerView(start, start + 600000);
    expect(state.wait).toBe('00:00');
    expect(state.review).toBe('05:00');
    expect(state.state).toContain('denetim bekleniyor');
  });

  it('shows review due at 15 minutes without granting approval', () => {
    const state = timerView(start, start + 900000);
    expect(state.review).toBe('00:00');
    expect(state.automaticApproval).toBe(false);
  });

  it('STOP overrides timer state', () => {
    expect(timerView(start, start + 1000000, true).state).toContain('STOPPED');
  });

  it('rejects missing timezone', () => {
    expect(() => parseStart('2026-11-23T03:00:00')).toThrow();
  });

  it('rejects future start', () => {
    expect(() => remainingSeconds(start, start - 1, 600)).toThrow();
  });

  it('supports timezone offsets', () => {
    expect(parseStart('2026-11-23T06:00:00+03:00')).toBe(start);
  });

  it('formats elapsed boundaries', () => {
    expect(formatRemaining(599)).toBe('09:59');
    expect(remainingSeconds(start, start + 10000000, 900)).toBe(0);
  });
});
