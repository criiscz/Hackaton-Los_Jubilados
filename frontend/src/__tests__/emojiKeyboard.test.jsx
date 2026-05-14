import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api/client', () => {
  const match = {
    id: 'm1',
    candidate: { id: 'c1', name: 'Luna', emoji: '🦋', interest: 'everyone', rizz: 80 },
    // Anchor in the past so the waiting-room gate is open in tests.
    when: '2000-01-01T00:00:00.000Z',
    status: 'scheduled',
  };
  const mockApi = {
    demoLogin: vi.fn(() => Promise.resolve({})),
    getMatch: vi.fn(() => Promise.resolve(match)),
    sendMessage: vi.fn((id, emoji) =>
      Promise.resolve({ id: `srv_${emoji}`, sender: 'me', emoji, at: Date.now() }),
    ),
    subscribeToChat: vi.fn(() => () => {}),
    getCandidates: vi.fn(() => Promise.resolve([])),
    scheduleMatch: vi.fn(() => Promise.resolve(match)),
    getScheduled: vi.fn(() => Promise.resolve([])),
    getMessages: vi.fn(() => Promise.resolve([])),
    payExtend: vi.fn(() => Promise.resolve({ ok: true })),
  };
  return { api: mockApi, mockApi, DEMO_PROFILE: {} };
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
    await waitFor(() => expect(screen.queryByLabelText('Back to feed')).toBeInTheDocument());
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('[contenteditable]')).toBeNull();
  });

  it('renders the 10 soft-tab keys with aria-labels', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Back to feed')).toBeInTheDocument());
    for (const e of SAFE_EMOJIS) {
      expect(screen.getByLabelText(`send ${e.label}`)).toBeInTheDocument();
    }
  });

  it('exposes the 10 spicy keys after switching tabs', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Back to feed')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /spicy/i }));
    for (const e of SPICY_EMOJIS) {
      expect(screen.getByLabelText(`send ${e.label}`)).toBeInTheDocument();
    }
  });

  it('appends an optimistic message row when an emoji key is tapped', async () => {
    renderChat();
    await waitFor(() => expect(screen.queryByLabelText('Back to feed')).toBeInTheDocument());
    const heartBtn = screen.getByRole('button', { name: /send heart$/i });
    fireEvent.click(heartBtn);
    await waitFor(() =>
      expect(screen.getByLabelText(/you sent ❤️/)).toBeInTheDocument(),
    );
  });
});
