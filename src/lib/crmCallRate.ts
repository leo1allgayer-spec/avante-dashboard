export function answeredCallRate(calls?:number|null, answered?:number|null) {
 if (calls == null || answered == null || calls <= 0) return '—';
 return (answered / calls * 100).toLocaleString('pt-BR',{maximumFractionDigits:1}) + '%';
}
