"use client";

import { CHAIN_IDS } from "@/app/config/wagmi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customScrollbar } from "@/lib/scrollbar";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

type ChainPersona = {
  id: number;
  name: string;
  alias: string;
  tagline: string;
  latency: string;
  bandwidth: string;
  gradient: string;
};

const CHAIN_PERSONAS: ChainPersona[] = [
  {
    id: CHAIN_IDS.BASE,
    name: "Base",
    alias: "Cobalt Rail",
    tagline: "Fast lanes curated by Coinbase crews",
    latency: "1.2s finality",
    bandwidth: "10k+ TPS bursts",
    gradient: "from-sky-500/40 via-cyan-400/10 to-transparent",
  },
  {
    id: CHAIN_IDS.ARBITRUM,
    name: "Arbitrum",
    alias: "Signal Ridge",
    tagline: "Deep liquidity & battle-tested rollups",
    latency: "1.5s finality",
    bandwidth: "8k+ TPS bursts",
    gradient: "from-emerald-400/40 via-lime-400/5 to-transparent",
  },
  {
    id: 10,
    name: "Optimism",
    alias: "Neon Corridor",
    tagline: "Sequenced optimism for DeFi and public goods",
    latency: "1.4s finality",
    bandwidth: "7k TPS bursts",
    gradient: "from-rose-400/40 via-red-400/10 to-transparent",
  },
  {
    id: 1,
    name: "Ethereum",
    alias: "Layer Zero",
    tagline: "Mainnet gravity well, ultimate settlement",
    latency: "12s finality",
    bandwidth: "30 TPS steady",
    gradient: "from-amber-400/40 via-yellow-400/10 to-transparent",
  },
];

export type ChainSelectMode = "from" | "to";
const TOKEN_OPTIONS = ["USDC", "ETH", "USDT"] as const;
type TokenSymbol = (typeof TOKEN_OPTIONS)[number];

interface ChainSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromChainId: number;
  toChainId: number;
  onSelect: (slot: ChainSelectMode, chainId: number) => void;
  defaultSlot?: ChainSelectMode;
  onTokenSelect?: (slot: ChainSelectMode, token: TokenSymbol) => void;
  fromToken?: TokenSymbol;
  toToken?: TokenSymbol;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  onBack?: () => void;
}

