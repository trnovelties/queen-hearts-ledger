
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DatePickerWithInput } from "@/components/ui/datepicker";

interface GameFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: any[];
  onComplete: () => void;
}

export function GameForm({ open, onOpenChange, games, onComplete }: GameFormProps) {
  const [gameForm, setGameForm] = useState({
    gameNumber: games.length > 0 ? games[games.length - 1].game_number + 1 : 1,
    startDate: new Date(),
    ticketPrice: 2,
    organizationPercentage: 40,
    jackpotPercentage: 60,
    minimumStartingJackpot: 500
  });

  const { toast } = useToast();

  const createGame = async () => {
    try {
      // Generate game name automatically from game number
      const gameName = `Game ${gameForm.gameNumber}`;
      
      // Get the previous game to check for carryover jackpot
      let carryoverJackpot = 0;
      if (games.length > 0) {
        const lastGame = games[games.length - 1];
        
        // Get the last ticket sale to find ending jackpot
        const { data: lastSale, error: saleError } = await supabase
          .from('ticket_sales')
          .select('ending_jackpot_total')
          .eq('game_id', lastGame.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!saleError && lastSale && lastSale.length > 0) {
          carryoverJackpot = lastSale[0].ending_jackpot_total;
        }
        
        // Ensure minimum starting jackpot
        carryoverJackpot = Math.max(carryoverJackpot, gameForm.minimumStartingJackpot);
      } else {
        // First game starts with minimum jackpot
        carryoverJackpot = gameForm.minimumStartingJackpot;
      }

      const { data, error } = await supabase.from('games').insert([{
        name: gameName, // Use the generated name
        game_number: gameForm.gameNumber,
        start_date: gameForm.startDate.toISOString().split('T')[0],
        ticket_price: gameForm.ticketPrice,
        organization_percentage: gameForm.organizationPercentage,
        jackpot_percentage: gameForm.jackpotPercentage,
        carryover_jackpot: carryoverJackpot
      }]).select();
      
      if (error) throw error;
      
      toast({
        title: "Game Created",
        description: `${gameName} has been created successfully.`
      });
      
      onOpenChange(false);
      onComplete();
      
      setGameForm({
        gameNumber: gameForm.gameNumber + 1,
        startDate: new Date(),
        ticketPrice: 2,
        organizationPercentage: 40,
        jackpotPercentage: 60,
        minimumStartingJackpot: 500
      });
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: `Failed to create game: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Game</DialogTitle>
          <DialogDescription>
            Enter the details for the new Queen of Hearts game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="gameNumber" className="text-sm font-medium">Game Number</label>
            <Input 
              id="gameNumber" 
              type="number" 
              value={gameForm.gameNumber} 
              onChange={e => setGameForm({...gameForm, gameNumber: parseInt(e.target.value)})} 
              min="1" 
            />
          </div>
          
          <div className="grid gap-2">
            <DatePickerWithInput
              label="Start Date"
              date={gameForm.startDate}
              setDate={(date) => date ? setGameForm({...gameForm, startDate: date}) : null}
              placeholder="Select start date"
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="ticketPrice" className="text-sm font-medium">Ticket Price ($)</label>
            <Input 
              id="ticketPrice" 
              type="number" 
              step="0.01" 
              value={gameForm.ticketPrice} 
              onChange={e => setGameForm({...gameForm, ticketPrice: parseFloat(e.target.value)})} 
              min="0.01" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="organizationPercentage" className="text-sm font-medium">Organization % <span className="text-xs text-muted-foreground">(must total 100%)</span></label>
              <Input 
                id="organizationPercentage" 
                type="number" 
                value={gameForm.organizationPercentage} 
                onChange={e => {
                  const org = parseInt(e.target.value) || 0;
                  setGameForm({
                    ...gameForm,
                    organizationPercentage: org,
                    jackpotPercentage: 100 - org
                  });
                }} 
                min="0" 
                max="100" 
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="jackpotPercentage" className="text-sm font-medium">Jackpot %</label>
              <Input 
                id="jackpotPercentage" 
                type="number" 
                value={gameForm.jackpotPercentage} 
                onChange={e => {
                  const jackpot = parseInt(e.target.value) || 0;
                  setGameForm({
                    ...gameForm,
                    jackpotPercentage: jackpot,
                    organizationPercentage: 100 - jackpot
                  });
                }} 
                min="0" 
                max="100" 
                disabled 
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="minimumStartingJackpot" className="text-sm font-medium">Minimum Starting Jackpot ($)</label>
            <Input 
              id="minimumStartingJackpot" 
              type="number" 
              step="0.01" 
              value={gameForm.minimumStartingJackpot} 
              onChange={e => setGameForm({...gameForm, minimumStartingJackpot: parseFloat(e.target.value)})} 
              min="0" 
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => createGame()}>Create Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
