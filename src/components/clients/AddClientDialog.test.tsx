// @vitest-environment jsdom
import React from 'react';
import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { AddClientDialog } from './AddClientDialog';
afterEach(cleanup);
it('prefills client identity while preserving reviewed contract values during parent refresh',async()=>{
 const add=vi.fn().mockResolvedValue(undefined),close=vi.fn();
 const initial={name:'Carla',company:'Carla Ltda',email:'carla@example.com',phone:'555100000000'};
 const view=render(<AddClientDialog open onClose={close} onAdd={add} initialClient={initial}/>);
 fireEvent.change(screen.getByPlaceholderText('Valor mensal'),{target:{value:'1500'}});
 view.rerender(<AddClientDialog open onClose={close} onAdd={add} initialClient={{...initial,name:'Atualização do cadastro'}}/>);
 expect((screen.getByPlaceholderText('Nome do cliente *') as HTMLInputElement).value).toBe('Carla');
 fireEvent.click(screen.getByRole('button',{name:'Adicionar Cliente'}));
 await waitFor(()=>expect(add).toHaveBeenCalledTimes(1));
 expect(add.mock.calls[0][0]).toMatchObject({name:'Carla',email:'carla@example.com',phone:'555100000000',contractValue:1500,monthlyContractValue:1500,paymentStatus:'a receber'});
 expect(close).toHaveBeenCalledTimes(1);
});
it('keeps the creation form open on linking failure',async()=>{
 const close=vi.fn();render(<AddClientDialog open onClose={close} onAdd={async()=>{throw new Error('Cliente já existe');}} initialClient={{name:'Carla'}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Adicionar Cliente'}));
 await screen.findByRole('alert');
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Cliente já existe'));
 expect(close).not.toHaveBeenCalled();
});
