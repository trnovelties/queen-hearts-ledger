
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
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

    // Get current week's jackpot contributions
    const weekJackpotContributions = weekData.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
    
    return weekJackpotContributions;
  };

  // Check if a week needs game completion (Queen of Hearts winner but game not ended)
  const needsGameCompletion = (week: any) => {
    return week.winner_name && 
           week.card_selected === 'Queen of Hearts' && 
           !game.end_date;
  };

  // Check if game is completed
  const isGameCompleted = game.end_date !== null && game.end_date !== undefined;

  return (
    <div className="p-4 border-t">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {isGameCompleted ? "Game Information" : "Weeks"}
        </h3>
        <div className="flex space-x-2">
          <Button
            onClick={() => onGeneratePdfReport(game)}
            variant="export"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export Game PDF
          </Button>
          <Button
            onClick={() => onOpenWeekForm(game.id)}
            size="sm"
            className="bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A] flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Week
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
        currentJackpotTotal={0}
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
