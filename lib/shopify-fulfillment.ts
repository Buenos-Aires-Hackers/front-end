const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_API!;

export interface FulfillmentDetails {
  fulfillment: {
    id: string;
    status: string;
    created_at: string;
    tracking_company?: string;
    tracking_number?: string;
    tracking_url?: string;
  };
  order: {
    id: string;
    name: string;
    email: string;
    financial_status: string;
    fulfillment_status: string;
    created_at: string;
    checkout_id?: string;
  };
}

export async function getFulfillmentDetails(fulfillmentId: string): Promise<{
  success: boolean;
  data?: FulfillmentDetails;
  error?: string;
}> {
  try {
    console.log(`Fetching fulfillment details for ID: ${fulfillmentId}`);

    // Use GraphQL to directly fetch fulfillment by ID - much more efficient!
    const fulfillmentGid = `gid://shopify/Fulfillment/${fulfillmentId}`;

    const graphqlQuery = `
      query GetFulfillment($id: ID!) {
        fulfillment(id: $id) {
          id
          legacyResourceId
          name
          status
          createdAt
          trackingInfo {
            company
            number
            url
          }
          order {
            id
            legacyResourceId
            name
            email
            processedAt
            createdAt
            totalPrice {
              amount
              currencyCode
            }
            checkoutId
            financialStatus
            fulfillmentStatus
          }
        }
      }
    `;

    const graphqlResponse = await fetch(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { id: fulfillmentGid },
        }),
      }
    );

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error("GraphQL request failed:", errorText);
      return {
        success: false,
        error: "Failed to fetch fulfillment from Shopify GraphQL",
      };
    }

    const graphqlData = await graphqlResponse.json();

    if (graphqlData.errors) {
      console.error("GraphQL errors:", graphqlData.errors);
      return {
        success: false,
        error: "GraphQL query failed",
      };
    }

    const fulfillment = graphqlData.data?.fulfillment;

    if (!fulfillment) {
      console.warn(`Fulfillment ${fulfillmentId} not found via GraphQL`);
      return {
        success: false,
        error: "Fulfillment not found in Shopify",
      };
    }

    console.log(
      `Found fulfillment ${fulfillmentId} in order ${fulfillment.order.legacyResourceId}`
    );

    return {
      success: true,
      data: {
        fulfillment: {
          id: fulfillment.legacyResourceId,
          status: fulfillment.status,
          created_at: fulfillment.createdAt,
          tracking_company: fulfillment.trackingInfo?.[0]?.company,
          tracking_number: fulfillment.trackingInfo?.[0]?.number,
          tracking_url: fulfillment.trackingInfo?.[0]?.url,
        },
        order: {
          id: fulfillment.order.legacyResourceId,
          name: fulfillment.order.name,
          email: fulfillment.order.email,
          financial_status: fulfillment.order.financialStatus,
          fulfillment_status: fulfillment.order.fulfillmentStatus,
          created_at: fulfillment.order.createdAt,
          checkout_id: fulfillment.order.checkoutId,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching fulfillment details:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}
