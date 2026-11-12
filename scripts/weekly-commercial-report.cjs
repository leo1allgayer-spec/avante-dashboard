const fs=require('fs'),cp=require('child_process'),path=require('path'),esbuild=require('esbuild');
(async()=>{
 delete process.env.SUPABASE_ACCESS_TOKEN;
 const keys=JSON.parse(cp.execFileSync('npx.cmd',['supabase','projects','api-keys','--project-ref','ohhgmoivhgkdxakrrutg','--reveal','-o','json'],{encoding:'utf8',shell:true,stdio:['ignore','pipe','pipe']}));
 const key=keys.find(k=>k.name==='service_role').api_key,base='https://ohhgmoivhgkdxakrrutg.supabase.co',headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const invoke=async(name,body,required=false)=>{try{const r=await fetch(base+'/functions/v1/'+name,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(110000)});const v=await r.json();if(!r.ok||v.error)throw Error(v.error||name+' unavailable');return v;}catch(e){if(required)throw e;return null;}};
 const groups=(process.argv.includes('--groups')||process.argv.includes('--send'))?await invoke('weekly-commercial-report',{action:'groups'},true):{groups:[]};
 if(process.argv.includes('--groups')){console.log(JSON.stringify(groups));return;}
 const shift=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
 const day=new Date(today+'T12:00:00Z').getUTCDay();
 const monday=shift(today,-((day+6)%7));
 const since=process.argv.find(a=>a.startsWith('--since='))?.split('=')[1]||shift(monday,-7),until=shift(since,6);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(since)||new Date(since+'T12:00:00Z').getUTCDay()!==1||until>=today)throw Error('Use a complete Monday-Sunday week');
 const data={};
 for(const table of ['vendas','fechamentos_diarios','meetings','criativos_vendas']){
  data[table]=[];for(let offset=0;;offset+=1000){const r=await fetch(base+'/rest/v1/'+table+'?select=*&order=id&limit=1000&offset='+offset,{headers});if(!r.ok)throw Error('Required data unavailable: '+table);const rows=await r.json();data[table].push(...rows);if(rows.length<1000)break;}
 }
 esbuild.buildSync({entryPoints:['scripts/weekly-commercial-core.ts'],outfile:'tmp/weekly-commercial-core.cjs',bundle:true,platform:'node',format:'cjs'});
 const {weeklyMetrics,weeklyMessage}=require(path.resolve('tmp/weekly-commercial-core.cjs'));
 const reports=[];
 for(const start of [since,shift(since,-7)]){
  const end=shift(start,6);
  const results=await Promise.allSettled([invoke('meta-ads',{datePreset:'custom',since:start,until:end}),invoke('crm-mql',{since:start,until:end}),invoke('meta-ads',{action:'creative_performance',datePreset:'custom',since:start,until:end})]);
  const [ads,mql,creatives]=results.map(r=>r.status==='fulfilled'?r.value:null);
  reports.push(weeklyMetrics(data,start,end,ads,mql,creatives));
 }
 const text=weeklyMessage(reports[0],reports[1]),folder='output/weekly-commercial/'+since;fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/report.txt',text);fs.writeFileSync(folder+'/metrics.json',JSON.stringify(reports,null,2));
 console.log(text);
 if(process.argv.includes('--send')){
  const config=JSON.parse(fs.readFileSync('scripts/weekly-commercial-destination.json','utf8'));
  const destination=groups.groups.find(g=>g.id===config.groupId&&g.channel===config.channel);
  if(!destination)throw Error('Authorized destination group not found; no message sent');
  const sent=await invoke('weekly-commercial-report',{action:'send',groupId:destination.id,channel:destination.channel,since,until,text},true);
  fs.writeFileSync(folder+'/delivery.json',JSON.stringify({since,until,...sent}));console.log(JSON.stringify({delivery:sent}));if(!sent.success)process.exitCode=1;
 }
})().catch(e=>{console.error(e.message||'Weekly report failed');process.exitCode=1;});

