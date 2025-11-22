import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    console.log("=== DEBUG WEBHOOK RECEIVED ===");
    console.log("URL:", request.url);
    console.log("Method:", request.method);
    console.log("Headers:", headers);
    console.log("Body:", body);
    console.log("=== END DEBUG ===");

    // Log to database for persistence
    await supabase.from("webhook_logs").insert({
      webhook_topic: "debug-webhook",
      payload: {
        url: request.url,
        method: request.method,
        headers: headers,
        body: body,
        timestamp: new Date().toISOString(),
      },
      processed: true,
    });

    return NextResponse.json({
      success: true,
      message: "Debug webhook received and logged",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in debug webhook:", error);
    return NextResponse.json(
      {
        error: "Debug webhook error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Debug webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
