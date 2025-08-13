
import { formatDateStringForDisplay } from '@/lib/dateUtils';
import { Trash2 } from "lucide-react";

interface WeekHeaderProps {
  week: any;
  onToggleWeek: (weekId: string | null) => void;
  onDeleteWeek?: (weekId: string) => void;
  isGameArchived?: boolean;
}

export const WeekHeader = ({ week, onToggleWeek, onDeleteWeek, isGameArchived = false }: WeekHeaderProps) => {
  return (
    <div className="flex justify-between items-start mb-4">
      <div>
        <h4 className="text-2xl font-bold text-[#1F4E4A] mb-2">Week {week.week_number}</h4>
        <p className="text-gray-600 text-lg">
          {formatDateStringForDisplay(week.start_date)} - {formatDateStringForDisplay(week.end_date)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onDeleteWeek && !isGameArchived && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteWeek(week.id);
            }}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 w-8 h-8 flex items-center justify-center rounded"
            title="Delete Week"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
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
