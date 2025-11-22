"use client";

import ListingsGrid from "@/components/listings-grid";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type OrderField = "created_at" | "price" | "rating" | "title";
type SortOption = { value: OrderField; label: string; direction: "asc" | "desc" };

const categories = [
  "All",
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports",
  "Books",
  "Health & Beauty",
  "Automotive",
];

const sortOptions: SortOption[] = [
  { value: "created_at", label: "Newest", direction: "desc" },
  { value: "created_at", label: "Oldest", direction: "asc" },
  { value: "price", label: "Price: Low to High", direction: "asc" },
  { value: "price", label: "Price: High to Low", direction: "desc" },
  { value: "rating", label: "Highest Rated", direction: "desc" },
  { value: "title", label: "A-Z", direction: "asc" },
  { value: "title", label: "Z-A", direction: "desc" },
];

export default function AllListingsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0]);
  const [showInStockOnly, setShowInStockOnly] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            All Listings
          </h1>
          <p className="text-lg text-gray-600">
            Browse our complete marketplace
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-6">
          {/* Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sort by
                </label>
                <select
                  value={`${selectedSort.value}-${selectedSort.direction}`}
                  onChange={(e) => {
                    const [value, direction] = e.target.value.split("-");
                    const option = sortOptions.find(
                      (opt) =>
                        opt.value === value && opt.direction === direction
                    );
                    if (option) setSelectedSort(option);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sortOptions.map((option, index) => (
                    <option
                      key={index}
                      value={`${option.value}-${option.direction}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inStock"
                checked={showInStockOnly}
                onChange={(e) => setShowInStockOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="inStock" className="text-sm font-medium">
                In stock only
              </label>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <ListingsGrid
          category={
            selectedCategory === "All"
              ? undefined
              : selectedCategory.toLowerCase()
          }
          inStock={showInStockOnly ? true : undefined}
          orderBy={selectedSort.value}
          orderDirection={selectedSort.direction}
          limit={24}
          showTitle={false}
        />
      </main>
    </div>
  );
}
