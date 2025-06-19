
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameName: string;
}

export function ExpenseModal({ open, onOpenChange, gameId, gameName }: ExpenseModalProps) {
  const { toast } = useToast();
  const [expenseData, setExpenseData] = useState({
    amount: "",
    memo: "",
    type: "expense", // "expense" or "donation"
  });
  
  // Use today's date in YYYY-MM-DD format for the user's timezone
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddExpense = async () => {
    console.log("=== COMPREHENSIVE EXPENSE DEBUG START ===");
    console.log("1. INITIAL VALUES:");
    console.log("   - Raw selectedDate from state:", selectedDate);
    console.log("   - Type of selectedDate:", typeof selectedDate);
    console.log("   - selectedDate length:", selectedDate.length);
    
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

    if (!expenseData.amount || parseFloat(expenseData.amount) <= 0) {
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
          description: "You must be logged in to add expenses.",
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
        amount: parseFloat(expenseData.amount),
        memo: expenseData.memo || null,
        is_donation: expenseData.type === "donation",
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
      
      console.log("=== COMPREHENSIVE EXPENSE DEBUG END ===");
      
      // Update game totals
      const { data: game } = await supabase
        .from('games')
        .select('total_expenses, total_donations, organization_net_profit')
        .eq('id', gameId)
        .single();
      
      if (game) {
        const amount = parseFloat(expenseData.amount);
        const isDonation = expenseData.type === "donation";
        
        const updatedTotals = {
          total_expenses: isDonation ? game.total_expenses : game.total_expenses + amount,
          total_donations: isDonation ? game.total_donations + amount : game.total_donations,
          organization_net_profit: game.organization_net_profit - amount,
        };
        
        await supabase
          .from('games')
          .update(updatedTotals)
          .eq('id', gameId);
      }
      
      toast({
        title: "Success",
        description: `${expenseData.type === "donation" ? "Donation" : "Expense"} has been added successfully.`,
      });
      
      setExpenseData({
        amount: "",
        memo: "",
        type: "expense",
      });
      setSelectedDate(getTodayDate());
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding expense:', error);
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
          <DialogTitle>Add Expense or Donation for {gameName}</DialogTitle>
          <DialogDescription>
            Record expenses or charitable donations associated with this game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expenseDate" className="col-span-1">Date</Label>
            <Input
              id="expenseDate"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expenseType" className="col-span-1">Type</Label>
            <Select
              value={expenseData.type}
              onValueChange={(value) => setExpenseData({
                ...expenseData,
                type: value,
              })}
            >
              <SelectTrigger id="expenseType" className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="donation">Donation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expenseAmount" className="col-span-1">Amount ($)</Label>
            <Input
              id="expenseAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={expenseData.amount}
              onChange={(e) => setExpenseData({
                ...expenseData,
                amount: e.target.value,
              })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expenseMemo" className="col-span-1">Memo</Label>
            <Input
              id="expenseMemo"
              placeholder="e.g., Ticket rolls, Toys for Tots"
              value={expenseData.memo}
              onChange={(e) => setExpenseData({
                ...expenseData,
                memo: e.target.value,
              })}
              className="col-span-3"
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
            onClick={handleAddExpense} 
            className="bg-[#1F4E4A]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
