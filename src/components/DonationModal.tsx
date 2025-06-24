
import { useState } from "react";
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
}

export function DonationModal({ open, onOpenChange, gameId, gameName, defaultDate }: DonationModalProps) {
  const { toast } = useToast();
  const [donationData, setDonationData] = useState({
    amount: "",
    memo: "",
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate || getTodayDateString());
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      console.log('=== COMPREHENSIVE DONATION DATE DEBUG ===');
      console.log('1. Raw selectedDate variable:', selectedDate);
      console.log('2. Type of selectedDate:', typeof selectedDate);
      console.log('3. selectedDate length:', selectedDate.length);
      console.log('4. selectedDate as JSON:', JSON.stringify(selectedDate));
      
      // Create a fresh date string to ensure no contamination
      const dateToSave = String(selectedDate).trim();
      console.log('5. dateToSave after String() and trim():', dateToSave);
      console.log('6. dateToSave === selectedDate:', dateToSave === selectedDate);
      
      // Validate the format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      console.log('7. Date format validation (YYYY-MM-DD):', dateRegex.test(dateToSave));
      
      // Show current timezone info
      console.log('8. Browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('9. Current time:', new Date().toString());
      console.log('10. Current time ISO:', new Date().toISOString());

      const insertData = {
        game_id: gameId,
        date: dateToSave,
        amount: parseFloat(donationData.amount),
        memo: donationData.memo || null,
        is_donation: true,
        user_id: user.id,
      };

      console.log('11. Final insertData object:', JSON.stringify(insertData, null, 2));
      console.log('12. insertData.date specifically:', insertData.date);

      const { data: insertResult, error } = await supabase
        .from('expenses')
        .insert(insertData)
        .select('*');
      
      if (error) {
        console.error('13. Supabase error:', error);
        throw error;
      }
      
      console.log('14. Supabase insert successful, result:', JSON.stringify(insertResult, null, 2));
      console.log('15. Returned date from database:', insertResult?.[0]?.date);
      console.log('16. Date comparison - sent vs received:', {
        sent: dateToSave,
        received: insertResult?.[0]?.date,
        match: dateToSave === insertResult?.[0]?.date
      });
      
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
    console.log('=== DATE INPUT CHANGE DEBUG ===');
    console.log('A. Raw e.target.value:', rawValue);
    console.log('B. Type of raw value:', typeof rawValue);
    console.log('C. Raw value length:', rawValue.length);
    console.log('D. Raw value as JSON:', JSON.stringify(rawValue));
    console.log('E. Current selectedDate before change:', selectedDate);
    
    setSelectedDate(rawValue);
    
    console.log('F. selectedDate should now be:', rawValue);
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
            <Label htmlFor="donationDate" className="col-span-1">Date</Label>
            <Input
              id="donationDate"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="col-span-3"
            />
          </div>
          
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
