
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

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
  
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDonation = async () => {
    console.log("=== DONATION DEBUG START ===");
    console.log("Raw selectedDate from input:", selectedDate);
    console.log("Type of selectedDate:", typeof selectedDate);
    console.log("User timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("Current date for reference:", new Date().toISOString());
    console.log("Current local date string:", new Date().toLocaleDateString());

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

      console.log("About to insert to database with date:", selectedDate);
      
      const insertData = {
        game_id: gameId,
        date: selectedDate,
        amount: parseFloat(donationData.amount),
        memo: donationData.memo || null,
        is_donation: true,
        user_id: user.id,
      };
      
      console.log("Full insert data:", insertData);

      const { data: insertResult, error } = await supabase
        .from('expenses')
        .insert(insertData)
        .select('*');
      
      if (error) throw error;
      
      console.log("Database insert result:", insertResult);
      console.log("Date that was actually saved:", insertResult?.[0]?.date);
      console.log("=== DONATION DEBUG END ===");
      
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
      
      setSelectedDate(defaultDate || "");
      
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
              onChange={(e) => {
                console.log("Date input changed to:", e.target.value);
                setSelectedDate(e.target.value);
              }}
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
