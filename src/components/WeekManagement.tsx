
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { TicketSalesTable } from './TicketSalesTable';
import { WinnerForm } from './WinnerForm';
import { PayoutSlipModal } from './PayoutSlipModal';
import { JackpotContributionModal } from './JackpotContributionModal';
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

  // FIXED: Enhanced handler for Queen of Hearts jackpot contribution
  const handleOpenJackpotContribution = (gameId: string, totalJackpot: number, winnerName: string, winnerData?: any) => {
    console.log('🎯 === OPENING JACKPOT CONTRIBUTION (WEEK MANAGEMENT) ===');
    console.log('🎯 Game ID:', gameId);
    console.log('🎯 Total Jackpot:', totalJackpot);
    console.log('🎯 Winner Name:', winnerName);
    console.log('🎯 Winner Data:', winnerData);
    
    // Enhanced validation checks with user feedback
    if (!gameId) {
      console.error('❌ No gameId provided');
      toast.error("Missing game ID. Cannot open jackpot contribution modal.");
      return;
    }
    
    if (!totalJackpot || totalJackpot <= 0) {
      console.error('❌ Invalid totalJackpot:', totalJackpot);
      toast.error("Invalid jackpot amount. Cannot open contribution modal.");
      return;
    }
    
    if (!winnerName || winnerName.trim() === '') {
      console.error('❌ No winnerName provided');
      toast.error("Missing winner name. Cannot open contribution modal.");
      return;
    }
    
    console.log('✅ All validation passed, opening jackpot contribution modal...');
    
    // STEP 1: Set the data for the modal
    setJackpotContributionData({
      gameId,
      totalJackpot,
      winnerName,
      winnerData
    });
    
    // STEP 2: Open the modal
    setJackpotContributionOpen(true);
    
    // STEP 3: Close the winner form since we're transitioning to jackpot modal
    setWinnerFormOpen(false);
    setSelectedGameId(null);
    setSelectedWeekId(null);
    
    console.log('✅ Jackpot contribution modal opened successfully');
    toast.success("Opening jackpot contribution modal...");
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
        onOpenJackpotContribution={handleOpenJackpotContribution}
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
