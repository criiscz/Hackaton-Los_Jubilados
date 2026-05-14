import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api/client', () => {
  const match = {
    id: 'm1',
    candidate: { id: 'c1', name: 'Luna', emoji: '🦋', interest: 'todes', labia: 80 },
    when: new Date().toISOString(),
    status: 'scheduled',
  };
  const mockApi = {
    getMatch: vi.fn(() => Promise.resolve(match)),
    sendMessage: vi.fn((id, emoji) => Promise.resolve({ id: `s_${emoji}`, sender: 'me', emoji, at: Date.now() })),
    receivePartnerMessage: vi.fn(() => ({ id: 'p1', sender: 'them', emoji: '👋', at: Date.now() })),
    payExtend: vi.fn(() => Promise.resolve({ ok: true })),
    getCandidates: vi.fn(() => Promise.resolve([])),
    scheduleMatch: vi.fn(() => Promise.resolve(match)),
    getScheduled: vi.fn(() => Promise.resolve([])),
    getMessages: vi.fn(() => Promise.resolve([])),
  };
  return { api: mockApi, mockApi };
});

import Chat from '../screens/Chat';

function renderChat() {
  return render(
    <MemoryRouter initialEntries={['/chat/m1']}>
      <Routes>
        <Route path="/chat/:matchId" element={<Chat />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Chat — expiry + extend flow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the ExtendChatCTA after 120s and hides the keyboard', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Volver al feed')).toBeInTheDocument());

    act(() => {
      vi.advanceTimersByTime(121 * 1000);
    });

    expect(await screen.findByText(/Se acabó el tiempo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar me encanta/i })).toBeNull();
  });

  it('opens PaymentModal, submitting resets the timer and re-enables the keyboard', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Volver al feed')).toBeInTheDocument());

    act(() => {
      vi.advanceTimersByTime(121 * 1000);
    });

    const extendBtn = await screen.findByRole('button', { name: /Extender 2 min más/i });
    fireEvent.click(extendBtn);

    expect(screen.getByRole('dialog', { name: /Pagar para extender chat/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Pagar para extender chat/i })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: /enviar me encanta/i })).toBeInTheDocument();
    expect(screen.queryByText(/Se acabó el tiempo/)).toBeNull();
  });
});
