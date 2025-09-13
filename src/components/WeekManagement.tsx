
import { Button } from "@/components/ui/button";
import { Download, Plus, Grid, Printer, CheckCircle } from "lucide-react";
import { TicketSalesTable } from './TicketSalesTable';
import { WinnerForm } from './WinnerForm';
import { PayoutSlipModal } from './PayoutSlipModal';
import { JackpotContributionModal } from './JackpotContributionModal';
import { GameSummaryDisplay } from './GameSummaryDisplay';
import { WeekCalendarGrid } from './WeekCalendarGrid';
import { useWinnerFormManager } from '@/hooks/useWinnerFormManager';
import { usePayoutSlipManager } from '@/hooks/usePayoutSlipManager';
import { useJackpotContributionManager } from '@/hooks/useJackpotContributionManager';

interface WeekManagementProps {
  game: any;
  expandedWeek: string | null;
  onToggleWeek: (weekId: string) => void;
  onOpenWeekForm: (gameId: string) => void;
  onGeneratePdfReport: (game: any) => void;
  onOpenSlotGrid: (game: any) => void;
  currentGameId: string | null;
  setCurrentGameId: (id: string | null) => void;
  games: any[];
  setGames: (games: any[]) => void;
  onRefreshData?: () => void;
  onOpenExpenseModal?: (date: string, gameId: string) => void;
  onOpenDonationModal?: (date: string, gameId: string) => void;
  onDeleteWeek?: (weekId: string) => void;
}

