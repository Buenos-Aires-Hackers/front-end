"use client";

import { type Listing } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useListings } from "../app/hooks/useListings";
import FulfillOrderModal from "./fulfill-order-modal";
import ProductCard from "./product-card";

interface ListingsGridProps {
  category?: string;
  inStock?: boolean;
  hideAvailable?: boolean;
  orderBy?: "created_at" | "price" | "rating" | "title";
  orderDirection?: "asc" | "desc";
  limit?: number;
  showTitle?: boolean;
  title?: string;
  className?: string;
  searchTerm?: string;
}

export default function ListingsGrid({
  category,
  inStock = true,
  hideAvailable = false,
  orderBy = "created_at",
  orderDirection = "desc",
  limit = 12,
  showTitle = false,
  title = "Listings",
  className = "",
  searchTerm = "",
}: ListingsGridProps) {
  const router = useRouter();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showFulfillModal, setShowFulfillModal] = useState(false);

  const { listings, isLoading, error } = useListings({
    category,
    inStock,
    hideAvailable,
    orderBy,
    orderDirection,
    limit,
  });

  const handleAddToCart = (listingId: number) => {
    console.log(`Added listing ${listingId} to cart`);
    // Add cart logic here
  };

  const handleViewListing = (listingId: number) => {
    router.push(`/listings/${listingId}`);
  };

  const handleFulfill = (listing: Listing) => {
    setSelectedListing(listing);
    setShowFulfillModal(true);
  };

  const handleFulfillSuccess = (checkoutUrl: string) => {
    console.log(
      `Fulfillment initiated for listing ${selectedListing?.id}, checkout: ${checkoutUrl}`
    );
    setShowFulfillModal(false);
    setSelectedListing(null);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredListings = normalizedSearch
    ? listings.filter((listing) =>
        listing.title?.toLowerCase().includes(normalizedSearch)
      )
    : listings;

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showTitle && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          </div>
        )}
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2 text-gray-600">Loading listings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showTitle && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          </div>
        )}
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded p-4 max-w-md mx-auto">
            <p className="text-red-800 font-medium">Error loading listings</p>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!filteredListings.length) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showTitle && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          </div>
        )}
        <div className="text-center py-12">
          <p className="text-gray-600">
            {normalizedSearch
              ? `No listings match "${searchTerm}".`
              : "No listings found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {showTitle && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-500">
            Showing {filteredListings.length} listing
            {filteredListings.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
        {filteredListings.map((listing) => (
          <div
            key={listing.id}
            // onClick={() => handleViewListing(listing.id)}
            className="cursor-pointer transition-transform duration-300 hover:-translate-y-2"
          >
            <ProductCard
              id={listing.id}
              title={listing.title}
              description={listing.description || ""}
              price={listing.price}
              originalPrice={listing.original_price}
              imageUrl={listing.image_url}
              badge={listing.badge}
              listing={listing}
              onAddToCart={(e) => {
                e?.stopPropagation();
                handleAddToCart(listing.id);
              }}
              onFulfill={handleFulfill}
            />
          </div>
        ))}
      </div>

      {/* Fulfill Order Modal */}
      <FulfillOrderModal
        isOpen={showFulfillModal}
        onClose={() => {
          setShowFulfillModal(false);
          setSelectedListing(null);
        }}
        listing={selectedListing}
        onSuccess={handleFulfillSuccess}
      />
    </div>
  );
}
