
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GameFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function GameForm({ onSuccess, onCancel }: GameFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    ticketPrice: 2,
    organizationPercentage: 40,
    jackpotPercentage: 60,
    minimumStartingJackpot: 500
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (formData.organizationPercentage + formData.jackpotPercentage !== 100) {
        toast.error("Organization and Jackpot percentages must total 100%");
        return;
      }

      // Get the next game number
      const { data: existingGames, error: gamesError } = await supabase
        .from('games')
        .select('game_number')
        .order('game_number', { ascending: false })
        .limit(1);

      if (gamesError) throw gamesError;

      const nextGameNumber = existingGames && existingGames.length > 0 
        ? existingGames[0].game_number + 1 
        : 1;

      // Get carryover from last game if exists
      let carryoverJackpot = 0;
      if (existingGames && existingGames.length > 0) {
        const { data: lastGame, error: lastGameError } = await supabase
          .from('games')
          .select('carryover_jackpot')
          .eq('game_number', existingGames[0].game_number)
          .single();

        if (lastGameError) throw lastGameError;
        carryoverJackpot = lastGame?.carryover_jackpot || 0;
      }

      // Create the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          game_number: nextGameNumber,
          name: formData.name,
          start_date: new Date().toISOString().split('T')[0],
          ticket_price: formData.ticketPrice,
          organization_percentage: formData.organizationPercentage,
          jackpot_percentage: formData.jackpotPercentage,
          minimum_starting_jackpot: formData.minimumStartingJackpot,
          carryover_jackpot: carryoverJackpot
        })
        .select()
        .single();

      if (gameError) throw gameError;

      toast.success("Game created successfully!");
      onSuccess();
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error("Failed to create game");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create New Game</CardTitle>
        <CardDescription>Set up a new Queen of Hearts game</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gameName">Game Name</Label>
            <Input
              id="gameName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Game 1"
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

          <div className="space-y-2">
            <Label htmlFor="minimumJackpot">Minimum Starting Jackpot ($)</Label>
            <Input
              id="minimumJackpot"
              type="number"
              min="0"
              step="0.01"
              value={formData.minimumStartingJackpot}
              onChange={(e) => setFormData({ ...formData, minimumStartingJackpot: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgPercentage">Organization %</Label>
              <Input
                id="orgPercentage"
                type="number"
                min="0"
                max="100"
                value={formData.organizationPercentage}
                onChange={(e) => setFormData({ ...formData, organizationPercentage: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jackpotPercentage">Jackpot %</Label>
              <Input
                id="jackpotPercentage"
                type="number"
                min="0"
                max="100"
                value={formData.jackpotPercentage}
                onChange={(e) => setFormData({ ...formData, jackpotPercentage: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Game"}
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
