// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { NavigationFavicon } from './NavigationFavicon';
afterEach(()=>{cleanup();document.head.querySelectorAll('link').forEach(link=>link.remove());});
function Navigate(){const go=useNavigate();return <><button onClick={()=>go('/vendas')}>Vendas</button><button onClick={()=>go('/auth')}>Login</button><button onClick={()=>go(-1)}>Voltar</button></>;}
it('updates browser icons and title together, including history navigation and fallback',()=>{
 document.head.innerHTML='<link rel="icon" href="/favicon.svg"><link rel="alternate icon" href="/favicon.png">';
 const view=render(<MemoryRouter initialEntries={['/dashboard-tv']}><NavigationFavicon/><Navigate/></MemoryRouter>);
 expect(document.title).toBe('Dashboard TV · Avante Dashboard');
 expect(document.querySelector('link[rel=icon]')?.getAttribute('href')).toBe('/favicons/monitor.svg');
 fireEvent.click(view.getByText('Vendas'));
 expect(document.title).toBe('Vendas · Avante Dashboard');
 expect(document.querySelector('link[rel="alternate icon"]')?.getAttribute('href')).toBe('/favicons/shoppingcart.svg');
 fireEvent.click(view.getByText('Login'));
 expect(document.querySelector('link[rel=icon]')?.getAttribute('href')).toBe('/favicon.svg');
 fireEvent.click(view.getByText('Voltar'));
 expect(document.title).toBe('Vendas · Avante Dashboard');
});
