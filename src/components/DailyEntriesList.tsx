
import { DailyEntryRow } from './DailyEntryRow';

interface DailyEntriesListProps {
  week: any;
  tempTicketInputs: {[key: string]: string};
  formatCurrency: (amount: number) => string;
  onInputChange: (weekId: string, dayIndex: number, value: string) => void;
  onInputSubmit: (weekId: string, dayIndex: number, value: string, gameId: string, games: any[], setGames: (games: any[]) => void) => void;
  currentGameId: string | null;
  games: any[];
  setGames: (games: any[]) => void;
  onEditEntry?: (entry: any) => void;
  onOpenExpenseModal?: (date: string, gameId: string) => void;
  onOpenDonationModal?: (date: string, gameId: string) => void;
}

export const DailyEntriesList = ({
  week,
  tempTicketInputs,
  formatCurrency,
  onInputChange,
  onInputSubmit,
  currentGameId,
  games,
  setGames,
  onEditEntry,
  onOpenExpenseModal,
  onOpenDonationModal
}: DailyEntriesListProps) => {
  return (
    <div className="pt-6">
      <h5 className="text-lg font-semibold mb-4 text-[#1F4E4A]">Daily Entries (7 Days)</h5>
      
      <div className="space-y-3 h-fit">
        {Array.from({ length: 7 }, (_, dayIndex) => {
          const weekStartDate = new Date(week.start_date);
          const entryDate = new Date(weekStartDate);
          entryDate.setDate(entryDate.getDate() + dayIndex);

          // Find existing entry for this specific date
          const existingEntry = week.ticket_sales.find((entry: any) => {
            const existingDate = new Date(entry.date);
            return existingDate.toDateString() === entryDate.toDateString();
          });

          const inputKey = `${week.id}-${dayIndex}`;
          const tempValue = tempTicketInputs[inputKey];
          
          // Show actual value if entry exists, temp value if being edited, or empty string for new entries
          const currentValue = tempValue !== undefined ? tempValue : (existingEntry?.tickets_sold !== undefined ? existingEntry.tickets_sold : '');

          return (
            <DailyEntryRow
              key={dayIndex}
              dayIndex={dayIndex}
              week={week}
              existingEntry={existingEntry}
              currentValue={currentValue}
              formatCurrency={formatCurrency}
              onInputChange={onInputChange}
              onInputSubmit={onInputSubmit}
              currentGameId={currentGameId}
              games={games}
              setGames={setGames}
              onEditEntry={onEditEntry}
              onOpenExpenseModal={onOpenExpenseModal}
              onOpenDonationModal={onOpenDonationModal}
            />
          );
        })}
      </div>
    </div>
  );
};
