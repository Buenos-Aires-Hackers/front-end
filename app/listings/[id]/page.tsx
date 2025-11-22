"use client";

import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useListing } from "../../hooks/useListing";

export default function ListingPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;

  const { listing, isLoading, error } = useListing(parseInt(listingId));

  const handleAddToCart = () => {
    console.log(`Added listing ${listingId} to cart`);
    // Add cart logic here
  };

  const handleToggleFavorite = () => {
    console.log(`Toggled favorite for listing ${listingId}`);
    // Add favorites logic here
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title,
        text: listing?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2 text-gray-600">Loading listing...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-24">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-800 font-medium">Error loading listing</p>
              <p className="text-red-600 text-sm mt-1">{error.message}</p>
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="mt-4"
              >
                Go Back
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Listing not found
            </h1>
            <p className="text-gray-600 mb-6">
              The listing you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="gap-2 pl-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 relative">
              {listing.badge && (
                <Badge className="absolute left-4 top-4 z-10" variant="default">
                  {listing.badge}
                </Badge>
              )}

              {listing.image_url ? (
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {listing.title}
              </h1>

              {/* Rating */}
              {listing.rating && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(listing.rating!)
                            ? "fill-yellow-400 text-yellow-400"
                            : i < listing.rating!
                            ? "fill-yellow-400/50 text-yellow-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {listing.rating} ({listing.reviews || 0} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  {listing.price}
                </span>
                {listing.original_price && (
                  <span className="text-lg text-muted-foreground line-through">
                    {listing.original_price}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {listing.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category and Stock Status */}
            <div className="space-y-2">
              {listing.category && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category</span>
                  <Badge variant="outline">{listing.category}</Badge>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Availability</span>
                <Badge variant={listing.in_stock ? "default" : "secondary"}>
                  {listing.in_stock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                className="flex-1 gap-2"
                disabled={!listing.in_stock}
              >
                <ShoppingCart className="h-4 w-4" />
                {listing.in_stock ? "Add to Cart" : "Out of Stock"}
              </Button>

              <Button
                onClick={handleToggleFavorite}
                variant="outline"
                size="icon"
              >
                <Heart className="h-4 w-4" />
              </Button>

              <Button onClick={handleShare} variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-500 space-y-1">
              {listing.created_at && (
                <p>
                  Listed on {new Date(listing.created_at).toLocaleDateString()}
                </p>
              )}
              {listing.updated_at &&
                listing.updated_at !== listing.created_at && (
                  <p>
                    Last updated{" "}
                    {new Date(listing.updated_at).toLocaleDateString()}
                  </p>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
