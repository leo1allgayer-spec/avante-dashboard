import { useState, useCallback, useEffect } from "react";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import { toast } from "sonner";

export interface CourseBooking {
  id: string;
  slotId: string;
  courseName: string;
  studentName: string;
  email: string;
  phone: string;
  instagram: string;
  certificateName: string;
  date: string;
  time: string;
  status: string;
  courseStatus: string;
  createdAt: string;
}

function rowToBooking(r: any): CourseBooking {
  return {
    id: r.id,
    slotId: r.slot_id,
    courseName: r.course_name,
    studentName: r.student_name,
    email: r.email,
    phone: r.phone,
    instagram: r.instagram || "",
    certificateName: r.certificate_name || "",
    date: r.date,
    time: r.time,
    status: r.status,
    courseStatus: r.course_status || "a confirmar",
    createdAt: r.created_at,
  };
}

export function useCourseBookings(courseName?: string) {
  const [bookings, setBookings] = useState<CourseBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("course_bookings").select("*").order("created_at", { ascending: false });
    if (courseName) query = query.eq("course_name", courseName);
    const { data, error } = await query;
    if (error) toast.error("Erro ao carregar agendamentos");
    else setBookings((data || []).map(rowToBooking));
    setLoading(false);
  }, [courseName]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const createBooking = async (b: { slotId: string; courseName: string; studentName: string; email: string; phone: string; date: string; time: string }) => {
    const { data, error } = await supabase
      .from("course_bookings")
      .insert({ slot_id: b.slotId, course_name: b.courseName, student_name: b.studentName, email: b.email, phone: b.phone, date: b.date, time: b.time })
      .select().single();
    if (error) { toast.error("Erro ao criar agendamento"); return null; }
    const booking = rowToBooking(data);
    setBookings(prev => [booking, ...prev]);
    return booking;
  };

  const updateBooking = async (id: string, updates: Partial<{ status: string; courseStatus: string; studentName: string; email: string; phone: string; instagram: string; certificateName: string; date: string }>) => {
    const wasRescheduled = updates.date !== undefined;
    const mapped: any = {};
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.courseStatus !== undefined) mapped.course_status = updates.courseStatus;
    if (updates.studentName !== undefined) mapped.student_name = updates.studentName;
    if (updates.email !== undefined) mapped.email = updates.email;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.instagram !== undefined) mapped.instagram = updates.instagram;
    if (updates.certificateName !== undefined) mapped.certificate_name = updates.certificateName;
    if (updates.date !== undefined) mapped.date = updates.date;
    const { error } = await (supabase as any).rpc("update_course_booking_admin", {
      p_booking_id: id,
      p_updates: mapped,
    });
    if (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast.error("Erro ao atualizar agendamento", { description: error.message });
      return;
    }

    if (wasRescheduled) {
      const { error: cancelError } = await supabase
        .from("whatsapp_scheduled_messages")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", id)
        .eq("status", "pending")
        .in("message_type", ["reminder_24h", "reminder_1h", "post_course"]);

      if (cancelError) {
        console.error("Erro ao cancelar avisos da data anterior:", cancelError);
      }

      const { error: scheduleError } = await supabase.functions.invoke("whatsapp-trigger", {
        body: { bookingId: id, rescheduled: true },
      });

      if (scheduleError) {
        console.error("Erro ao reagendar avisos do WhatsApp:", scheduleError);
        toast.warning("Data atualizada, mas os avisos não foram reagendados", {
          description: "Tente salvar a nova data novamente ou envie os lembretes manualmente.",
        });
      } else {
        toast.success("Avisos reagendados para a nova data");
      }
    }
    setBookings(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
    if (!wasRescheduled) toast.success("Agendamento atualizado");
  };

  const deleteBooking = async (id: string) => {
    const { error } = await supabase.from("course_bookings").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir agendamento"); return; }
    setBookings(prev => prev.filter(x => x.id !== id));
    toast.success("Agendamento excluído");
  };

  return { bookings, loading, createBooking, updateBooking, deleteBooking, refetch: fetchBookings };
}

export async function getBookingCountForSlot(slotId: string): Promise<number> {
  const { count, error } = await supabase
    .from("course_bookings")
    .select("*", { count: "exact", head: true })
    .eq("slot_id", slotId)
    .eq("status", "confirmed");
  if (error) return 0;
  return count || 0;
}
