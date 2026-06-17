import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

interface Props {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  placeholder?: string;
  type?: string;
  className?: string;
  displayClassName?: string;
  renderDisplay?: (value: string) => React.ReactNode;
}

export function EditableCell({ value, onSave, placeholder, type = "text", className, displayClassName, renderDisplay }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    setEditing(false);
    if (draft !== value) await onSave(draft);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        className={`h-7 text-sm ${className || ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group inline-flex items-center gap-1 text-left hover:bg-muted/40 rounded px-1 py-0.5 -mx-1 min-w-[40px] ${displayClassName || ""}`}
      title="Clique para editar"
    >
      <span className={value ? "" : "text-muted-foreground italic"}>
        {renderDisplay ? renderDisplay(value) : (value || placeholder || "—")}
      </span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
    </button>
  );
}
