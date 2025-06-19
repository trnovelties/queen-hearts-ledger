import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, isValid, parseISO } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PayoutSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winnerData: any;
}

export function PayoutSlipModal({ open, onOpenChange, winnerData }: PayoutSlipModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  if (!winnerData) return null;

  // Safe date formatting function
  const formatSafeDate = (dateValue: any, formatString: string = 'MMM d, yyyy') => {
    if (!dateValue) return 'N/A';
    
    let date: Date;
    if (typeof dateValue === 'string') {
      date = parseISO(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return 'N/A';
    }
    
    return isValid(date) ? format(date, formatString) : 'N/A';
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    if (slipRef.current) {
      try {
        const canvas = await html2canvas(slipRef.current, {
          scale: 2, // Increase scale for better resolution
          useCORS: true, // Enable cross-origin resource loading if needed
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`payout-slip-${winnerData.winnerName}-${winnerData.weekNumber}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Distribution Slip</DialogTitle>
        </DialogHeader>
        
        <div ref={slipRef} className="bg-white p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <img src="/logo.png" alt="Company Logo" className="h-8" />
            </div>
            <div className="text-right space-y-1">
              <p className="font-semibold">Prepared By: Finance Department</p>
              <p className="text-sm text-gray-600">Date Prepared: {formatSafeDate(new Date())}</p>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">PAYOUT DISTRIBUTION SLIP</h2>
            <p className="text-lg">Week {winnerData.weekNumber}</p>
            <p className="text-sm text-gray-600">
              {formatSafeDate(winnerData.weekStartDate)} - {formatSafeDate(winnerData.weekEndDate)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Winner Name:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {winnerData.winnerName || 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Account Number:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {winnerData.accountNumber || 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Bank Name:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {winnerData.bankName || 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Date:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {formatSafeDate(winnerData.date)}
                </div>
              </div>
              <div>
                <span className="font-semibold">Amount Won:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {winnerData.amountWon ? `$${winnerData.amountWon.toLocaleString()}` : 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Payment Method:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {winnerData.paymentMethod || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Distribution Details:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-400">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 px-4 py-2">Item</th>
                      <th className="border border-gray-400 px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-4 py-2">Winnings</td>
                      <td className="border border-gray-400 px-4 py-2">${winnerData.amountWon?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-4 py-2">Tax Withheld</td>
                      <td className="border border-gray-400 px-4 py-2">${winnerData.taxWithheld?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-4 py-2">Other Deductions</td>
                      <td className="border border-gray-400 px-4 py-2">${winnerData.otherDeductions?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-4 py-2 font-semibold">Net Payout</td>
                      <td className="border border-gray-400 px-4 py-2 font-semibold">${winnerData.netPayout?.toLocaleString() || '0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg">Additional Notes:</h3>
              <p className="text-sm">{winnerData.additionalNotes || 'N/A'}</p>
            </div>
          </div>

          <div className="flex justify-between items-end text-sm">
            <div className="space-y-1">
              <p className="font-semibold">Authorized Signature:</p>
              <div className="border-b border-gray-300 w-48"></div>
              <p className="text-gray-600">Finance Manager</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Winner's Signature:</p>
              <div className="border-b border-gray-300 w-48"></div>
              <p className="text-gray-600">Date Received: {formatSafeDate(new Date())}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={generatePDF} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
