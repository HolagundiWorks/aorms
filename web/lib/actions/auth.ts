"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { roleHome } from "../auth/role-home";

export type AuthActionState = { error: string } | null;

export async function signIn(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const home = roleHome(profile?.role);
  if (!home) {
    await supabase.auth.signOut();
    return { error: "This account's portal isn't available yet — contact your firm for access." };
  }

  redirect(home);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
