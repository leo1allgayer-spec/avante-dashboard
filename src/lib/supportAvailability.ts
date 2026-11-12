export const SUPPORT_WEEKDAYS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
export function supportTimeRange(first:string,last:string,interval:number){
 const minutes=(time:string)=>{if(!/^\d{2}:\d{2}$/.test(time))throw new Error('Informe horários válidos.');const [h,m]=time.split(':').map(Number);if(h>23||m>59)throw new Error('Informe horários válidos.');return h*60+m;};
 const start=minutes(first),end=minutes(last);
 if(start>end)throw new Error('O último início deve ser igual ou posterior ao primeiro.');
 if(!Number.isInteger(interval)||interval<15||interval>240)throw new Error('Escolha um intervalo entre 15 e 240 minutos.');
 const slots:string[]=[];
 for(let n=start;n<=end;n+=interval)slots.push(String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'));
 return slots;
}
export function supportCapacity(value:string|number){const n=Number(value);if(!Number.isInteger(n)||n<1||n>50)throw new Error('As vagas devem ser um número inteiro entre 1 e 50.');return n;}
export function supportPeriod(time:string){return time<'12:00'?'Manhã':time<'18:00'?'Tarde':'Noite';}
