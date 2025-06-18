
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WeekFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  existingWeeks: any[];
  onWeekCreated: () => void;
}

export function WeekForm({ open, onOpenChange, gameId, existingWeeks, onWeekCreated }: WeekFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    weekNumber: existingWeeks.length + 1,
    startDate: new Date(),
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // 7 days from now
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('weeks')
        .insert({
          game_id: gameId,
          user_id: user.id,
          week_number: formData.weekNumber,
          start_date: formData.startDate.toISOString().split('T')[0],
          end_date: formData.endDate.toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Week created successfully!",
      });

      onWeekCreated();
    } catch (error: any) {
      console.error('Error creating week:', error);
      toast({
        title: "Error",
        description: "Failed to create week",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Create New Week</CardTitle>
            <CardDescription>Add a new week to this game</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weekNumber">Week Number</Label>
                <Input
                  id="weekNumber"
                  type="number"
                  min="1"
                  value={formData.weekNumber}
                  onChange={(e) => setFormData({ ...formData, weekNumber: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePickerWithInput
                  date={formData.startDate}
                  setDate={(date) => date && setFormData({ ...formData, startDate: date })}
                  placeholder="Select start date"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePickerWithInput
                  date={formData.endDate}
                  setDate={(date) => date && setFormData({ ...formData, endDate: date })}
                  placeholder="Select end date"
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Week"}
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
