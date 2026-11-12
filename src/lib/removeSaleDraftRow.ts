export function removeSaleDraftRow<T,R>(items:T[],records:R[],index:number) {
 if(items.length<2||index<0||index>=items.length)throw new Error('Mantenha pelo menos um item na venda.');
 return {items:items.filter((_,i)=>i!==index),records:records.filter((_,i)=>i!==index),removed:records[index]};
}
