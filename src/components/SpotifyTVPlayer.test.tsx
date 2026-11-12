// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SpotifyTVPlayer from './SpotifyTVPlayer';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: { user: { id: 'test-user' } } }) }));
const prefix = 'avante-spotify-tv:test-user';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); history.replaceState(null, '', '/dashboard-tv'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete (window as any).Spotify; });
it('opens setup and validates client ID before attempting authorization', async () => {
  render(<SpotifyTVPlayer />);
  fireEvent.click(screen.getByRole('button', { name: 'Conectar Spotify' }));
  expect(screen.getByLabelText('Client ID')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Conectar Spotify' })[1]);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Informe o Client ID'));
  expect(sessionStorage.getItem(prefix + ':pending')).toBeNull();
});
it('rejects an OAuth callback with an unrecognized state without exchanging tokens', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  history.replaceState(null, '', '/dashboard-tv?code=untrusted&state=wrong');
  render(<SpotifyTVPlayer />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não reconhecida'));
  expect(fetch).not.toHaveBeenCalled();
  expect(location.search).toBe('');
});
it('keeps the player connected when settings close, and disconnects on exit', async () => {
  sessionStorage.setItem(prefix + ':token', JSON.stringify({ access_token: 'test', refresh_token: 'test-refresh', expires: Date.now() + 3600000 }));
  const disconnect = vi.fn();
  (window as any).Spotify = { Player: class { addListener() {} connect() { return Promise.resolve(true); } disconnect = disconnect; } };
  const view = render(<SpotifyTVPlayer />);
  await waitFor(() => expect(screen.getByText('Conectando player…')).toBeTruthy());
  fireEvent.click(screen.getByLabelText('Configurar Spotify'));
  fireEvent.click(screen.getByLabelText('Fechar configurações Spotify'));
  expect(disconnect).not.toHaveBeenCalled();
  view.unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
});
it('clears the old authorization when switching accounts while keeping the app ID', async () => {
  localStorage.setItem(prefix + ':client', 'a'.repeat(32));
  sessionStorage.setItem(prefix + ':token', JSON.stringify({ access_token: 'old-account', refresh_token: 'old-refresh', expires: Date.now() + 3600000 }));
  (window as any).Spotify = { Player: class { addListener() {} connect() { return Promise.resolve(true); } disconnect() {} } };
  render(<SpotifyTVPlayer />);
  fireEvent.click(screen.getByLabelText('Configurar Spotify'));
  fireEvent.click(screen.getByRole('button', { name: 'Trocar conta' }));
  await waitFor(() => expect(sessionStorage.getItem(prefix + ':token')).toBeNull());
  expect((screen.getByLabelText('Client ID') as HTMLInputElement).value).toBe('a'.repeat(32));
  expect(screen.queryByRole('button', { name: 'Trocar conta' })).toBeNull();
});
it('transfers current playback to the browser without requiring a content link', async () => {
  sessionStorage.setItem(prefix + ':token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires: Date.now() + 3600000 }));
  const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch);
  (window as any).Spotify = { Player: class {
    addListener(name: string, cb: any) { if (name === 'ready') queueMicrotask(() => cb({ device_id: 'browser-device' })); }
    connect() { return Promise.resolve(true); } disconnect() {} activateElement() {}
  } };
  render(<SpotifyTVPlayer />);
  fireEvent.click(screen.getByLabelText('Configurar Spotify'));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Tocar neste aparelho' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Tocar neste aparelho' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('https://api.spotify.com/v1/me/player', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ device_ids: ['browser-device'], play: true }) })));
  expect(screen.queryByRole('alert')).toBeNull();
});
