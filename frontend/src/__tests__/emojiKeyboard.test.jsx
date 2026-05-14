import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    sendMessage: vi.fn((id, emoji) =>
      Promise.resolve({ id: `srv_${emoji}`, sender: 'me', emoji, at: Date.now() }),
    ),
    receivePartnerMessage: vi.fn(() => ({ id: 'p1', sender: 'them', emoji: '👋', at: Date.now() })),
    getCandidates: vi.fn(() => Promise.resolve([])),
    scheduleMatch: vi.fn(() => Promise.resolve(match)),
    getScheduled: vi.fn(() => Promise.resolve([])),
    getMessages: vi.fn(() => Promise.resolve([])),
    payExtend: vi.fn(() => Promise.resolve({ ok: true })),
  };
  return { api: mockApi, mockApi };
});

import Chat from '../screens/Chat';
import { SAFE_EMOJIS, SPICY_EMOJIS } from '../constants/emojiKeyboard';

function renderChat() {
  return render(
    <MemoryRouter initialEntries={['/chat/m1']}>
      <Routes>
        <Route path="/chat/:matchId" element={<Chat />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Chat — emoji-only input enforcement', () => {
  it('has zero text inputs in the entire chat surface', async () => {
    const { container } = renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Volver al feed')).toBeInTheDocument());
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('[contenteditable]')).toBeNull();
  });

  it('renders the 10 safe-tab keys with aria-labels', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Volver al feed')).toBeInTheDocument());
    for (const e of SAFE_EMOJIS) {
      expect(screen.getByLabelText(`enviar ${e.label}`)).toBeInTheDocument();
    }
  });

  it('exposes the 10 spicy keys after switching tabs', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Volver al feed')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /picantes/i }));
    for (const e of SPICY_EMOJIS) {
      expect(screen.getByLabelText(`enviar ${e.label}`)).toBeInTheDocument();
    }
  });

  it('appends an optimistic message row when an emoji key is tapped', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Volver al feed')).toBeInTheDocument());
    const heartBtn = screen.getByRole('button', { name: /enviar me encanta/i });
    fireEvent.click(heartBtn);
    await waitFor(() =>
      expect(screen.getByLabelText(/enviaste ❤️/)).toBeInTheDocument(),
    );
  });
});
