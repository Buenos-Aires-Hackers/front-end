# React Query Hooks for Listings

This folder contains React Query hooks for managing listings data from the Supabase database.

## Available Hooks

### `useListings(options?)`

Fetches multiple listings with optional filtering and sorting.

**Options:**

- `category?: string` - Filter by category
- `inStock?: boolean` - Filter by stock status
- `orderBy?: 'created_at' | 'price' | 'rating' | 'title'` - Sort field (default: 'created_at')
- `orderDirection?: 'asc' | 'desc'` - Sort direction (default: 'desc')
- `limit?: number` - Maximum number of results (default: 50)

**Returns:**

- `listings: Listing[]` - Array of listings
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => void` - Function to refetch data

**Example:**

```tsx
import { useListings } from "../hooks";

function ListingsPage() {
  const { listings, isLoading, error } = useListings({
    category: "electronics",
    inStock: true,
    orderBy: "price",
    orderDirection: "asc",
    limit: 20,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {listings.map((listing) => (
        <div key={listing.id}>{listing.title}</div>
      ))}
    </div>
  );
}
```

### `useListing(id)`

Fetches a single listing by ID.

**Parameters:**

- `id: number | string` - The listing ID

**Returns:**

- `listing: Listing | null` - The listing data or null if not found
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => void` - Function to refetch data

**Example:**

```tsx
import { useListing } from "../hooks";

function ListingDetail({ listingId }: { listingId: number }) {
  const { listing, isLoading, error } = useListing(listingId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!listing) return <div>Listing not found</div>;

  return (
    <div>
      <h1>{listing.title}</h1>
      <p>{listing.description}</p>
      <p>Price: {listing.price}</p>
    </div>
  );
}
```

### `useCreateListing()`

Creates a new listing.

**Returns:**

- `createListing: (data: CreateListingData) => Promise<Listing>` - Function to create listing
- `isCreating: boolean` - Loading state
- `createError: Error | null` - Error state

**Example:**

```tsx
import { useCreateListing } from "../hooks";

function CreateListingForm() {
  const { createListing, isCreating, createError } = useCreateListing();

  const handleSubmit = async (formData: CreateListingData) => {
    try {
      const newListing = await createListing(formData);
      console.log("Created listing:", newListing);
    } catch (error) {
      console.error("Failed to create listing:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Listing"}
      </button>
      {createError && <div>Error: {createError.message}</div>}
    </form>
  );
}
```

### `useUpdateListing()`

Updates an existing listing.

**Returns:**

- `updateListing: (data: UpdateListingData) => Promise<Listing>` - Function to update listing
- `isUpdating: boolean` - Loading state
- `updateError: Error | null` - Error state

**Example:**

```tsx
import { useUpdateListing } from "../hooks";

function EditListingForm({ listingId }: { listingId: number }) {
  const { updateListing, isUpdating, updateError } = useUpdateListing();

  const handleSubmit = async (formData: Partial<CreateListingData>) => {
    try {
      const updatedListing = await updateListing({
        id: listingId,
        ...formData,
      });
      console.log("Updated listing:", updatedListing);
    } catch (error) {
      console.error("Failed to update listing:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isUpdating}>
        {isUpdating ? "Updating..." : "Update Listing"}
      </button>
      {updateError && <div>Error: {updateError.message}</div>}
    </form>
  );
}
```

### `useDeleteListing()`

Deletes a listing.

**Returns:**

- `deleteListing: (id: number) => Promise<void>` - Function to delete listing
- `isDeleting: boolean` - Loading state
- `deleteError: Error | null` - Error state

**Example:**

```tsx
import { useDeleteListing } from "../hooks";

function DeleteListingButton({ listingId }: { listingId: number }) {
  const { deleteListing, isDeleting, deleteError } = useDeleteListing();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this listing?")) {
      try {
        await deleteListing(listingId);
        console.log("Listing deleted");
      } catch (error) {
        console.error("Failed to delete listing:", error);
      }
    }
  };

  return (
    <div>
      <button onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Delete Listing"}
      </button>
      {deleteError && <div>Error: {deleteError.message}</div>}
    </div>
  );
}
```

## Listing Type

The `Listing` interface includes the following fields:

```typescript
interface Listing {
  id: number;
  title: string;
  description?: string;
  price: string;
  tags?: string[];
  ordered_by?: string;
  url?: string;
  original_price?: string;
  image_url?: string;
  badge?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  in_stock?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

## Features

- **Automatic Caching**: All queries are cached for optimal performance
- **Background Updates**: Data is automatically refetched when stale
- **Optimistic Updates**: Cache is invalidated and updated after mutations
- **Error Handling**: Proper error handling with typed error states
- **TypeScript Support**: Full TypeScript support with proper typing
- **Filtering & Sorting**: Built-in filtering and sorting options for listings
