"use client";

import { useCurrentUser } from "@/app/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Home, User } from "lucide-react";
import Image from "next/image";
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
  const isConnected = Boolean(address);
  const navigation = [
    { name: "Home", href: "/" },
    // { name: "Listings", href: "/listings" },
    // { name: "Orders", href: "/orders" },
    { name: "Account", href: "/account" },
  ];

  const mobileNav = [
    { name: "Home", href: "/", icon: Home },
    { name: "Account", href: "/account", icon: User },
  ];

  const renderNavLink = (
    item: (typeof navigation)[number],
    mobile?: boolean
  ) => {
    const isActive = pathname === item.href;
    if (mobile) {
      const Icon = (item as (typeof mobileNav)[number]).icon;
      return (
        <Link
          key={item.name}
          href={item.href}
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
            isActive ? "text-emerald-300" : "text-zinc-400"
          }`}
        >
          <Icon className="h-5 w-5" />
          {item.name}
        </Link>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-emerald-400/20 text-emerald-200"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        {item.name}
      </Link>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 hidden w-full border-b border-white/10 bg-[#020202]/95 backdrop-blur md:block">
        <div className="container mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 w-full items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/apple-touch-icon.png"
                  alt="PayPunk Logo"
                  width={32}
                  height={32}
                />
                <span className="text-xl font-bold text-gray-100">PayPunk</span>
              </Link>
              <div className="hidden items-center gap-4 md:flex">
                {navigation.map((item) => renderNavLink(item))}
              </div>
            </div>

            {isMounted && (
              <Button
                onClick={() => open()}
                variant={address ? "outline" : "default"}
                className="relative bg-black hover:bg-emerald-400"
                disabled={isUserLoading}
              >
                <span
                  aria-hidden
                  className={`mr-2 h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-400" : "bg-zinc-500"
                  }`}
                />
                <span>
                  {address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : "Connect Wallet"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {isMounted && (
        <nav className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4 md:hidden">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-black/80 px-6 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.7)] backdrop-blur">
            {mobileNav.slice(0, 1).map((item) => renderNavLink(item, true))}

            <button
              type="button"
              onClick={() => open()}
              className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/20 text-white shadow-lg"
              aria-label={address ? "Manage wallet" : "Connect wallet"}
              disabled={isUserLoading}
            >
              <span
                aria-hidden
                className={`absolute -top-1 -right-0 h-2.5 w-2.5 rounded-full border border-black ${
                  isConnected ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <Image
                src="/apple-touch-icon.png"
                alt="PayPunk Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
            </button>

            {mobileNav.slice(1).map((item) => renderNavLink(item, true))}
          </div>
        </nav>
      )}
    </>
  );
}
