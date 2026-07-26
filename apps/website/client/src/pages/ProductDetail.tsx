import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ProductBadge } from "@/components/menu/ProductBadge";
import { ProductConfigurator } from "@/components/menu/ProductConfigurator";
import { FavoriteHeartButton } from "@/components/menu/FavoriteHeartButton";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";

export default function ProductDetail() {
  const [, params] = useRoute("/menu/:productId");
  const { items, groups, isLoading, error, reloadCatalog } = useMenuCatalog();
  const productId = decodeURIComponent(params?.productId ?? "");
  // A URL may carry a product family slug or an exact SKU slug/id; both open the same family.
  const sku = items.find((entry) => entry.id === productId || entry.slug === productId);
  const group =
    groups.find((entry) => entry.productGroupSlug === productId) ??
    (sku ? groups.find((entry) => entry.productGroupSlug === sku.productGroupSlug) : undefined);

  if (isLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="size-6 text-brand-red" />
        Loading product…
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container max-w-xl py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-brand-red" />
        <h1 className="brand-heading mb-2 text-3xl">Product unavailable</h1>
        <p className="mb-6 text-muted-foreground">
          {error
            ? "We could not load this product. You can retry or return to the menu."
            : "This item may no longer be available on the current menu."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {error ? (
            <Button variant="outline" className="rounded-2xl" onClick={() => void reloadCatalog()}>
              Try again
            </Button>
          ) : null}
          <Link href="/menu">
            <Button className="rounded-2xl brand-gradient text-white">Back to menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  const favouriteSku = sku ?? group.options[0];

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container max-w-6xl">
        <Link href="/menu">
          <Button variant="ghost" className="mb-5 -ml-3 rounded-2xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to menu
          </Button>
        </Link>
        <div className="mb-7">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
              {group.category}
            </span>
            {group.badge ? <ProductBadge badge={group.badge} /> : null}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="brand-heading text-3xl md:text-5xl">{group.name}</h1>
            {favouriteSku ? <FavoriteHeartButton item={favouriteSku} /> : null}
          </div>
          <p className="mt-3 max-w-3xl text-muted-foreground">{group.description}</p>
        </div>
        <ProductConfigurator group={group} initialSkuId={sku?.id} />
      </div>
    </div>
  );
}
