export async function clientNoteIntakeLink(db:any, origin:string, sourceToken:string|undefined, save:()=>Promise<string|false>) {
 if(sourceToken)return `${origin}/cadastro-notas-cliente?token=${encodeURIComponent(sourceToken)}`;
 const id=await save();
 if(!id)throw new Error('Salve a ficha para gerar o link do cliente.');
 const {data,error}=await db.from('client_contract_notes').select('form_token').eq('id',id).single();
 if(error||!data?.form_token)throw new Error('Não foi possível gerar o link individual. A ficha foi salva; tente novamente.');
 return `${origin}/cadastro-notas-cliente?ficha=${encodeURIComponent(data.form_token)}`;
}
