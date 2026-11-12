import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { sendWhatsAppOnce } from '../_shared/whatsapp-dispatch.ts';
function whatsappChannel(channel: string) {
  const prefix = channel === "backup" ? "EVOLUTION_BACKUP_" : "EVOLUTION_";
  const url = Deno.env.get(prefix + "API_URL")?.trim().replace(/\/+$/, "").replace(/\/manager$/i, "");
  const instance = Deno.env.get(prefix + "INSTANCE_NAME"), token = Deno.env.get(prefix + "API_TOKEN");
  if (!url || !instance || !token) throw new Error("Canal WhatsApp não configurado.");
  return { url, instance, token };
}
async function whatsappRequest(channel: string, path: string, body?: object) {
  const config = whatsappChannel(channel);
  let instance = config.instance;
  let state = await fetch(`${config.url}/instance/connectionState/${encodeURIComponent(instance)}`, { headers: { apikey: config.token }, signal: AbortSignal.timeout(20000) });
  if (state.status === 404) {
    const response = await fetch(`${config.url}/instance/fetchInstances`, { headers: { apikey: config.token }, signal: AbortSignal.timeout(20000) });
    const instances = await response.json();
    const match = Array.isArray(instances) && instances.find(value => [value.name, value.profileName, value.instance?.instanceName].some(name => String(name || "").toLowerCase() === instance.toLowerCase()));
    if (!response.ok || !match) throw new Error("Instância WhatsApp não encontrada.");
    instance = match.name || match.instance.instanceName;
    state = await fetch(`${config.url}/instance/connectionState/${encodeURIComponent(instance)}`, { headers: { apikey: config.token }, signal: AbortSignal.timeout(20000) });
  }
  const connection = await state.json();
  if (!state.ok || String(connection?.instance?.state ?? connection?.state ?? "").toLowerCase() !== "open") throw new Error("Canal WhatsApp desconectado.");
  const response = await fetch(`${config.url}/${path}/${encodeURIComponent(instance)}${body ? "" : "?getParticipants=false"}`, {
    method: body ? "POST" : "GET", headers: { apikey: config.token, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok || data?.error) throw new Error("Não foi possível acessar o grupo no WhatsApp.");
  return data;
}

const groupName = 'TIME COMERCIAL AVANTE';
const normalize = (text:string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
Deno.serve(async req => {
 try {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return new Response('Unauthorized', {status:401});
  if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    const verifier = createClient(Deno.env.get('SUPABASE_URL')!, token);
    const { error } = await verifier.auth.admin.listUsers({ page:1, perPage:1 });
    if (error) return new Response('Unauthorized', {status:401});
  }
  const body = await req.json();
  const groups:any[] = [];
  const diagnostics:any[] = [];
  for(const channel of ['backup','primary']) {
   try {
    const rows=await whatsappRequest(channel,'group/fetchAllGroups');
    diagnostics.push({channel, count:Array.isArray(rows)?rows.length:null, candidates:(Array.isArray(rows)?rows:[]).filter(g=>normalize(String(g.subject||'')).includes('COMERCIAL')).map(g=>({id:g.id,name:g.subject}))});
    for(const group of Array.isArray(rows)?rows:[]) if(normalize(String(group.subject||''))===groupName) groups.push({id:group.id,name:group.subject,channel,members:group.size??group.participants?.length??null});
   } catch(error) { diagnostics.push({channel,error:error instanceof Error?error.message:'Indisponível'}); }
  }
  if(body.action==='groups') return Response.json({groups,diagnostics});
  const destination=groups.find(g=>g.id===body.groupId&&g.channel===body.channel);
  if(!destination||!/^[0-9-]+@g\.us$/.test(destination.id)) throw new Error('Grupo não encontrado no WhatsApp conectado');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(body.since)||!/^\d{4}-\d{2}-\d{2}$/.test(body.until)||typeof body.text!=='string'||body.text.length>15000||!body.text.startsWith('📊 *Relatório comercial semanal')) throw new Error('Relatório inválido');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const result=await sendWhatsAppOnce(db,destination.id,body.text,destination.channel==='backup'?'internal':'customer','weekly_commercial_report',`${body.since}:${body.until}`);
  if(!result.deduplicated)await db.from('whatsapp_message_logs').insert({booking_id:null,phone:destination.id,student_name:groupName,course_name:`Comercial ${body.since} a ${body.until}`,message_type:'weekly_commercial_report',message_text:body.text,status:result.accepted?'sent':'error',error_message:result.accepted?null:result.resultText,sent_at:result.accepted?new Date().toISOString():null});
  return Response.json({success:result.accepted,deduplicated:result.deduplicated,error:result.accepted?null:result.resultText});
 }catch(error){return Response.json({success:false,error:error instanceof Error?error.message:'Falha no relatório'},{status:400});}
});

