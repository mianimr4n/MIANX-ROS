import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import {
  addCloudFavorite,
  favoriteCodeForItem,
  fetchCloudFavorites,
  isFavoriteCode,
  invalidateFavoritesCache,
  removeCloudFavorite,
} from "@/lib/customer-favorites-api";
import type { MenuItem } from "@/lib/telepizza-types";
import { Button } from "@/components/ui/button";

type FavoriteHeartButtonProps = {
  item: Pick<MenuItem, "id" | "slug" | "name">;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteHeartButton({ item, className = "", size = "md" }: FavoriteHeartButtonProps) {
  const { isAuthenticated, session, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const code = favoriteCodeForItem(item);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "sm" ? "h-9 w-9" : "h-10 w-10";

  useEffect(() => {
    if (!isAuthenticated || !session?.access_token) {
      setFavorited(false);
      return;
    }
    void fetchCloudFavorites(session.access_token, user?.id ?? session.access_token)
      .then(() => setFavorited(isFavoriteCode(code)))
      .catch(() => setFavorited(false));
  }, [isAuthenticated, session?.access_token, user?.id, code]);

  if (!isAuthenticated) {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/menu";
    // Single interactive control: Button-as-Link (avoids unnamed nested <button>).
    return (
      <Button
        asChild
        variant="outline"
        size="icon"
        className={`${buttonSize} min-h-11 min-w-11 rounded-2xl border-border bg-white/90 text-muted-foreground hover:text-brand-red ${className}`}
      >
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          onClick={() => rememberAuthNextPath(returnPath)}
          aria-label={`Sign in to save ${item.name} to favorites`}
        >
          <Heart className={iconSize} aria-hidden="true" />
        </Link>
      </Button>
    );
  }

  async function toggleFavorite() {
    if (!session?.access_token || busy) return;
    setBusy(true);
    try {
      if (favorited) {
        await removeCloudFavorite(session.access_token, code);
        setFavorited(false);
      } else {
        await addCloudFavorite(session.access_token, code);
        setFavorited(true);
      }
    } catch {
      invalidateFavoritesCache();
      setFavorited(isFavoriteCode(code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={`${buttonSize} min-h-11 min-w-11 rounded-2xl border-border bg-white/90 ${
        favorited ? "text-brand-red border-brand-red/30" : "text-muted-foreground hover:text-brand-red"
      } ${className}`}
      aria-pressed={favorited}
      aria-label={
        favorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`
      }
      disabled={busy}
      onClick={() => void toggleFavorite()}
    >
      {busy ? (
        <Loader2 className={`${iconSize} animate-spin`} aria-hidden="true" />
      ) : (
        <Heart className={`${iconSize} ${favorited ? "fill-brand-red" : ""}`} aria-hidden="true" />
      )}
    </Button>
  );
}
