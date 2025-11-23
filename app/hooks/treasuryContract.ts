"use client";

import type { Address } from "viem";

const envAddress = process.env
  .NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS as Address | undefined;

export const DEFAULT_TREASURY_CONTRACT_ADDRESS = envAddress;

export const resolveTreasuryContractAddress = (
  override?: Address
): Address | undefined => override ?? DEFAULT_TREASURY_CONTRACT_ADDRESS;
