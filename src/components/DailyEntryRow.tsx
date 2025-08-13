
import { Input } from "@/components/ui/input";
import { formatDateStringForDisplay } from '@/lib/dateUtils';

interface DailyEntryRowProps {
  dayIndex: number;
  week: any;
  existingEntry: any;
  currentValue: string | number;
  formatCurrency: (amount: number) => string;
  onInputChange: (weekId: string, dayIndex: number, value: string) => void;
  onInputSubmit: (weekId: string, dayIndex: number, value: string, gameId: string, games: any[], setGames: (games: any[]) => void) => void;
  currentGameId: string | null;
  games: any[];
  setGames: (games: any[]) => void;
}

export const DailyEntryRow = ({
  dayIndex,
  week,
  existingEntry,
  currentValue,
  formatCurrency,
  onInputChange,
  onInputSubmit,
  currentGameId,
  games,
  setGames
}: DailyEntryRowProps) => {
  const weekStartDate = new Date(week.start_date);
  const entryDate = new Date(weekStartDate);
  entryDate.setDate(entryDate.getDate() + dayIndex);
  
  const dateString = entryDate.toISOString().split('T')[0];

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold text-gray-900">
          Day {dayIndex + 1}
        </div>
        <div className="text-sm text-gray-600">
          {formatDateStringForDisplay(dateString)}
        </div>
        {!existingEntry && (
          <div className="text-xs text-orange-600 font-medium">
            Entry Required
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Tickets Sold</label>
          <Input
            type="number"
            min="0"
            value={currentValue}
            onChange={(e) => onInputChange(week.id, dayIndex, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur(); // This will trigger onBlur, so we don't call onInputSubmit here
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== (existingEntry?.tickets_sold?.toString() || '')) {
                onInputSubmit(week.id, dayIndex, e.target.value, currentGameId!, games, setGames);
              }
            }}
            className="w-28 h-9 text-center font-medium"
            placeholder="Enter tickets"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Day Total</label>
          <div className={`text-sm font-bold px-3 py-2 rounded border min-w-[80px] text-center ${
            existingEntry 
              ? 'bg-blue-100 text-blue-800 border-blue-200' 
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            {existingEntry ? formatCurrency(existingEntry.amount_collected) : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};