export function ChainSelectModal({
  open,
  onOpenChange,
  fromChainId,
  toChainId,
  onSelect,
  defaultSlot = "from",
  onTokenSelect,
  fromToken,
  toToken,
  onConfirm,
  confirmLabel,
  confirmLoadingLabel,
  confirmLoading,
  confirmDisabled,
  onBack,
}: ChainSelectModalProps) {
  const [activeSlot, setActiveSlot] = useState<ChainSelectMode>(defaultSlot);
  const [tokenSelections, setTokenSelections] = useState<{
    from: TokenSymbol;
    to: TokenSymbol;
  }>({
    from: fromToken ?? "USDC",
    to: toToken ?? "USDC",
  });

  useEffect(() => {
    if (!open) {
      setActiveSlot(defaultSlot);
      setTokenSelections({
        from: fromToken ?? "USDC",
        to: toToken ?? "USDC",
      });
    }
  }, [open, defaultSlot, fromToken, toToken]);

  const resolveToken = (slot: ChainSelectMode) =>
    slot === "from"
      ? fromToken ?? tokenSelections.from
      : toToken ?? tokenSelections.to;

  const handleTokenChange = (slot: ChainSelectMode, token: TokenSymbol) => {
    setTokenSelections((prev) => ({ ...prev, [slot]: token }));
    onTokenSelect?.(slot, token);
  };

  const handleSelect = (chainId: number) => {
    onSelect(activeSlot, chainId);
  };

  const handleSwap = () => {
    onSelect("from", toChainId);
    onSelect("to", fromChainId);
    const currentFromToken = resolveToken("from");
    const currentToToken = resolveToken("to");
    setTokenSelections({
      from: currentToToken,
      to: currentFromToken,
    });
    onTokenSelect?.("from", currentToToken);
    onTokenSelect?.("to", currentFromToken);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[520px] max-h-[88vh] overflow-y-auto overflow-x-hidden border border-emerald-500/30 bg-gradient-to-b from-[#03060d] via-[#050a0f] to-black text-white shadow-[0_25px_90px_rgba(0,0,0,0.7)]",
          customScrollbar
        )}
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-16">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-white/10"
                onClick={onBack}
              >
                Back
              </Button>
            ) : (
              <span className="w-16" />
            )}
            <DialogTitle className="flex items-center justify-between text-base font-semibold tracking-tight text-white">
              <span>Pick Departure & Arrival Chains</span>
            </DialogTitle>
          </div>
          {/* <DialogDescription className="text-sm text-emerald-100/80">
            Tap a slot, then tap a chain. Cards show which rails power departure
            and arrival so you can route in two clicks.
          </DialogDescription> */}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-white/5 bg-black/30 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/60">
                  Active slot
                </p>
                <p className="text-base font-semibold text-white">
                  {activeSlot === "from" ? "Departure chain" : "Arrival chain"}
                </p>
              </div>
              <div className="flex gap-2">
                {(["from", "to"] as ChainSelectMode[]).map((slot) => {
                  const isActive = activeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setActiveSlot(slot)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.25em] transition-colors",
                        isActive
                          ? "border-emerald-400/80 bg-emerald-500/20 text-emerald-100"
                          : "border-white/10 text-zinc-400 hover:text-white"
                      )}
                    >
                      {slot === "from" ? "From" : "To"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {(["from", "to"] as ChainSelectMode[]).map((slot) => {
                const chainId = slot === "from" ? fromChainId : toChainId;
                const persona = CHAIN_PERSONAS.find((p) => p.id === chainId);
                const selectedToken = resolveToken(slot);
                return (
                  <div
                    key={slot}
                    className="rounded-xl  border border-white/5 bg-white/5 p-2.5 space-y-2"
                  >
                    <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-100/70">
                      {slot === "from" ? "Departure" : "Arrival"}
                    </p>
                    <div className="flex gap-1 justify-between">
                      <p className="text-lg font-semibold text-white">
                        {persona?.name ?? "Not set"}
                      </p>
                      {slot === "from" && (
                        <Select
                          value={selectedToken}
                          onValueChange={(value) =>
                            handleTokenChange(slot, value as TokenSymbol)
                          }
                        >
                          <SelectTrigger className="h-9 border-white/10 bg-black/30 text-xs uppercase tracking-[0.3em] text-emerald-100">
                            <SelectValue placeholder="Token" />
                          </SelectTrigger>
                          <SelectContent className="border border-white/10 bg-[#050a0f] text-white">
                            {TOKEN_OPTIONS.map((token) => (
                              <SelectItem
                                key={token}
                                value={token}
                                className="text-xs uppercase tracking-[0.3em]"
                              >
                                {token}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="outline"
              className="w-full border border-white/10 bg-emerald-300 hover:bg-emerald-400 text-white hover:border-emerald-400/60 hover:text-emerald-200"
              onClick={handleSwap}
              type="button"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Swap From & To
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CHAIN_PERSONAS.map((persona) => {
              const isFrom = persona.id === fromChainId;
              const isTo = persona.id === toChainId;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handleSelect(persona.id)}
                  className={cn(
                    "relative rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 via-transparent to-transparent p-4 text-left transition-all",
                    "hover:border-emerald-500/40 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]",
                    (isFrom || isTo) &&
                      "border-emerald-400/60 shadow-[0_15px_60px_rgba(16,185,129,0.35)]"
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute -right-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full opacity-40 blur-3xl",
                      `bg-gradient-to-br ${persona.gradient}`
                    )}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-white mt-0.5">
                        {persona.name}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[13px] text-zinc-200">
                    {persona.tagline}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.25em] text-emerald-100/80">
                    <span className="rounded-full border border-emerald-400/30 px-2.5 py-0.5">
                      {persona.bandwidth}
                    </span>
                    <span className="rounded-full border border-emerald-400/30 px-2.5 py-0.5">
                      {persona.latency}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.3em] text-emerald-200">
                    {isFrom && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1">
                        From rail
                      </span>
                    )}
                    {isTo && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1">
                        To rail
                      </span>
                    )}
                    {!isFrom && !isTo && (
                      <span className="rounded-full border border-white/10 px-3 py-1 text-white/70">
                        Tap to assign
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {onConfirm && confirmLabel ? (
            <Button
              className="w-full border border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              disabled={confirmDisabled || confirmLoading}
              onClick={onConfirm}
              type="button"
            >
              {confirmLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {confirmLoading
                ? confirmLoadingLabel ?? confirmLabel
                : confirmLabel}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
