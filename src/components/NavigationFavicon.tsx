import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metricsItems, gestaoItems, metaItems } from '@/constants/dashboardNavigation';

const items=[...metricsItems,...gestaoItems,...metaItems];
export function NavigationFavicon(){
 const {pathname}=useLocation();
 useEffect(()=>{
  const page=items.find(item=>item.url===pathname);
  const href=page?`/favicons/${page.icon.displayName!.toLowerCase()}.svg`:'/favicon.svg';
  // Update both declarations so browsers do not retain the alternate PNG icon.
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="alternate icon"]').forEach(link=>{link.type='image/svg+xml';link.href=href;});
  document.title=page?`${page.title} · Avante Dashboard`:'Avante Dashboard';
 },[pathname]);
 return null;
}
