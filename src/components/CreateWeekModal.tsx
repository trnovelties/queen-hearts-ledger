
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTodayDateString } from "@/lib/dateUtils";

interface CreateWeekModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameName: string;
  onSuccess?: () => void;
}

export function CreateWeekModal({ open, onOpenChange, gameId, gameName, onSuccess }: CreateWeekModalProps) {
  const { toast } = useToast();
  const [weekData, setWeekData] = useState({
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWeek = async () => {
    if (!weekData.startDate || !weekData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select both start and end dates.",
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
          description: "You must be logged in to create weeks.",
          variant: "destructive",
        });
        return;
      }

      // Get the current week count for this game
      const { data: existingWeeks } = await supabase
        .from('weeks')
        .select('week_number')
        .eq('game_id', gameId)
        .order('week_number', { ascending: false })
        .limit(1);

      const nextWeekNumber = existingWeeks && existingWeeks.length > 0 
        ? existingWeeks[0].week_number + 1 
        : 1;

      const { data, error } = await supabase
        .from('weeks')
        .insert([{
          game_id: gameId,
          week_number: nextWeekNumber,
          start_date: weekData.startDate,
          end_date: weekData.endDate,
          user_id: user.id,
        }])
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Week ${nextWeekNumber} created successfully.`,
      });

      setWeekData({
        startDate: getTodayDateString(),
        endDate: getTodayDateString(),
      });

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating week:', error);
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
          <DialogTitle>Create New Week for {gameName}</DialogTitle>
          <DialogDescription>
            Set the start and end dates for the new week.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="col-span-1">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={weekData.startDate}
              onChange={(e) => setWeekData({
                ...weekData,
                startDate: e.target.value,
              })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="col-span-1">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={weekData.endDate}
              onChange={(e) => setWeekData({
                ...weekData,
                endDate: e.target.value,
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
            onClick={handleCreateWeek} 
            className="bg-[#1F4E4A]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Week"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
