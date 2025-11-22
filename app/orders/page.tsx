import OrderTrackingDashboard from "@/components/order-tracking-dashboard";

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-emerald-950/20 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order Tracking</h1>
          <p className="text-zinc-400">
            Monitor your sales and purchases across the marketplace
          </p>
        </div>

        <OrderTrackingDashboard />
      </div>
    </div>
  );
}
