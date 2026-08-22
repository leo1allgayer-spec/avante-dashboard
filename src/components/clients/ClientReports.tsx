import { useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useClientReports } from "@/hooks/clients/useClientReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function ClientReports({ clientId }: { clientId: string }) {
  const { reports, loading, upload, remove, download } = useClientReports(clientId);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportDate, setReportDate] = useState(today());

  const submit = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({ file, title, description, reportDate });
      setFile(null); setTitle(""); setDescription("");
      const input = document.getElementById("client-report-file") as HTMLInputElement | null;
      if (input) input.value = "";
      toast({ title: "Relatório armazenado" });
    } catch (error: any) {
      toast({ title: "Erro ao armazenar relatório", description: error.message, variant: "destructive" });
    }
  };

  return <div className="space-y-5">
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Adicionar relatório</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <div><Label>Data do relatório</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Relatório mensal de agosto" /></div>
        <div className="md:col-span-3"><Label>Observação</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Resumo ou observações do relatório" /></div>
        <div className="md:col-span-2"><Label>Arquivo (máx. 15 MB)</Label><Input id="client-report-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        <div className="flex items-end"><Button className="w-full gap-2" disabled={!file || upload.isPending} onClick={() => void submit()}>{upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Armazenar relatório</Button></div>
      </div>
    </div>
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4"><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico de relatórios</h3></div>
      {loading ? <div className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : reports.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum relatório armazenado.</div> : <div className="divide-y divide-border">{reports.map((report) => <div key={report.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><FileText className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-semibold">{report.title}</p><p className="text-xs text-muted-foreground">{new Date(`${report.report_date}T12:00:00`).toLocaleDateString("pt-BR")} · {report.file_name} · {formatSize(report.file_size)}</p>{report.description && <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>}</div><div className="flex gap-1"><Button size="icon" variant="outline" title="Abrir relatório" onClick={() => void download(report)}><Download className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" title="Excluir relatório" disabled={remove.isPending} onClick={() => void remove.mutateAsync(report)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}
    </div>
  </div>;
}
