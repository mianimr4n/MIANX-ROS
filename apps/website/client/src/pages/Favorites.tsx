import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FavoriteHeartButton } from "@/components/menu/FavoriteHeartButton";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import {
  favoriteCodeForItem,
  fetchCloudFavorites,
  favoritesAvailable,
} from "@/lib/customer-favorites-api";
import { formatMenuPriceLabel } from "@/lib/menu-utils";
import type { MenuItem } from "@/lib/telepizza-types";

export default function Favorites() {
  const { isAuthenticated, user, session } = useAuth();
  const { items, isLoading: catalogLoading } = useMenuCatalog();
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !session?.access_token || !favoritesAvailable()) {
      setFavoriteCodes([]);
      return;
    }
    setLoading(true);
    setError(null);
    void fetchCloudFavorites(session.access_token, user?.id ?? session.access_token)
      .then((rows) => setFavoriteCodes(rows.map((row) => row.menuItemCode)))
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Could not load favorites.");
        setFavoriteCodes([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, session?.access_token, user?.id]);

  const favoriteItems = useMemo(() => {
    const codeSet = new Set(favoriteCodes.map((code) => code.toLowerCase()));
    return items.filter((item) => codeSet.has(favoriteCodeForItem(item)));
  }, [favoriteCodes, items]);

  if (!isAuthenticated || !user) {
    const returnPath = "/favorites";
    return (
      <div className="container py-16 text-center">
        <Heart className="mx-auto mb-4 h-10 w-10 text-brand-red" aria-hidden="true" />
        <p className="text-muted-foreground mb-4">Sign in to view your saved favorites.</p>
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          onClick={() => rememberAuthNextPath(returnPath)}
        >
          <Button className="rounded-2xl brand-gradient text-white">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-4xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-white via-brand-cream/40 to-white shadow-sm">
          <div className="h-1.5 brand-gradient" aria-hidden="true" />
          <div className="p-4 sm:p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-red">
              My Telepizza
            </p>
            <h1 className="brand-heading text-3xl">Favorites</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Items you heart on the menu — synced to your Telepizza account when the API is live.
            </p>
          </div>
        </header>

        {!favoritesAvailable() ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-8 text-center">
            <p className="font-semibold">Favorites need the live API</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure the backend to save favorites to your account. Browse the menu anytime.
            </p>
            <Link href="/menu" className="mt-4 inline-block">
              <Button className="rounded-2xl brand-gradient text-white">Browse menu</Button>
            </Link>
          </div>
        ) : loading || catalogLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand-red" />
            Loading favorites…
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-brand-red/20 bg-brand-red/5 px-4 py-3 text-sm text-brand-red">
            {error}
          </p>
        ) : favoriteItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-8 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-brand-red" aria-hidden="true" />
            <p className="font-semibold">No favorites yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the heart on menu items to save them here.
            </p>
            <Link href="/menu" className="mt-4 inline-block">
              <Button className="rounded-2xl brand-gradient text-white">Browse menu</Button>
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {favoriteItems.map((item: MenuItem) => (
              <li
                key={item.id}
                className="flex gap-4 rounded-3xl border border-border bg-white p-4 shadow-sm"
              >
                <img
                  src={item.image}
                  alt=""
                  className="h-24 w-24 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
                        {item.category}
                      </p>
                      <Link href={`/menu/${encodeURIComponent(item.slug ?? item.id)}`}>
                        <h2 className="truncate font-bold text-brand-charcoal hover:text-brand-red">
                          {item.name}
                        </h2>
                      </Link>
                    </div>
                    <FavoriteHeartButton item={item} size="sm" />
                  </div>
                  <p className="text-sm font-semibold text-brand-red">
                    {formatMenuPriceLabel(item, item.price ?? item.variants?.[0]?.price)}
                  </p>
                  <Link href={`/menu/${encodeURIComponent(item.slug ?? item.id)}`}>
                    <Button size="sm" variant="outline" className="rounded-2xl">
                      View item
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
