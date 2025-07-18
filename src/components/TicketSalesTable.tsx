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
  onDeleteWeek?: (weekId: string) => void;
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
  onCompleteGameClick,
  onDeleteWeek
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

  // Helper function to calculate cumulative values
  const calculateCumulativeValues = () => {
    const currentGame = games.find(g => g.id === game.id);
    if (!currentGame) return { cumulativeOrganizationNet: 0, cumulativeCurrentJackpot: 0, cumulativeJackpotPool: 0 };

    // Get all weeks up to and including current week
    const weeksUpToCurrent = currentGame.weeks
      .filter((w: any) => w.week_number <= week.week_number)
      .sort((a: any, b: any) => a.week_number - b.week_number);

    let cumulativeOrganizationNet = 0;
    let cumulativeCurrentJackpot = 0;
    let cumulativeJackpotPool = 0;

    weeksUpToCurrent.forEach((w: any) => {
      if (w.ticket_sales) {
        const weekOrgTotal = w.ticket_sales.reduce((sum: number, entry: any) => sum + entry.organization_total, 0);
        const weekJackpotTotal = w.ticket_sales.reduce((sum: number, entry: any) => sum + entry.jackpot_total, 0);
        
        cumulativeOrganizationNet += weekOrgTotal;
        
        // For cumulative current jackpot, add carryover to first week only
        if (w.week_number === 1) {
          cumulativeCurrentJackpot += weekJackpotTotal + (currentGame.carryover_jackpot || 0);
        } else {
          cumulativeCurrentJackpot += weekJackpotTotal;
        }
        
        // For jackpot pool cumulative, add carryover to first week only
        if (w.week_number === 1) {
          cumulativeJackpotPool += weekJackpotTotal + (currentGame.carryover_jackpot || 0);
        } else {
          cumulativeJackpotPool += weekJackpotTotal;
        }
        
        // Scenario 2: For Queen of Hearts, show cumulative before payout
        if (w.card_selected === 'Queen of Hearts') {
          // Don't deduct Queen of Hearts payout from cumulative display (show pre-payout total)
          return;
        }
        
        // For completed weeks with winners (but not Queen of Hearts), deduct payout from cumulative
        // BUT only for weeks BEFORE the current week, not the current week itself
        if (w.winner_name && w.weekly_payout && w.card_selected !== 'Queen of Hearts' && w.week_number < week.week_number) {
          cumulativeCurrentJackpot -= w.weekly_payout;
        }
      }
    });

    return { cumulativeOrganizationNet, cumulativeCurrentJackpot, cumulativeJackpotPool };
  };

  // Calculate week totals from daily entries
  const weekTotalTickets = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.tickets_sold, 0);
  const weekTotalSales = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.amount_collected, 0);
  const weekOrganizationTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.organization_total, 0);
  const weekJackpotTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.jackpot_total, 0);

  // Calculate cumulative values
  const { cumulativeOrganizationNet, cumulativeCurrentJackpot, cumulativeJackpotPool } = calculateCumulativeValues();

  // Calculate displayed ending jackpot based on week completion status
  useEffect(() => {
    const calculateDisplayedEndingJackpot = async () => {
      // For completed games, calculate the final ending jackpot properly
      if (game.end_date) {
        // If this week has a winner, show the ending jackpot after payout
        if (week.winner_name && week.weekly_payout) {
          if (week.card_selected === 'Queen of Hearts') {
            setDisplayedEndingJackpot(0); // Queen of Hearts clears the jackpot
          } else {
            setDisplayedEndingJackpot(weekJackpotTotal - week.weekly_payout);
          }
        } else {
          // No winner, show the full week jackpot total
          setDisplayedEndingJackpot(weekJackpotTotal);
        }
        return;
      }

      if (week.winner_name && week.ending_jackpot !== null && week.ending_jackpot !== undefined) {
        // Scenario 2: Queen of Hearts hit - current ending jackpot should be 0 (ignore minimum payout logic)
        if (week.card_selected === 'Queen of Hearts') {
          setDisplayedEndingJackpot(0);
          return;
        }
        
        // Week is completed (regular scenario) - show current week's jackpot pool minus payout
        const currentWeekEndingJackpot = weekJackpotTotal - (week.weekly_payout || 0);
        console.log('Using current week jackpot pool minus payout for completed week:', currentWeekEndingJackpot);
        setDisplayedEndingJackpot(currentWeekEndingJackpot);
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

            console.log('Query result:', { error, previousWeek });
            if (!error && previousWeek && previousWeek.ending_jackpot !== null && previousWeek.ending_jackpot !== undefined) {
              previousEndingJackpot = Number(previousWeek.ending_jackpot);
              console.log('Found previous week ending jackpot:', previousEndingJackpot);
            } else {
              // Fallback to carryover for first week if no previous week data
              console.log('No previous week ending jackpot found, using carryover for week 1');
              console.log('Previous week data:', previousWeek);
              console.log('Query error:', error);
              previousEndingJackpot = week.week_number === 1 ? (game.carryover_jackpot || 0) : 0;
            }
          } else {
            // Week 1 starts with carryover jackpot
            previousEndingJackpot = game.carryover_jackpot || 0;
            console.log('Week 1, starting jackpot from carryover:', previousEndingJackpot);
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
        <WeekHeader 
          week={week} 
          onToggleWeek={onToggleWeek}
          onDeleteWeek={onDeleteWeek}
        />
        
        {/* Week Summary Stats */}
        <WeekSummaryStats
          weekTotalTickets={weekTotalTickets}
          weekTotalSales={weekTotalSales}
          weekOrganizationTotal={weekOrganizationTotal}
          weekJackpotTotal={weekJackpotTotal}
          displayedEndingJackpot={displayedEndingJackpot}
          hasWinner={hasWinner()}
          formatCurrency={formatCurrency}
          cumulativeOrganizationNet={cumulativeOrganizationNet}
          cumulativeCurrentJackpot={cumulativeCurrentJackpot}
          cumulativeJackpotPool={cumulativeJackpotPool}
          carryoverJackpot={game.carryover_jackpot}
          isFirstWeek={week.week_number === 1}
          weeklyPayout={week.weekly_payout || 0}
          isGameCompleted={!!game.end_date}
          isLastWeek={week.week_number === Math.max(...game.weeks.map((w: any) => w.week_number))}
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
