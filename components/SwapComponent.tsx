import { useState, useEffect } from "react";
import { formatUnits, parseUnits, formatEther } from "viem";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { ArrowDownUp, Loader2 } from "lucide-react";
import {
  CallbackType,
  type CrossChainSdk,
  type ExecCallback,
} from "@eil-protocol/sdk";
import { type AmbireMultiChainSmartAccount } from "@eil-protocol/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createEilSdk, fetchUSDCBalances, swapUSDC } from "@/lib/eil-sdk";
import { CHAIN_IDS } from "@/app/config/wagmi";

const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.BASE]: "Base",
  [CHAIN_IDS.ARBITRUM]: "Arbitrum",
};

export function SwapComponent() {
  const [amount, setAmount] = useState("");
  const [fromChain, setFromChain] = useState(CHAIN_IDS.ARBITRUM);
  const [toChain, setToChain] = useState(CHAIN_IDS.BASE);
  const [sdk, setSdk] = useState<CrossChainSdk | null>(null);
  const [account, setAccount] = useState<AmbireMultiChainSmartAccount | null>(
    null
  );
  const [completedOps, setCompletedOps] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    createEilSdk()
      .then(({ sdk: newSdk, account: newAccount }) => {
        if (!cancelled) {
          setSdk(newSdk);
          setAccount(newAccount);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to initialize SDK:", error);
          enqueueSnackbar(
            "Failed to initialize SDK. Please connect your wallet.",
            { variant: "error" }
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { data: balances, isFetching } = useQuery({
    queryKey: ["usdc-balances", account?.addressOn(BigInt(CHAIN_IDS.BASE))],
    enabled: !!account,
    queryFn: () =>
      account
        ? fetchUSDCBalances(account)
        : { baseBalance: 0n, arbitrumBalance: 0n },
  });

  useEffect(() => {
    if (balances) {
      console.log("Base ETH balance:", formatEther(balances.balanceEth0));
      console.log("Arbitrum ETH balance:", formatEther(balances.balanceEth1));
    }
  }, [balances]);

  const swapMutation = useMutation({
    mutationFn: async () => {
      if (!sdk || !account) throw new Error("SDK not initialized");
      if (!amount) throw new Error("Amount is required");

      const callback: ExecCallback = ({ type, index, revertReason }) => {
        const chainName =
          index === 0 ? CHAIN_NAMES[fromChain] : CHAIN_NAMES[toChain];
        console.log("Swap progress:", { type, index, chainName, revertReason });
        console.log(
          revertReason?.cause?.data?.originalError?.error?.message ??
            revertReason
        );

        enqueueSnackbar(`Operation on ${chainName}: ${type}`, {
          variant: "info",
        });

        if (type === CallbackType.Done) {
          setCompletedOps((prev) => {
            if (prev + 1 === 2) {
              queryClient.invalidateQueries({ queryKey: ["usdc-balances"] });
              enqueueSnackbar("Swap completed successfully!", {
                variant: "success",
              });
              return 0;
            }
            return prev + 1;
          });
        }
      };

      await swapUSDC(
        sdk,
        account,
        fromChain,
        toChain,
        parseUnits(amount, 6),
        callback
      );
    },
    onError: (error: Error) => {
      console.error("Swap error:", error);
      enqueueSnackbar(error?.message ?? "Swap failed", { variant: "error" });
    },
  });

  const getBalance = (chainId: number) =>
    chainId === CHAIN_IDS.BASE
      ? balances?.baseBalance
      : balances?.arbitrumBalance;

  const formatBalance = (balance: bigint | undefined) =>
    balance ? Number(formatUnits(balance, 6)) : 0;

  const fromBalanceFormatted = formatBalance(getBalance(fromChain));
  const toBalanceFormatted = formatBalance(getBalance(toChain));
  const amountNum = parseFloat(amount) || 0;
  const isValidAmount =
    amount && amountNum > 0 && amountNum <= fromBalanceFormatted;

  if (!sdk || !account) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Cross-Chain USDC Swap</CardTitle>
          <CardDescription>Connecting to wallet...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Cross-Chain USDC Swap</CardTitle>
        <CardDescription>
          Swap USDC between Base and Arbitrum using EIL Protocol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>From</Label>
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">
                {CHAIN_NAMES[fromChain]}
              </span>
              <span className="text-sm text-muted-foreground">
                Balance: {isFetching ? "..." : fromBalanceFormatted.toFixed(2)}{" "}
                USDC
              </span>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              max={fromBalanceFormatted}
              step={0.000001}
            />
            {amount && !isValidAmount && (
              <p className="text-sm text-destructive">
                {amountNum <= 0
                  ? "Amount must be greater than 0"
                  : "Insufficient balance"}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setFromChain(toChain);
              setToChain(fromChain);
            }}
            disabled={swapMutation.isPending}
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label>To</Label>
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">
                {CHAIN_NAMES[toChain]}
              </span>
              <span className="text-sm text-muted-foreground">
                Balance: {isFetching ? "..." : toBalanceFormatted.toFixed(2)}{" "}
                USDC
              </span>
            </div>
            <Input
              type="text"
              value={amount || "0.00"}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => swapMutation.mutate()}
          disabled={!isValidAmount || swapMutation.isPending}
        >
          {swapMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Swapping... ({completedOps}/2)
            </>
          ) : (
            "Swap"
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>This swap uses the EIL Protocol for cross-chain transfers</p>
          <p>The transaction will be executed on both chains simultaneously</p>
          <p>
            USDC will be moved from {CHAIN_NAMES[fromChain]} to{" "}
            {CHAIN_NAMES[toChain]}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
