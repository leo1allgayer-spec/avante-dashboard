import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    courseStatus: r.course_status || "confirmado",
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
    const mapped: any = {};
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.courseStatus !== undefined) mapped.course_status = updates.courseStatus;
    if (updates.studentName !== undefined) mapped.student_name = updates.studentName;
    if (updates.email !== undefined) mapped.email = updates.email;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.instagram !== undefined) mapped.instagram = updates.instagram;
    if (updates.certificateName !== undefined) mapped.certificate_name = updates.certificateName;
    if (updates.date !== undefined) mapped.date = updates.date;
    const { error } = await supabase.from("course_bookings").update(mapped).eq("id", id);
    if (error) { toast.error("Erro ao atualizar agendamento"); return; }
    setBookings(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
    toast.success("Agendamento atualizado");
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
