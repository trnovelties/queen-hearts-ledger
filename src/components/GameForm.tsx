
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getTodayDateString } from "@/lib/dateUtils";

interface GameFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: any[];
  onComplete: () => void;
}

export function GameForm({ open, onOpenChange, games, onComplete }: GameFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    startDate: getTodayDateString(), // Default to today, but user can change
    ticketPrice: 2,
    organizationPercentage: 40,
    jackpotPercentage: 60,
    minimumStartingJackpot: 500
  });
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const nextGameNumber = games.length + 1;
      setFormData({
        name: `Game ${nextGameNumber}`,
        startDate: getTodayDateString(), // Default to today
        ticketPrice: 2,
        organizationPercentage: 40,
        jackpotPercentage: 60,
        minimumStartingJackpot: 500
      });
    }
  }, [open, games.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (formData.organizationPercentage + formData.jackpotPercentage !== 100) {
        toast.error("Organization and Jackpot percentages must total 100%");
        return;
      }

      if (!user) {
        toast.error("You must be logged in to create games.");
        return;
      }

      console.log('Creating game with user_id:', user.id);

      // Get current configuration including card payouts and version - now user-specific
      const { data: config, error: configError } = await supabase
        .from('configurations')
        .select('card_payouts, version')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (configError) {
        console.error('Error fetching configuration:', configError);
        toast.error("Failed to fetch current configuration");
        return;
      }

      // Get carryover from last game
      let carryoverJackpot = 0;
      if (games.length > 0) {
        const lastGame = games[games.length - 1];
        carryoverJackpot = lastGame.carryover_jackpot || 0;
      }

      const gameNumber = games.length + 1;

      // CRITICAL FIX: Use the user-selected date directly as string
      console.log('=== GAME FORM DATE DEBUG ===');
      console.log('1. User selected start_date:', formData.startDate);
      console.log('2. typeof formData.startDate:', typeof formData.startDate);
      console.log('3. User timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

      const gameData = {
        game_number: gameNumber,
        name: formData.name,
        start_date: formData.startDate, // Use EXACTLY what user selected, no conversion
        ticket_price: formData.ticketPrice,
        organization_percentage: formData.organizationPercentage,
        jackpot_percentage: formData.jackpotPercentage,
        minimum_starting_jackpot: formData.minimumStartingJackpot,
        carryover_jackpot: carryoverJackpot,
        card_payouts: config.card_payouts,
        configuration_version: config.version,
        user_id: user.id // Explicitly set user_id
      };

      console.log('4. Final gameData:', JSON.stringify(gameData, null, 2));
      console.log('5. gameData.start_date specifically:', gameData.start_date);

      const { data: insertResult, error } = await supabase
        .from('games')
        .insert(gameData)
        .select('*');

      if (error) {
        console.error('6. Supabase error:', error);
        throw error;
      }

      console.log('7. Insert successful, DB returned:', JSON.stringify(insertResult, null, 2));
      console.log('8. DB returned start_date:', insertResult?.[0]?.start_date);
      console.log('9. Date match check:', formData.startDate === insertResult?.[0]?.start_date);

      toast.success("Game created successfully!");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error("Failed to create game");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    console.log('=== DATE INPUT CHANGE DEBUG ===');
    console.log('User selected date from input:', selectedDate);
    console.log('typeof selectedDate:', typeof selectedDate);
    
    // Set exactly what user selected from date input (YYYY-MM-DD string)
    setFormData({ ...formData, startDate: selectedDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Create New Game</CardTitle>
            <CardDescription>Set up a new Queen of Hearts game</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Game Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Game 1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleStartDateChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationPercentage">Organization Percentage (%)</Label>
                <Input
                  id="organizationPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.organizationPercentage}
                  onChange={(e) => setFormData({ ...formData, organizationPercentage: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jackpotPercentage">Jackpot Percentage (%)</Label>
                <Input
                  id="jackpotPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.jackpotPercentage}
                  onChange={(e) => setFormData({ ...formData, jackpotPercentage: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumStartingJackpot">Minimum Starting Jackpot ($)</Label>
                <Input
                  id="minimumStartingJackpot"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimumStartingJackpot}
                  onChange={(e) => setFormData({ ...formData, minimumStartingJackpot: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Game"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
