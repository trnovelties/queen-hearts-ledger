
import { Trash2 } from 'lucide-react';
import { formatDateStringForDisplay } from '@/lib/dateUtils';

interface WeekHeaderProps {
  week: any;
  onToggleWeek: (weekId: string | null) => void;
  onDeleteWeek?: (weekId: string) => void;
}

export const WeekHeader = ({ week, onToggleWeek, onDeleteWeek }: WeekHeaderProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteWeek && confirm('Are you sure you want to delete this week? This action cannot be undone.')) {
      onDeleteWeek(week.id);
    }
  };

  return (
    <div className="flex justify-between items-start mb-4">
      <div>
        <h4 className="text-2xl font-bold text-[#1F4E4A] mb-2">Week {week.week_number}</h4>
        <p className="text-gray-600 text-lg">
          {formatDateStringForDisplay(week.start_date)} - {formatDateStringForDisplay(week.end_date)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onDeleteWeek && (
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-red-50"
            title="Delete week"
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
