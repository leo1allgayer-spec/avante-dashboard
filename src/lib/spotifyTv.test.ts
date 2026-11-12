import { expect, it } from 'vitest';
import { spotifyChallenge, spotifyContext } from './spotifyTv';
it('accepts Spotify content URLs without allowing arbitrary hosts', () => {
  const id = '1234567890123456789012';
  expect(spotifyContext(`https://open.spotify.com/playlist/${id}?si=share`)).toEqual({ type: 'playlist', uri: `spotify:playlist:${id}` });
  expect(spotifyContext(`https://open.spotify.com/intl-pt/track/${id}`)?.type).toBe('track');
  expect(spotifyContext(`spotify:album:${id}`)?.type).toBe('album');
  for (const url of [`https://open.spotify.com.evil.test/track/${id}`, `http://open.spotify.com/track/${id}`, 'javascript:alert(1)', 'https://open.spotify.com/user/test']) expect(spotifyContext(url)).toBeNull();
});
it('generates the standard RFC 7636 S256 PKCE challenge', async () => {
  expect(await spotifyChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
