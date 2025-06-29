
import { Button } from "@/components/ui/button";

interface WinnerSelectionSectionProps {
  week: any;
  isWeekComplete: boolean;
  hasWinner: boolean;
  onWinnerButtonClick: () => void;
}

export const WinnerSelectionSection = ({
  week,
  isWeekComplete,
  hasWinner,
  onWinnerButtonClick
}: WinnerSelectionSectionProps) => {
  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h5 className={`text-lg font-semibold mb-1 ${
            hasWinner ? 'text-green-800' : 
            isWeekComplete ? 'text-blue-800' : 'text-gray-600'
          }`}>
            {hasWinner ? 'Winner Selected!' : 
             isWeekComplete ? 'Ready for Winner Selection' : 'Complete All 7 Days First'}
          </h5>
          <p className={`text-sm ${
            hasWinner ? 'text-green-700' : 
            isWeekComplete ? 'text-blue-700' : 'text-gray-500'
          }`}>
            {hasWinner ? `Winner: ${week.winner_name} - ${week.card_selected}` :
             isWeekComplete ? 'All 7 days have entries. Ready to select a winner.' :
             `${week.ticket_sales.length}/7 days entered`}
          </p>
        </div>
        <Button
          onClick={onWinnerButtonClick}
          className={`font-semibold px-6 py-2 ${
            hasWinner ? 'bg-green-600 hover:bg-green-700 text-white' :
            isWeekComplete ? 'bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A]' :
            'bg-gray-300 hover:bg-gray-400 text-gray-600'
          }`}
        >
          {hasWinner ? 'View Winner Details' : 'Add Winner Details'}
        </Button>
      </div>
    </div>
  );
};
