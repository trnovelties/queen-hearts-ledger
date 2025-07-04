import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
interface WeekCalendarGridProps {
  weeks: any[];
  expandedWeek: string | null;
  onToggleWeek: (weekId: string) => void;
  onSetCurrentGameId: (gameId: string) => void;
  gameId: string;
  needsGameCompletion: (week: any) => boolean;
  onCompleteGame: (week: any) => void;
}
export const WeekCalendarGrid = ({
  weeks,
  expandedWeek,
  onToggleWeek,
  onSetCurrentGameId,
  gameId,
  needsGameCompletion,
  onCompleteGame
}: WeekCalendarGridProps) => {
  return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-[5px]">
      {weeks.map((week: any) => <div key={week.id} className="space-y-2">
          {/* Week Button */}
          <Button onClick={() => {
        onToggleWeek(week.id);
        onSetCurrentGameId(gameId);
      }} variant="outline" className={`w-full h-16 text-lg font-semibold transition-all duration-200 ${expandedWeek === week.id ? 'bg-[#4A7C59] border-[#4A7C59] text-white shadow-md' : 'bg-[#A1E96C] border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90'}`}>
            Week {week.week_number}
          </Button>
          
          {/* Complete Your Game Button for Queen of Hearts winners */}
          {needsGameCompletion(week)}
        </div>)}
    </div>;
};