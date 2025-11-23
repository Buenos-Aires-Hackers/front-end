"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Check,
  Eye,
  Shield,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "paypunk:onboarding-v1";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
    setIsReady(true);
  }, []);

  const markSeen = () => {
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      markSeen();
      setOpen(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      markSeen();
    }
    setOpen(nextOpen);
  };

  const steps = [
    {
      title: "Welcome to PayPunk",
      description: "Cypherpunk commerce rails, no KYC. Just encrypted trust.",
      icon: (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          <ShoppingBag className="h-7 w-7" />
        </div>
      ),
      content: (
        <div className="space-y-4 text-sm text-zinc-300">
          <p className="leading-relaxed text-zinc-200">
            Spin up bounties for real-world gear, let verified runners fulfill
            them, and settle entirely on-chain.
          </p>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-black/40 px-3 py-1 text-xs uppercase tracking-wide text-emerald-200">
            <Wallet className="h-4 w-4" />
            Connect wallet to enter
          </div>
        </div>
      ),
    },
    {
      title: "How it Works",
      description: "A simple and secure process for decentralized shopping.",
      icon: (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-gradient-to-b from-emerald-500/20 to-transparent text-emerald-300">
          <ArrowRight className="h-7 w-7" />
        </div>
      ),
      content: (
        <div className="space-y-4 text-sm text-zinc-300">
          <div className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 bg-gradient-to-b from-white/5 to-transparent p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                01
              </div>
              <div className="leading-relaxed">
                <span className="font-medium text-white">Request:</span> Drop
                links, proof, and bounty in a single listing.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                02
              </div>
              <div className="leading-relaxed">
                <span className="font-medium text-white">Fulfill:</span>{" "}
                Reputation-gated runners secure the item and upload receipts.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                03
              </div>
              <div className="leading-relaxed">
                <span className="font-medium text-white">Settle:</span> Funds
                flow trustlessly once proofs pass automated checks.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Choose Your Role",
      description: "Participate as a Requester or a Fulfiller.",
      icon: (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          <Users className="h-7 w-7" />
        </div>
      ),
      content: (
        <div className="grid gap-3">
          {[
            {
              label: "Requesters",
              detail: "Post drops, stake collateral, review proofs.",
              icon: <Eye className="h-4 w-4 text-emerald-300" />,
            },
            {
              label: "Fulfillers",
              detail: "Deploy capital, win bounties, grow rep.",
              icon: <Shield className="h-4 w-4 text-emerald-300" />,
            },
          ].map((role) => (
            <div
              key={role.label}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 bg-gradient-to-r from-white/5 via-transparent to-transparent px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-white">
                  {role.label}
                </div>
                <p className="text-xs text-zinc-400">{role.detail}</p>
              </div>
              {role.icon}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Ready to Start?",
      description: "Join the future of decentralized e-commerce.",
      icon: (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-gradient-to-b from-emerald-500/20 to-transparent text-emerald-300">
          <Check className="h-7 w-7" />
        </div>
      ),
      content: (
        <div className="space-y-4 text-sm text-zinc-300">
          <p className="leading-relaxed">
            Sync your wallet, scout available drops, and spin up encrypted
            orders. PayPunk routes commerce through privacy-first rails.
          </p>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-emerald-200">
            Transmission secure — ready for deployment
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  if (!isReady) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] border border-emerald-500/30 bg-gradient-to-b from-[#04080f] via-[#030305] to-black text-white shadow-[0_25px_120px_rgba(0,0,0,0.65)]">
        <DialogHeader>
          <div className="flex justify-center">{currentStep.icon}</div>
          <DialogTitle className="text-center text-lg tracking-tight text-white">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-emerald-100/80">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">{currentStep.content}</div>
        <DialogFooter className="w-full">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
              {steps.map((_, index) => {
                const isActive = index === step;
                return (
                  <span
                    key={index}
                    className={`h-1 rounded-full transition-all ${
                      isActive ? "w-8 bg-emerald-400" : "w-3 bg-white/20"
                    }`}
                  />
                );
              })}
            </div>
            <Button
              className="w-full border border-emerald-400/50 bg-emerald-500/20 text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30"
              onClick={handleNext}
            >
              {step === steps.length - 1 ? "Enter PayPunk" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
