"use client";

import { useCreateListing } from "@/app/hooks/useListingMutations";
import { useOrderCreatorAddress } from "@/app/hooks/useOrderCreatorAddress";
import { useShopifyProduct } from "@/app/hooks/useShopifyProduct";
import { Button } from "@/components/ui/button";
import { humanizeShopifyHandle } from "@/lib/shopify";
import type { UserAddress } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  connectedAddress?: string;
}

interface FormValues {
  url: string;
  price: string;
  deliveryAddress: string;
  deliveryCountry: string;
}

const DEFAULT_FORM: FormValues = {
  url: "",
  price: "",
  deliveryAddress: "",
  deliveryCountry: "",
};

const formatSavedAddress = (address: UserAddress) => {
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state_province,
    address.postal_code,
  ].filter(Boolean);

  return parts.join(", ");
};

const formatUserPrice = (value: string) => {
  if (!value.trim()) return "$0.00";
  const trimmed = value.trim();
  return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
};

const formatShopifyPrice = (amount?: string, currency?: string) => {
  if (!amount) return undefined;
  const parsed = Number(amount);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parsed);
  } catch {
    return `$${parsed.toFixed(2)}`;
  }
};

export default function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  connectedAddress,
}: CreateOrderModalProps) {
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const { createListing, isCreating } = useCreateListing();
  const { fetchProduct, isFetchingProduct } = useShopifyProduct();
  const { address: savedAddress } = useOrderCreatorAddress(connectedAddress);

  useEffect(() => {
    if (!savedAddress) {
      return;
    }

    const formattedAddress = formatSavedAddress(savedAddress);

    setFormValues((prev) => {
      const shouldUpdateAddress =
        !prev.deliveryAddress && Boolean(formattedAddress);
      const shouldUpdateCountry =
        !prev.deliveryCountry && Boolean(savedAddress.country);

      if (!shouldUpdateAddress && !shouldUpdateCountry) {
        return prev;
      }

      return {
        ...prev,
        deliveryAddress: shouldUpdateAddress
          ? formattedAddress
          : prev.deliveryAddress,
        deliveryCountry: shouldUpdateCountry
          ? savedAddress.country || prev.deliveryCountry
          : prev.deliveryCountry,
      };
    });
  }, [savedAddress]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!connectedAddress) {
      setFormError("Connect your wallet before creating an order.");
      return;
    }

    if (!formValues.deliveryAddress || !formValues.deliveryCountry) {
      setFormError("Please provide a delivery address and country.");
      return;
    }

    try {
      const normalizedPrice = formatUserPrice(formValues.price);
      const product = await fetchProduct(formValues.url);
      const listing = await createListing({
        title: product.title || humanizeShopifyHandle(product.handle),
        description: `Deliver to ${formValues.deliveryAddress}, ${
          formValues.deliveryCountry
        }. ${product.description || ""}`.trim(),
        price: normalizedPrice,
        original_price: formatShopifyPrice(
          product.variantPrice,
          product.currencyCode
        ),
        image_url: product.imageUrl,
        url: formValues.url,
        ordered_by: connectedAddress?.toLowerCase(),
        in_stock: true,
        badge: "New",
      });

      onSuccess(`Created order for ${listing.title}.`);
      onClose();
      setFormValues(DEFAULT_FORM);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to create listing."
      );
    }
  };

  const handleClose = () => {
    setFormError(null);
    setFormValues(DEFAULT_FORM);
    onClose();
  };

  const isSubmitting = isCreating || isFetchingProduct;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-[#050505] p-8 text-white shadow-[0_15px_60px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Create listing</h2>
          <p className="text-sm text-zinc-500">
            Drop the product link, delivery details, and how much you are
            willing to pay.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Product URL</label>
            <input
              type="url"
              required
              value={formValues.url}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, url: event.target.value }))
              }
              placeholder="https://your-store.myshopify.com/products/..."
              className="w-full rounded-2xl border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Connected wallet</label>
            <input
              type="text"
              value={connectedAddress ?? "Connect wallet to continue"}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-emerald-400/20 bg-black/30 px-4 py-3 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Delivery address</label>
            <input
              type="text"
              required
              value={formValues.deliveryAddress}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  deliveryAddress: event.target.value,
                }))
              }
              placeholder="0x Street Name, City"
              className="w-full rounded-2xl border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Delivery country</label>
            <input
              type="text"
              required
              value={formValues.deliveryCountry}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  deliveryCountry: event.target.value,
                }))
              }
              placeholder="United States"
              className="w-full rounded-2xl border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Offer price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={formValues.price}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  price: event.target.value,
                }))
              }
              placeholder="149.00"
              className="w-full rounded-2xl border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <div className="flex  gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleClose}
              className="w-1/2 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 rounded-2xl border border-emerald-400 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/30"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isFetchingProduct ? "Fetching product..." : "Creating..."}
                </span>
              ) : (
                "Create listing"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
