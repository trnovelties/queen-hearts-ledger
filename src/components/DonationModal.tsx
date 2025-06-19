
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
  
  // Use today's date in YYYY-MM-DD format for the user's timezone
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate || getTodayDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDonation = async () => {
    console.log("=== COMPREHENSIVE DONATION DEBUG START ===");
    console.log("1. INITIAL VALUES:");
    console.log("   - Raw selectedDate from state:", selectedDate);
    console.log("   - Type of selectedDate:", typeof selectedDate);
    console.log("   - selectedDate length:", selectedDate.length);
    console.log("   - defaultDate prop:", defaultDate);
    
    console.log("2. CURRENT ENVIRONMENT:");
    console.log("   - User timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("   - User locale:", navigator.language);
    console.log("   - Current timestamp:", new Date().toISOString());
    console.log("   - Current local date:", new Date().toLocaleDateString());
    console.log("   - Current local time:", new Date().toLocaleTimeString());
    
    console.log("3. DATE PROCESSING:");
    // Test what happens when we create a Date object from the string
    const testDate = new Date(selectedDate);
    console.log("   - Date object from selectedDate:", testDate);
    console.log("   - Date.toISOString():", testDate.toISOString());
    console.log("   - Date.toLocaleDateString():", testDate.toLocaleDateString());
    console.log("   - Date.getFullYear():", testDate.getFullYear());
    console.log("   - Date.getMonth()+1:", testDate.getMonth() + 1);
    console.log("   - Date.getDate():", testDate.getDate());
    
    // Test timezone offset
    console.log("4. TIMEZONE ANALYSIS:");
    console.log("   - Timezone offset minutes:", testDate.getTimezoneOffset());
    console.log("   - Timezone offset hours:", testDate.getTimezoneOffset() / 60);
    
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

      // SOLUTION: Use the exact date string without any conversion
      console.log("5. DATABASE INSERT:");
      console.log("   - Using exact selectedDate string:", selectedDate);
      console.log("   - NO Date object conversion applied");
      
      const insertData = {
        game_id: gameId,
        date: selectedDate, // Use the exact string from the input
        amount: parseFloat(donationData.amount),
        memo: donationData.memo || null,
        is_donation: true,
        user_id: user.id,
      };
      
      console.log("   - Full insert data object:", insertData);

      const { data: insertResult, error } = await supabase
        .from('expenses')
        .insert(insertData)
        .select('*');
      
      if (error) {
        console.log("   - Database error:", error);
        throw error;
      }
      
      console.log("6. DATABASE RESULT:");
      console.log("   - Insert successful:", insertResult);
      console.log("   - Date that was actually saved:", insertResult?.[0]?.date);
      console.log("   - Saved date type:", typeof insertResult?.[0]?.date);
      
      // Verify what we saved vs what we intended
      console.log("7. VERIFICATION:");
      console.log("   - Intended date:", selectedDate);
      console.log("   - Saved date:", insertResult?.[0]?.date);
      console.log("   - Match?", selectedDate === insertResult?.[0]?.date);
      
      console.log("=== COMPREHENSIVE DONATION DEBUG END ===");
      
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
      
      setSelectedDate(defaultDate || getTodayDate());
      
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
    const newDate = e.target.value;
    console.log("DATE INPUT CHANGED:");
    console.log("- New date value:", newDate);
    console.log("- Event target value:", e.target.value);
    console.log("- Input type:", e.target.type);
    setSelectedDate(newDate);
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
