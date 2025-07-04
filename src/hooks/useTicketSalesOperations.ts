
import { useDailyEntryOperations } from './useDailyEntryOperations';
import { useWeekTotalsUpdater } from './useWeekTotalsUpdater';
import { useGameTotalsUpdater } from './useGameTotalsUpdater';

export const useTicketSalesOperations = () => {
  const { updateDailyEntry } = useDailyEntryOperations();
  const { updateWeekTotals } = useWeekTotalsUpdater();
  const { updateGameTotals } = useGameTotalsUpdater();

  const updateDailyEntryWithTotals = async (
    weekId: string,
    dayIndex: number,
    ticketsSold: number,
    currentGameId: string,
    games: any[],
    setGames: (games: any[]) => void,
    onError?: (message: string) => void
  ) => {
    // Update the daily entry
    await updateDailyEntry(
      weekId,
      dayIndex,
      ticketsSold,
      currentGameId,
      games,
      setGames,
      onError
    );

    // Update week and game totals
    await updateWeekTotals(weekId);
    await updateGameTotals(currentGameId);
  };

  return {
    updateDailyEntry: updateDailyEntryWithTotals,
    updateWeekTotals,
    updateGameTotals
  };
};
