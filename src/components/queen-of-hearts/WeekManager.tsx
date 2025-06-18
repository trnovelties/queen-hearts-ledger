
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DailyTicketGrid } from "./DailyTicketGrid";
import { TicketSalesRow } from "../TicketSalesRow";
import { WinnerForm } from "../WinnerForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface WeekManagerProps {
  week: any;
  game: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onWeekUpdated: () => void;
  isArchived?: boolean;
}

export function WeekManager({
  week,
  game,
  isExpanded,
  onToggleExpand,
  onWeekUpdated,
  isArchived = false
}: WeekManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [ticketSales, setTicketSales] = useState<any[]>([]);
  const [showAddRow, setShowAddRow] = useState(false);
  const [showWinnerForm, setShowWinnerForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      fetchTicketSales();
    }
  }, [isExpanded, week.id]);

  const fetchTicketSales = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', week.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setTicketSales(data || []);
    } catch (error: any) {
      console.error('Error fetching ticket sales:', error);
    }
  };

  const handleDeleteWeek = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('weeks')
        .delete()
        .eq('id', week.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Week deleted successfully",
      });

      onWeekUpdated();
    } catch (error: any) {
      console.error('Error deleting week:', error);
      toast({
        title: "Error",
        description: "Failed to delete week",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const previousEndingJackpot = 0; // TODO: Calculate from previous weeks
  const previousJackpotContributions = 0; // TODO: Calculate from previous weeks

  return (
    <>
      <Card className="border-l-4 border-l-[#A1E96C] bg-[#F7F8FC]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              <CardTitle className="text-sm font-semibold text-[#1F4E4A]">
                Week {week.week_number}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {formatDate(week.start_date)} - {formatDate(week.end_date)}
              </Badge>
              {week.winner_name && (
                <Badge variant="default" className="text-xs bg-[#A1E96C] text-[#1F4E4A]">
                  Winner: {week.winner_name}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right text-xs">
                <div className="font-semibold text-[#1F4E4A]">
                  {formatCurrency(week.weekly_sales)}
                </div>
                <div className="text-[#132E2C]/60">Sales</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading || isArchived}
                className="h-6 px-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded-lg">
                <div className="text-center">
                  <div className="font-bold text-[#1F4E4A]">{formatCurrency(week.weekly_sales)}</div>
                  <div className="text-xs text-[#132E2C]/60">Weekly Sales</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[#1F4E4A]">{week.weekly_tickets_sold}</div>
                  <div className="text-xs text-[#132E2C]/60">Tickets Sold</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[#1F4E4A]">{formatCurrency(week.weekly_payout)}</div>
                  <div className="text-xs text-[#132E2C]/60">Payout</div>
                </div>
              </div>

              {ticketSales.length > 0 && (
                <DailyTicketGrid
                  ticketSales={ticketSales}
                  weekStartDate={week.start_date}
                  weekEndDate={week.end_date}
                />
              )}

              <div className="flex gap-2">
                {!isArchived && (
                  <>
                    <Button
                      onClick={() => setShowAddRow(true)}
                      size="sm"
                      variant="outline"
                      className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Daily Entry
                    </Button>
                    {!week.winner_name && (
                      <Button
                        onClick={() => setShowWinnerForm(true)}
                        size="sm"
                        className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90"
                      >
                        Add Winner
                      </Button>
                    )}
                  </>
                )}
              </div>

              {showAddRow && (
                <div className="border-t pt-4">
                  <TicketSalesRow
                    gameId={game.id}
                    weekId={week.id}
                    gameData={game}
                    previousEndingJackpot={previousEndingJackpot}
                    previousJackpotContributions={previousJackpotContributions}
                    onSuccess={() => {
                      fetchTicketSales();
                      onWeekUpdated();
                      setShowAddRow(false);
                    }}
                    onCancel={() => setShowAddRow(false)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {showWinnerForm && (
        <WinnerForm
          open={showWinnerForm}
          onOpenChange={setShowWinnerForm}
          weekId={week.id}
          gameId={game.id}
          gameData={game}
          onComplete={() => {
            onWeekUpdated();
            setShowWinnerForm(false);
          }}
          onOpenPayoutSlip={() => {}}
        />
      )}

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteWeek}
        title="Delete Week"
        description={`Are you sure you want to delete Week ${week.week_number}? This will also delete all associated ticket sales.`}
        isLoading={isLoading}
      />
    </>
  );
}
