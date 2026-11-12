import {createContext,useContext,useState,type ReactNode} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';

type Visibility={hidden:Set<string>;toggle:(id:string)=>void;reset:()=>void};
const Context=createContext<Visibility|null>(null);
function Store({userId,children}:{userId:string;children:ReactNode}){
 const storageKey='avante-tv-hidden-v1-'+userId;
 const [hidden,setHidden]=useState<Set<string>>(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');return new Set(Array.isArray(saved)?saved.filter(v=>typeof v==='string'):[]);}catch{return new Set();}});
 const persist=(next:Set<string>)=>{setHidden(next);try{localStorage.setItem(storageKey,JSON.stringify([...next]));}catch{/* Keep the current screen usable when browser storage is unavailable. */}};
 return <Context.Provider value={{hidden,toggle:id=>{const next=new Set(hidden);if(next.has(id))next.delete(id);else next.add(id);persist(next);},reset:()=>persist(new Set())}}>{children}</Context.Provider>;
}
export function TVVisibilityProvider({children}:{children:ReactNode}){const {session}=useAuth();const id=session?.user.id||'local';return <Store key={id} userId={id}>{children}</Store>;}
function useVisibility(){const value=useContext(Context);if(!value)throw new Error('TV visibility provider missing');return value;}
export function TVHideButton({id,label}:{id:string;label:string}){
 const {hidden,toggle}=useVisibility(),isHidden=hidden.has(id),text=(isHidden?'Mostrar ':'Ocultar ')+label;
 return <button type="button" aria-label={text} title={text} aria-pressed={isHidden} onClick={()=>toggle(id)} className="inline-flex shrink-0 items-center justify-center rounded p-1 align-middle text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">{isHidden?<EyeOff className="h-3 w-3"/>:<Eye className="h-3 w-3"/>}</button>;
}
export function TVSecret({id,children,inline=false}:{id:string;children:ReactNode;inline?:boolean}){
 const {hidden}=useVisibility();
 if(!hidden.has(id))return <>{children}</>;
 return inline?<span aria-label="Informação oculta" className="tracking-widest text-slate-500">••••</span>:<div aria-label="Informação oculta" className="flex min-h-8 flex-1 items-center justify-center text-xl tracking-[0.25em] text-slate-500">••••</div>;
}
export function TVRestoreButton(){const {hidden,reset}=useVisibility();return hidden.size>0?<button type="button" onClick={reset} className="mt-2 inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[10px] normal-case tracking-normal text-slate-300 hover:bg-slate-800"><Eye className="h-3 w-3"/>Mostrar tudo ({hidden.size})</button>:null;}
