import { expect, it } from 'vitest';
import { groupNavigationItems,metricsItems,gestaoItems,metaItems } from './dashboardNavigation';
it('groups every existing route exactly once',()=>{
 const all=[...metricsItems,...gestaoItems,...metaItems];
 const urls=groupNavigationItems(all).flatMap(g=>g.items.map(i=>i.url));
 expect(new Set(urls).size).toBe(urls.length);expect([...urls].sort()).toEqual(all.map(i=>i.url).sort());
});
it('never adds routes that were not allowed for the user',()=>{
 const allowed=gestaoItems.filter(i=>['/tasks','/gestor-tarefas'].includes(i.url));
 expect(groupNavigationItems(allowed).flatMap(g=>g.items)).toEqual(expect.arrayContaining(allowed));
 expect(groupNavigationItems(allowed).flatMap(g=>g.items)).toHaveLength(allowed.length);
 expect(groupNavigationItems([])).toEqual([]);
});
