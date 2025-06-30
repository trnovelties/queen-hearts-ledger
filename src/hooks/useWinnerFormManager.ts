
import { useState } from 'react';
import { toast } from "sonner";

export const useWinnerFormManager = () => {
  const [winnerFormOpen, setWinnerFormOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  const handleOpenWinnerForm = (gameId: string, weekId: string) => {
    console.log('=== OPENING WINNER FORM ===');
    console.log('Game ID:', gameId);
    console.log('Week ID:', weekId);
    setSelectedGameId(gameId);
    setSelectedWeekId(weekId);
    setWinnerFormOpen(true);
  };

  const handleWinnerFormComplete = (onRefreshData?: () => void) => {
    console.log('=== WINNER FORM COMPLETED ===');
    setWinnerFormOpen(false);
    setSelectedGameId(null);
    setSelectedWeekId(null);
    // Refresh the data to show updated winner information
    if (onRefreshData) {
      onRefreshData();
    }
  };

  return {
    winnerFormOpen,
    setWinnerFormOpen,
    selectedGameId,
    selectedWeekId,
    handleOpenWinnerForm,
    handleWinnerFormComplete
  };
};
