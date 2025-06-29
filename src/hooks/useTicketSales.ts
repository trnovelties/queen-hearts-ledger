
import { useTicketInputs } from './useTicketInputs';
import { useTicketSalesOperations } from './useTicketSalesOperations';

export const useTicketSales = () => {
  const { tempTicketInputs, handleTicketInputChange, clearTicketInput } = useTicketInputs();
  const { updateDailyEntry } = useTicketSalesOperations();

  const handleTicketInputSubmit = (
    weekId: string,
    dayIndex: number,
    value: string,
    currentGameId: string,
    games: any[],
    setGames: (games: any[]) => void
  ) => {
    const ticketsSold = parseInt(value) || 0;
    
    clearTicketInput(weekId, dayIndex);
    updateDailyEntry(weekId, dayIndex, ticketsSold, currentGameId, games, setGames);
  };

  return {
    updateDailyEntry,
    handleTicketInputChange,
    handleTicketInputSubmit,
    tempTicketInputs
  };
};
