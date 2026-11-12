const SELLERS = [
  {id:'826c0859-b246-43b7-9268-02b5cc38e777',name:'Lucas'},
  {id:'810891e4-e8cd-4987-8222-6280fbdeb155',name:'Allgayer'},
];
export function selectedCallTotals(payload: any) {
  if (!Array.isArray(payload?.data)) throw new Error('Resposta de ligações inválida');
  return SELLERS.map(seller => {
    const row = payload.data.find((item:any) => item.user_id === seller.id);
    if (!row) throw new Error(`CRM não retornou ${seller.name}`);
    const calls = Number(row.attempts ?? row.calls);
    if (!Number.isInteger(calls) || calls < 0) throw new Error('Quantidade de ligações inválida');
    const metric = (value:unknown) => value === undefined || value === null ? null : Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
    const answered = metric(row.answered);
    const notAnswered = metric(row.not_answered);
    const people = metric(row.unique_people ?? row.unique_leads ?? row.leads_contacted ?? row.leads_count ?? row.leads);
    const apiRatio = row.attempts_per_person;
    const attemptsPerPerson = apiRatio !== undefined && apiRatio !== null && apiRatio !== '' && Number.isFinite(Number(apiRatio)) && Number(apiRatio) >= 0
      ? Number(apiRatio)
      : people === null ? null : people > 0 ? calls / people : 0;
    return { ...seller, calls, answered, notAnswered, people, attemptsPerPerson, availableMetrics: Object.keys(row) };
  });
}
