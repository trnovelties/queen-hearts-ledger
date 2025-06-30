import { useTicketSales } from '@/hooks/useTicketSales';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WeekHeader } from './WeekHeader';
import { WeekSummaryStats } from './WeekSummaryStats';
import { WinnerInfoDisplay } from './WinnerInfoDisplay';
import { DailyEntriesList } from './DailyEntriesList';
import { WinnerSelectionSection } from './WinnerSelectionSection';

interface TicketSalesTableProps {
  week: any;
  game: any;
  currentGameId: string | null;
  games: any[];
  setGames: (games: any[]) => void;
  onToggleWeek: (weekId: string | null) => void;
  onOpenWinnerForm?: (gameId: string, weekId: string) => void;
  onOpenPayoutSlip?: (winnerData: any) => void;
  onOpenExpenseModal?: (date: string, gameId: string) => void;
  onOpenDonationModal?: (date: string, gameId: string) => void;
  onRefreshData?: () => void;
  needsGameCompletion?: (week: any) => boolean;
  onCompleteGameClick?: (week: any) => void;
}

export const TicketSalesTable = ({
  week,
  game,
  currentGameId,
  games,
  setGames,
  onToggleWeek,
  onOpenWinnerForm,
  onOpenPayoutSlip,
  onOpenExpenseModal,
  onOpenDonationModal,
  onRefreshData,
  needsGameCompletion,
  onCompleteGameClick
}: TicketSalesTableProps) => {
  const { handleTicketInputChange, handleTicketInputSubmit, tempTicketInputs } = useTicketSales();
  const [displayedEndingJackpot, setDisplayedEndingJackpot] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Check if week is complete (has entries for all 7 days, regardless of ticket count)
  const isWeekComplete = () => {
    return week.ticket_sales.length === 7;
  };

  // Check if week already has a winner
  const hasWinner = () => {
    return week.winner_name && week.winner_name.trim() !== '';
  };

  // Handle winner button click with validation
  const handleWinnerButtonClick = () => {
    if (!isWeekComplete()) {
      toast({
        title: "Week Incomplete",
        description: "Please enter ticket sales for all 7 days before adding winner details.",
        variant: "destructive",
      });
      return;
    }
    
    if (onOpenWinnerForm) {
      onOpenWinnerForm(game.id, week.id);
    }
  };

  // Calculate week totals from daily entries
  const weekTotalTickets = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.tickets_sold, 0);
  const weekTotalSales = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.amount_collected, 0);
  const weekOrganizationTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.organization_total, 0);
  const weekJackpotTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.jackpot_total, 0);

  // Calculate displayed ending jackpot based on week completion status
  useEffect(() => {
    const calculateDisplayedEndingJackpot = async () => {
      if (week.winner_name && week.ending_jackpot !== null && week.ending_jackpot !== undefined) {
        // Week is completed - use the stored ending jackpot value from database
        console.log('Using stored ending jackpot for completed week:', week.ending_jackpot);
        setDisplayedEndingJackpot(week.ending_jackpot);
      } else {
        // Week is not completed - calculate current jackpot dynamically
        try {
          // Get previous week's stored ending jackpot as starting point
          let previousEndingJackpot = 0;
          if (week.week_number > 1) {
            const { data: previousWeek, error } = await supabase
              .from('weeks')
              .select('ending_jackpot')
              .eq('game_id', game.id)
              .eq('week_number', week.week_number - 1)
              .eq('user_id', user?.id)
              .single();

            if (!error && previousWeek && previousWeek.ending_jackpot !== null) {
              previousEndingJackpot = previousWeek.ending_jackpot;
              console.log('Found previous week ending jackpot:', previousEndingJackpot);
            } else {
              // Fallback to game carryover if previous week not found or has no ending jackpot
              console.log('No previous week ending jackpot found, using game carryover:', game.carryover_jackpot);
              previousEndingJackpot = game.carryover_jackpot || 0;
            }
          } else {
            // Week 1 starts with game's carryover jackpot
            previousEndingJackpot = game.carryover_jackpot || 0;
            console.log('Week 1, using game carryover jackpot:', previousEndingJackpot);
          }

          // Add current week's jackpot contributions to get the current running total
          const currentJackpotTotal = previousEndingJackpot + weekJackpotTotal;
          console.log('Calculating current jackpot for incomplete week:');
          console.log('Previous ending jackpot:', previousEndingJackpot);
          console.log('Current week contributions:', weekJackpotTotal);
          console.log('Current total jackpot:', currentJackpotTotal);
          
          setDisplayedEndingJackpot(currentJackpotTotal);
        } catch (error) {
          console.error('Error calculating current jackpot:', error);
          // Fallback calculation
          const fallbackJackpot = (game.carryover_jackpot || 0) + weekJackpotTotal;
          console.log('Using fallback calculation:', fallbackJackpot);
          setDisplayedEndingJackpot(fallbackJackpot);
        }
      }
    };

    calculateDisplayedEndingJackpot();
  }, [week, game.id, game.carryover_jackpot, weekJackpotTotal, user?.id]);

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
      {/* Week Details Header */}
      <div className="pb-6 border-b border-gray-200">
        <WeekHeader week={week} onToggleWeek={onToggleWeek} />
        
        {/* Week Summary Stats */}
        <WeekSummaryStats
          weekTotalTickets={weekTotalTickets}
          weekTotalSales={weekTotalSales}
          weekOrganizationTotal={weekOrganizationTotal}
          weekJackpotTotal={weekJackpotTotal}
          displayedEndingJackpot={displayedEndingJackpot}
          hasWinner={hasWinner()}
          formatCurrency={formatCurrency}
        />
        
        {/* Winner Information */}
        <WinnerInfoDisplay 
          week={week} 
          formatCurrency={formatCurrency}
          onOpenPayoutSlip={onOpenPayoutSlip}
          onOpenWinnerForm={onOpenWinnerForm}
          gameId={game.id}
        />
      </div>
      
      {/* 7 Daily Entries */}
      <DailyEntriesList
        week={week}
        tempTicketInputs={tempTicketInputs}
        formatCurrency={formatCurrency}
        onInputChange={handleTicketInputChange}
        onInputSubmit={handleTicketInputSubmit}
        currentGameId={currentGameId}
        games={games}
        setGames={setGames}
        onOpenExpenseModal={onOpenExpenseModal}
        onOpenDonationModal={onOpenDonationModal}
      />

      {/* Winner Selection Section */}
      <WinnerSelectionSection
        week={week}
        isWeekComplete={isWeekComplete()}
        hasWinner={hasWinner()}
        onWinnerButtonClick={handleWinnerButtonClick}
        needsGameCompletion={needsGameCompletion ? needsGameCompletion(week) : false}
        onCompleteGameClick={onCompleteGameClick ? () => onCompleteGameClick(week) : undefined}
      />
    </div>
  );
};
