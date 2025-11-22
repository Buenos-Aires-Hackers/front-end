"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function Navbar() {
  const { allAccounts } = useAppKitAccount();
  const { open } = useAppKit();
  const pathname = usePathname();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const address = useMemo(() => allAccounts[0]?.address, [allAccounts]);
  const navigation = [
    { name: "Home", href: "/" },
    { name: "Listings", href: "/listings" },
    { name: "Orders", href: "/orders" },
    { name: "Account", href: "/account" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#020202]/95 backdrop-blur">
      <div className="container mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 w-full items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <ShoppingBag className="h-8 w-8 text-emerald-300" />
              <span className="text-xl font-bold text-gray-100">EthStore</span>
            </Link>
            <div className="hidden items-center gap-4 md:flex">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-400/20 text-emerald-200"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {isMounted && (
            <Button
              onClick={() => open()}
              variant={address ? "outline" : "default"}
              className="border-emerald-400/40 text-white"
              disabled={isUserLoading}
            >
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
