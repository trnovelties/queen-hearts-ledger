
import { formatDateStringForDisplay } from '@/lib/dateUtils';

interface WeekHeaderProps {
  week: any;
  onToggleWeek: (weekId: string | null) => void;
}

export const WeekHeader = ({ week, onToggleWeek }: WeekHeaderProps) => {
  return (
    <div className="flex justify-between items-start mb-4">
      <div>
        <h4 className="text-2xl font-bold text-[#1F4E4A] mb-2">Week {week.week_number}</h4>
        <p className="text-gray-600 text-lg">
          {formatDateStringForDisplay(week.start_date)} - {formatDateStringForDisplay(week.end_date)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleWeek(null)}
          className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
        >
          ×
        </button>
      </div>
    </div>
  );
};
