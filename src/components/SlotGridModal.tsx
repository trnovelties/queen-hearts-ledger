import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from "sonner";

interface SlotGridModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: any;
  selectedSlots: number[];
  currentWeekNumber?: number;
}

export const SlotGridModal = ({
  open,
  onOpenChange,
  game,
  selectedSlots,
  currentWeekNumber
}: SlotGridModalProps) => {
  
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Queen of Hearts Available Slots', 105, 30, { align: 'center' });
      
      // Game and Week info
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      const gameNumber = game?.game_number ? game.game_number.toString().padStart(2, '0') : '01';
      const weekNumber = currentWeekNumber || 1;
      doc.text(`Game ${gameNumber} - Current Week ${weekNumber}`, 105, 50, { align: 'center' });
      
      // Grid parameters - 9 columns to match the modal
      const boxSize = 15;
      const cols = 9;
      const padding = 20;
      const rowSpacing = 20;
      const colSpacing = 20;
      
      // Calculate grid dimensions to center it
      const gridWidth = (cols - 1) * colSpacing + boxSize;
      const startX = (210 - gridWidth) / 2; // Center in A4 width
      const startY = 70; // Start after header
      
      // Draw 54 slots in 9-column grid
      for (let i = 1; i <= 54; i++) {
        const row = Math.floor((i - 1) / cols);
        const col = (i - 1) % cols;
        
        const x = startX + col * colSpacing;
        const y = startY + row * rowSpacing;
        
        // Draw the box
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(x, y, boxSize, boxSize);
        
        // Add slot number
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(i.toString(), x + boxSize/2, y + boxSize/2 + 2, { align: 'center' });
        
        // Check if this slot is selected
        if (selectedSlots.includes(i)) {
          // Draw green X
          doc.setDrawColor(0, 180, 50);
          doc.setLineWidth(2);
          doc.line(x + 2, y + 2, x + boxSize - 2, y + boxSize - 2);
          doc.line(x + 2, y + boxSize - 2, x + boxSize - 2, y + 2);
        }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="space-y-4 text-center">
          <DialogTitle className="text-4xl font-bold text-black text-center">
            Queen of Hearts Available Slots
          </DialogTitle>
          <div className="text-2xl font-medium text-black text-center">
            Game {game?.game_number?.toString().padStart(2, '0') || '01'} - Current Week {currentWeekNumber || 1}
          </div>
          <div className="flex justify-center pt-2">
            <Button 
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-green-800 text-green-200 border-green-700 hover:bg-green-700 hover:text-green-100"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="px-6 py-8">
          <div className="grid grid-cols-9 gap-0 max-w-[630px] mx-auto">
            {Array.from({ length: 54 }, (_, index) => {
              const slotNumber = index + 1;
              const isSelected = selectedSlots.includes(slotNumber);
              
              return (
                <div key={slotNumber} className="relative">
                  <div className="w-[70px] h-[90px] border border-black flex items-center justify-center relative">
                    <span className="text-2xl font-medium text-black">
                      {slotNumber}
                    </span>
                    
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-[60px] h-[82px]">
                          <svg
                            width="60"
                            height="82"
                            viewBox="0 0 60 82"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute inset-0"
                          >
                            <path
                              d="M 59.120879498135864 74.9973546547777 C 59.39959464334043 75.37826535322394 59.62068044013957 75.83047327135655 59.7715199882819 76.32815707743329 C 59.92235953642423 76.82584088351003 60 77.35925592549225 60 77.89794498444836 C 60 78.43663404340447 59.92235953642423 78.97004908538669 59.7715199882819 79.46773289146343 C 59.62068044013957 79.96541669754016 59.39959464334043 80.41762461567278 59.120879498135864 80.79853531411902 C 58.8421643529313 81.17944601256526 58.51128051039523 81.48159660152409 58.147121627900056 81.68774398398527 C 57.78296274540488 81.89389136644645 57.3926590561496 82 56.99849633008415 82.00000000000001 C 56.604333604018706 82 56.21402991476343 81.89389136644645 55.849871032268254 81.68774398398527 C 55.48571214977308 81.48159660152409 55.15482830723701 81.17944601256526 54.876113162032446 80.79853531411902 L 29.999997139136386 46.79604703030914 L 5.123882546672129 80.79853531411902 C 4.560991895745552 81.56781914262731 3.797548357892894 82.00000002144574 3.00150080905223 82.00000000000001 C 2.2054532602115664 81.99999997855429 1.442009722358908 81.56781920371867 0.8791190714323314 80.79853531411902 C 0.31622842050575484 80.02925142451937 1.569199704348455e-8 78.9858766345306 0 77.89794498444836 C -1.569199704348455e-8 76.81001333436612 0.31622846520674885 75.76663854437734 0.8791190714323314 74.9973546547777 L 25.758984256095356 40.99999609015306 L 0.8791190714323314 7.0026394804519105 C 0.31622842050575484 6.2333555908522555 0 5.189982755786955 0 4.102051105704715 C 0 3.014119455622474 0.31622842050575484 1.9707466205571742 0.8791190714323314 1.2014627309575197 C 1.442009722358908 0.432178841357865 2.2054532602115664 3.641328718496611e-15 3.00150080905223 0 C 3.797548357892894 0 4.560991895745552 0.432178841357865 5.123882546672129 1.2014627309575197 L 29.999997139136386 35.20394514999699 L 54.876113162032446 1.2014627309575197 C 55.43900381295902 0.4321789024492234 56.20244878124349 -2.1445729292762216e-8 56.99849633008415 0 C 57.79454387892481 2.1445729292762216e-8 58.55798884720929 0.432178841357865 59.120879498135864 1.2014627309575197 C 59.68377014906244 1.9707466205571742 59.999999984308005 3.014119455622474 60 4.102051105704715 C 60.000000015691995 5.189982755786955 59.68377010436144 6.2333555908522555 59.120879498135864 7.0026394804519105 L 34.24101002217741 40.99999609015306 L 59.120879498135864 74.9973546547777 Z"
                              fill="#00BD2C"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};