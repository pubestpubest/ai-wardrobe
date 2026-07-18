import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, pin: string) {
    const { data, error } = await supabase.auth.signUp({ email, password: pin });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error("ต้องยืนยันอีเมลก่อน — เปิด auto-confirm ใน Supabase");
    }
  }

  async function signIn(email: string, pin: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return {
    session,
    user: (session?.user as User | undefined) ?? null,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
