// One course identity and visible name across sales, booking, agendas and surveys.
// Financial category names and public slugs are kept for compatibility.
export const COURSE_CATALOG=[
 {id:'meta_ads',name:'Curso Meta Ads',slug:'meta-ads',financialName:'Curso de Meta Ads',subtitle:'Facebook e Instagram',aliases:['Curso de Meta Ads','Meta Ads','Curso Tráfego Pago Meta Ads','Curso de Tráfego Pago Meta Ads']},
 {id:'meta_ads_advanced',name:'Curso Meta Ads Avançado',slug:'gestor-pro',financialName:'Curso Meta Ads Avançado',subtitle:'Facebook e Instagram',aliases:['Curso de Meta Ads Avançado','Meta Ads Avançado','Gestor PRO','Gestor PRO+','Curso de Tráfego Gestor PRO','Curso de Tráfego Gestor PRO+']},
 {id:'meta_ads_online',name:'Curso Meta Ads Online',slug:'meta-ads-online',financialName:'Curso Meta Ads Online',subtitle:'Facebook e Instagram · Online',aliases:['Curso de Meta Ads Online','Meta Ads Online','Curso Tráfego Pago Meta Ads Online']},
 {id:'google',name:'Curso Google Ads',slug:'google-ads',financialName:'Curso Google Ads',aliases:['Curso de Google Ads','Google Ads','Curso Tráfego Pago Google Ads','Curso de Tráfego Pago Google Ads']},
 {id:'social_media',name:'Curso Social Media',slug:'social-media',financialName:'Curso de Social Midia',aliases:['Curso de Social Media','Curso de Social Midia','Curso Social Midia','Social Media','Social Midia']},
 {id:'canva',name:'Curso Canva',slug:'canva',financialName:'Curso Canva para Empreendedores',aliases:['Curso de Canva','Curso Canva para Empreendedores','Curso de Canva para Empreendedores','Canva']},
 {id:'ia',name:'Curso Inteligência Artificial',slug:'ia',financialName:'Curso de IA',aliases:['Curso de Inteligência Artificial','Curso de IA','Curso IA','Inteligência Artificial','IA']},
 {id:'video',name:'Curso Captação e Edição de Vídeo',slug:'captacao-edicao-video',financialName:'Curso Captacao/Edicao',aliases:['Curso de Captação e Edição de Vídeo','Curso Captacao/Edicao','Curso Captacao Edicao','Curso Captacao/Edicao de Conteudo','Curso de Edição e Captação de Vídeos','Curso Edição e Captação de Vídeos','Captação e Edição de Vídeo','Captação/Edição']},
 {id:'tiktok',name:'Curso TikTok Ads',slug:null,financialName:'Curso de TikTok Ads',aliases:['Curso de TikTok Ads','TikTok Ads']},
 {id:'youtube',name:'Curso YouTube Ads',slug:null,financialName:'Curso de YouTube Ads',aliases:['Curso de YouTube Ads','YouTube Ads']},
] as const;
export type CourseId=typeof COURSE_CATALOG[number]['id'];
export const normalizeCourseAlias=(value?:string|null)=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function findCourse(value?:string|null){
 const key=normalizeCourseAlias(value);if(!key)return undefined;
 return COURSE_CATALOG.find(course=>normalizeCourseAlias(course.id)===key||[course.name,course.financialName,...course.aliases].some(alias=>normalizeCourseAlias(alias)===key));
}
export function courseDisplayName(value?:string|null){return findCourse(value)?.name||(value||'').trim();}
// Bare "Social Media" in a sale is a service, not automatically a course.
export function saleCourseDisplayName(value?:string|null){
 const course=findCourse(value);
 return course&&!(course.id==='social_media'&&!normalizeCourseAlias(value).startsWith('curso '))?course.name:(value||'').trim();
}
export function saleCourseFinancialName(value?:string|null){
 const course=findCourse(value);
 return course&&!(course.id==='social_media'&&!normalizeCourseAlias(value).startsWith('curso '))?course.financialName:(value||'').trim();
}
export const BOOKABLE_COURSES=COURSE_CATALOG.filter(course=>course.slug!==null);
export const COURSE_NAMES_BY_TYPE=Object.fromEntries(COURSE_CATALOG.map(course=>[course.id,course.name])) as Record<CourseId,string>;
