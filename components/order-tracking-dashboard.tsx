"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { useUserOrders } from "@/app/hooks/useOrderTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useState } from "react";

export default function OrderTrackingDashboard() {
  const { user } = useCurrentUser();
  const { data, isLoading, error, refetch } = useUserOrders(
    user?.wallet_address || null
  );

  const [selectedTab, setSelectedTab] = useState<
    "all" | "created" | "purchased"
  >("all");

  if (!user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-zinc-500">
            Please connect your wallet to view orders
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <p className="text-zinc-500">Loading orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <p>Failed to load orders</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const orders = data?.data.orders || [];
  const analytics = data?.data.analytics;

  // Filter orders based on selected tab
  const filteredOrders = orders.filter((order) => {
    // if (selectedTab === 'created') {
    //   // Orders for listings created by this user (they are the seller)
    //   return order.creator_wallet_address === user.wallet_address;
    // } else if (selectedTab === 'purchased') {
    //   // Orders purchased by this user (they are the buyer)
    //   return order.purchaser_wallet_address === user.wallet_address;
    // }
    return true; // All orders
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "paid":
        return <Package className="h-4 w-4" />;
      case "fulfilled":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "paid":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "fulfilled":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "delivered":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-emerald-400/20 bg-black/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ${analytics.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-emerald-400/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-400/20 bg-black/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {analytics.totalOrders}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-blue-400/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-400/20 bg-black/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Avg Order Value</p>
                  <p className="text-2xl font-bold text-purple-400">
                    $
                    {analytics.totalOrders > 0
                      ? (
                          analytics.totalRevenue / analytics.totalOrders
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-400/60" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <Card className="border-white/10 bg-black/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Order History</CardTitle>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              onClick={() => setSelectedTab("all")}
              variant={selectedTab === "all" ? "default" : "ghost"}
              size="sm"
              className={
                selectedTab === "all"
                  ? "bg-emerald-400/20 text-emerald-400 border-emerald-400/20"
                  : "text-zinc-400 hover:text-white"
              }
            >
              All Orders
            </Button>
            <Button
              onClick={() => setSelectedTab("created")}
              variant={selectedTab === "created" ? "default" : "ghost"}
              size="sm"
              className={
                selectedTab === "created"
                  ? "bg-emerald-400/20 text-emerald-400 border-emerald-400/20"
                  : "text-zinc-400 hover:text-white"
              }
            >
              Sales
            </Button>
            <Button
              onClick={() => setSelectedTab("purchased")}
              variant={selectedTab === "purchased" ? "default" : "ghost"}
              size="sm"
              className={
                selectedTab === "purchased"
                  ? "bg-emerald-400/20 text-emerald-400 border-emerald-400/20"
                  : "text-zinc-400 hover:text-white"
              }
            >
              Purchases
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500">No orders found</p>
              <p className="text-sm text-zinc-600 mt-2">
                {selectedTab === "created" && "You haven't made any sales yet"}
                {selectedTab === "purchased" &&
                  "You haven't made any purchases yet"}
                {selectedTab === "all" && "No orders to display"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.order_status)}
                      <div>
                        <p className="font-medium text-white">
                          {order.listing_title}
                        </p>
                        <p className="text-sm text-zinc-400">
                          Order #{order.shopify_order_id}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-emerald-400">
                        ${order.total_price.toFixed(2)}
                      </p>
                      <Badge className={getStatusColor(order.order_status)}>
                        {order.order_status}
                      </Badge>
                    </div>

                    {order.tracking_info && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <a
                          href={order.tracking_info.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Track
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
