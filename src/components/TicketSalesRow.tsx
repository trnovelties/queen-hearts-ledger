
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useJackpotCalculation } from "@/hooks/useJackpotCalculation";
import { useAuth } from "@/context/AuthContext";

interface TicketSalesRowProps {
  gameId: string;
  weekId: string;
  gameData: {
    ticket_price: number;
    organization_percentage: number;
    jackpot_percentage: number;
    minimum_starting_jackpot: number;
    carryover_jackpot: number;
  };
  previousEndingJackpot: number;
  previousJackpotContributions: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TicketSalesRow({ 
  gameId, 
  weekId, 
  gameData, 
  previousEndingJackpot, 
  previousJackpotContributions,
  onSuccess, 
  onCancel 
}: TicketSalesRowProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: new Date(),
    ticketsSold: '',
    ticketPrice: gameData.ticket_price
  });
  const [isLoading, setIsLoading] = useState(false);

  // Calculate current jackpot contributions
  const currentJackpotContribution = (parseFloat(formData.ticketsSold) || 0) * formData.ticketPrice * (gameData.jackpot_percentage / 100);
  const totalJackpotContributions = previousJackpotContributions + currentJackpotContribution;

  // Use the hook to calculate displayed jackpot
  const displayedJackpot = useJackpotCalculation({
    jackpotContributions: totalJackpotContributions,
    minimumJackpot: gameData.minimum_starting_jackpot,
    carryoverJackpot: gameData.carryover_jackpot
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!user?.id) {
      toast.error("You must be logged in to add ticket sales");
      setIsLoading(false);
      return;
    }

    try {
      const ticketsSold = parseInt(formData.ticketsSold);
      if (!ticketsSold || ticketsSold <= 0) {
        toast.error("Please enter a valid number of tickets sold");
        return;
      }

      const amountCollected = ticketsSold * formData.ticketPrice;
      const organizationTotal = amountCollected * (gameData.organization_percentage / 100);
      const jackpotTotal = amountCollected * (gameData.jackpot_percentage / 100);

      // Get cumulative collected for this game
      const { data: existingSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('amount_collected')
        .eq('game_id', gameId);

      if (salesError) throw salesError;

      const cumulativeCollected = (existingSales?.reduce((sum, sale) => sum + sale.amount_collected, 0) || 0) + amountCollected;

      // Calculate new jackpot contributions total
      const newJackpotContributions = totalJackpotContributions;

      // Insert ticket sales record
      const { error: insertError } = await supabase
        .from('ticket_sales')
        .insert({
          game_id: gameId,
          week_id: weekId,
          user_id: user.id,
          date: formData.date.toISOString().split('T')[0],
          tickets_sold: ticketsSold,
          ticket_price: formData.ticketPrice,
          amount_collected: amountCollected,
          cumulative_collected: cumulativeCollected,
          organization_total: organizationTotal,
          jackpot_total: jackpotTotal,
          jackpot_contributions_total: newJackpotContributions,
          displayed_jackpot_total: displayedJackpot,
          ending_jackpot_total: displayedJackpot
        });

      if (insertError) throw insertError;

      // Update game totals
      const { error: updateError } = await supabase
        .from('games')
        .update({
          total_sales: cumulativeCollected
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      toast.success("Ticket sales added successfully!");
      onSuccess();
    } catch (error) {
      console.error('Error adding ticket sales:', error);
      toast.error("Failed to add ticket sales");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-[#1F4E4A]/20 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#1F4E4A] font-inter">Add Ticket Sales</CardTitle>
        <CardDescription className="text-[#132E2C]/60">Record daily ticket sales for this week</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-semibold text-[#132E2C]">Date</Label>
            <DatePickerWithInput
              date={formData.date}
              setDate={(date) => setFormData({ ...formData, date: date || new Date() })}
              placeholder="Select date"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketsSold" className="text-sm font-semibold text-[#132E2C]">Tickets Sold</Label>
            <Input
              id="ticketsSold"
              type="text"
              inputMode="numeric"
              value={formData.ticketsSold}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setFormData({ ...formData, ticketsSold: value });
                }
              }}
              placeholder="150"
              className="border-[#1F4E4A]/20 focus:ring-[#A1E96C] font-medium"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketPrice" className="text-sm font-semibold text-[#132E2C]">Ticket Price ($)</Label>
            <Input
              id="ticketPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.ticketPrice}
              onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) || 0 })}
              className="border-[#1F4E4A]/20 focus:ring-[#A1E96C] font-medium"
              required
            />
          </div>

          {/* Show calculated values */}
          <div className="space-y-3 p-4 bg-[#F7F8FC] rounded-lg border border-[#1F4E4A]/10">
            <h4 className="text-sm font-semibold text-[#132E2C] mb-2">Calculated Values</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#132E2C]/70">Amount Collected:</span>
                <span className="font-semibold text-[#1F4E4A]">${((parseFloat(formData.ticketsSold) || 0) * formData.ticketPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]/70">Organization Total:</span>
                <span className="font-semibold text-[#1F4E4A]">${(((parseFloat(formData.ticketsSold) || 0) * formData.ticketPrice) * (gameData.organization_percentage / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]/70">Jackpot Contribution:</span>
                <span className="font-semibold text-[#1F4E4A]">${currentJackpotContribution.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]/70">Total Jackpot Contributions:</span>
                <span className="font-semibold text-[#1F4E4A]">${totalJackpotContributions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1F4E4A]/10">
                <span className="font-semibold text-[#132E2C]">Displayed Jackpot:</span>
                <span className="font-bold text-[#A1E96C] text-lg">${displayedJackpot.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 bg-[#1F4E4A] hover:bg-[#132E2C] text-white font-semibold"
            >
              {isLoading ? "Adding..." : "Add Row"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white font-semibold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
