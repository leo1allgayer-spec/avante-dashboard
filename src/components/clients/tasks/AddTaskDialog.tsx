import {TaskFilePicker} from "./TaskFilePicker";
import { useState } from "react";
import { Task, TeamMember } from "@/types/clients/task";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "createdAt" | "startedAt" | "completedAt" | "userId">, files?: File[]) => void | Promise<unknown>;
  members: TeamMember[];
}

export function AddTaskDialog({ open, onClose, onAdd, members }: Props) {
  const [files,setFiles]=useState<File[]>([]);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"Baixa" | "Média" | "Alta">("Média");
  const [isDaily, setIsDaily] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);setError("");
    try { await onAdd({
      title: title.trim(),
      description,
      assigneeId: assigneeId || null,
      dueDate,
      priority,
      status: "Pendente",
      isDaily,
    },files);
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setPriority("Média");
    setIsDaily(false);
    setFiles([]);onClose();
    }catch(error){setError(error instanceof Error?error.message:"Não foi possível salvar a tarefa.");}finally{setSaving(false);}
  };

  return (
    <Dialog open={open} onOpenChange={()=>{if(!saving)onClose();}}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da tarefa *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Criar relatório mensal" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={3} />
          </div>
          <TaskFilePicker files={files} onChange={setFiles} disabled={saving}/>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}{!m.phone ? " · WhatsApp não cadastrado" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="Média">🟡 Média</SelectItem>
                  <SelectItem value="Alta">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Data de entrega</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isDaily} onCheckedChange={setIsDaily} />
            <Label>Tarefa fixa diária</Label>
          </div>
        </div>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()||saving}>{saving?"Salvando tarefa e anexos…":"Criar Tarefa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
