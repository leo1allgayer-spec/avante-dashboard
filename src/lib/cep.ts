export function formatCep(value:string){const digits=value.replace(/\D/g,'').slice(0,8);return digits.length>5?digits.slice(0,5)+'-'+digits.slice(5):digits;}
export const validCep=(value:string)=>value.replace(/\D/g,'').length===8;
