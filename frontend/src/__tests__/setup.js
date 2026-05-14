import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Silence noisy router future-flag warning in v6.
const origWarn = console.warn;
console.warn = (...args) => {
  const m = args[0];
  if (typeof m === 'string' && (m.includes('React Router Future Flag') || m.includes('startTransition'))) return;
  origWarn(...args);
};
