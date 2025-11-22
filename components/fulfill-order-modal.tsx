"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { useFulfillmentMutations } from "@/app/hooks/useFulfillmentMutations";
import { useOrderCreatorAddress } from "@/app/hooks/useOrderCreatorAddress";
import { useShopifyCart } from "@/app/hooks/useShopifyCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Listing } from "@/lib/supabase";
import { ExternalLink, Loader2, Package } from "lucide-react";
import { useState } from "react";

interface FulfillOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onSuccess?: (checkoutUrl: string) => void;
}

export default function FulfillOrderModal({
  isOpen,
  onClose,
  listing,
  onSuccess,
}: FulfillOrderModalProps) {
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user: currentUser } = useCurrentUser();
  const { address: creatorAddress, isLoading: isLoadingAddress } =
    useOrderCreatorAddress(listing?.ordered_by);

  // Debug logging
  console.log("FulfillOrderModal Debug:", {
    listingOrderedBy: listing?.ordered_by,
    creatorAddress: creatorAddress,
    isLoadingAddress: isLoadingAddress,
  });
  const { createCart, getProductVariant } = useShopifyCart();
  const { createFulfillmentOrder } = useFulfillmentMutations();

  if (!isOpen || !listing) return null;

  const handleFulfillOrder = async () => {
    if (!listing.url || !creatorAddress) {
      setError("Missing product URL or delivery address");
      return;
    }

    setIsFulfilling(true);
    setError(null);

    try {
      // Get product variant ID from URL
      const variantId = await getProductVariant(listing.url);

      if (!variantId) {
        throw new Error("Could not find product variant for this item");
      }

      // Prepare address data
      const deliveryAddress = {
        firstName: creatorAddress.full_name?.split(" ")[0] || "",
        lastName: creatorAddress.full_name?.split(" ").slice(1).join(" ") || "",
        address1: creatorAddress.address_line_1 || "",
        address2: creatorAddress.address_line_2 || undefined,
        city: creatorAddress.city || "",
        province: creatorAddress.state_province || "",
        country: creatorAddress.country || "",
        zip: creatorAddress.postal_code || "",
      };

      console.log("Creating cart with address data:", deliveryAddress);

      // Create cart with prefilled address and tracking metadata
      const cartResponse = await createCart({
        productVariantId: variantId,
        quantity: 1,
        email: creatorAddress.full_name
          ? `${creatorAddress.full_name}@example.com`
          : undefined,
        phone: creatorAddress.phone || undefined,
        countryCode: getCountryCode(creatorAddress.country || ""),
        listingId: listing.id.toString(), // For order tracking
        purchaserWallet: currentUser?.wallet_address, // For order tracking
        deliveryAddress,
      });

      if (cartResponse.success && cartResponse.checkoutUrl) {
        // Create order record in database
        if (currentUser?.wallet_address) {
          try {
            await createFulfillmentOrder({
              listingId: listing.id,
              fulfillerId: currentUser.wallet_address,
              checkoutUrl: cartResponse.checkoutUrl,
              status: "fulfiller_processing",
            });
          } catch (orderError) {
            console.warn("Failed to create order record:", orderError);
            // Continue with checkout even if order creation fails
          }
        }

        onSuccess?.(cartResponse.checkoutUrl);
        // Open checkout in new tab
        window.open(cartResponse.checkoutUrl, "_blank", "noopener,noreferrer");
        onClose();
      } else {
        throw new Error(cartResponse.error || "Failed to create checkout");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fulfill order");
    } finally {
      setIsFulfilling(false);
    }
  };

  const getCountryCode = (country: string): string => {
    const countryMap: { [key: string]: string } = {
      "United States": "US",
      Canada: "CA",
      "United Kingdom": "GB",
      Australia: "AU",
      Germany: "DE",
      France: "FR",
      Japan: "JP",
      // Add more as needed
    };
    return countryMap[country] || "US";
  };

  const formatAddress = (addr: typeof creatorAddress) => {
    if (!addr) return "No address available";

    const parts = [
      addr.address_line_1,
      addr.address_line_2,
      addr.city,
      addr.state_province,
      addr.postal_code,
      addr.country,
    ].filter(Boolean);

    return parts.join(", ");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-emerald-400/20 bg-[#050505] p-8 text-white shadow-[0_15px_60px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Fulfill Order</h2>
          <p className="text-sm text-zinc-500">
            Review the order details and proceed to checkout to fulfill this
            request.
          </p>
        </div>

        <div className="space-y-6">
          {/* Product Information */}
          <Card className="border-emerald-400/20 bg-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-300">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-4">
                {listing.image_url && (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{listing.title}</h3>
                  <p className="text-sm overflow-hidden w-[90%] whitespace-break-spaces text-zinc-400 line-clamp-2">
                    {listing.description || "No description available"}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-semibold text-emerald-300">
                      {listing.price}
                    </span>
                    {listing.original_price && (
                      <span className="text-sm text-zinc-500 line-through">
                        {listing.original_price}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {listing.url && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-zinc-400" />
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View Product
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address */}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleFulfillOrder}
              disabled={
                isFulfilling || !creatorAddress || !listing.url || !currentUser
              }
              className="w-1/2 rounded-2xl border border-emerald-400 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/30 disabled:opacity-50"
            >
              {isFulfilling ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Checkout...
                </span>
              ) : (
                "Proceed to Checkout"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
