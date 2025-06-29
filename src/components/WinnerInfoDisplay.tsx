
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';

interface WinnerInfoDisplayProps {
  week: any;
  formatCurrency: (amount: number) => string;
  onOpenPayoutSlip?: (winnerData: any) => void;
}

export const WinnerInfoDisplay = ({ week, formatCurrency, onOpenPayoutSlip }: WinnerInfoDisplayProps) => {
  if (!week.winner_name) return null;

  const handlePrintSlip = () => {
    if (onOpenPayoutSlip) {
      const winnerData = {
        winnerName: week.winner_name,
        slotChosen: week.slot_chosen,
        cardSelected: week.card_selected,
        payoutAmount: week.weekly_payout,
        winnerPresent: week.winner_present,
        weekNumber: week.week_number,
        weekStartDate: week.start_date,
        weekEndDate: week.end_date,
        authorizedSignatureName: week.authorized_signature_name || 'Finance Manager'
      };
      onOpenPayoutSlip(winnerData);
    }
  };

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h5 className="text-lg font-semibold text-yellow-800 flex items-center">
          🏆 Winner Information
        </h5>
        {onOpenPayoutSlip && (
          <Button
            onClick={handlePrintSlip}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Slip
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
        <div className="space-y-1">
          <div className="font-medium text-yellow-700">Winner Name</div>
          <div className="text-yellow-900 font-semibold">{week.winner_name}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-yellow-700">Slot Selected</div>
          <div className="text-yellow-900 font-semibold">#{week.slot_chosen}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-yellow-700">Card Drawn</div>
          <div className="text-yellow-900 font-semibold">{week.card_selected}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-yellow-700">Payout Amount</div>
          <div className="text-yellow-900 font-semibold">{formatCurrency(week.weekly_payout)}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-yellow-700">Winner Present</div>
          <div className={`font-semibold ${week.winner_present ? 'text-green-600' : 'text-red-600'}`}>
            {week.winner_present ? '✓ Yes' : '✗ No'}
          </div>
        </div>
      </div>
    </div>
  );
};
