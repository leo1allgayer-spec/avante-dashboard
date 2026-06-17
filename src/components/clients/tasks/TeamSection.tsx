import { useState } from "react";
import { TeamMember } from "@/types/clients/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, UserPlus } from "lucide-react";

interface Props {
  members: TeamMember[];
  onAdd: (name: string) => void;
  onUpdate: (member: TeamMember) => void;
  onDelete: (id: string) => void;
}

export function TeamSection({ members, onAdd, onUpdate, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Record<string, TeamMember>>({});

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  };

  const startEdit = (m: TeamMember) => {
    setEditing((prev) => ({ ...prev, [m.id]: { ...m } }));
  };

  const saveEdit = (id: string) => {
    if (editing[id]) {
      onUpdate(editing[id]);
      setEditing((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do novo membro"
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <UserPlus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => {
          const isEditing = !!editing[m.id];
          const current = editing[m.id] || m;
          return (
            <Card key={m.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <Input
                      value={current.name}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [m.id]: { ...current, name: e.target.value },
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="font-medium">{m.name}</span>
                  )}
                  <div className="flex gap-1">
                    {isEditing ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(m.id)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(m)}>
                        Editar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Meta diária</Label>
                        <Input
                          type="number"
                          value={current.dailyTaskGoal}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [m.id]: { ...current, dailyTaskGoal: parseInt(e.target.value) || 0 },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Meta semanal</Label>
                        <Input
                          type="number"
                          value={current.weeklyTaskGoal}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [m.id]: { ...current, weeklyTaskGoal: parseInt(e.target.value) || 0 },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Max min/tarefa</Label>
                        <Input
                          type="number"
                          value={current.maxTaskMinutes}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [m.id]: { ...current, maxTaskMinutes: parseInt(e.target.value) || 0 },
                            }))
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Meta: {m.dailyTaskGoal}/dia</span>
                    <span>{m.weeklyTaskGoal}/sem</span>
                    <span>Max: {m.maxTaskMinutes}min</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Adicione os membros da sua equipe acima</p>
      )}
    </div>
  );
}
