
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { getTodayDateString } from "@/lib/dateUtils";

interface DonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameName: string;
  defaultDate?: string;
  onSuccess?: () => void;
}

export function DonationModal({ open, onOpenChange, gameId, gameName, defaultDate, onSuccess }: DonationModalProps) {
  const { toast } = useToast();
  const [donationData, setDonationData] = useState({
    amount: "",
    memo: "",
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate || getTodayDateString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selectedDate when defaultDate prop changes
  useEffect(() => {
    if (defaultDate) {
      setSelectedDate(defaultDate);
    }
  }, [defaultDate]);

  const handleAddDonation = async () => {
    if (!donationData.amount || parseFloat(donationData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Please select a date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add donations.",
          variant: "destructive",
        });
        return;
      }

      console.log('=== DONATION DATE DEBUG ===');
      console.log('1. selectedDate variable:', selectedDate);
      console.log('2. typeof selectedDate:', typeof selectedDate);
      console.log('3. User timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      // Ensure we send the date exactly as a string, no conversions
      const dateToSave = String(selectedDate).trim();
      console.log('4. dateToSave (final):', dateToSave);

      const insertData = {
        game_id: gameId,
        date: dateToSave, // Pure string, no Date conversion
        amount: parseFloat(donationData.amount),
        memo: donationData.memo || null,
        is_donation: true,
        user_id: user.id,
      };

      console.log('5. Final insertData:', JSON.stringify(insertData, null, 2));

      const { data: insertResult, error } = await supabase
        .from('expenses')
        .insert(insertData)
        .select('*');
      
      if (error) {
        console.error('6. Supabase error:', error);
        throw error;
      }
      
      console.log('7. Insert successful, DB returned:', JSON.stringify(insertResult, null, 2));
      console.log('8. DB returned date:', insertResult?.[0]?.date);
      console.log('9. Date match:', dateToSave === insertResult?.[0]?.date);
      
      // Update game totals
      const { data: game } = await supabase
        .from('games')
        .select('total_donations, organization_net_profit')
        .eq('id', gameId)
        .single();
      
      if (game) {
        const amount = parseFloat(donationData.amount);
        
        const updatedTotals = {
          total_donations: game.total_donations + amount,
          organization_net_profit: game.organization_net_profit - amount,
        };
        
        await supabase
          .from('games')
          .update(updatedTotals)
          .eq('id', gameId);
      }
      
      toast({
        title: "Success",
        description: "Donation has been added successfully.",
      });
      
      setDonationData({
        amount: "",
        memo: "",
      });
      
      setSelectedDate(defaultDate || getTodayDateString());
      
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error adding donation:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    console.log('=== DONATION DATE INPUT CHANGE ===');
    console.log('Raw e.target.value:', rawValue);
    console.log('Setting selectedDate to:', rawValue);
    
    // Set exactly as received from input (YYYY-MM-DD string)
    setSelectedDate(rawValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Donation for {gameName}</DialogTitle>
          <DialogDescription>
            Record a charitable donation associated with this game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="donationAmount" className="col-span-1">Amount ($)</Label>
            <Input
              id="donationAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={donationData.amount}
              onChange={(e) => setDonationData({
                ...donationData,
                amount: e.target.value,
              })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="donationMemo" className="col-span-1">Purpose</Label>
            <Textarea
              id="donationMemo"
              placeholder="e.g., Toys for Tots, Food Bank, Community Center"
              value={donationData.memo}
              onChange={(e) => setDonationData({
                ...donationData,
                memo: e.target.value,
              })}
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleAddDonation} 
            className="bg-[#1F4E4A]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Add Donation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
