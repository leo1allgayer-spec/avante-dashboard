export function resolveCrmResponsible(team: any[], name: string): string | null {
  if (!name.trim()) return null;
  const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  const aliases:Record<string,string> = {'lucas pilger':'lucas','leonardo allgayer':'allgayer','nicolas patzlaff':'nicolas','ana':'ana carolina'};
  const wanted = aliases[normalize(name)] || normalize(name);
  const matches = team.filter(user => normalize(String(user.name || '')) === wanted);
  if (matches.length !== 1 || !matches[0].user_id) throw new Error(`Não foi possível identificar o responsável ${name} no CRM`);
  return matches[0].user_id;
}
