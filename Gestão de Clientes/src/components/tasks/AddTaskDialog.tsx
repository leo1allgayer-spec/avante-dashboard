import { useState } from "react";
import { Task, TeamMember } from "@/types/task";
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
  onAdd: (task: Omit<Task, "id" | "createdAt" | "startedAt" | "completedAt" | "userId">) => void;
  members: TeamMember[];
}

export function AddTaskDialog({ open, onClose, onAdd, members }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"Baixa" | "Média" | "Alta">("Média");
  const [isDaily, setIsDaily] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description,
      assigneeId: assigneeId || null,
      dueDate,
      priority,
      status: "Pendente",
      isDaily,
    });
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setPriority("Média");
    setIsDaily(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>Criar Tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
