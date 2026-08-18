import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      تسجيل الخروج
    </button>
  );
}
