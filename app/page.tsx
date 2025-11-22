"use client";

import CreateOrderModal from "@/components/create-order-modal";
import ListingsGrid from "@/components/listings-grid";
import Navbar from "@/components/navbar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Button } from "@/components/ui/button";
import { useAppKitAccount } from "@reown/appkit/react";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { allAccounts } = useAppKitAccount();
  const connectedAddress = useMemo(
    () => allAccounts[0]?.address,
    [allAccounts]
  );

  const handleModalToggle = (state: boolean) => {
    setIsModalOpen(state);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#020202] to-black text-white">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-col gap-6 rounded-3xl border border-emerald-400/10 bg-black/40 p-6 shadow-[0_10px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.4em] text-emerald-300">
              Home
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/40 bg-black/60 px-4 py-3 text-base text-white sm:w-96">
                <Search className="h-5 w-5 text-emerald-200" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-transparent text-base text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <Button
                onClick={() => handleModalToggle(true)}
                className="rounded-2xl border border-emerald-400 bg-transparent text-emerald-200 transition-colors hover:bg-emerald-400/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Curated drops from verified shoppers
            </h1>
            <p className="mt-3 text-lg text-zinc-400">
              Discover rare products, submit new orders, and let the EthStore
              collective hunt them down for you.
            </p>
          </div>

          {successMessage && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-emerald-100">
              {successMessage}
            </div>
          )}
        </div>

        <ListingsGrid
          className="pt-4"
          inStock={true}
          hideAvailable={true}
          orderBy="created_at"
          orderDirection="desc"
          limit={12}
          showTitle={false}
          searchTerm={searchTerm}
        />
      </main>

      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => handleModalToggle(false)}
        onSuccess={(message) => setSuccessMessage(message)}
        connectedAddress={connectedAddress}
      />
      <OnboardingModal />
    </div>
  );
}
