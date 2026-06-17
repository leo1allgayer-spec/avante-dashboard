import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CourseEnrollment {
  id: string;
  studentName: string;
  contact: string;
  email: string;
  instagram: string;
  date: string;
  time: string;
  courseType: string;
}

function rowToEnrollment(r: any): CourseEnrollment {
  return {
    id: r.id,
    studentName: r.student_name,
    contact: r.contact || "",
    email: (r as any).email || "",
    instagram: (r as any).instagram || "",
    date: r.date || "",
    time: r.time || "",
    courseType: r.course_type,
  };
}

export function useCourseEnrollments(courseType: "google" | "social_media" | "meta_ads" | "meta_ads_advanced" | "ia" | "video") {
  const { session } = useAuth();
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_enrollments")
      .select("*")
      .eq("course_type", courseType)
      .order("date", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar inscrições");
    } else {
      setEnrollments((data || []).map(rowToEnrollment));
    }
    setLoading(false);
  }, [courseType]);

  useEffect(() => { fetch(); }, [fetch]);

  const addEnrollment = async (e: Omit<CourseEnrollment, "id">) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("course_enrollments")
      .insert({
        user_id: session.user.id,
        course_type: courseType,
        student_name: e.studentName,
        contact: e.contact,
        email: e.email,
        instagram: e.instagram,
        date: e.date,
        time: e.time,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar inscrição");
    } else {
      setEnrollments((prev) => [rowToEnrollment(data), ...prev]);
      toast.success("Inscrição adicionada");
    }
  };

  const updateEnrollment = async (e: CourseEnrollment) => {
    const { error } = await supabase
      .from("course_enrollments")
      .update({
        student_name: e.studentName,
        contact: e.contact,
        email: e.email,
        instagram: e.instagram,
        date: e.date,
        time: e.time,
      })
      .eq("id", e.id);
    if (error) {
      toast.error("Erro ao atualizar inscrição");
    } else {
      setEnrollments((prev) => prev.map((x) => (x.id === e.id ? e : x)));
      toast.success("Inscrição atualizada");
    }
  };

  const deleteEnrollment = async (id: string) => {
    // Fetch the enrollment first so we can also remove the matching course_booking
    const target = enrollments.find((x) => x.id === id);
    const { error } = await supabase.from("course_enrollments").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir inscrição");
      return;
    }
    if (target) {
      const typeToName: Record<string, string> = {
        google: "Curso Google Ads",
        social_media: "Curso Social Media",
        meta_ads: "Curso Meta Ads",
        meta_ads_advanced: "Curso Meta Ads Avançado",
        ia: "Curso Inteligência Artificial",
        video: "Curso Captação e Edição de Vídeo",
      };
      const courseName = typeToName[target.courseType];
      if (courseName) {
        await supabase
          .from("course_bookings")
          .delete()
          .eq("course_name", courseName)
          .eq("student_name", target.studentName)
          .eq("date", target.date)
          .eq("time", target.time);
      }
    }
    setEnrollments((prev) => prev.filter((x) => x.id !== id));
    toast.success("Inscrição excluída");
  };


  return { enrollments, loading, addEnrollment, updateEnrollment, deleteEnrollment, refetch: fetch };
}
