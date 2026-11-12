// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {TVHideButton,TVRestoreButton,TVSecret,TVVisibilityProvider} from './TVVisibility';
const auth=vi.hoisted(()=>({id:'user-a'}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({session:{user:{id:auth.id}}})}));
const Demo=()=><TVVisibilityProvider><TVHideButton id="revenue" label="faturamento"/><TVSecret id="revenue"><strong>R$ 34.867</strong><span>Meta R$ 120.000</span></TVSecret><TVHideButton id="cost" label="CAC"/><TVSecret id="cost" inline>R$ 552</TVSecret><TVRestoreButton/></TVVisibilityProvider>;
beforeEach(()=>{localStorage.clear();auth.id='user-a';});
afterEach(cleanup);
it('unmounts the value and related details, preserves other indicators, and restores on click',()=>{
 render(<Demo/>);
 fireEvent.click(screen.getByRole('button',{name:'Ocultar faturamento'}));
 expect(screen.queryByText('R$ 34.867')).toBeNull();
 expect(screen.queryByText('Meta R$ 120.000')).toBeNull();
 expect(screen.getByText('R$ 552')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Mostrar faturamento'}));
 expect(screen.getByText('R$ 34.867')).toBeTruthy();
});
it('persists per user and can restore all hidden indicators',()=>{
 const view=render(<Demo/>);
 fireEvent.click(screen.getByRole('button',{name:'Ocultar faturamento'}));
 fireEvent.click(screen.getByRole('button',{name:'Ocultar CAC'}));
 view.unmount();render(<Demo/>);
 expect(screen.queryByText('R$ 34.867')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Mostrar tudo (2)'}));
 expect(screen.getByText('R$ 34.867')).toBeTruthy();expect(screen.getByText('R$ 552')).toBeTruthy();
});
it('isolates preferences between accounts and tolerates malformed storage',()=>{
 localStorage.setItem('avante-tv-hidden-v1-user-a','["revenue"]');
 const view=render(<Demo/>);expect(screen.queryByText('R$ 34.867')).toBeNull();
 auth.id='user-b';view.rerender(<Demo/>);expect(screen.getByText('R$ 34.867')).toBeTruthy();
 view.unmount();localStorage.setItem('avante-tv-hidden-v1-user-b','broken');render(<Demo/>);
 expect(screen.getByText('R$ 34.867')).toBeTruthy();
});
