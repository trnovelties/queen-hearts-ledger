
import { Button } from "@/components/ui/button";
import { Printer, Edit, Grid } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from "sonner";

interface WinnerInfoDisplayProps {
  week: any;
  game?: any;
  formatCurrency: (amount: number) => string;
  onOpenPayoutSlip?: (winnerData: any) => void;
  onOpenWinnerForm?: (gameId: string, weekId: string) => void;
  gameId?: string;
}

export const WinnerInfoDisplay = ({
  week,
  game,
  formatCurrency,
  onOpenPayoutSlip,
  onOpenWinnerForm,
  gameId
}: WinnerInfoDisplayProps) => {
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

  const handleEditWinner = () => {
    if (onOpenWinnerForm && gameId) {
      onOpenWinnerForm(gameId, week.id);
    }
  };

  const handlePrintSlotGrid = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Selected Slot Grid', 105, 25, { align: 'center' });
      
      // Game and Week info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      const gameNumber = game?.game_number ? game.game_number.toString() : '1';
      const weekNumber = week.week_number ? week.week_number.toString() : '1';
      doc.text(`Game ${gameNumber} - Week ${weekNumber}`, 105, 40, { align: 'center' });
      
      // Date range
      const startDate = week.start_date ? new Date(week.start_date).toLocaleDateString() : '';
      const endDate = week.end_date ? new Date(week.end_date).toLocaleDateString() : '';
      doc.text(`${startDate} - ${endDate}`, 105, 55, { align: 'center' });
      
      // Selected slot info in header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Selected Slot: #${week.slot_chosen}`, 105, 70, { align: 'center' });
      
      // Grid parameters - smaller boxes, better spacing, centered
      const boxSize = 15; // Smaller boxes
      const cols = 6;
      const rowSpacing = 25; // Better gap between rows
      const colSpacing = 25; // Better gap between columns
      
      // Calculate grid dimensions to center it
      const gridWidth = (cols - 1) * colSpacing + boxSize;
      const startX = (210 - gridWidth) / 2; // Center horizontally (210 is A4 width in mm)
      const startY = 85;
      
      // Draw 52 slots in grid
      for (let i = 1; i <= 52; i++) {
        const row = Math.floor((i - 1) / cols);
        const col = (i - 1) % cols;
        
        const x = startX + col * colSpacing;
        const y = startY + row * rowSpacing;
        
        // Draw the box
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(x, y, boxSize, boxSize);
        
        // Check if this is the selected slot
        const selectedSlot = parseInt(week.slot_chosen);
        if (i === selectedSlot) {
          // Draw large green X that exceeds the box
          doc.setDrawColor(0, 150, 0); // Green color
          doc.setLineWidth(4);
          
          // X lines extending beyond the box
          const extend = 4;
          doc.line(x - extend, y - extend, x + boxSize + extend, y + boxSize + extend);
          doc.line(x - extend, y + boxSize + extend, x + boxSize + extend, y - extend);
        }
        
        // Add slot number to the right of the box
        doc.setDrawColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(i.toString().padStart(2, '0'), x + boxSize + 3, y + boxSize/2 + 2);
      }
      
      // Save PDF
      doc.save(`slot-grid-game-${gameNumber}-week-${weekNumber}.pdf`);
      toast.success('Slot grid PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating slot grid PDF:', error);
      toast.error('Failed to generate slot grid PDF');
    }
  };

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h5 className="text-lg font-semibold text-yellow-800 flex items-center">
          🏆 Winner Information
        </h5>
        <div className="flex gap-2">
          {onOpenWinnerForm && gameId && (
            <Button 
              onClick={handleEditWinner} 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Winner Details
            </Button>
          )}
          <Button 
            onClick={handlePrintSlotGrid} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
          >
            <Grid className="h-4 w-4" />
            Print Selected Slot
          </Button>
          {onOpenPayoutSlip && (
            <Button 
              onClick={handlePrintSlip} 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Distribution Slip
            </Button>
          )}
        </div>
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
          <div className="font-medium text-yellow-700">Distribution Amount</div>
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
