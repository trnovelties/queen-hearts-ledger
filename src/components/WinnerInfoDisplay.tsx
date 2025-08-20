
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Edit } from 'lucide-react';
import { toast } from "sonner";
import { useState } from "react";

interface WinnerInfoDisplayProps {
  week: any;
  game?: any;
  formatCurrency: (amount: number) => string;
  onOpenPayoutSlip?: (winnerData: any) => void;
  onOpenWinnerForm?: (gameId: string, weekId: string) => void;
  gameId?: string;
  isGameArchived?: boolean;
}

export const WinnerInfoDisplay = ({
  week,
  game,
  formatCurrency,
  onOpenPayoutSlip,
  onOpenWinnerForm,
  gameId,
  isGameArchived = false
}: WinnerInfoDisplayProps) => {
  const [showGameCompletionModal, setShowGameCompletionModal] = useState(false);
  
  if (!week.winner_name) return null;

  const handlePrintSlip = () => {
    // Check if it's Queen of Hearts and game isn't completed yet
    if (week.card_selected === 'Queen of Hearts' && !game?.end_date) {
      setShowGameCompletionModal(true);
      return;
    }
    
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

  const handleEditWinner = () => {
    if (onOpenWinnerForm && gameId) {
      onOpenWinnerForm(gameId, week.id);
    }
  };


  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h5 className="text-lg font-semibold text-yellow-800 flex items-center">
          🏆 Winner Information
        </h5>
        <div className="flex gap-2">
          {onOpenWinnerForm && gameId && !isGameArchived && (
            <Button 
              onClick={handleEditWinner} 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 bg-green-800 text-green-200 border-green-700 hover:bg-green-700 hover:text-green-100"
            >
              <Edit className="h-4 w-4" />
              Edit Winner Details
            </Button>
          )}
          {onOpenPayoutSlip && (
            <Button 
              onClick={handlePrintSlip} 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 bg-green-800 text-green-200 border-green-700 hover:bg-green-700 hover:text-green-100"
            >
              <Printer className="h-4 w-4" />
              Print Distribution Slip
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 text-sm">
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
          <div className="font-medium text-yellow-700">Distribution Amount</div>
          <div className="text-yellow-900 font-semibold">
            {week.card_selected === 'Queen of Hearts' && !game?.end_date ? 
              <span className="text-sm">please complete your game first.</span> : 
              week.card_selected === 'Queen of Hearts' && game?.end_date ? 
                'Check Game Details' : 
                formatCurrency(week.weekly_payout)
            }
          </div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-yellow-700">Winner Present</div>
          <div className={`font-semibold ${week.winner_present ? 'text-green-600' : 'text-red-600'}`}>
            {week.winner_present ? '✓ Yes' : '✗ No'}
          </div>
        </div>
      </div>
      
      {/* Game Completion Required Modal */}
      <Dialog open={showGameCompletionModal} onOpenChange={setShowGameCompletionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Game Completion Required</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-yellow-600 text-6xl">⚠️</div>
            <p className="text-center text-muted-foreground">
              Please complete your game first to print winner distribution amount from archived game.
            </p>
            <Button 
              onClick={() => setShowGameCompletionModal(false)}
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
