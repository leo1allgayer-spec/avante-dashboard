import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface SupportAvailabilityRule {
  id: string;
  weekday: number;
  start_time: string;
  capacity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportBooking {
  id: string;
  student_id: string;
  cpf_limpo: string;
  student_name: string;
  booking_date: string;
  start_time: string;
  modality: "presencial" | "online";
  status: "agendado" | "concluido" | "cancelado";
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SupportSlot {
  slot_date: string;
  start_time: string;
  capacity: number;
  booked: number;
}

export interface SupportStudentLookup {
  student_id: string;
  name: string;
  used: number;
  remaining: number;
}

export function useSupportRules() {
  return useQuery({
    queryKey: ["support-rules"],
    queryFn: async () => {
      const { data, error } = await db.from("support_availability_rules").select("*").order("weekday").order("start_time");
      if (error) throw error;
      return (data || []) as SupportAvailabilityRule[];
    },
  });
}

export function useCreateSupportRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Pick<SupportAvailabilityRule, "weekday" | "start_time" | "capacity">) => {
      const { data, error } = await db.from("support_availability_rules").insert(rule).select().single();
      if (error) throw error;
      return data as SupportAvailabilityRule;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-rules"] }),
  });
}

export function useUpdateSupportRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportAvailabilityRule> & { id: string }) => {
      const { data, error } = await db.from("support_availability_rules").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data as SupportAvailabilityRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-rules"] });
      queryClient.invalidateQueries({ queryKey: ["support-slots"] });
    },
  });
}

export function useDeleteSupportRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("support_availability_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-rules"] });
      queryClient.invalidateQueries({ queryKey: ["support-slots"] });
    },
  });
}

export function useSupportBookings() {
  return useQuery({
    queryKey: ["support-bookings"],
    queryFn: async () => {
      const { data, error } = await db.from("support_bookings").select("*").order("booking_date").order("start_time");
      if (error) throw error;
      return (data || []) as SupportBooking[];
    },
  });
}

export function useUpdateSupportBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportBooking> & { id: string }) => {
      const { data, error } = await db.from("support_bookings").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data as SupportBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["support-slots"] });
    },
  });
}

export async function lookupSupportStudent(cpf: string) {
  const { data, error } = await db.rpc("lookup_support_student", { p_cpf: cpf });
  if (error) throw error;
  return (data || null) as SupportStudentLookup | null;
}

export function useSupportSlots(from: string, to: string) {
  return useQuery({
    queryKey: ["support-slots", from, to],
    queryFn: async () => {
      const { data, error } = await db.rpc("list_support_slots", { p_from: from, p_to: to });
      if (error) throw error;
      return (data || []) as SupportSlot[];
    },
  });
}

export function useCreateSupportBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cpf, date, time, modality, name, phone }: { cpf: string; date: string; time: string; modality: "presencial" | "online"; name?: string; phone?: string }) => {
      const { data, error } = await db.rpc("create_support_booking", {
        p_cpf: cpf,
        p_date: date,
        p_start_time: time,
        p_modality: modality,
        p_student_name: name || null,
        p_student_phone: phone || null,
      });
      if (error) throw error;
      return data as { id: string; name: string; date: string; time: string; used: number; remaining: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["support-slots"] });
    },
  });
}
