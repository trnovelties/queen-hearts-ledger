
import { useToast } from "@/hooks/use-toast";
import { useTicketInputs } from './useTicketInputs';
import { useTicketSalesOperations } from './useTicketSalesOperations';

export const useTicketSales = () => {
  const { toast } = useToast();
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
    
    // Pass error handler to show toast notifications
    updateDailyEntry(
      weekId, 
      dayIndex, 
      ticketsSold, 
      currentGameId, 
      games, 
      setGames,
      (errorMessage: string) => {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    );
  };

  return {
    updateDailyEntry: (weekId: string, dayIndex: number, ticketsSold: number, currentGameId: string, games: any[], setGames: (games: any[]) => void) => {
      updateDailyEntry(weekId, dayIndex, ticketsSold, currentGameId, games, setGames, (errorMessage: string) => {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      });
    },
    handleTicketInputChange,
    handleTicketInputSubmit,
    tempTicketInputs
  };
};
