import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface WinnerFormProps {
  week: any;
  game: any;
  onWinnerSubmit: (winnerData: any) => Promise<void>;
  onGameComplete?: (winnerData: any) => Promise<void>;
  onOpenJackpotContribution?: (data: {
    totalJackpot: number;
    winnerName: string;
    winnerData: any;
  }) => void;
}

export const WinnerForm = ({ 
  week, 
  game, 
  onWinnerSubmit, 
  onGameComplete,
  onOpenJackpotContribution 
}: WinnerFormProps) => {
  const { toast } = useToast();
  const [winnerName, setWinnerName] = useState('');
  const [slotChosen, setSlotChosen] = useState('');
  const [cardSelected, setCardSelected] = useState('');
  const [winnerPresent, setWinnerPresent] = useState(false);
  const [authorizedSignature, setAuthorizedSignature] = useState('');
  const [calculatedPayout, setCalculatedPayout] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showWinnerForm, setShowWinnerForm] = useState(true);

  useEffect(() => {
    if (week && game) {
      // Calculate the payout based on week and game data
      const payout = week.ending_jackpot || 0;
      setCalculatedPayout(payout);
    }
  }, [week, game]);

  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    if (!winnerName.trim()) {
      errors.winnerName = 'Winner Name is required';
    }

    if (!slotChosen) {
      errors.slotChosen = 'Slot Chosen is required';
    }

    if (!cardSelected) {
      errors.cardSelected = 'Card Selected is required';
    }

    if (!authorizedSignature.trim()) {
      errors.authorizedSignature = 'Authorized Signature is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setWinnerName('');
    setSlotChosen('');
    setCardSelected('');
    setWinnerPresent(false);
    setAuthorizedSignature('');
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const winnerData = {
        winnerName,
        slotChosen: parseInt(slotChosen),
        cardSelected,
        winnerPresent,
        authorizedSignature,
        weeklyPayout: calculatedPayout
      };

      // Submit winner data first
      await onWinnerSubmit(winnerData);

      // Check if Queen of Hearts was drawn
      if (cardSelected === 'Queen of Hearts') {
        // Instead of immediately completing the game, open contribution modal
        if (onOpenJackpotContribution) {
          onOpenJackpotContribution({
            totalJackpot: calculatedPayout,
            winnerName,
            winnerData
          });
        } else {
          // Fallback to old behavior if contribution modal not available
          await onGameComplete?.(winnerData);
        }
      }

      // Reset form for non-Queen of Hearts wins
      if (cardSelected !== 'Queen of Hearts') {
        resetForm();
      }
    } catch (error: any) {
      console.error('Error submitting winner:', error);
      toast({
        title: "Error",
        description: `Failed to submit winner: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="winnerName">Winner Name</Label>
        <Input
          type="text"
          id="winnerName"
          value={winnerName}
          onChange={(e) => setWinnerName(e.target.value)}
        />
        {formErrors.winnerName && <p className="text-red-500 text-sm">{formErrors.winnerName}</p>}
      </div>

      <div>
        <Label htmlFor="slotChosen">Slot Chosen</Label>
        <Input
          type="number"
          id="slotChosen"
          value={slotChosen}
          onChange={(e) => setSlotChosen(e.target.value)}
        />
        {formErrors.slotChosen && <p className="text-red-500 text-sm">{formErrors.slotChosen}</p>}
      </div>

      <div>
        <Label htmlFor="cardSelected">Card Selected</Label>
        <Select onValueChange={setCardSelected}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a card" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Queen of Hearts">Queen of Hearts</SelectItem>
            <SelectItem value="Other Card">Other Card</SelectItem>
          </SelectContent>
        </Select>
        {formErrors.cardSelected && <p className="text-red-500 text-sm">{formErrors.cardSelected}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="winnerPresent"
          checked={winnerPresent}
          onCheckedChange={(checked) => setWinnerPresent(!!checked)}
        />
        <label
          htmlFor="winnerPresent"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Winner Present
        </label>
      </div>

      <div>
        <Label htmlFor="authorizedSignature">Authorized Signature</Label>
        <Input
          type="text"
          id="authorizedSignature"
          value={authorizedSignature}
          onChange={(e) => setAuthorizedSignature(e.target.value)}
        />
        {formErrors.authorizedSignature && <p className="text-red-500 text-sm">{formErrors.authorizedSignature}</p>}
      </div>

      <div>
        <Label htmlFor="calculatedPayout">Calculated Payout</Label>
        <Input
          type="text"
          id="calculatedPayout"
          value={calculatedPayout.toFixed(2)}
          readOnly
        />
      </div>

      <Button disabled={isLoading} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90">
        {isLoading ? 'Submitting...' : 'Submit Winner'}
      </Button>
    </form>
  );
};
