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
      const communityId = user.user_metadata?.community_id as string | undefined;
      if (!communityId) return null;
      const { data } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .maybeSingle();
      return (data as unknown as Community) ?? null;
    },
  });
}
