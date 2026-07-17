import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ProductBadge } from "@/components/menu/ProductBadge";
import { ProductConfigurator } from "@/components/menu/ProductConfigurator";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";

export default function ProductDetail() {
  const [, params] = useRoute("/menu/:productId");
  const { items, isLoading, error, reloadCatalog } = useMenuCatalog();
  const productId = decodeURIComponent(params?.productId ?? "");
  const item = items.find((entry) => entry.id === productId || entry.slug === productId);

  if (isLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="size-6 text-brand-red" />
        Loading product…
      </div>
    );
  }

  if (!item) {
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
              {item.category}
            </span>
            {item.badge ? <ProductBadge badge={item.badge} /> : null}
          </div>
          <h1 className="brand-heading text-3xl md:text-5xl">{item.name}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">{item.description}</p>
        </div>
        <ProductConfigurator item={item} />
      </div>
    </div>
  );
}
