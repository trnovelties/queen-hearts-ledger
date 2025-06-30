
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download, Plus, Trash2, Crown } from "lucide-react";
import { TicketSalesTable } from './TicketSalesTable';
import { WinnerForm } from './WinnerForm';
import { PayoutSlipModal } from './PayoutSlipModal';
import { JackpotContributionModal } from './JackpotContributionModal';
import { GameSummaryDisplay } from './GameSummaryDisplay';
import { formatDateStringForDisplay } from '@/lib/dateUtils';
import { toast } from "sonner";

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
  onOpenDonationModal
}: WeekManagementProps) => {
  const [winnerFormOpen, setWinnerFormOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [payoutSlipOpen, setPayoutSlipOpen] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const [jackpotContributionOpen, setJackpotContributionOpen] = useState(false);
  const [jackpotContributionData, setJackpotContributionData] = useState<{
    gameId: string;
    totalJackpot: number;
    winnerName: string;
    winnerData?: any;
  } | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleOpenWinnerForm = (gameId: string, weekId: string) => {
    console.log('=== OPENING WINNER FORM ===');
    console.log('Game ID:', gameId);
    console.log('Week ID:', weekId);
    setSelectedGameId(gameId);
    setSelectedWeekId(weekId);
    setWinnerFormOpen(true);
  };

  const handleWinnerFormComplete = () => {
    console.log('=== WINNER FORM COMPLETED ===');
    setWinnerFormOpen(false);
    setSelectedGameId(null);
    setSelectedWeekId(null);
    // Refresh the data to show updated winner information
    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Calculate the actual total jackpot for Queen of Hearts winners
  const calculateTotalJackpot = (week: any) => {
    // Calculate total jackpot contributions from all weeks in the game
    const totalContributions = game.weeks.reduce((total: number, w: any) => {
      const weekContributions = w.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
      return total + weekContributions;
    }, 0);
    
    // Add carryover jackpot from previous game
    const totalJackpot = (game.carryover_jackpot || 0) + totalContributions;
    
    console.log('🎰 Calculated total jackpot:', totalJackpot);
    console.log('🎰 Carryover jackpot:', game.carryover_jackpot);
    console.log('🎰 Total contributions:', totalContributions);
    
    return Math.max(totalJackpot, 100); // Ensure minimum jackpot for modal validation
  };

  // Handle "Complete Your Game" button for Queen of Hearts winners
  const handleCompleteGame = (week: any) => {
    console.log('🎯 === OPENING JACKPOT CONTRIBUTION FROM COMPLETE BUTTON ===');
    console.log('🎯 Week:', week);
    console.log('🎯 Game ID:', game.id);
    console.log('🎯 Winner Name:', week.winner_name);
    
    const totalJackpot = calculateTotalJackpot(week);
    
    console.log('🎯 Calculated Total Jackpot:', totalJackpot);
    
    if (!totalJackpot || totalJackpot <= 0) {
      toast.error("Unable to calculate jackpot amount. Please refresh and try again.");
      return;
    }
    
    // Set jackpot contribution data and open modal
    setJackpotContributionData({
      gameId: game.id,
      totalJackpot: totalJackpot,
      winnerName: week.winner_name,
      winnerData: {
        winnerName: week.winner_name,
        cardSelected: week.card_selected,
        slotChosen: week.slot_chosen,
        amountWon: totalJackpot,
        authorizedSignatureName: week.authorized_signature_name,
        gameId: game.id,
        weekId: week.id,
        weekNumber: week.week_number,
        weekStartDate: week.start_date,
        weekEndDate: week.end_date,
        winnerPresent: week.winner_present
      }
    });
    setJackpotContributionOpen(true);
    
    console.log('✅ Jackpot contribution modal opened from complete button');
  };

  const handleJackpotContributionComplete = () => {
    console.log('=== JACKPOT CONTRIBUTION COMPLETED ===');
    
    // Open payout slip if we have winner data
    if (jackpotContributionData?.winnerData) {
      console.log('Opening payout slip with winner data:', jackpotContributionData.winnerData);
      handleOpenPayoutSlip(jackpotContributionData.winnerData);
    }
    
    // Clean up state
    setJackpotContributionOpen(false);
    setJackpotContributionData(null);
    
    // Refresh the data to show updated game status
    if (onRefreshData) {
      onRefreshData();
    }
    
    toast.success("Game completed successfully!");
  };

  const handleOpenPayoutSlip = (winnerData: any) => {
    console.log('=== OPENING PAYOUT SLIP ===');
    console.log('Winner Data:', winnerData);
    
    // Enhance winnerData with game information
    const enhancedWinnerData = {
      ...winnerData,
      gameName: game.name,
      gameNumber: game.game_number
    };
    setPayoutSlipData(enhancedWinnerData);
    setPayoutSlipOpen(true);
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

  return (
    <div className="p-4 border-t">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Weeks</h3>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-[5px]">
            {game.weeks.map((week: any) => (
              <div key={week.id} className="space-y-2">
                {/* Week Button */}
                <Button
                  onClick={() => {
                    onToggleWeek(week.id);
                    setCurrentGameId(game.id);
                  }}
                  variant="outline"
                  className={`w-full h-16 text-lg font-semibold transition-all duration-200 ${
                    expandedWeek === week.id
                      ? 'bg-[#4A7C59] border-[#4A7C59] text-white shadow-md'
                      : 'bg-[#A1E96C] border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90'
                  }`}
                >
                  Week {week.week_number}
                </Button>
                
                {/* Complete Your Game Button for Queen of Hearts winners */}
                {needsGameCompletion(week) && (
                  <Button
                    onClick={() => handleCompleteGame(week)}
                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-yellow-900 font-bold text-xs py-1 px-2 rounded shadow-lg border border-yellow-300"
                    size="sm"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Complete Your Game
                  </Button>
                )}
              </div>
            ))}
          </div>
          
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
              onOpenPayoutSlip={handleOpenPayoutSlip}
              onOpenExpenseModal={onOpenExpenseModal}
              onOpenDonationModal={onOpenDonationModal}
              onRefreshData={onRefreshData}
              needsGameCompletion={needsGameCompletion}
              onCompleteGameClick={handleCompleteGame}
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
        onComplete={handleWinnerFormComplete}
        onOpenPayoutSlip={handleOpenPayoutSlip}
      />

      {/* Jackpot Contribution Modal */}
      <JackpotContributionModal
        open={jackpotContributionOpen}
        onOpenChange={setJackpotContributionOpen}
        gameId={jackpotContributionData?.gameId || null}
        totalJackpot={jackpotContributionData?.totalJackpot || 0}
        winnerName={jackpotContributionData?.winnerName || ''}
        onComplete={handleJackpotContributionComplete}
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
