"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiAdapter } from "../config/wagmi";

const queryClient = new QueryClient();

export const AppProvider = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};
