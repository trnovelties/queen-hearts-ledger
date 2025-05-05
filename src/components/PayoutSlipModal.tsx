
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Printer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from "@/integrations/supabase/client";

interface PayoutSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winnerData: {
    winnerName: string;
    slotChosen: number;
    cardSelected: string;
    payoutAmount: number;
    date: string;
    gameNumber: number;
    gameName: string;
    weekNumber: number;
    weekId: string;
    weekStartDate: string;
    weekEndDate: string;
  };
}

export function PayoutSlipModal({
  open,
  onOpenChange,
  winnerData
}: PayoutSlipModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();
  const [authorizedName, setAuthorizedName] = useState<string>('');
  
  const handleGeneratePDF = async () => {
    if (slipRef.current) {
      try {
        // Save authorized signature name to database
        if (authorizedName) {
          const { error } = await supabase
            .from('weeks')
            .update({
              authorized_signature_name: authorizedName
            })
            .eq('id', winnerData.weekId);
            
          if (error) {
            console.error('Error saving authorized signature name:', error);
            toast({
              title: "Error",
              description: "Failed to save authorized signature name.",
              variant: "destructive"
            });
          }
        }
        
        const canvas = await html2canvas(slipRef.current, {
          scale: 2, // Improve quality
          backgroundColor: 'white',
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`payout-slip-${winnerData.winnerName.replace(/\s+/g, '-')}.pdf`);
        
        toast({
          title: "PDF Generated",
          description: "The payout slip has been generated and downloaded."
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "Error",
          description: "Failed to generate the PDF. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Payout Slip</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          <div className="mb-6">
            <Label htmlFor="authorizedSignatureName" className="mb-2 block">Authorized Signature Name</Label>
            <Input
              id="authorizedSignatureName"
              placeholder="Enter name of authorized person signing"
              value={authorizedName}
              onChange={(e) => setAuthorizedName(e.target.value)}
              className="mb-4"
            />
          </div>
          
          <div className="flex justify-end mb-4">
            <Button 
              onClick={handleGeneratePDF} 
              className="bg-[#1F4E4A] text-[#EDFFDF] hover:bg-[#1F4E4A]/90"
            >
              <Printer className="h-4 w-4 mr-2 text-[#EDFFDF]" /> Print Payout Slip
            </Button>
          </div>
          
          <div 
            ref={slipRef} 
            className="bg-white p-8 border rounded-md shadow-sm"
            style={{ minHeight: '500px' }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-1">Queen of Hearts</h2>
              <h3 className="text-xl font-semibold mb-4">Winner Payout Slip</h3>
              <div className="text-lg font-medium">{profile?.organization_name || 'Organization'}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <div className="font-semibold text-gray-600">Game:</div>
                <div>{winnerData.gameName} (#{winnerData.gameNumber})</div>
              </div>
              <div>
                <div className="font-semibold text-gray-600">Week:</div>
                <div>
                  Week {winnerData.weekNumber} ({format(new Date(winnerData.weekStartDate), 'MMM d, yyyy')} - {format(new Date(winnerData.weekEndDate), 'MMM d, yyyy')})
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <div className="font-semibold text-gray-600">Date of Drawing:</div>
                <div>{format(new Date(winnerData.date), 'MMMM d, yyyy')}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-600">Winner:</div>
                <div className="font-semibold">{winnerData.winnerName}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <div className="font-semibold text-gray-600">Slot Chosen:</div>
                <div>{winnerData.slotChosen}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-600">Card Exposed:</div>
                <div>{winnerData.cardSelected}</div>
              </div>
            </div>
            
            <div className="mb-12 border-t border-b py-4">
              <div className="font-semibold text-gray-600">Amount Won:</div>
              <div className="text-2xl font-bold">{formatCurrency(winnerData.payoutAmount)}</div>
            </div>
            
            <div className="mt-16 pt-2 border-t border-gray-400">
              <div className="font-semibold text-gray-600 text-center">
                {authorizedName ? authorizedName : 'Authorized Signature'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
