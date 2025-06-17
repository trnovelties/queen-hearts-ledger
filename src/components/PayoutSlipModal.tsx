
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
  } | null;
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
    if (!winnerData || !slipRef.current) {
      toast({
        title: "Error",
        description: "Winner data is not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
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
        scale: 2,
        backgroundColor: 'white',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`distribution-slip-${winnerData.winnerName.replace(/\s+/g, '-')}.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "The distribution slip has been generated and downloaded."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate the PDF. Please try again.",
        variant: "destructive"
      });
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
      <DialogContent className="w-[90vw] h-[90vh] max-w-4xl max-h-none overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-[#1F4E4A]">Winner Distribution Slip</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full overflow-hidden">
          {!winnerData ? (
            <div className="text-center p-4">
              <p>No winner data available. Please try again.</p>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="authorizedSignatureName" className="mb-2 block text-sm font-medium text-[#1F4E4A]">
                      Authorized Signature Name
                    </Label>
                    <Input
                      id="authorizedSignatureName"
                      placeholder="Enter name of authorized person signing"
                      value={authorizedName}
                      onChange={(e) => setAuthorizedName(e.target.value)}
                      className="border-[#1F4E4A]/20 focus:border-[#A1E96C] focus:ring-[#A1E96C]"
                    />
                  </div>
                  <Button 
                    onClick={handleGeneratePDF} 
                    className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90 font-medium px-6 py-2 h-10"
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print Distribution Slip
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                <div 
                  ref={slipRef} 
                  className="bg-white p-8 border-2 border-gray-300 rounded-lg shadow-lg mx-auto max-w-3xl min-h-[600px]"
                >
                  {/* Header Section */}
                  <div className="text-center mb-8 border-b-2 border-[#1F4E4A] pb-6">
                    <div className="mb-4">
                      <h1 className="text-3xl font-bold text-[#1F4E4A] mb-2">QUEEN OF HEARTS</h1>
                      <h2 className="text-xl font-semibold text-gray-700">Winner Distribution Slip</h2>
                    </div>
                    <div className="bg-[#F7F8FC] px-4 py-2 rounded-lg inline-block">
                      <span className="text-lg font-semibold text-[#1F4E4A]">
                        {profile?.organization_name || 'Organization Name'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Game Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-[#1F4E4A] mb-4 border-b border-gray-300 pb-2">
                      GAME INFORMATION
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Game:</span>
                          <span className="font-medium">{winnerData.gameName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Week:</span>
                          <span className="font-medium">Week {winnerData.weekNumber}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Week Period:</span>
                          <span className="font-medium">
                            {format(new Date(winnerData.weekStartDate), 'MMM d')} - {format(new Date(winnerData.weekEndDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Drawing Date:</span>
                          <span className="font-medium">{format(new Date(winnerData.date), 'MMMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Winner Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-[#1F4E4A] mb-4 border-b border-gray-300 pb-2">
                      WINNER DETAILS
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Winner Name:</span>
                          <span className="font-bold text-lg">{winnerData.winnerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Slot Chosen:</span>
                          <span className="font-medium text-lg">#{winnerData.slotChosen}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">Card Exposed:</span>
                          <span className="font-bold text-lg text-red-600">{winnerData.cardSelected}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Distribution Amount Section */}
                  <div className="mb-8">
                    <div className="bg-[#A1E96C] rounded-lg p-6 text-center border-2 border-[#1F4E4A]">
                      <h3 className="text-lg font-bold text-[#1F4E4A] mb-2">AMOUNT WON</h3>
                      <div className="text-4xl font-bold text-[#1F4E4A]">
                        {formatCurrency(winnerData.payoutAmount)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Signature Section */}
                  <div className="mt-12 pt-8 border-t-2 border-gray-300">
                    <div className="grid grid-cols-2 gap-12">
                      <div className="text-center">
                        <div className="border-b-2 border-gray-400 pb-1 mb-2 h-12 flex items-end justify-center">
                          <span className="text-sm text-gray-500">Winner Signature</span>
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {winnerData.winnerName}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="border-b-2 border-gray-400 pb-1 mb-2 h-12 flex items-end justify-center">
                          <span className="text-sm text-gray-500">Authorized Signature</span>
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {authorizedName || 'Authorized Representative'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-6 text-xs text-gray-500">
                      Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
