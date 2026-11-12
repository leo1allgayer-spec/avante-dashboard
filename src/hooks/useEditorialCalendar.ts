import { isSocialOperationUser } from "@/lib/accessControl";
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { isEditorialPrimary } from '@/lib/editorialPermissions';
import { EditorialClient, EditorialEntry, EditorialItem, EditorialFolder, EditorialDayNote, editorialItems } from '@/lib/editorialCalendar';

// Editorial planning is independent of operational agendas.
const db = supabase as any;
async function allRows(table: string, columns = '*') {
  const result: any[] = [];
  for (let start = 0; ; start += 1000) {
    let query = db.from(table).select(columns).order('id').range(start, start + 999);
    if (table === 'editorial_entries') query = query.is('source_meeting_id', null);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
export function useEditorialCalendar() {
  const { session } = useAuth();
  const canManageAll = isEditorialPrimary(session?.user.email);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['editorial-calendar', session?.user.id], enabled: !!session,
    refetchInterval: 30000, refetchOnWindowFocus: 'always',
    queryFn: async () => {
      const [entries, clients, folders, notes] = await Promise.all([
        allRows('editorial_entries'),
        isSocialOperationUser(session?.user.email) ? db.rpc('list_social_operation_clients').then(({data,error}:any)=>{if(error) throw error; return data;}) : allRows('gestao_clients', 'id,name,company'),
        allRows('editorial_folders'),
        allRows('editorial_day_notes'),
      ]);
      return { items: editorialItems(entries as EditorialEntry[]), clients: clients as EditorialClient[], folders: folders as EditorialFolder[], notes: notes as EditorialDayNote[] };
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ item, patch, remove }: { item: EditorialItem; patch?: Partial<EditorialEntry>; remove?: boolean }) => {
      if (!session || (!canManageAll && item.user_id && item.user_id !== session.user.id)) throw new Error('Somente o responsável ou o acesso principal pode editar este conteúdo.');
      if (remove) {
        if (isSocialOperationUser(session.user.email) && item.user_id && item.user_id !== session.user.id) throw new Error('Somente o autor pode excluir este conteúdo.');
        const { error, data } = await db.from('editorial_entries').delete().eq('id', item.id).select('id').single();
        if (error || !data) throw error || new Error('Não foi possível excluir.');
        return;
      }
      const { id, ...fields } = item;
      const { id: ignoredId, user_id: ignoredUser, source_meeting_id: ignoredSource, ...changes } = patch || {};
      let request;
      if (!id) request = db.from('editorial_entries').insert({ ...fields, ...changes, source_meeting_id: null, user_id: session.user.id });
      else request = db.from('editorial_entries').update(changes).eq('id', id);
      let { error, data } = await request.select('id').single();
      if (error || !data) throw error || new Error('Não foi possível salvar.');
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['editorial-calendar'] }); },
    onError: (error: Error) => toast.error(error.message || 'Não foi possível salvar. Tente novamente.'),
  });
  const folderMutation = useMutation({
    mutationFn: async ({ name, client_id }: { name: string; client_id: string | null }) => {
      if (!session) throw new Error('Entre novamente para continuar.');
      const { data, error } = await db.from('editorial_folders').insert({ name: name.trim(), client_id, user_id: session.user.id }).select('*').single();
      if (error) throw new Error(error.code === '23505' ? 'Este cliente já está no Calendário Editorial.' : 'Não foi possível adicionar o cliente.');
      return data as EditorialFolder;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['editorial-calendar'] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const saveNote = async (folder_id: string, date: string, body: string, category: string) => {
    if (!session) throw new Error('Sessão expirada.');
    const previous = query.data?.notes.find(n => n.folder_id === folder_id && n.date === date);
    const payload = { folder_id, date, body, category };
    const request = previous ? db.from('editorial_day_notes').update(payload).eq('id', previous.id)
      : db.from('editorial_day_notes').upsert({ ...payload, user_id: session.user.id }, { onConflict: 'folder_id,date' });
    const { error } = await request.select('id').single();
    if (error) throw new Error('Não foi possível salvar esta anotação.');
    await qc.invalidateQueries({ queryKey: ['editorial-calendar'] });
  };
  return { ...query, items: query.data?.items || [], clients: query.data?.clients || [], folders: query.data?.folders || [], notes: query.data?.notes || [], userId: session?.user.id,
    canManageAll, addFolder: folderMutation.mutateAsync, addingFolder: folderMutation.isPending, saveNote,
    saving: mutation.isPending, save: (item: EditorialItem, patch: Partial<EditorialEntry>) => mutation.mutateAsync({ item, patch }),
    remove: (item: EditorialItem) => mutation.mutateAsync({ item, remove: true }) };
}
