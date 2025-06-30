import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, CheckCheck, DollarSign, RotateCw, UserCheck, UserCircleIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WeekSummaryStats } from "./WeekSummaryStats";
import { DailyEntryForm } from "./DailyEntryForm";
import { WinnerForm } from "./WinnerForm";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { formatDateString } from "@/lib/dateUtils";
import { JackpotContributionModal } from './JackpotContributionModal';
import { useGameCompletion } from '@/hooks/useGameCompletion';

interface WeekManagementProps {
  week: any;
  game: any;
  onUpdate: () => void;
  onGameComplete?: (winnerData: any) => Promise<void>;
}

export const WeekManagement = ({ 
  week, 
  game, 
  onUpdate, 
  onGameComplete 
}: WeekManagementProps) => {
  const { toast } = useToast();
  const [showDailyEntryForm, setShowDailyEntryForm] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showWinnerForm, setShowWinnerForm] = useState(false);
  const [isSubmittingWinner, setIsSubmittingWinner] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New state for jackpot contribution modal
  const [showJackpotContribution, setShowJackpotContribution] = useState(false);
  const [jackpotContributionData, setJackpotContributionData] = useState<{
    totalJackpot: number;
    winnerName: string;
    winnerData: any;
  } | null>(null);

  const { completeGameWithContribution } = useGameCompletion();

  const handleOpenDailyEntry = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setShowDailyEntryForm(true);
  };

  const handleCloseDailyEntry = () => {
    setShowDailyEntryForm(false);
    setSelectedDayIndex(null);
  };

  const handleWinnerSubmit = async (winnerData: any) => {
    setIsSubmittingWinner(true);

    try {
      const { winnerName, slotChosen, cardSelected, winnerPresent, authorizedSignature, weeklyPayout } = winnerData;

      // Update week with winner information
      const { error } = await supabase
        .from('weeks')
        .update({
          winner_name: winnerName,
          slot_chosen: slotChosen,
          card_selected: cardSelected,
          winner_present: winnerPresent,
          authorized_signature_name: authorizedSignature,
          weekly_payout: weeklyPayout,
          ending_jackpot: 0 // Set to 0, contribution will be carryover
        })
        .eq('id', week.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Winner information submitted successfully!",
      });

      setShowWinnerForm(false);
      await onUpdate();
    } catch (error: any) {
      console.error("Error submitting winner:", error);
      toast({
        title: "Error",
        description: `Failed to submit winner: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingWinner(false);
    }
  };

  const handleGameComplete = async (winnerData: any) => {
    try {
      // Set end date for the game
      const { data, error } = await supabase
        .from('games')
        .update({
          end_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', game.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game completed successfully!",
      });

      await onGameComplete?.(winnerData);
    } catch (error: any) {
      console.error("Error completing game:", error);
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleOpenJackpotContribution = (data: {
    totalJackpot: number;
    winnerName: string;
    winnerData: any;
  }) => {
    setJackpotContributionData(data);
    setShowJackpotContribution(true);
  };

  const handleJackpotContributionConfirm = async (contributionAmount: number) => {
    if (!jackpotContributionData) return;

    try {
      const finalWinnerPayout = jackpotContributionData.totalJackpot - contributionAmount;
      
      // Complete the game with the contribution
      await completeGameWithContribution(
        game.id,
        contributionAmount,
        finalWinnerPayout
      );

      // Update the winner's actual payout in the week record
      const { error: weekUpdateError } = await supabase
        .from('weeks')
        .update({
          weekly_payout: finalWinnerPayout
        })
        .eq('id', week.id)
        .eq('user_id', user?.id);

      if (weekUpdateError) throw weekUpdateError;

      toast({
        title: "Success",
        description: contributionAmount > 0 
          ? `Game completed! Winner contributed ${formatCurrency(contributionAmount)} to next game.`
          : "Game completed successfully!",
      });

      // Call the parent's game complete callback
      await onGameComplete?.(jackpotContributionData.winnerData);
      
      // Reset state
      setJackpotContributionData(null);
    } catch (error: any) {
      console.error('Error handling jackpot contribution:', error);
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to refresh week: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasWinner = week.winner_name !== null;
  const weekStartDate = new Date(week.start_date);
  const weekEndDate = new Date(week.end_date);

  const displayedEndingJackpot = week.ending_jackpot !== null ? week.ending_jackpot : week.weekly_payout;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">
            Week #{week.week_number}
          </CardTitle>
          <Button 
            variant="ghost" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RotateCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {formatDateString(weekStartDate)} - {formatDateString(weekEndDate)}
          </div>

          <WeekSummaryStats
            weekTotalTickets={week.weekly_tickets_sold}
            weekTotalSales={week.weekly_sales}
            weekOrganizationTotal={week.weekly_sales - week.weekly_payout}
            weekJackpotTotal={week.weekly_sales - week.weekly_payout}
            displayedEndingJackpot={displayedEndingJackpot}
            hasWinner={hasWinner}
            formatCurrency={formatCurrency}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, index) => {
          const currentDate = new Date(weekStartDate);
          currentDate.setDate(weekStartDate.getDate() + index);
          const formattedDate = currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{formattedDate}</CardTitle>
                <UserCircleIcon className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-center text-[#1F4E4A]">
                  {week.ticket_sales && week.ticket_sales[index]
                    ? week.ticket_sales[index].tickets_sold
                    : 0}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => handleOpenDailyEntry(index)}
                >
                  Enter Sales
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!hasWinner && (
        <Button 
          className="w-full bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
          onClick={() => setShowWinnerForm(true)}
        >
          Enter Winner
        </Button>
      )}

      {showDailyEntryForm && (
        <DailyEntryForm
          open={showDailyEntryForm}
          onOpenChange={setShowDailyEntryForm}
          weekId={week.id}
          dayIndex={selectedDayIndex!}
          currentGameId={game.id}
          games={game}
          onComplete={() => {
            handleCloseDailyEntry();
            onUpdate();
          }}
        />
      )}

      {showWinnerForm && (
        <WinnerForm
          week={week}
          game={game}
          onWinnerSubmit={handleWinnerSubmit}
          onGameComplete={handleGameComplete}
          onOpenJackpotContribution={handleOpenJackpotContribution}
        />
      )}

      <JackpotContributionModal
        open={showJackpotContribution}
        onOpenChange={setShowJackpotContribution}
        totalJackpot={jackpotContributionData?.totalJackpot || 0}
        winnerName={jackpotContributionData?.winnerName || ''}
        onConfirm={handleJackpotContributionConfirm}
      />
    </div>
  );
};
