import { Button } from "@/components/ui/button";
import { Printer, Edit, Grid } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from "sonner";
interface WinnerInfoDisplayProps {
  week: any;
  formatCurrency: (amount: number) => string;
  onOpenPayoutSlip?: (winnerData: any) => void;
  onOpenWinnerForm?: (gameId: string, weekId: string) => void;
  gameId?: string;
}
export const WinnerInfoDisplay = ({
  week,
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
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Selected Slot #', 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Game ## Week ##`, 105, 45, { align: 'center' });
      doc.text(`${week.start_date} - ${week.end_date}`, 105, 60, { align: 'center' });
      
      // Grid setup
      const startX = 30;
      const startY = 80;
      const cellWidth = 30;
      const cellHeight = 20;
      const cols = 5;
      const rows = Math.ceil(52 / cols);
      
      doc.setFontSize(10);
      
      // Draw grid
      for (let i = 1; i <= 52; i++) {
        const row = Math.floor((i - 1) / cols);
        const col = (i - 1) % cols;
        
        const x = startX + col * cellWidth;
        const y = startY + row * cellHeight;
        
        // Draw cell border
        doc.rect(x, y, cellWidth, cellHeight);
        
        // Check if this is the selected slot
        if (i === parseInt(week.slot_chosen)) {
          // Draw green checkmark for selected slot
          doc.setFillColor(0, 255, 0);
          doc.text('✓', x + 5, y + 12);
          doc.setFillColor(0, 0, 0);
        }
        
        // Draw slot number
        const slotText = i.toString().padStart(2, '0');
        doc.text(slotText, x + cellWidth - 15, y + 12);
      }
      
      // Save the PDF
      doc.save(`slot-grid-week-${week.week_number}.pdf`);
      toast.success('Slot grid PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating slot grid PDF:', error);
      toast.error('Failed to generate slot grid PDF');
    }
  };
  return <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h5 className="text-lg font-semibold text-yellow-800 flex items-center">
          🏆 Winner Information
        </h5>
        <div className="flex gap-2">
          {onOpenWinnerForm && gameId && <Button onClick={handleEditWinner} variant="outline" size="sm" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Winner Details
            </Button>}
          <Button onClick={handlePrintSlotGrid} variant="outline" size="sm" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Print Selected Slot
          </Button>
          {onOpenPayoutSlip && <Button onClick={handlePrintSlip} variant="outline" size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Distribution Slip
            </Button>}
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
    </div>;
};