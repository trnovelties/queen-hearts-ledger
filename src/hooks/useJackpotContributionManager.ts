
import { useState } from 'react';
import { toast } from "sonner";

export const useJackpotContributionManager = () => {
  const [jackpotContributionOpen, setJackpotContributionOpen] = useState(false);
  const [jackpotContributionData, setJackpotContributionData] = useState<{
    gameId: string;
    totalJackpot: number;
    winnerName: string;
    winnerData?: any;
  } | null>(null);

  // Calculate the actual total jackpot for Queen of Hearts winners
  const calculateTotalJackpot = (week: any, game: any) => {
    // Use the net_available_for_final_winner from the database for Queen of Hearts
    if (week.card_selected === 'Queen of Hearts' && game.net_available_for_final_winner) {
      console.log('🎰 Using net_available_for_final_winner from database:', game.net_available_for_final_winner);
      return game.net_available_for_final_winner;
    }
    
    // For Queen of Hearts without net_available_for_final_winner, use weekly_payout
    if (week.card_selected === 'Queen of Hearts' && week.weekly_payout) {
      console.log('🎰 Using Queen of Hearts weekly_payout as fallback:', week.weekly_payout);
      return week.weekly_payout;
    }
    
    // Calculate total jackpot contributions from all weeks in the game
    const totalContributions = game.weeks.reduce((total: number, w: any) => {
      const weekContributions = w.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
      return total + weekContributions;
    }, 0);
    
    // For non-Queen of Hearts scenarios, add carryover jackpot from previous game
    const totalJackpot = (game.carryover_jackpot || 0) + totalContributions;
    
    console.log('🎰 Calculated total jackpot:', totalJackpot);
    console.log('🎰 Carryover jackpot:', game.carryover_jackpot);
    console.log('🎰 Total contributions:', totalContributions);
    
    return Math.max(totalJackpot, 100); // Ensure minimum jackpot for modal validation
  };

  // Handle "Complete Your Game" button for Queen of Hearts winners
  const handleCompleteGame = (week: any, game: any) => {
    console.log('🎯 === OPENING JACKPOT CONTRIBUTION FROM COMPLETE BUTTON ===');
    console.log('🎯 Week:', week);
    console.log('🎯 Game ID:', game.id);
    console.log('🎯 Winner Name:', week.winner_name);
    
    const totalJackpot = calculateTotalJackpot(week, game);
    
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

  const handleJackpotContributionComplete = (onRefreshData?: () => void, onOpenPayoutSlip?: (data: any) => void) => {
    console.log('=== JACKPOT CONTRIBUTION COMPLETED ===');
    
    // Open payout slip if we have winner data
    if (jackpotContributionData?.winnerData && onOpenPayoutSlip) {
      console.log('Opening payout slip with winner data:', jackpotContributionData.winnerData);
      onOpenPayoutSlip(jackpotContributionData.winnerData);
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

  return {
    jackpotContributionOpen,
    setJackpotContributionOpen,
    jackpotContributionData,
    handleCompleteGame,
    handleJackpotContributionComplete
  };
};
