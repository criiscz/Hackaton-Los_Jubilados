import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at full duration', () => {
    const start = Date.now();
    const { result } = renderHook(() => useCountdown(start, 120));
    expect(result.current.mmss).toBe('02:00');
    expect(result.current.expired).toBe(false);
    expect(result.current.urgent).toBe(false);
  });

  it('flags urgent in the last 15s', () => {
    const start = Date.now();
    const { result } = renderHook(() => useCountdown(start, 120));
    act(() => {
      vi.advanceTimersByTime(106 * 1000);
    });
    expect(result.current.urgent).toBe(true);
    expect(result.current.expired).toBe(false);
    expect(result.current.mmss).toBe('00:14');
  });

  it('flags expired at zero', () => {
    const start = Date.now();
    const { result } = renderHook(() => useCountdown(start, 120));
    act(() => {
      vi.advanceTimersByTime(120 * 1000);
    });
    expect(result.current.expired).toBe(true);
    expect(result.current.mmss).toBe('00:00');
    expect(result.current.urgent).toBe(false);
  });

  it('does not return negative remaining past expiry', () => {
    const start = Date.now();
    const { result } = renderHook(() => useCountdown(start, 120));
    act(() => {
      vi.advanceTimersByTime(300 * 1000);
    });
    expect(result.current.remaining).toBe(0);
    expect(result.current.mmss).toBe('00:00');
  });
});
