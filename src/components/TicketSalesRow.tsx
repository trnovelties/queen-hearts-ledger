
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/datepicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useJackpotCalculation } from "@/hooks/useJackpotCalculation";

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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Add Ticket Sales</CardTitle>
        <CardDescription>Record daily ticket sales for this week</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <DatePicker
              date={formData.date}
              setDate={(date) => setFormData({ ...formData, date: date || new Date() })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketsSold">Tickets Sold</Label>
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
            <Input
              id="ticketPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.ticketPrice}
              onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          {/* Show calculated values */}
          <div className="space-y-2 text-sm text-gray-600">
            <div>Amount Collected: ${((parseFloat(formData.ticketsSold) || 0) * formData.ticketPrice).toFixed(2)}</div>
            <div>Organization Total: ${(((parseFloat(formData.ticketsSold) || 0) * formData.ticketPrice) * (gameData.organization_percentage / 100)).toFixed(2)}</div>
            <div>Jackpot Contribution: ${currentJackpotContribution.toFixed(2)}</div>
            <div>Total Jackpot Contributions: ${totalJackpotContributions.toFixed(2)}</div>
            <div className="font-semibold">Displayed Jackpot: ${displayedJackpot.toFixed(2)}</div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Adding..." : "Add Row"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
