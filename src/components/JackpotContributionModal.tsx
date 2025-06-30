
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface JackpotContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalJackpot: number;
  winnerName: string;
  onConfirm: (contributionAmount: number) => void;
}

export const JackpotContributionModal = ({
  open,
  onOpenChange,
  totalJackpot,
  winnerName,
  onConfirm
}: JackpotContributionModalProps) => {
  const [contributionAmount, setContributionAmount] = useState(0);
  const [error, setError] = useState('');

  const finalPayout = totalJackpot - contributionAmount;

  const handleContributionChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    setError('');
    
    if (amount < 0) {
      setError('Contribution amount cannot be negative');
    } else if (amount > totalJackpot) {
      setError('Contribution amount cannot exceed the total jackpot');
    } else {
      setContributionAmount(amount);
    }
  };

  const handleConfirm = () => {
    if (error) return;
    
    if (contributionAmount < 0 || contributionAmount > totalJackpot) {
      setError('Invalid contribution amount');
      return;
    }

    onConfirm(contributionAmount);
    onOpenChange(false);
  };

  const handleSkipContribution = () => {
    onConfirm(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🎉 Queen of Hearts Winner!</DialogTitle>
          <DialogDescription>
            Congratulations {winnerName}! You've won the jackpot of {formatCurrency(totalJackpot)}.
            Would you like to contribute some of your winnings to the next game's jackpot?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-green-800">
                Total Jackpot Won: {formatCurrency(totalJackpot)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribution">Contribution to Next Game (Optional)</Label>
            <Input
              id="contribution"
              type="number"
              min="0"
              max={totalJackpot}
              step="0.01"
              value={contributionAmount || ''}
              onChange={(e) => handleContributionChange(e.target.value)}
              placeholder="Enter amount to contribute"
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {contributionAmount > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Winner takes home:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(finalPayout)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Contributes to next game:</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(contributionAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleSkipContribution}
              className="flex-1"
            >
              No Contribution
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!!error}
              className="flex-1 bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
            >
              {contributionAmount > 0 ? 'Confirm Contribution' : 'Take Full Amount'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
