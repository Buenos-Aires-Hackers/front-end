import { NextRequest, NextResponse } from "next/server";
import { getFulfillmentDetails } from "@/lib/shopify-fulfillment";

export async function GET(
  request: NextRequest,
  { params }: { params: { fulfillmentId: string } }
) {
  try {
    const { fulfillmentId } = params;

    if (!fulfillmentId) {
      return NextResponse.json(
        { error: "Fulfillment ID is required" },
        { status: 400 }
      );
    }

    const result = await getFulfillmentDetails(fulfillmentId);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Fulfillment not found",
          fulfillmentId,
          message: result.error
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      fulfillment: result.data!.fulfillment,
      order: result.data!.order
    });
  } catch (error) {
    console.error("Error fetching fulfillment details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
