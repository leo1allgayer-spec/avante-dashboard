import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MessageTiming {
  id: string;
  messageType: string;
  offsetValue: number;
  offsetUnit: "hours" | "days";
  direction: "before" | "after";
}

const TYPE_LABELS: Record<string, string> = {
  reminder_24h: "Lembrete antes do curso",
  reminder_1h: "Lembrete próximo ao curso",
  post_course: "Pós-curso (upsell)",
};

export function getTimingLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

export function formatTimingDescription(t: MessageTiming) {
  const unit = t.offsetUnit === "hours" ? (t.offsetValue === 1 ? "hora" : "horas") : (t.offsetValue === 1 ? "dia" : "dias");
  const dir = t.direction === "before" ? "antes" : "depois";
  return `${t.offsetValue} ${unit} ${dir} do curso`;
}

export function useWhatsAppTiming() {
  const [timings, setTimings] = useState<MessageTiming[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_message_timing" as any)
      .select("*")
      .order("message_type");

    if (error) {
      console.error(error);
    } else {
      setTimings((data as any[]).map(r => ({
        id: r.id,
        messageType: r.message_type,
        offsetValue: r.offset_value,
        offsetUnit: r.offset_unit,
        direction: r.direction,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateTiming = async (id: string, updates: Partial<Pick<MessageTiming, "offsetValue" | "offsetUnit">>) => {
    const payload: any = {};
    if (updates.offsetValue !== undefined) payload.offset_value = updates.offsetValue;
    if (updates.offsetUnit !== undefined) payload.offset_unit = updates.offsetUnit;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("whatsapp_message_timing" as any)
      .update(payload)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      setTimings(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success("Tempo de envio atualizado!");
    }
  };

  return { timings, loading, updateTiming, refetch: fetch };
}
