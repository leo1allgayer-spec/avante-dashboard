import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, SkipBack, SkipForward, Settings2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { randomSpotifySecret, spotifyChallenge, spotifyContext, SPOTIFY_SCOPES } from '@/lib/spotifyTv';

type Token = { access_token: string; refresh_token: string; expires: number };
let sdkLoad: Promise<void> | undefined;
function loadSdk() {
  if ((window as any).Spotify) return Promise.resolve();
  if (sdkLoad) return sdkLoad;
  sdkLoad = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('O player demorou para responder. Recarregue a página.')), 20000);
    (window as any).onSpotifyWebPlaybackSDKReady = () => { clearTimeout(timer); resolve(); };
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onerror = () => { clearTimeout(timer); reject(new Error('Não foi possível carregar o Spotify.')); };
    document.head.appendChild(script);
  }).catch(error => { sdkLoad = undefined; throw error; });
  return sdkLoad;
}
export default function SpotifyTVPlayer() {
  const { session } = useAuth();
  return session?.user.id ? <Player key={session.user.id} userId={session.user.id} /> : null;
}
function Player({ userId }: { userId: string }) {
  const key = `avante-spotify-tv:${userId}`;
  const read = (storage: Storage, name: string) => { try { return storage.getItem(name) || ''; } catch { return ''; } };
  const [clientId, setClientId] = useState(() => read(localStorage, key + ':client'));
  const [token, setToken] = useState<Token | null>(() => { try { return JSON.parse(read(sessionStorage, key + ':token') || 'null'); } catch { return null; } });
  const tokenRef = useRef(token);
  const refresh = useRef<Promise<string> | null>(null);
  const callbackStarted = useRef(false);
  const player = useRef<any>(null);
  const [device, setDevice] = useState('');
  const [state, setState] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(40);
  const [link, setLink] = useState('');
  const redirect = `${location.origin}/dashboard-tv`;
  const saveToken = (next: Token | null) => {
    tokenRef.current = next;
    if (next) sessionStorage.setItem(key + ':token', JSON.stringify(next));
    else sessionStorage.removeItem(key + ':token');
    setToken(next);
  };
  const requestToken = async (body: URLSearchParams) => {
    const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error('A autorização expirou ou foi recusada. Conecte o Spotify novamente.');
    return data;
  };
  const accessToken = async () => {
    const current = tokenRef.current;
    if (!current) throw new Error('Conecte sua conta Spotify.');
    if (current.expires > Date.now() + 60000) return current.access_token;
    if (!refresh.current) refresh.current = (async () => {
      const data = await requestToken(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: current.refresh_token, client_id: clientId }));
      saveToken({ access_token: data.access_token, refresh_token: data.refresh_token || current.refresh_token, expires: Date.now() + data.expires_in * 1000 });
      return data.access_token as string;
    })().finally(() => { refresh.current = null; });
    return refresh.current;
  };
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível executar a ação.'); setOpen(true); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if ((!params.has('code') && !params.has('error')) || callbackStarted.current) return;
    callbackStarted.current = true;
    setOpen(true);
    const code = params.get('code');
    const returnedState = params.get('state');
    const denied = params.has('error');
    const pending = read(sessionStorage, key + ':pending');
    sessionStorage.removeItem(key + ':pending');
    ['code', 'state', 'error', 'error_description'].forEach(p => params.delete(p));
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
    void run(async () => {
      if (denied) throw new Error('Conexão cancelada no Spotify. Você pode tentar novamente.');
      const auth = pending ? JSON.parse(pending) : null;
      if (!auth || !code || auth.state !== returnedState || auth.userId !== userId || Date.now() - auth.created > 600000) throw new Error('Conexão não reconhecida ou expirada. Clique em Conectar Spotify novamente.');
      const data = await requestToken(new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: auth.clientId, code_verifier: auth.verifier }));
      saveToken({ access_token: data.access_token, refresh_token: data.refresh_token, expires: Date.now() + data.expires_in * 1000 });
    });
  }, []);
  const connected = !!token;
  useEffect(() => {
    if (!connected) return;
    let active = true;
    let instance: any;
    let readyTimer: ReturnType<typeof setTimeout>;
    void (async () => {
      try {
        await loadSdk();
        if (!active) return;
        instance = new (window as any).Spotify.Player({ name: 'Avante Dashboard TV', volume: 0.4, getOAuthToken: (cb: (value: string) => void) => { accessToken().then(value => { if (active) cb(value); }).catch(e => { if (active) { setError(e.message); setOpen(true); } }); } });
        player.current = instance;
        instance.addListener('ready', ({ device_id }: any) => { if (active) { clearTimeout(readyTimer); setDevice(device_id); } });
        instance.addListener('not_ready', () => { if (active) setDevice(''); });
        instance.addListener('player_state_changed', (next: any) => { if (active) setState(next); });
        for (const name of ['initialization_error', 'authentication_error', 'account_error', 'playback_error']) instance.addListener(name, ({ message }: any) => { if (active) { clearTimeout(readyTimer); setError(name === 'account_error' ? 'Esta conta precisa ter Spotify Premium ativo.' : message); setOpen(true); } });
        instance.addListener('autoplay_failed', () => { if (active) { setError('Clique em Tocar para liberar o áudio neste navegador.'); setOpen(true); } });
        readyTimer = setTimeout(() => { if (active) { setError('O Spotify não conectou. Confira a conta autorizada no aplicativo Spotify Developers e o suporte de áudio protegido do navegador.'); setOpen(true); } }, 30000);
        if (!await instance.connect()) throw new Error('Não foi possível conectar o player do Spotify.');
      } catch (e) { if (active) { clearTimeout(readyTimer); setError(e instanceof Error ? e.message : 'Erro ao conectar o Spotify.'); setOpen(true); } }
    })();
    return () => { active = false; clearTimeout(readyTimer); instance?.disconnect(); player.current = null; setDevice(''); setState(null); };
  }, [connected]);
  const connect = () => void run(async () => {
    if (!/^[a-f0-9]{32}$/i.test(clientId.trim())) throw new Error('Informe o Client ID do aplicativo criado no Spotify Developers.');
    const verifier = randomSpotifySecret();
    const authState = randomSpotifySecret();
    const id = clientId.trim();
    localStorage.setItem(key + ':client', id);
    sessionStorage.setItem(key + ':pending', JSON.stringify({ state: authState, verifier, clientId: id, userId, created: Date.now() }));
    const params = new URLSearchParams({ client_id: id, response_type: 'code', show_dialog: 'true', redirect_uri: redirect, scope: SPOTIFY_SCOPES, state: authState, code_challenge_method: 'S256', code_challenge: await spotifyChallenge(verifier) });
    location.assign('https://accounts.spotify.com/authorize?' + params);
  });
  const api = async (path: string, body: unknown) => {
    const response = await fetch('https://api.spotify.com/v1' + path, { method: 'PUT', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(response.status === 403 ? 'Spotify recusou a reprodução. Confira o Premium e se esta conta está autorizada no aplicativo Spotify Developers.' : response.status === 429 ? 'Limite do Spotify atingido. Aguarde um pouco e tente novamente.' : 'Não foi possível iniciar a reprodução. Conecte novamente ou escolha outra música.');
  };
  const disconnect = () => {
    player.current?.disconnect();
    saveToken(null);
    sessionStorage.removeItem(key + ':pending');
    setDevice(''); setState(null); setError(''); setOpen(true);
  };
  const activate = () => player.current?.activateElement();
  const track = state?.track_window?.current_track;
  const button = 'rounded p-1.5 text-slate-200 hover:bg-slate-700 disabled:opacity-40';
  return <div className="relative mt-3 w-[230px] text-xs normal-case tracking-normal">
    <div className="flex items-center gap-1 text-emerald-400"><Music2 className="h-4 w-4"/><span className="font-semibold">Spotify</span><button type="button" aria-label="Configurar Spotify" onClick={() => setOpen(!open)} className={button + ' ml-auto'}><Settings2 className="h-3.5 w-3.5"/></button></div>
    {!connected ? <button type="button" onClick={() => setOpen(true)} className="mt-1 rounded-full bg-emerald-500 px-3 py-1.5 font-semibold text-black">Conectar Spotify</button> : <>
      <p className="truncate text-slate-200" title={track?.name}>{track?.name || (device ? 'Escolha uma música no Spotify' : 'Conectando player…')}</p>
      {track && <p className="truncate text-[10px] text-slate-400">{track.artists?.map((a: any) => a.name).join(', ')}</p>}
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Música anterior" disabled={!device || busy} className={button} onClick={() => void run(() => player.current.previousTrack())}><SkipBack className="h-4 w-4"/></button>
        <button type="button" aria-label={state && !state.paused ? 'Pausar música' : 'Tocar música'} disabled={!device || busy} className={button} onClick={() => { activate(); void run(async () => { if (!state) await api('/me/player', { device_ids: [device], play: true }); else await player.current.togglePlay(); }); }}>{state && !state.paused ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}</button>
        <button type="button" aria-label="Próxima música" disabled={!device || busy} className={button} onClick={() => void run(() => player.current.nextTrack())}><SkipForward className="h-4 w-4"/></button>
        <input type="range" aria-label="Volume do Spotify" min="0" max="100" value={volume} disabled={!device} className="ml-1 w-20 accent-emerald-500" onChange={event => { const next = Number(event.target.value); setVolume(next); player.current?.setVolume(next / 100).catch(() => setError('Não foi possível ajustar o volume.')); }}/>
      </div>
    </>}
    {open && <section data-lenis-prevent aria-label="Conexão Spotify" className="absolute left-0 top-full z-50 mt-2 max-h-[65vh] w-[350px] max-w-[90vw] overflow-y-auto overscroll-contain rounded-xl border border-slate-600 bg-slate-950 p-4 shadow-2xl">
      <div className="mb-3 flex justify-between"><h2 className="font-semibold">Spotify no Dashboard TV</h2><button type="button" aria-label="Fechar configurações Spotify" onClick={() => setOpen(false)}><X className="h-4 w-4"/></button></div>
      {error && <p role="alert" className="mb-3 text-amber-300">{error}</p>}
      {!connected ? <>
        <p className="mb-2 text-slate-300">Na primeira conexão, crie um aplicativo no <a className="text-emerald-400 underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developers</a>, habilite Web API e Web Playback SDK e cadastre este Redirect URI:</p>
        <p className="mb-2 break-all rounded bg-slate-800 p-2 text-[11px] select-text">{redirect}</p>
        <p className="mb-3 text-slate-400">Em modo de desenvolvimento, adicione a conta que vai tocar música à lista de usuários autorizados do aplicativo.</p>
        <p className="mb-3 text-slate-300">Para trocar de conta, saia da conta atual no <a className="text-emerald-400 underline" href="https://accounts.spotify.com/" target="_blank" rel="noreferrer">Spotify</a> e conecte novamente com a conta Premium. Mantenha o mesmo Client ID e autorize a nova conta na lista de usuários do aplicativo.</p>
        <label htmlFor="spotify-tv-client">Client ID</label><input id="spotify-tv-client" value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2" placeholder="Client ID do aplicativo" autoComplete="off"/>
        <button type="button" disabled={busy} onClick={connect} className="mt-3 rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50">{busy ? 'Conectando…' : 'Conectar Spotify'}</button>
        <p className="mt-2 text-[10px] text-slate-400">O login acontece no Spotify. A autorização fica somente nesta aba; sua senha não passa pelo dashboard.</p>
      </> : <>
        <p className="mb-3 text-slate-300">O som sai pelo aparelho onde este dashboard está aberto. Se você espelha o PC na TV, selecione a TV como saída de áudio do computador.</p>
        <p className="mb-3 text-slate-400">Sem link, o botão continua a música atual do Spotify neste aparelho. Você também pode escolher outra playlist, álbum ou música pelo link.</p>
        <label htmlFor="spotify-tv-link">Link do Spotify (opcional)</label><input id="spotify-tv-link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://open.spotify.com/playlist/…" className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2"/>
        <button type="button" disabled={!device || busy} className="mt-3 rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50" onClick={() => { activate(); void run(async () => { if (!link.trim()) { await api('/me/player', { device_ids: [device], play: true }); return; } const context = spotifyContext(link); if (!context) throw new Error('Cole um link válido de playlist, álbum ou música do Spotify.'); await api('/me/player/play?device_id=' + encodeURIComponent(device), context.type === 'track' ? { uris: [context.uri] } : { context_uri: context.uri }); }); }}>Tocar neste aparelho</button>
        <div className="mt-3 flex gap-4"><button type="button" className="text-slate-300 underline" onClick={disconnect}>Trocar conta</button><button type="button" className="text-slate-400 underline" onClick={disconnect}>Desconectar</button></div>
      </>}
    </section>}
  </div>;
}
