
import { useState } from 'react';

export const usePayoutSlipManager = () => {
  const [payoutSlipOpen, setPayoutSlipOpen] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);

  const handleOpenPayoutSlip = (winnerData: any, game: any) => {
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

  return {
    payoutSlipOpen,
    setPayoutSlipOpen,
    payoutSlipData,
    handleOpenPayoutSlip
  };
};