export const WeekManagement = ({
  game,
  expandedWeek,
  onToggleWeek,
  onOpenWeekForm,
  onGeneratePdfReport,
  onOpenSlotGrid,
  currentGameId,
  setCurrentGameId,
  games,
  setGames,
  onRefreshData,
  onOpenExpenseModal,
  onOpenDonationModal,
  onDeleteWeek
}: WeekManagementProps) => {
  const {
    winnerFormOpen,
    setWinnerFormOpen,
    selectedGameId,
    selectedWeekId,
    handleOpenWinnerForm,
    handleWinnerFormComplete
  } = useWinnerFormManager();

  const {
    payoutSlipOpen,
    setPayoutSlipOpen,
    payoutSlipData,
    handleOpenPayoutSlip
  } = usePayoutSlipManager();

  const {
    jackpotContributionOpen,
    setJackpotContributionOpen,
    jackpotContributionData,
    handleCompleteGame,
    handleJackpotContributionComplete
  } = useJackpotContributionManager();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getCurrentGameData = () => {
    return games.find(g => g.id === selectedGameId);
  };

  const getCurrentWeekData = () => {
    const gameData = getCurrentGameData();
    return gameData?.weeks?.find((w: any) => w.id === selectedWeekId);
  };

  const calculateCurrentJackpotTotal = () => {
    const gameData = getCurrentGameData();
    const weekData = getCurrentWeekData();
    
    if (!gameData || !weekData) return 0;

    // For Queen of Hearts scenarios, calculate the total accumulated jackpot
    if (weekData.card_selected === 'Queen of Hearts' || (selectedWeekId && weekData.week_number)) {
      // Calculate total jackpot contributions from all weeks up to current week
      const allWeeksUpToCurrent = gameData.weeks
        .filter((w: any) => w.week_number <= weekData.week_number)
        .sort((a: any, b: any) => a.week_number - b.week_number);
      
      let totalAccumulatedJackpot = gameData.carryover_jackpot || 0;
      
      allWeeksUpToCurrent.forEach((w: any) => {
        const weekJackpotContributions = w.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
        totalAccumulatedJackpot += weekJackpotContributions;
        
        // Deduct previous weekly payouts (but not current week)
        if (w.week_number < weekData.week_number && w.winner_name && w.weekly_payout) {
          totalAccumulatedJackpot -= w.weekly_payout;
        }
      });
      
      console.log('🎯 Calculated total accumulated jackpot for Queen of Hearts:', totalAccumulatedJackpot);
      return totalAccumulatedJackpot;
    }

    // For regular scenarios, just return current week's contributions
    const weekJackpotContributions = weekData.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
    return weekJackpotContributions;
  };

  // Check if a week needs game completion (Queen of Hearts winner but game not ended)
  const needsGameCompletion = (week: any) => {
    return week.winner_name && 
           week.card_selected === 'Queen of Hearts' && 
           !game.end_date;
  };

  // Check if game needs completion (has Queen of Hearts winner but not completed)
  const needsGameCompletionButton = () => {
    return game.weeks.some((week: any) => 
      week.winner_name && 
      week.card_selected === 'Queen of Hearts' && 
      !game.end_date
    );
  };

  const getQueenOfHeartsWeek = () => {
    return game.weeks.find((week: any) => 
      week.winner_name && 
      week.card_selected === 'Queen of Hearts' && 
      !game.end_date
    );
  };

  // Check if game is completed
  const isGameCompleted = game.end_date !== null && game.end_date !== undefined;

  // Get the Queen of Hearts winner data for completed games
  const getQueenOfHeartsWinner = () => {
    if (!isGameCompleted) return null;
    
    const queenWeek = game.weeks.find((week: any) => 
      week.card_selected === 'Queen of Hearts' && week.winner_name
    );
    
    if (!queenWeek) return null;
    
    return {
      winnerName: queenWeek.winner_name,
      slotChosen: queenWeek.slot_chosen,
      cardSelected: queenWeek.card_selected,
      payoutAmount: game.jackpot_contribution || queenWeek.weekly_payout,
      winnerPresent: queenWeek.winner_present,
      weekNumber: queenWeek.week_number,
      weekStartDate: queenWeek.start_date,
      weekEndDate: queenWeek.end_date,
      authorizedSignatureName: queenWeek.authorized_signature_name || 'Finance Manager'
    };
  };

  const handlePrintWinnerSlip = () => {
    const winnerData = getQueenOfHeartsWinner();
    if (winnerData) {
      handleOpenPayoutSlip(winnerData, game);
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {isGameCompleted ? "Game Information" : "Weeks"}
        </h3>
        <div className="flex space-x-2">
          {isGameCompleted && (
            <Button
              onClick={() => onGeneratePdfReport(game)}
              variant="export"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Export Game PDF
            </Button>
          )}
          {needsGameCompletionButton() && (
            <Button
              onClick={() => {
                const queenWeek = getQueenOfHeartsWeek();
                if (queenWeek) {
                  handleCompleteGame(queenWeek, game);
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 hover:border-yellow-700"
            >
              <CheckCircle className="h-4 w-4" /> Complete Your Game
            </Button>
          )}
          {isGameCompleted && getQueenOfHeartsWinner() && (
            <Button
              onClick={handlePrintWinnerSlip}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-green-800 text-green-200 border-green-700 hover:bg-green-700 hover:text-green-100"
            >
              <Printer className="h-4 w-4" /> Print Winner Slip
            </Button>
          )}
          <Button
            onClick={() => onOpenSlotGrid(game)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
          >
            <Grid className="h-4 w-4 text-red-600" /> View Slot grid
          </Button>
          <Button
            onClick={() => onOpenWeekForm(game.id)}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Plus className="h-4 w-4 text-red-600" /> Add Week
          </Button>
        </div>
      </div>
      
      {/* Game Summary Display - Only for completed games */}
      <GameSummaryDisplay game={game} formatCurrency={formatCurrency} />
      
      {game.weeks.length === 0 ? (
        <p className="text-muted-foreground text-sm">No weeks added yet.</p>
      ) : (
        <div className="space-y-4">
          {/* Week Calendar-style Layout */}
          <WeekCalendarGrid
            weeks={game.weeks}
            expandedWeek={expandedWeek}
            onToggleWeek={onToggleWeek}
            onSetCurrentGameId={setCurrentGameId}
            gameId={game.id}
            needsGameCompletion={needsGameCompletion}
            onCompleteGame={(week) => handleCompleteGame(week, game)}
          />
          
          {/* Expanded Week Details */}
          {expandedWeek && game.weeks.find((w: any) => w.id === expandedWeek) && (
            <TicketSalesTable
              week={game.weeks.find((w: any) => w.id === expandedWeek)}
              game={game}
              currentGameId={currentGameId}
              games={games}
              setGames={setGames}
              onToggleWeek={onToggleWeek}
              onOpenWinnerForm={handleOpenWinnerForm}
              onOpenPayoutSlip={(winnerData) => handleOpenPayoutSlip(winnerData, game)}
              onOpenExpenseModal={onOpenExpenseModal}
              onOpenDonationModal={onOpenDonationModal}
              onRefreshData={onRefreshData}
              needsGameCompletion={needsGameCompletion}
              onCompleteGameClick={(week) => handleCompleteGame(week, game)}
              onDeleteWeek={onDeleteWeek}
            />
          )}
        </div>
      )}

      {/* Winner Form Modal */}
      <WinnerForm
        open={winnerFormOpen}
        onOpenChange={setWinnerFormOpen}
        gameId={selectedGameId}
        weekId={selectedWeekId}
        gameData={getCurrentGameData()}
        currentJackpotTotal={calculateCurrentJackpotTotal()}
        jackpotContributions={calculateCurrentJackpotTotal()}
        onComplete={() => handleWinnerFormComplete(onRefreshData)}
        onOpenPayoutSlip={(winnerData) => handleOpenPayoutSlip(winnerData, game)}
      />

      {/* Jackpot Contribution Modal */}
      <JackpotContributionModal
        open={jackpotContributionOpen}
        onOpenChange={setJackpotContributionOpen}
        gameId={jackpotContributionData?.gameId || null}
        totalJackpot={jackpotContributionData?.totalJackpot || 0}
        winnerName={jackpotContributionData?.winnerName || ''}
        onComplete={() => handleJackpotContributionComplete(
          onRefreshData, 
          (winnerData) => handleOpenPayoutSlip(winnerData, game)
        )}
      />

      {/* Payout Slip Modal */}
      <PayoutSlipModal
        open={payoutSlipOpen}
        onOpenChange={setPayoutSlipOpen}
        winnerData={payoutSlipData}
      />
    </div>
  );
};
