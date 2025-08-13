
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface WinnerSelectionSectionProps {
  week: any;
  isWeekComplete: boolean;
  hasWinner: boolean;
  onWinnerButtonClick: () => void;
  onCompleteGameClick?: () => void;
  needsGameCompletion?: boolean;
  isGameArchived?: boolean;
}

export const WinnerSelectionSection = ({
  week,
  isWeekComplete,
  hasWinner,
  onWinnerButtonClick,
  onCompleteGameClick,
  needsGameCompletion = false,
  isGameArchived = false
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
          
          {/* NEW: Show completion message for Queen of Hearts */}
          {needsGameCompletion && (
            <p className="text-sm text-yellow-700 font-medium mt-1">
              🎉 Queen of Hearts won! Complete your game to distribute the jackpot.
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          {/* Main Winner Button - Hidden for archived games */}
          {!isGameArchived && (
            <Button
              onClick={onWinnerButtonClick}
              className={`font-semibold px-6 py-2 ${
                hasWinner ? 'bg-green-600 hover:bg-green-700 text-white' :
                isWeekComplete ? 'bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A]' :
                'bg-gray-300 hover:bg-gray-400 text-gray-600'
              }`}
            >
              {hasWinner ? 'Edit Winner Details' : 'Add Winner Details'}
            </Button>
          )}
          
          {/* NEW: Complete Your Game Button for Queen of Hearts - Hidden for archived games */}
          {needsGameCompletion && onCompleteGameClick && !isGameArchived && (
            <Button
              onClick={onCompleteGameClick}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-yellow-900 font-bold px-6 py-2 rounded shadow-lg border border-yellow-300"
            >
              <Crown className="h-4 w-4 mr-2" />
              Complete Your Game
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
