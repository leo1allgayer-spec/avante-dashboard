export const SPOTIFY_SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
export function spotifyContext(input: string) {
  const value = input.trim();
  const uri = /^spotify:(playlist|album|track):([a-zA-Z0-9]{22})$/.exec(value);
  if (uri) return { type: uri[1], uri: value };
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;
    const match = /^\/(?:intl-[a-z-]+\/)?(playlist|album|track)\/([a-zA-Z0-9]{22})\/?$/.exec(url.pathname);
    return match ? { type: match[1], uri: `spotify:${match[1]}:${match[2]}` } : null;
  } catch { return null; }
}
export function randomSpotifySecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
export async function spotifyChallenge(verifier: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
