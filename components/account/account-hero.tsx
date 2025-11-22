"use client";

interface AccountHeroProps {
  walletAddress?: string;
  fullName?: string | null;
  stats: Record<string, number>;
  isLoading: boolean;
  errorMessage?: string | null;
  showConnectNotice: boolean;
}

const formatWallet = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

export function AccountHero({
  walletAddress,
  fullName,
  stats,
  isLoading,
  errorMessage,
  showConnectNotice,
}: AccountHeroProps) {
  return (
    <div className="rounded-3xl border border-emerald-400/10 bg-black/40 p-6 shadow-[0_10px_60px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-300">Account</p>
          <h1 className="mt-3 text-3xl font-semibold">
            {fullName || "Your EthStore profile"}
          </h1>
          {walletAddress && (
            <p className="text-sm text-zinc-500">{formatWallet(walletAddress)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-center"
            >
              <p className="text-3xl font-semibold text-emerald-300">{value}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">{key}</p>
            </div>
          ))}
        </div>
      </div>
      {isLoading && (
        <p className="mt-4 text-sm text-zinc-500">Loading account data...</p>
      )}
      {errorMessage && (
        <p className="mt-4 text-sm text-red-400">{errorMessage}</p>
      )}
      {showConnectNotice && (
        <p className="mt-4 text-sm text-yellow-400">
          Please connect your wallet to load your account information.
        </p>
      )}
    </div>
  );
}
