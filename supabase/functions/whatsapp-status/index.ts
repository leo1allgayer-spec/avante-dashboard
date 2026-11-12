// Read-only operational check. Never sends a WhatsApp message or reconnects an instance.
Deno.serve(async (req) => {
  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Verify access through PostgREST, including projects with rotated API keys.
  // This private table explicitly revokes access from anon/authenticated roles.
  const access = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/whatsapp_dispatch_attempts?select=dispatch_key&limit=0`, {
    headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: authorization },
    signal: AbortSignal.timeout(8000),
  });
  await access.text();
  if (!access.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const channels = await Promise.all(['primary', 'backup'].map(async channel => {
    const prefix = channel === 'primary' ? 'EVOLUTION_' : 'EVOLUTION_BACKUP_';
    const rawUrl = Deno.env.get(prefix + 'API_URL');
    const instance = Deno.env.get(prefix + 'INSTANCE_NAME');
    const token = Deno.env.get(prefix + 'API_TOKEN');
    if (!rawUrl || !instance || !token) return { channel, configured: false };
    const url = rawUrl.trim().replace(/\/+$/, '').replace(/\/manager$/i, '');
    const options = () => ({ headers: { apikey: token }, signal: AbortSignal.timeout(8000) });
    try {
      const response = await fetch(`${url}/instance/connectionState/${encodeURIComponent(instance)}`, options());
      const state = await response.json().catch(() => ({}));
      const listResponse = await fetch(`${url}/instance/fetchInstances`, options());
      const list = await listResponse.json().catch(() => []);
      const match = Array.isArray(list) && list.find(i => [i.name, i.profileName, i.instance?.instanceName]
        .some(n => String(n || '').toLowerCase() === instance.toLowerCase()));
      const owner = String(match?.ownerJid || match?.instance?.owner || match?.owner || '').split('@')[0].replace(/\D/g, '');
      return { channel, configured: true, instance, host: new URL(url).hostname, httpStatus: response.status,
        state: state?.instance?.state ?? state?.state ?? match?.connectionStatus ?? null,
        numberEnding: owner ? owner.slice(-4) : null,
        matchedInstance: match?.name || match?.instance?.instanceName || null };
    } catch {
      return { channel, configured: true, instance, state: 'unreachable' };
    }
  }));
  return Response.json({ channels });
});
