import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppTemplate {
  id: string;
  type: string;
  messageTemplate: string;
  isActive: boolean;
}

export interface WhatsAppLog {
  id: string;
  bookingId: string | null;
  phone: string;
  studentName: string;
  courseName: string;
  messageType: string;
  messageText: string;
  status: string;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface WhatsAppScheduled {
  id: string;
  bookingId: string;
  messageType: string;
  scheduledFor: string;
  status: string;
}

const TYPE_LABELS: Record<string, string> = {
  confirmation: "Confirmação",
  reminder_24h: "Lembrete 24h",
  reminder_1h: "Lembrete 1h",
  post_course: "Pós-curso",
};

export function getTypeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

export function useWhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_message_templates")
      .select("*")
      .order("type");
    if (error) toast.error("Erro ao carregar templates");
    else setTemplates((data || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      messageTemplate: r.message_template,
      isActive: r.is_active,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateTemplate = async (id: string, updates: { messageTemplate?: string; isActive?: boolean }) => {
    const mapped: any = {};
    if (updates.messageTemplate !== undefined) mapped.message_template = updates.messageTemplate;
    if (updates.isActive !== undefined) mapped.is_active = updates.isActive;
    mapped.updated_at = new Date().toISOString();
    const { error } = await supabase.from("whatsapp_message_templates").update(mapped).eq("id", id);
    if (error) { toast.error("Erro ao atualizar template"); return; }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    toast.success("Template atualizado");
  };

  return { templates, loading, updateTemplate, refetch: fetch };
}

export function useWhatsAppLogs() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_message_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Erro ao carregar logs");
    else setLogs((data || []).map((r: any) => ({
      id: r.id,
      bookingId: r.booking_id,
      phone: r.phone,
      studentName: r.student_name,
      courseName: r.course_name,
      messageType: r.message_type,
      messageText: r.message_text,
      status: r.status,
      errorMessage: r.error_message,
      sentAt: r.sent_at,
      createdAt: r.created_at,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, loading, refetch: fetch };
}

export async function resendMessage(log: WhatsAppLog) {
  // Sempre buscar dados atualizados do booking para refletir alterações
  // recentes (telefone, nome, etc.) ao reenviar a mensagem.
  let phone = log.phone;
  let studentName = log.studentName;
  let courseName = log.courseName;
  let useCustomText = true;

  if (log.bookingId) {
    const { data: booking } = await supabase
      .from("course_bookings")
      .select("phone, student_name, course_name")
      .eq("id", log.bookingId)
      .maybeSingle();
    if (booking) {
      phone = booking.phone || phone;
      studentName = booking.student_name || studentName;
      courseName = booking.course_name || courseName;
      // Se o telefone/nome mudou, regenerar a mensagem a partir do template
      useCustomText = false;
    }
  }

  const { error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      phone,
      bookingId: log.bookingId,
      messageType: log.messageType,
      studentName,
      courseName,
      ...(useCustomText ? { customText: log.messageText } : {}),
    },
  });
  if (error) {
    toast.error("Erro ao reenviar mensagem");
    return false;
  }
  toast.success("Mensagem reenviada");
  return true;
}

export async function sendManualMessage(phone: string, bookingId: string | null, messageType: string, studentName: string, courseName: string) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { phone, bookingId, messageType, studentName, courseName },
  });
  if (error) {
    toast.error("Erro ao enviar mensagem");
    return false;
  }
  toast.success("Mensagem enviada");
  return true;
}
