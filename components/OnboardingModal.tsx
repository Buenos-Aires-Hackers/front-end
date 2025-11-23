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
import { ArrowRight, Check, ShoppingBag, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setOpen(false);
  };

  const steps = [
    {
      title: "Welcome to PayPunk",
      description: "The decentralized marketplace with Shopify integration.",
      icon: <ShoppingBag className="w-12 h-12 text-primary mb-4" />,
      content: (
        <div className="space-y-4">
          <p>
            PayPunk allows you to create purchase requests for items and have
            them fulfilled by other users through a seamless Shopify checkout
            integration.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span>Connect your wallet to get started</span>
          </div>
        </div>
      ),
    },
    {
      title: "How it Works",
      description: "A simple and secure process for decentralized shopping.",
      icon: <ArrowRight className="w-12 h-12 text-primary mb-4" />,
      content: (
        <div className="space-y-4 text-sm">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">1</div>
              <div>
                <span className="font-medium">Request:</span> Users create
                listings with product URLs and offer prices.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">2</div>
              <div>
                <span className="font-medium">Fulfill:</span> Fulfillers pick up
                orders and pay via Shopify.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">3</div>
              <div>
                <span className="font-medium">Earn:</span> Fulfillers earn
                rewards for completing orders.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Choose Your Role",
      description: "Participate as a Requester or a Fulfiller.",
      icon: <Users className="w-12 h-12 text-primary mb-4" />,
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4 text-center space-y-2 hover:bg-accent transition-colors cursor-default">
            <div className="font-semibold">Requester</div>
            <p className="text-xs text-muted-foreground">
              Post items you want to buy and set your price.
            </p>
          </div>
          <div className="border rounded p-4 text-center space-y-2 hover:bg-accent transition-colors cursor-default">
            <div className="font-semibold">Fulfiller</div>
            <p className="text-xs text-muted-foreground">
              Fulfill orders for others and earn crypto.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Ready to Start?",
      description: "Join the future of decentralized e-commerce.",
      icon: <Check className="w-12 h-12 text-primary mb-4" />,
      content: (
        <div className="space-y-4">
          <p>
            Connect your wallet, browse listings, or create your own request
            today.
          </p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center">{currentStep.icon}</div>
          <DialogTitle className="text-center">{currentStep.title}</DialogTitle>
          <DialogDescription className="text-center">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">{currentStep.content}</div>
        <DialogFooter className="sm:justify-between">
          <div className="flex justify-center w-full gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <Button className="w-full mt-4" onClick={handleNext}>
            {step === steps.length - 1 ? "Get Started" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
