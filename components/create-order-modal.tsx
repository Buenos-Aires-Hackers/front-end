"use client";

import { CHAIN_IDS } from "@/app/config/wagmi";
import {
  useCreatePrivateCredentials,
  type PrivateCredentialsInput,
} from "@/app/hooks/useCreatePrivateCredentials";
import { useCreateListing } from "@/app/hooks/useListingMutations";
import { useListListing } from "@/app/hooks/useListListing";
import { useOrderCreatorAddress } from "@/app/hooks/useOrderCreatorAddress";
import { useShopifyProduct } from "@/app/hooks/useShopifyProduct";
import {
  ChainSelectModal,
  type ChainSelectMode,
} from "@/components/chain-select-modal";
import { Button } from "@/components/ui/button";
import { humanizeShopifyHandle } from "@/lib/shopify";
import type { UserAddress } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";

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

const PAYMENT_TOKEN_DECIMALS = Number(
  process.env.NEXT_PUBLIC_PAYMENT_TOKEN_DECIMALS ?? "6"
);

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

const parseDeliveryAddress = (
  raw: string
): { homeAddress: string; city: string } => {
  if (!raw) {
    return { homeAddress: "", city: "" };
  }

  const [street, ...rest] = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    homeAddress: street || raw.trim(),
    city: rest.join(", "),
  };
};

const buildPrivateCredentialsInput = (
  savedAddress: UserAddress | null,
  formValues: FormValues,
  connectedAddress?: string
): PrivateCredentialsInput => {
  const parsedAddress = parseDeliveryAddress(formValues.deliveryAddress);
  const combinedSavedAddress = [
    savedAddress?.address_line_1,
    savedAddress?.address_line_2,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    fullName: savedAddress?.full_name || connectedAddress || "PayPunk Shopper",
    emailAddress: "",
    homeAddress:
      combinedSavedAddress ||
      parsedAddress.homeAddress ||
      formValues.deliveryAddress,
    city: savedAddress?.city || parsedAddress.city || "",
    country: savedAddress?.country || formValues.deliveryCountry,
    zip: savedAddress?.postal_code || "",
  };
};

export default function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  connectedAddress,
}: CreateOrderModalProps) {
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [fromChainId, setFromChainId] = useState(CHAIN_IDS.ARBITRUM);
  const [toChainId, setToChainId] = useState(CHAIN_IDS.BASE);
  const { createListing, isCreating } = useCreateListing();
  const { fetchProduct, isFetchingProduct } = useShopifyProduct();
  const { address: savedAddress } = useOrderCreatorAddress(connectedAddress);
  const {
    createPrivateCredentials,
    isLoading: isCreatingCredentials,
    reset: resetCredentialsState,
  } = useCreatePrivateCredentials();
  const {
    list,
    waitForReceipt,
    isWriting,
    isConfirming,
    reset: resetListState,
  } = useListListing();

  useEffect(() => {
    if (!savedAddress || !isOpen) {
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
  }, [savedAddress, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    setIsChainModalOpen(true);
  };

  const handleClose = () => {
    setFormError(null);
    setFormValues(DEFAULT_FORM);
    setIsChainModalOpen(false);
    resetListState();
    resetCredentialsState();
    onClose();
  };

  const isSubmitting =
    isCreating ||
    isFetchingProduct ||
    isCreatingCredentials ||
    isWriting ||
    isConfirming;

  const getSubmitLabel = () => {
    if (isCreatingCredentials) return "Encrypting delivery data...";
    if (isWriting) return "Confirm in wallet...";
    if (isConfirming) return "Waiting for confirmation...";
    if (isFetchingProduct) return "Fetching product...";
    if (isCreating) return "Saving listing...";
    return "Create listing";
  };

  const handleChainSelect = (slot: ChainSelectMode, chainId: number) => {
    if (slot === "from") {
      setFromChainId(chainId as any);
    } else {
      setToChainId(chainId as any);
    }
  };

  const handleConfirmListing = async () => {
    if (!connectedAddress) {
      setFormError("Connect your wallet before creating an order.");
      return;
    }

    setFormError(null);

    try {
      const shopperAddress = connectedAddress as Address;
      const privateCredentialsInput = buildPrivateCredentialsInput(
        savedAddress,
        formValues,
        connectedAddress
      );
      const privateCredentials = await createPrivateCredentials(
        privateCredentialsInput
      );
      const amount = parseUnits(
        (formValues.price || "0").trim() || "0",
        PAYMENT_TOKEN_DECIMALS
      );
      const transactionHash = await list({
        url: formValues.url,
        amount,
        shopper: shopperAddress,
        privateCredentials,
      });
      const transactionReceipt = await waitForReceipt(transactionHash);
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
        ordered_by: connectedAddress.toLowerCase(),
        in_stock: true,
        badge: "New",
      });

      const previewHash = `${transactionReceipt.transactionHash.slice(
        0,
        10
      )}...`;
      onSuccess(`Created order for ${listing.title}. Tx ${previewHash}`);
      handleClose();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to create listing."
      );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-md rounded border border-emerald-400/20 bg-[#050505] p-8 text-white shadow-[0_15px_60px_rgba(0,0,0,0.65)]"
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
                  setFormValues((prev) => ({
                    ...prev,
                    url: event.target.value,
                  }))
                }
                placeholder="https://your-store.myshopify.com/products/..."
                className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Connected wallet</label>
              <input
                type="text"
                value={connectedAddress ?? "Connect wallet to continue"}
                readOnly
                className="w-full cursor-not-allowed rounded border border-emerald-400/20 bg-black/30 px-4 py-3 text-white placeholder:text-zinc-500"
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
                className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            {formError && <p className="text-sm text-red-400">{formError}</p>}

            <div className="flex  gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                onClick={handleClose}
                className="w-1/2 rounded border border-white/10 bg-white/5 text-white hover:bg-white/10"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 rounded border border-emerald-400 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/30"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {getSubmitLabel()}
                  </span>
                ) : (
                  "Create listing"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <ChainSelectModal
        open={isChainModalOpen}
        onOpenChange={(nextOpen) => {
          if (!isSubmitting) {
            setIsChainModalOpen(nextOpen);
          }
        }}
        fromChainId={fromChainId}
        toChainId={toChainId}
        onSelect={handleChainSelect}
        defaultSlot="from"
        onConfirm={handleConfirmListing}
        confirmLabel="Complete listing"
        confirmLoading={isSubmitting}
        confirmLoadingLabel={getSubmitLabel()}
        confirmDisabled={!connectedAddress || isSubmitting}
        onBack={() => {
          if (!isSubmitting) {
            setIsChainModalOpen(false);
          }
        }}
      />
    </>
  );
}
