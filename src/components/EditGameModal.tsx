
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameName: string;
  onSuccess?: () => void;
}

export function EditGameModal({ open, onOpenChange, gameId, gameName, onSuccess }: EditGameModalProps) {
  const { toast } = useToast();
  const [gameData, setGameData] = useState({
    name: gameName,
    ticketPrice: 2,
    organizationPercentage: 40,
    jackpotPercentage: 60,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && gameId) {
      fetchGameData();
    }
  }, [open, gameId]);

  const fetchGameData = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('name, ticket_price, organization_percentage, jackpot_percentage')
        .eq('id', gameId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setGameData({
          name: data.name,
          ticketPrice: data.ticket_price,
          organizationPercentage: data.organization_percentage,
          jackpotPercentage: data.jackpot_percentage,
        });
      }
    } catch (error: any) {
      console.error('Error fetching game data:', error);
      toast({
        title: "Error",
        description: "Failed to load game data.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGame = async () => {
    if (!gameData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Game name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (gameData.organizationPercentage + gameData.jackpotPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Organization and Jackpot percentages must total 100%.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('games')
        .update({
          name: gameData.name,
          ticket_price: gameData.ticketPrice,
          organization_percentage: gameData.organizationPercentage,
          jackpot_percentage: gameData.jackpotPercentage,
        })
        .eq('id', gameId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Game updated successfully.",
      });

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating game:', error);
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
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>
            Update the game settings and percentages.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gameName" className="col-span-1">Name</Label>
            <Input
              id="gameName"
              value={gameData.name}
              onChange={(e) => setGameData({
                ...gameData,
                name: e.target.value,
              })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ticketPrice" className="col-span-1">Ticket Price ($)</Label>
            <Input
              id="ticketPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={gameData.ticketPrice}
              onChange={(e) => setGameData({
                ...gameData,
                ticketPrice: parseFloat(e.target.value) || 0,
              })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="orgPercentage" className="col-span-1">Organization %</Label>
            <Input
              id="orgPercentage"
              type="number"
              min="0"
              max="100"
              value={gameData.organizationPercentage}
              onChange={(e) => setGameData({
                ...gameData,
                organizationPercentage: parseFloat(e.target.value) || 0,
              })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="jackpotPercentage" className="col-span-1">Jackpot %</Label>
            <Input
              id="jackpotPercentage"
              type="number"
              min="0"
              max="100"
              value={gameData.jackpotPercentage}
              onChange={(e) => setGameData({
                ...gameData,
                jackpotPercentage: parseFloat(e.target.value) || 0,
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
            onClick={handleUpdateGame} 
            className="bg-[#1F4E4A]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
