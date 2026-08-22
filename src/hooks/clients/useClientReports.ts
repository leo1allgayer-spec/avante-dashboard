import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";

export interface ClientReport {
  id: string;
  client_id: string;
  report_date: string;
  title: string;
  description: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export function useClientReports(clientId: string) {
  const qc = useQueryClient();
  const queryKey = ["client-reports", clientId];
  const reports = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("client_reports").select("*").eq("client_id", clientId).order("report_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClientReport[];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ file, title, description, reportDate }: { file: File; title: string; description: string; reportDate: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Usuário não autenticado");
      if (file.size > 15 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 15 MB");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${auth.user.id}/${clientId}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await supabase.storage.from("client-reports").upload(path, file, { contentType: file.type, upsert: false });
      if (storageError) throw storageError;
      const { error } = await (supabase as any).from("client_reports").insert({ uploaded_by: auth.user.id, client_id: clientId, report_date: reportDate, title: title.trim() || file.name, description: description.trim(), file_name: file.name, file_path: path, mime_type: file.type, file_size: file.size });
      if (error) {
        await supabase.storage.from("client-reports").remove([path]);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (report: ClientReport) => {
      const { error } = await (supabase as any).from("client_reports").delete().eq("id", report.id);
      if (error) throw error;
      await supabase.storage.from("client-reports").remove([report.file_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const download = async (report: ClientReport) => {
    const { data, error } = await supabase.storage.from("client-reports").createSignedUrl(report.file_path, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return { reports: reports.data || [], loading: reports.isLoading, upload, remove, download };
}
