
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";
import { formatDateStringForDisplay } from '@/lib/dateUtils';

interface DailyEntryEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  onSave: () => void;
}

export function DailyEntryEditModal({ open, onOpenChange, entry, onSave }: DailyEntryEditModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticketsSold, setTicketsSold] = useState(0);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setTicketsSold(entry.tickets_sold || 0);
      setDate(entry.date || '');
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry || !user?.id) return;

    setLoading(true);
    try {
      // Get game data for calculations
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', entry.game_id)
        .eq('user_id', user.id)
        .single();

      if (gameError) throw gameError;

      // Calculate the updated values
      const ticketPrice = gameData.ticket_price;
      const amountCollected = ticketsSold * ticketPrice;
      const organizationTotal = amountCollected * (gameData.organization_percentage / 100);
      const jackpotTotal = amountCollected * (gameData.jackpot_percentage / 100);

      // Update the entry
      const { error } = await supabase
        .from('ticket_sales')
        .update({
          date: date,
          tickets_sold: ticketsSold,
          amount_collected: amountCollected,
          organization_total: organizationTotal,
          jackpot_total: jackpotTotal
        })
        .eq('id', entry.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry updated successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: `Failed to update entry: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Daily Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tickets">Tickets Sold</Label>
            <Input
              id="tickets"
              type="number"
              min="0"
              value={ticketsSold}
              onChange={(e) => setTicketsSold(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
