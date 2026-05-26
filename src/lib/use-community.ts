import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Community } from "@/interface";

export type { Community };

export function useCommunity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["community", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Community | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("communities")
        .select("*")
        .eq("admin_id", user.id)
        .maybeSingle();
      return (data as unknown as Community) ?? null;
    },
  });
}
