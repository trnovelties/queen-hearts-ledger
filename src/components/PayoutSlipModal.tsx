
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { formatDateStringForDisplay, formatDateStringShort, getTodayDateString } from '@/lib/dateUtils';
import { useAuth } from '@/context/AuthContext';

interface PayoutSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winnerData: any;
}

export function PayoutSlipModal({ open, onOpenChange, winnerData }: PayoutSlipModalProps) {
  const { user } = useAuth();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<any>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (winnerData && open && user?.id) {
      console.log('PayoutSlipModal - Winner data received:', winnerData);
      fetchAllData();
    }
  }, [winnerData, open, user?.id]);

  const fetchAllData = async () => {
    if (!winnerData?.gameId || !user?.id) {
      console.log('PayoutSlipModal - Missing gameId or user ID');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching data for gameId:', winnerData.gameId, 'weekId:', winnerData.weekId);
      
      // Fetch game data
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', winnerData.gameId)
        .eq('user_id', user.id)
        .single();
      
      if (gameError) {
        console.error('Error fetching game data:', gameError);
      } else {
        console.log('Game data fetched:', gameData);
        setGameData(gameData);
      }

      // Fetch week data if weekId is provided
      if (winnerData.weekId) {
        const { data: weekData, error: weekError } = await supabase
          .from('weeks')
          .select('*')
          .eq('id', winnerData.weekId)
          .eq('user_id', user.id)
          .single();
        
        if (weekError) {
          console.error('Error fetching week data:', weekError);
        } else {
          console.log('Week data fetched:', weekData);
          setWeekData(weekData);
        }
      }
      
      // Fetch expenses for this game
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', winnerData.gameId)
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
      } else {
        console.log('Expenses data fetched:', expensesData);
        setExpenses(expensesData || []);
      }
      
    } catch (error) {
      console.error('Error fetching payout slip data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!winnerData) return null;

  // Safe date formatting function using timezone-neutral string functions
  const formatSafeDate = (dateValue: any, formatType: 'full' | 'short' = 'full') => {
    if (!dateValue) return 'N/A';
    
    // Handle various input types and convert to string
    let dateString: string;
    if (typeof dateValue === 'string') {
      dateString = dateValue;
    } else if (dateValue instanceof Date) {
      // Convert Date to YYYY-MM-DD string (this might have timezone issues but is legacy support)
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    } else {
      return 'N/A';
    }
    
    // Use our timezone-neutral formatting functions
    if (formatType === 'short') {
      return formatDateStringShort(dateString);
    } else {
      return formatDateStringForDisplay(dateString);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    if (slipRef.current) {
      try {
        const canvas = await html2canvas(slipRef.current, {
          scale: 2,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        const fileName = `payout-slip-${winnerData.winnerName || 'winner'}-week-${weekData?.week_number || winnerData.weekNumber || 'N/A'}.pdf`;
        pdf.save(fileName);
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  // Calculate totals
  const totalExpenses = expenses.filter(e => !e.is_donation).reduce((sum, e) => sum + e.amount, 0);
  const totalDonations = expenses.filter(e => e.is_donation).reduce((sum, e) => sum + e.amount, 0);
  const grossWinnings = winnerData.amountWon || winnerData.payoutAmount || weekData?.weekly_payout || 0;
  const netPayout = grossWinnings; // Assuming no deductions for now

  // Use data from winnerData first, then fallback to fetched data
  const displayData = {
    winnerName: winnerData.winnerName || weekData?.winner_name || 'N/A',
    cardSelected: winnerData.cardSelected || weekData?.card_selected || 'N/A',
    slotChosen: winnerData.slotChosen || weekData?.slot_chosen || 'N/A',
    gameName: winnerData.gameName || gameData?.name || 'N/A',
    weekNumber: winnerData.weekNumber || weekData?.week_number || 'N/A',
    weekStartDate: winnerData.weekStartDate || weekData?.start_date,
    weekEndDate: winnerData.weekEndDate || weekData?.end_date,
    winnerPresent: winnerData.winnerPresent !== undefined ? winnerData.winnerPresent : weekData?.winner_present,
    authorizedSignatureName: winnerData.authorizedSignatureName || weekData?.authorized_signature_name || 'N/A',
    drawingDate: winnerData.date || getTodayDateString()
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Distribution Slip</DialogTitle>
          <DialogDescription>
            Review and download the payout distribution slip for {displayData.winnerName}
          </DialogDescription>
        </DialogHeader>
        
        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading slip data...</span>
          </div>
        )}
        
        <div ref={slipRef} className="bg-white p-8 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="text-xl font-bold">Queen of Hearts Game</h1>
              <p className="text-sm text-gray-600">Payout Distribution Slip</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-semibold">Prepared By: Finance Department</p>
              <p className="text-sm text-gray-600">Date Prepared: {formatSafeDate(getTodayDateString())}</p>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">WEEK {displayData.weekNumber} PAYOUT</h2>
            <p className="text-lg font-semibold">{displayData.gameName}</p>
            <p className="text-sm text-gray-600">
              Week Period: {formatSafeDate(displayData.weekStartDate)} - {formatSafeDate(displayData.weekEndDate)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Winner Name:</span>
                <div className="border-b border-gray-300 pb-1 mt-1 text-lg">
                  {displayData.winnerName}
                </div>
              </div>
              <div>
                <span className="font-semibold">Date of Drawing:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {formatSafeDate(displayData.drawingDate)}
                </div>
              </div>
              <div>
                <span className="font-semibold">Slot Selected:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  #{displayData.slotChosen}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Card Drawn:</span>
                <div className="border-b border-gray-300 pb-1 mt-1 text-lg font-semibold">
                  {displayData.cardSelected}
                </div>
              </div>
              <div>
                <span className="font-semibold">Winner Present:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {displayData.winnerPresent !== undefined ? (displayData.winnerPresent ? 'Yes' : 'No') : 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Authorized By:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {displayData.authorizedSignatureName}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Financial Distribution Details:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-400 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-400 px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-400 px-4 py-2">Gross Winnings</td>
                    <td className="border border-gray-400 px-4 py-2 text-right font-semibold">
                      {formatCurrency(grossWinnings)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 px-4 py-2">Less: Tax Withholding</td>
                    <td className="border border-gray-400 px-4 py-2 text-right">
                      {formatCurrency(0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 px-4 py-2">Less: Other Deductions</td>
                    <td className="border border-gray-400 px-4 py-2 text-right">
                      {formatCurrency(0)}
                    </td>
                  </tr>
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-400 px-4 py-2 font-bold">Net Payout to Winner</td>
                    <td className="border border-gray-400 px-4 py-2 text-right font-bold text-lg">
                      {formatCurrency(netPayout)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {expenses.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Game Expenses & Donations Summary:</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Expenses</h4>
                  <div className="space-y-1 text-sm">
                    {expenses.filter(e => !e.is_donation).slice(0, 5).map((expense, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{formatSafeDate(expense.date, 'short')} - {expense.memo || 'Expense'}</span>
                        <span>{formatCurrency(expense.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 font-semibold flex justify-between">
                      <span>Total Expenses:</span>
                      <span>{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Donations</h4>
                  <div className="space-y-1 text-sm">
                    {expenses.filter(e => e.is_donation).slice(0, 5).map((donation, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{formatSafeDate(donation.date, 'short')} - {donation.memo || 'Donation'}</span>
                        <span>{formatCurrency(donation.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 font-semibold flex justify-between">
                      <span>Total Donations:</span>
                      <span>{formatCurrency(totalDonations)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end text-sm pt-8 border-t">
            <div className="space-y-2">
              <p className="font-semibold">Authorized Signature:</p>
              <div className="border-b border-gray-300 w-48 h-8"></div>
              <p className="text-gray-600">Finance Manager</p>
              <p className="text-xs text-gray-500">Date: _______________</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Winner's Signature:</p>
              <div className="border-b border-gray-300 w-48 h-8"></div>
              <p className="text-gray-600">Date Received: _______________</p>
              <p className="text-xs text-gray-500">ID Verified: _______________</p>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-500 pt-4">
            <p>This document serves as official record of payout distribution.</p>
            <p>Please retain for your records.</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={generatePDF} disabled={isGeneratingPdf || loading}>
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
