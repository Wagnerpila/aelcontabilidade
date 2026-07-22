import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

/**
 * Guard que verifica se o usuário tem empresa aprovada.
 * Se não, redireciona para /Onboarding.
 * Admin sempre passa direto.
 */
export default function OnboardingGuard({ children }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const user = await base44.auth.me();
        // Admin nunca precisa de onboarding
        if (user.role === "admin") {
          setChecked(true);
          return;
        }
        // Usuário sem empresa aprovada → onboarding
        if (!user.empresa_id || user.empresa_status !== "aprovado") {
          if (window.location.pathname !== "/Onboarding") {
            window.location.href = "/Onboarding";
          } else {
            setChecked(true);
          }
          return;
        }
        setChecked(true);
      } catch {
        setChecked(true);
      }
    };
    check();
  }, []);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}