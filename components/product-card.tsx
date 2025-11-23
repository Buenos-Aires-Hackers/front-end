import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Listing } from "@/lib/supabase";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  id: number;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  imageUrl?: string;
  badge?: string;
  listing?: Listing;
  onAddToCart?: (e?: React.MouseEvent) => void;
  onFulfill?: (listing: Listing) => void;
}

export default function ProductCard({
  id,
  title,
  description,
  price,
  originalPrice,
  imageUrl,
  badge,
  listing,
  onAddToCart,
  onFulfill,
}: ProductCardProps) {
  const formattedPrice = price.startsWith("$") ? price : `$${price}`;

  const handleFulfillClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (listing && onFulfill) {
      onFulfill(listing);
    }
  };

  return (
    <Card
      data-listing-id={id}
      className="group flex h-full flex-col overflow-hidden border border-emerald-300/20 bg-[#050505] text-white shadow-[0_0_25px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:shadow-[0_10px_45px_rgba(20,241,149,0.25)]"
    >
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-b from-zinc-900 via-black to-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full rounded-b object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Product Image
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-5">
        <div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">
            {title}
          </h3>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-white">
              {formattedPrice}
            </span>
            {originalPrice && (
              <span className="text-sm text-zinc-500 line-through">
                {originalPrice.startsWith("$")
                  ? originalPrice
                  : `$${originalPrice}`}
              </span>
            )}
          </div>

          <Button
            onClick={handleFulfillClick}
            className="flex w-full items-center justify-center gap-2 rounded border border-emerald-400 bg-transparent text-lg uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-400/10"
          >
            <ShoppingCart className="h-5 w-5" />
            Fulfill
          </Button>
        </div>
      </div>
    </Card>
  );
}
