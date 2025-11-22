# EthStore - Decentralized Marketplace with Shopify Integration

A Web3 marketplace where users can create purchase requests and have them fulfilled by other users through Shopify checkout integration.

## Features

### 🛒 **Dual-Role Order System**

- **Requesters**: Create listings with delivery details and offer prices
- **Fulfillers**: Browse listings and fulfill orders through Shopify checkout
- Automatic address prefill from requester's profile

### 💳 **Shopify Integration**

- Seamless checkout experience with Shopify Storefront API
- Auto-prefilled delivery addresses from order creator
- Product variant detection from URLs
- Real-time cart creation with buyer preferences

### 🔗 **Web3 Features**

- Wallet-based authentication (WalletConnect, MetaMask, etc.)
- Cross-chain support (Ethereum, Base, Arbitrum, Optimism)
- On-chain order tracking and fulfillment status

### 📦 **Order Management**

- Real-time fulfillment status tracking
- Order history for both buyers and fulfillers
- Automated reward system for successful fulfillments

## Architecture

### **Fulfillment Flow**

1. **Requester** creates a listing with:

   - Product URL (Shopify store)
   - Delivery address
   - Offer price
   - Connected wallet address

2. **Fulfiller** clicks "Fulfill" and:

   - Views order details and delivery address
   - System fetches product variant from URL
   - Creates Shopify cart with prefilled address
   - Opens checkout in new tab
   - Order status tracked in database

3. **Order Tracking**:
   - `fulfiller_processing` → `shipped` → `delivered` → `completed`
   - Automatic reward calculations
   - Status updates and notifications

### **Tech Stack**

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Web3**: WalletConnect, Wagmi, Viem
- **Database**: Supabase (PostgreSQL)
- **E-commerce**: Shopify Storefront API
- **State Management**: TanStack Query

## Setup

### Prerequisites

- Node.js 18+
- Supabase account and project
- Shopify store with Storefront API access
- WalletConnect Project ID (optional)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ethglobal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Shopify (Required for fulfillment)
   NEXT_PUBLIC_SHOPIFY_STORE_NAME=your-store-name
   NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
   ```

4. **Database Setup**

   - Import the database schema from `DATABASE_SCHEMA.md`
   - Run migrations in your Supabase project
   - Enable Row Level Security (RLS)

5. **Shopify Configuration**
   - Create a Shopify store or use existing one
   - Generate Storefront API access token
   - Ensure products have proper handles/URLs

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Key Components

### **Core Hooks**

- `useOrderCreatorAddress` - Fetches delivery address from wallet
- `useShopifyCart` - Creates Shopify carts with prefilled data
- `useFulfillmentMutations` - Manages order creation and updates
- `useFulfillmentOrders` - Fetches orders by role/status

### **Main Components**

- `FulfillOrderModal` - Order fulfillment interface
- `CreateOrderModal` - Request creation interface
- `ProductCard` - Listing display with fulfill action
- `ListingsGrid` - Browse all available listings

### **Database Schema**

See `DATABASE_SCHEMA.md` for detailed information about:

- User management with wallet integration
- Listing and order structures
- Role-based permissions (buyer/fulfiller)
- Order status workflow
- Address management

## API Integration

### **Shopify Storefront API**

```typescript
// Example: Creating a cart with prefilled address
const cartResponse = await createCart({
  productVariantId: "gid://shopify/ProductVariant/123",
  quantity: 1,
  email: "user@example.com",
  countryCode: "US",
  deliveryAddress: {
    firstName: "John",
    lastName: "Doe",
    address1: "123 Main St",
    city: "New York",
    province: "NY",
    country: "US",
    zip: "10001",
  },
});
```

### **Database Operations**

```typescript
// Example: Creating fulfillment order
await createFulfillmentOrder({
  listingId: 123,
  fulfillerId: "0x123...",
  checkoutUrl: "https://checkout.shopify.com/...",
  status: "fulfiller_processing",
});
```

## Deployment

### **Vercel (Recommended)**

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### **Other Platforms**

- Ensure Node.js 18+ runtime
- Set environment variables
- Run `npm run build` and `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

---

## Troubleshooting

### **Common Issues**

**Shopify Integration:**

- Verify store name and access token
- Ensure products have valid handles
- Check Storefront API permissions

**Database:**

- Confirm RLS policies are enabled
- Verify table relationships and foreign keys
- Check user permissions

**Web3:**

- Ensure wallet is connected
- Verify network compatibility
- Check WalletConnect configuration

### **Support**

- Check the issues section for common problems
- Review database schema documentation
- Verify environment variable setup
