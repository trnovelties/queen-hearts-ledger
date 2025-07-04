
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
    // Update the daily entry - this already updates local state optimistically
    await updateDailyEntry(
      weekId,
      dayIndex,
      ticketsSold,
      currentGameId,
      games,
      setGames,
      onError
    );

    // Note: Week and game totals are already calculated and updated in the local state
    // by updateDailyEntry, so we don't need additional database calls here
  };

  return {
    updateDailyEntry: updateDailyEntryWithTotals,
    updateWeekTotals,
    updateGameTotals
  };
};
