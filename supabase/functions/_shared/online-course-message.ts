export function onlineCourseMessage(text: string) {
 const content=text.replace(/(?:📍\s*)?Endere[cç]o\s*:[^\r\n]*/gi,'').replace(/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[^\s]+/gi,'').trim();
 return `${content}\n\n💻 Modalidade: online. A equipe enviará as orientações de acesso.`;
}
