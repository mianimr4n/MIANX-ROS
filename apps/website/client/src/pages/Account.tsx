import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Legacy Account Center path — permanently redirects to My Telepizza.
 * Preserves hash sections (#profile, #orders, …).
 */
export default function Account() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    navigate(`/my-telepizza${hash}`, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container max-w-md text-center text-muted-foreground">
        Taking you to My Telepizza…
      </div>
    </div>
  );
}
