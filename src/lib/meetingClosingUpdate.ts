import type {Meeting} from '@/types/clients/task';
export function isMeetingClosingOnlyUpdate(before:Meeting|undefined,after:Meeting){
 if(!before)return false;
 const withoutClosing=(meeting:Meeting)=>Object.fromEntries(Object.entries(meeting).filter(([key])=>!['closingStatus','hasClosed','objection'].includes(key)));
 return JSON.stringify(withoutClosing(before))===JSON.stringify(withoutClosing(after));
}
