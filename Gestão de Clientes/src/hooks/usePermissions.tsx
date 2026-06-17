import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserPermission {
  id: string;
  userId: string;
  email: string;
  canAccessClients: boolean;
  canAccessTasks: boolean;
  canAccessBookings: boolean;
}

export function usePermissions() {
  const { session } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [myPermissions, setMyPermissions] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from("user_permissions")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar permissões");
    } else {
      const mapped = (data as any[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        email: r.email,
        canAccessClients: r.can_access_clients,
        canAccessTasks: r.can_access_tasks,
        canAccessBookings: r.can_access_bookings,
      }));
      setPermissions(mapped);
      const mine = mapped.find((p) => p.userId === session.user.id);
      setMyPermissions(mine || null);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const updatePermission = async (perm: UserPermission) => {
    const { error } = await supabase
      .from("user_permissions")
      .update({
        can_access_clients: perm.canAccessClients,
        can_access_tasks: perm.canAccessTasks,
        can_access_bookings: perm.canAccessBookings,
      })
      .eq("id", perm.id);

    if (error) {
      toast.error("Erro ao atualizar permissão");
    } else {
      setPermissions((prev) =>
        prev.map((p) => (p.id === perm.id ? perm : p))
      );
      if (perm.userId === session?.user?.id) {
        setMyPermissions(perm);
      }
      toast.success("Permissão atualizada!");
    }
  };

  return { permissions, myPermissions, loading, updatePermission, refetch: fetchPermissions };
}
