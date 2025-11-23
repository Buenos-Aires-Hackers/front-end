"use client";

import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { customScrollbar } from "@/lib/scrollbar";
import type { AccountOrder, Listing, UserAddress } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccountData } from "../hooks/useAccountData";
import { useAddressMutations } from "../hooks/useAddressMutations";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useUserOrders } from "../hooks/useOrderTracking";
import { createListing, useZkPurchaseFlow } from "../hooks/useZkPurchaseFlow";

type AddressFormValues = {
  full_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
};

const buildAddressValues = (
  address?: UserAddress | null
): AddressFormValues => ({
  full_name: address?.full_name || "",
  address_line_1: address?.address_line_1 || "",
  address_line_2: address?.address_line_2 || "",
  city: address?.city || "",
  state_province: address?.state_province || "",
  postal_code: address?.postal_code || "",
  country: address?.country || "",
  phone: address?.phone || "",
});

export default function AccountPage() {
  const { allAccounts } = useAppKitAccount();
  const walletAddress = useMemo(() => allAccounts[0]?.address, [allAccounts]);
  console.log("🚀 ~ AccountPage ~ walletAddress:", walletAddress);
  const {
    user: currentUser,
    isLoading: isUserLoading,
    error: userError,
  } = useCurrentUser();
  const {
    data,
    isLoading: isDataLoading,
    error: dataError,
    refetch,
  } = useAccountData(walletAddress);
  const { saveAddress, isSavingAddress } = useAddressMutations();
  const [addressNotice, setAddressNotice] = useState<string | null>(null);

  // ZK Purchase Flow for claim functionality
  const {
    executePurchaseFlow,
    generateProofOnly,
    calculateListingId,
    isProcessing: isZkProcessing,
    currentStep,
    error: zkError,
    clearError: clearZkError,
  } = useZkPurchaseFlow();

  // Fetch Shopify orders from new order tracking system (only when walletAddress exists)
  const {
    data: shopifyOrdersData,
    isLoading: isShopifyOrdersLoading,
    error: shopifyOrdersError,
  } = useUserOrders(walletAddress || null);
  console.log("🚀 ~ AccountPage ~ shopifyOrdersData:", shopifyOrdersData);
  console.log("🚀 ~ AccountPage ~ data:", data);
  console.log("🚀 ~ AccountPage ~ currentUser:", currentUser);
  console.log("🚀 ~ AccountPage ~ walletAddress:", walletAddress);
  console.log("🚀 ~ AccountPage ~ data.listings:", data?.listings);
  console.log(
    "🚀 ~ AccountPage ~ shopifyOrders:",
    shopifyOrdersData?.data?.orders
  );

  // Refetch account data when user is loaded to ensure fresh data
  useEffect(() => {
    if (currentUser && !isDataLoading) {
      refetch();
    }
  }, [currentUser, refetch, isDataLoading]);

  const isLoading = isUserLoading || isDataLoading;
  const error = userError || dataError;

  const defaultAddress = useMemo(() => {
    const addresses = data?.addresses ?? [];
    return addresses.find((addr) => addr.is_default) ?? addresses[0];
  }, [data?.addresses]);

  const handleAddressSubmit = async (values: AddressFormValues) => {
    setAddressNotice(null);
    if (!currentUser) {
      setAddressNotice("Please connect your wallet to save addresses.");
      return;
    }

    try {
      await saveAddress({
        id: defaultAddress?.id,
        user_id: currentUser.id,
        address_type: defaultAddress?.address_type ?? "shipping",
        is_default: true,
        ...values,
      });
      setAddressNotice("Address saved successfully.");
      // Refetch account data to show updated address
      refetch();
    } catch (err) {
      setAddressNotice(
        err instanceof Error ? err.message : "Failed to save address."
      );
    }
  };

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString() : "--";

  const handleClaimOrder = async (shopifyOrderId: number, order: any) => {
    if (!currentUser || !walletAddress) {
      setAddressNotice("Please connect your wallet to claim orders.");
      return;
    }

    try {
      clearZkError();
      setAddressNotice("Testing listing ID calculation with order data...");

      console.log("🧪 Using order data for calculateId:", {
        shopifyOrderId,
        order,
        walletAddress,
      });

      // Use the order data directly to create the listing structure
      // Fix: privateCredentials must be exactly 32 bytes (bytes32)
      const credentialsData = JSON.stringify({
        orderId: shopifyOrderId,
        walletAddress,
        timestamp: Date.now(),
      });

      // Create a 32-byte hash from the credentials data
      const credentialsHash = `0x${Buffer.from(credentialsData)
        .toString("hex")
        .slice(0, 64)
        .padEnd(64, "0")}` as `0x${string}`;

      const orderListing = {
        url: order.listing_title || `Order #${shopifyOrderId}`,
        productId: shopifyOrderId.toString(),
        amount: parseEther(order.total_price?.toString() || "0"),
        shopper: walletAddress as `0x${string}`,
        privateCredentials: credentialsHash,
      };

      console.log("🧪 Order listing for ID calculation:", orderListing);
      console.log(
        "📋 privateCredentials length:",
        credentialsHash.length,
        "should be 66 (0x + 64 hex chars)"
      );

      // Step 1: Generate ZK proof first
      setAddressNotice("Generating ZK proof for order verification...");

      // Generate ZK proof for the order
      const zkProofResult = await generateProofOnly(
        shopifyOrderId.toString(),
        walletAddress as `0x${string}`,
        [
          "id",
          "total_price",
          "financial_status",
          "fulfillment_status",
          "customer",
        ]
      );

      if (!zkProofResult.success) {
        throw new Error(zkProofResult.error || "Failed to generate ZK proof");
      }

      // Step 2: Calculate listing ID using the same structure
      setAddressNotice("ZK proof generated! Calculating listing ID...");

      let listingId: `0x${string}`;
      try {
        console.log("🔍 Calculating listing ID with orderListing...");
        const idResult = await calculateListingId(orderListing);

        if (!idResult.success || !idResult.data) {
          throw new Error("Failed to get listing ID from calculation");
        }

        listingId = idResult.data;
        console.log("✅ Listing ID calculated:", listingId);
        setAddressNotice(
          `Listing ID calculated: ${listingId.slice(
            0,
            10
          )}... Submitting to blockchain...`
        );
      } catch (calcError) {
        console.error("❌ calculateId failed:", calcError);
        throw new Error(
          `Failed to calculate listing ID: ${
            calcError instanceof Error ? calcError.message : "Unknown error"
          }`
        );
      }

      // Step 3: Submit purchase with ZK proof and calculated listing ID
      setAddressNotice("Submitting claim to blockchain...");

      // Create the final listing for submission (reuse the same structure)
      const listing = createListing(
        order.listing_title || `Order #${shopifyOrderId}`,
        shopifyOrderId.toString(),
        parseEther(order.total_price?.toString() || "0"),
        walletAddress as `0x${string}`,
        credentialsHash
      );

      // Now manually execute the purchase flow with our calculated ID
      let purchaseResult;
      try {
        console.log(
          "🔗 Submitting purchase with calculated listing ID:",
          listingId
        );

        // Use the contract hooks that are already available from useZkPurchaseFlow
        const purchaseHash = await executePurchaseFlow({
          listing,
          orderId: shopifyOrderId.toString(),
          walletAddress: walletAddress as `0x${string}`,
          extractionFields: [
            "id",
            "total_price",
            "financial_status",
            "fulfillment_status",
          ],
        });

        console.log("✅ Purchase flow completed:", purchaseHash);
        purchaseResult = purchaseHash;

        setAddressNotice("Purchase confirmed! Updating database...");
      } catch (purchaseError) {
        console.error("❌ Purchase submission failed:", purchaseError);
        throw new Error(
          `Purchase submission failed: ${
            purchaseError instanceof Error
              ? purchaseError.message
              : "Unknown error"
          }`
        );
      }

      // Also call the traditional claim API for database updates
      const response = await fetch(`/api/orders/${shopifyOrderId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          zkProof: zkProofResult.zkProof,
          transactionHash: purchaseResult.purchaseHash,
          listingId: listingId, // Use our calculated listing ID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.warn("Database claim update failed:", result.error);
        // Don't fail the entire process if blockchain succeeded
      }

      setAddressNotice(
        `Order claimed successfully! Transaction: ${purchaseResult.purchaseHash.slice(
          0,
          10
        )}...`
      );

      // Refresh orders data to reflect the claim
      if (shopifyOrdersData) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error claiming order with ZK proof:", error);
      setAddressNotice(
        error instanceof Error
          ? `Failed to claim order: ${error.message}`
          : "Failed to claim order. Please try again."
      );
    }
  };

  const renderOrders = (orders: AccountOrder[]) => {
    if (!orders.length) {
      return <p className="text-sm text-zinc-500">No orders yet.</p>;
    }

    return (
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded border border-white/10 bg-black/30 p-4"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  {order.listing?.title ??
                    `Listing #${order.listing_id ?? "--"}`}
                </p>
                <p className="text-sm text-zinc-500">
                  Status: {order.status ?? "unknown"} · Updated{" "}
                  {formatDate(order.updated_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-emerald-300">
                  {order.total_amount || order.unit_price || "--"}
                </p>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {order.order_type || "Standard"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRequests = (requests: Listing[]) => {
    console.log("renderRequests called with:", requests);
    console.log("requests.length:", requests?.length);

    if (!requests.length) {
      return (
        <div className="text-sm text-zinc-500">
          <p>No purchase requests.</p>
          <p className="text-xs text-zinc-600 mt-2">
            Debug: Total requests = {requests?.length || 0}
          </p>
        </div>
      );
    }

    const handleDeleteRequest = async (requestId: number) => {
      if (!confirm("Are you sure you want to delete this purchase request?")) {
        return;
      }

      try {
        const { error } = await supabase
          .from("listings")
          .delete()
          .eq("id", requestId);

        if (error) {
          console.error("Error deleting request:", error);
          alert("Failed to delete request. Please try again.");
        } else {
          // Refresh the data
          refetch();
        }
      } catch (err) {
        console.error("Error deleting request:", err);
        alert("Failed to delete request. Please try again.");
      }
    };

    return (
      <div className="space-y-3">
        {requests.map((request) => {
          if (request.status !== "available") return null;
          return (
            <div
              key={request.id}
              className="rounded border border-white/10 bg-black/30 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex-1  max-w-fit">
                  <p className="text-lg  font-semibold text-white">
                    {request.title}
                  </p>

                  {request.url && (
                    <a
                      href={request.url}
                      className="text-sm w-[40%] overflow-hidden text-zinc-400 mt-1 line-clamp-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Check item
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-base text-emerald-300">
                      Budget {request.max_budget ?? request.price ?? "--"}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {request.category ?? "general"}
                    </p>
                  </div>
                  {request.status === "available" && (
                    <button
                      onClick={() => handleDeleteRequest(request.id)}
                      className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-900/20 transition-colors"
                      title="Delete request"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const stats = {
    orders:
      (data?.orders.length ?? 0) + (shopifyOrdersData?.data.orders.length ?? 0),
    listings: data?.listings?.length ?? 0,
    // revenue: shopifyOrdersData?.data.analytics?.totalRevenue ?? 0,
  };

  const activeListings = useMemo(() => {
    if (data?.listings) {
      return data.listings.filter((listing) => listing.status === "available");
    }
    return [];
  }, [data?.listings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#020202] to-black text-white">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="rounded border border-emerald-400/10 bg-black/40 p-6 shadow-[0_10px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-emerald-300">
                Account
              </p>
              <h1 className="mt-3 text-3xl font-semibold">
                {currentUser?.full_name ||
                  data?.user?.full_name ||
                  "Your Profile"}
              </h1>
              <p className="text-sm text-zinc-500">
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "Connect your wallet to view account data."}
              </p>
              {defaultAddress && (
                <p className="text-xs text-emerald-400 mt-1">
                  📍 {defaultAddress.city}, {defaultAddress.state_province}{" "}
                  {defaultAddress.postal_code}
                </p>
              )}
              {!defaultAddress &&
                data?.addresses &&
                data.addresses.length > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    📍 Address found but not set as default
                  </p>
                )}
            </div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded border border-white/10 bg-black/30 px-5 py-4 text-center"
                >
                  <p className="text-3xl font-semibold text-emerald-300">
                    {value}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {key}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {isLoading && (
            <p className="mt-4 text-sm text-zinc-500">
              Loading account data...
            </p>
          )}
          {error && (
            <div className="mt-4 p-3 rounded bg-red-900/20 border border-red-400/20">
              <p className="text-sm text-red-400">
                Error: {error instanceof Error ? error.message : error}
              </p>
            </div>
          )}
          {zkError && (
            <div className="mt-4 p-3 rounded bg-red-900/20 border border-red-400/20">
              <p className="text-sm text-red-400">ZK Proof Error: {zkError}</p>
              <button
                onClick={clearZkError}
                className="text-xs text-red-300 hover:text-red-200 mt-1 underline"
              >
                Clear error
              </button>
            </div>
          )}
          {currentStep && (
            <div className="mt-4 p-3 rounded bg-emerald-900/20 border border-emerald-400/20">
              <p className="text-sm text-emerald-200 flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full" />
                {currentStep}
              </p>
            </div>
          )}
          {!walletAddress && (
            <div className="mt-4 p-3 rounded bg-yellow-900/20 border border-yellow-400/20">
              <p className="text-sm text-yellow-400">
                Please connect your wallet to load your account information.
              </p>
            </div>
          )}
        </div>

        {walletAddress && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Shopify Orders - New Order Tracking System */}
            <section
              className={cn(
                "rounded max-h-[600px] overflow-y-auto border border-white/10 bg-black/40 p-6",
                customScrollbar
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Orders</h2>
                <span className="text-sm text-zinc-500">
                  {shopifyOrdersData?.data.orders.length ?? 0} orders
                </span>
              </div>
              {isShopifyOrdersLoading ? (
                <p className="text-sm text-zinc-500">
                  Loading marketplace orders...
                </p>
              ) : shopifyOrdersError ? (
                <p className="text-sm text-red-400">
                  Error loading orders: {shopifyOrdersError.message}
                </p>
              ) : !shopifyOrdersData?.data.orders.length ? (
                <div className="text-sm text-zinc-500">
                  <p>No marketplace orders yet.</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    Debug: walletAddress = {walletAddress}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Orders data:{" "}
                    {JSON.stringify(shopifyOrdersData?.data, null, 2)}
                  </p>
                  {zkError && (
                    <div className="mt-3 p-2 rounded bg-red-900/20 border border-red-400/20">
                      <p className="text-xs text-red-400">
                        ZK Error: {zkError}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {shopifyOrdersData.data.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded border border-white/10 bg-black/30 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-white">
                            {order.listing_title}
                          </p>
                          <p className="text-sm text-zinc-500">
                            Status: {order.order_status} · Order #
                            {order.shopify_order_id}
                          </p>
                          {order.tracking_info && (
                            <p className="text-xs text-emerald-400">
                              Tracking: {order.tracking_info.tracking_number} (
                              {order.tracking_info.shipment_status})
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-semibold text-emerald-300">
                              ${order.total_price} {order.currency}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          {order.order_status === "fulfilled" &&
                            !order.claimed_at &&
                            order.purchaser_wallet_address?.toLowerCase() ===
                              walletAddress?.toLowerCase() && (
                              <Button
                                onClick={() =>
                                  handleClaimOrder(
                                    order.shopify_order_id,
                                    order
                                  )
                                }
                                disabled={isZkProcessing}
                                className="rounded border border-emerald-400 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/30 px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isZkProcessing ? (
                                  <span className="flex items-center gap-2">
                                    <div className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full" />
                                    {currentStep
                                      ? currentStep.slice(0, 15) + "..."
                                      : "Processing..."}
                                  </span>
                                ) : (
                                  "Claim with ZK Proof"
                                )}
                              </Button>
                            )}
                          {order.claimed_at && (
                            <div className="text-right">
                              <p className="text-sm font-semibold text-emerald-300">
                                ✓ Claimed
                              </p>
                              <p className="text-xs text-emerald-400">
                                {formatDate(order.claimed_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              className={cn(
                "rounded border max-h-[600px] border-white/10 bg-black/40 p-6",
                customScrollbar
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Active Listings</h2>
                <span className="text-sm text-zinc-500">
                  {activeListings.length ?? 0} active listings
                </span>
              </div>

              {data?.listings &&
                data.listings.length > 0 &&
                renderRequests(data.listings)}
            </section>
          </div>
        )}

        {walletAddress && (
          <AddressFormSection
            key={defaultAddress?.updated_at ?? defaultAddress?.id ?? "new"}
            defaultValues={buildAddressValues(defaultAddress)}
            notice={addressNotice}
            isSaving={isSavingAddress}
            onSubmit={handleAddressSubmit}
          />
        )}
      </main>
    </div>
  );
}

interface AddressFormSectionProps {
  defaultValues: AddressFormValues;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  notice: string | null;
  isSaving: boolean;
}

function AddressFormSection({
  defaultValues,
  onSubmit,
  notice,
  isSaving,
}: AddressFormSectionProps) {
  const [formValues, setFormValues] =
    useState<AddressFormValues>(defaultValues);

  // Update form values when defaultValues change (when address data is loaded)
  useEffect(() => {
    setFormValues(defaultValues);
  }, [defaultValues]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(formValues);
  };

  return (
    <section className="rounded border border-white/10 bg-black/40 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Delivery address</h2>
        <p className="text-sm text-zinc-500">
          Update where you want orders fulfilled and delivered.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm text-zinc-400 md:col-span-2">
          <span className="mb-2 block">Full name</span>
          <input
            type="text"
            required
            value={formValues.full_name}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, full_name: e.target.value }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">Address line 1</span>
          <input
            type="text"
            required
            value={formValues.address_line_1}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                address_line_1: e.target.value,
              }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">Address line 2</span>
          <input
            type="text"
            value={formValues.address_line_2}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                address_line_2: e.target.value,
              }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">City</span>
          <input
            type="text"
            required
            value={formValues.city}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, city: e.target.value }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">State / Province</span>
          <input
            type="text"
            value={formValues.state_province}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                state_province: e.target.value,
              }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">Postal code</span>
          <input
            type="text"
            required
            value={formValues.postal_code}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                postal_code: e.target.value,
              }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">Country</span>
          <input
            type="text"
            required
            value={formValues.country}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                country: e.target.value,
              }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <label className="text-sm text-zinc-400">
          <span className="mb-2 block">Phone</span>
          <input
            type="tel"
            value={formValues.phone}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full rounded border border-emerald-400/40 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </label>

        <div className="md:col-span-2">
          {notice && <p className="mb-3 text-sm text-emerald-200">{notice}</p>}
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full rounded border border-emerald-400 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/30"
          >
            {isSaving ? "Saving..." : "Save address"}
          </Button>
        </div>
      </form>
    </section>
  );
}
