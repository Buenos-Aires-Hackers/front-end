# Shopify Webhooks Setup Guide

## Current Issue

Your order tracking system exists but webhooks may not be properly configured. This means:

- Orders don't appear after purchases
- Purchased listings aren't hidden from display

## Webhook Setup Requirements

### 1. App Configuration (shopify.app.toml)

You need to configure webhooks in your Shopify app configuration. Based on the GraphQL schema research, here are the key order-related webhook topics:

```toml
[webhooks]
api_version = "2025-01"

[webhooks.orders_paid]
endpoint = "/api/webhooks/orders/paid"

[webhooks.orders_fulfilled]
endpoint = "/api/webhooks/orders/fulfilled"

[webhooks.orders_cancelled]
endpoint = "/api/webhooks/orders/cancelled"

[webhooks.orders_partially_fulfilled]
endpoint = "/api/webhooks/orders/partially_fulfilled"
```

### 2. Webhook Endpoints Setup

Your app needs to handle webhook events at the specified endpoints. The webhooks will be sent as POST requests to your app.

### 3. Shopify App Setup

In your Shopify Partner Dashboard:

1. Go to your app settings
2. Navigate to "App setup" → "Webhooks"
3. Configure the webhook endpoints
4. Ensure your app has the required scopes: `read_orders`, `write_orders`

### 4. GraphQL Webhook Subscription (Alternative)

You can also set up webhooks programmatically using the GraphQL Admin API:

```graphql
mutation webhookSubscriptionCreate(
  $topic: WebhookSubscriptionTopic!
  $webhookSubscription: WebhookSubscriptionInput!
) {
  webhookSubscriptionCreate(
    topic: $topic
    webhookSubscription: $webhookSubscription
  ) {
    webhookSubscription {
      id
      callbackUrl
      topic
      format
    }
    userErrors {
      field
      message
    }
  }
}
```

With variables:

```json
{
  "topic": "ORDERS_PAID",
  "webhookSubscription": {
    "uri": "https://your-app-domain.com/api/webhooks/orders/paid",
    "format": "JSON"
  }
}
```

## Available Order Webhook Topics

Based on the GraphQL schema, these are the key topics for order tracking:

- `ORDERS_CANCELLED`
- `ORDERS_CREATE`
- `ORDERS_DELETE`
- `ORDERS_EDITED`
- `ORDERS_FULFILLED`
- `ORDERS_PAID`
- `ORDERS_PARTIALLY_FULFILLED`
- `ORDERS_UPDATED`

## Next Steps

1. Create webhook endpoint handlers (see webhook implementation files)
2. Configure webhooks in Shopify app dashboard
3. Test webhook delivery using Shopify's webhook testing tools
4. Update listing display logic to hide purchased items
