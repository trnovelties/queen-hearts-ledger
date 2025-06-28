
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface PayoutSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winnerData: any;
}

export function PayoutSlipModal({ open, onOpenChange, winnerData }: PayoutSlipModalProps) {
  const { user } = useAuth();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [slipData, setSlipData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  console.log('PayoutSlipModal rendered:', { open, winnerData });

  useEffect(() => {
    if (open && winnerData && user?.id) {
      console.log('Effect triggered - fetching slip data...');
      fetchSlipData();
    }
  }, [open, winnerData, user?.id]);

  const fetchSlipData = async () => {
    if (!user?.id || !winnerData) {
      console.error('Missing user or winner data:', { userId: user?.id, winnerData });
      setError('Missing user or winner data');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching slip data with winner data:', winnerData);
      
      // Extract IDs from winnerData - try multiple possible field names
      const gameId = winnerData.gameId || winnerData.game_id;
      const weekId = winnerData.weekId || winnerData.week_id;
      
      console.log('Extracted IDs:', { gameId, weekId });
      
      if (!gameId || !weekId) {
        throw new Error(`Missing game or week ID. GameId: ${gameId}, WeekId: ${weekId}`);
      }

      // Fetch game data
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .eq('user_id', user.id)
        .single();

      if (gameError) {
        console.error('Game fetch error:', gameError);
        throw new Error(`Failed to fetch game: ${gameError.message}`);
      }
      console.log('Game data:', gameData);

      // Fetch week data
      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('id', weekId)
        .eq('user_id', user.id)
        .single();

      if (weekError) {
        console.error('Week fetch error:', weekError);
        throw new Error(`Failed to fetch week: ${weekError.message}`);
      }
      console.log('Week data:', weekData);

      // Fetch ticket sales for this week
      const { data: ticketSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (salesError) {
        console.error('Ticket sales fetch error:', salesError);
        throw new Error(`Failed to fetch ticket sales: ${salesError.message}`);
      }
      console.log('Ticket sales data:', ticketSales);

      // Combine all data
      const combinedData = {
        game: gameData,
        week: weekData,
        ticketSales: ticketSales || [],
        winnerData: winnerData
      };

      console.log('Final combined slip data:', combinedData);
      setSlipData(combinedData);

    } catch (error: any) {
      console.error('Error in fetchSlipData:', error);
      setError(error.message || 'Failed to fetch slip data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const generatePDF = async () => {
    if (!slipRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `payout-slip-${slipData?.week?.winner_name || 'winner'}-week-${slipData?.week?.week_number || 'N/A'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl" aria-describedby="loading-description">
          <DialogHeader>
            <DialogTitle>Payout Distribution Slip</DialogTitle>
            <DialogDescription id="loading-description">
              Loading slip data, please wait...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading slip data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl" aria-describedby="error-description">
          <DialogHeader>
            <DialogTitle>Payout Distribution Slip</DialogTitle>
            <DialogDescription id="error-description">
              There was an error loading the slip data
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col justify-center items-center p-8">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <Button onClick={fetchSlipData} variant="outline">
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Don't render if no data
  if (!slipData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl" aria-describedby="no-data-description">
          <DialogHeader>
            <DialogTitle>Payout Distribution Slip</DialogTitle>
            <DialogDescription id="no-data-description">
              No slip data available
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            <div>No data available</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate totals from ticket sales
  const weekTotalTickets = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.tickets_sold || 0), 0) || 0;
  const weekTotalSales = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.amount_collected || 0), 0) || 0;
  const weekOrganizationTotal = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.organization_total || 0), 0) || 0;
  const weekJackpotTotal = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="slip-description">
        <DialogHeader>
          <DialogTitle>Payout Distribution Slip</DialogTitle>
          <DialogDescription id="slip-description">
            Distribution slip for {slipData.week?.winner_name || 'N/A'} - Week {slipData.week?.week_number || 'N/A'}
          </DialogDescription>
        </DialogHeader>
        
        <div ref={slipRef} className="bg-white p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="text-xl font-bold">Queen of Hearts Game</h1>
              <p className="text-sm text-gray-600">Payout Distribution Slip</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-semibold">Prepared By: Finance Department</p>
              <p className="text-sm text-gray-600">Date Prepared: {formatDate(new Date().toISOString().split('T')[0])}</p>
            </div>
          </div>
          
          {/* Game & Week Info */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">WEEK {slipData.week?.week_number || 'N/A'} PAYOUT</h2>
            <p className="text-lg font-semibold">{slipData.game?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600">
              Week Period: {formatDate(slipData.week?.start_date)} - {formatDate(slipData.week?.end_date)}
            </p>
          </div>

          {/* Winner Information */}
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Winner Name:</span>
                <div className="border-b border-gray-300 pb-1 mt-1 text-lg">
                  {slipData.week?.winner_name || winnerData?.winnerName || 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Date of Drawing:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {formatDate(winnerData?.date || new Date().toISOString().split('T')[0])}
                </div>
              </div>
              <div>
                <span className="font-semibold">Slot Selected:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  #{slipData.week?.slot_chosen || winnerData?.slotChosen || 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Card Drawn:</span>
                <div className="border-b border-gray-300 pb-1 mt-1 text-lg font-semibold">
                  {slipData.week?.card_selected || winnerData?.cardSelected || 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Winner Present:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {slipData.week?.winner_present !== undefined ? (slipData.week.winner_present ? 'Yes' : 'No') : 
                   winnerData?.winnerPresent !== undefined ? (winnerData.winnerPresent ? 'Yes' : 'No') : 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-semibold">Authorized By:</span>
                <div className="border-b border-gray-300 pb-1 mt-1">
                  {slipData.week?.authorized_signature_name || winnerData?.authorizedSignatureName || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Week Summary Stats */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Week {slipData.week?.week_number || 'N/A'} Summary:</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{weekTotalTickets}</div>
                <div className="text-sm text-blue-600 font-medium">Tickets Sold</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{formatCurrency(weekTotalSales)}</div>
                <div className="text-sm text-green-600 font-medium">Total Sales</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{formatCurrency(weekOrganizationTotal)}</div>
                <div className="text-sm text-purple-600 font-medium">Organization Share</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{formatCurrency(weekJackpotTotal)}</div>
                <div className="text-sm text-orange-600 font-medium">Jackpot Contribution</div>
              </div>
            </div>
          </div>

          {/* Daily Entries Table */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Daily Entries:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-400">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-400 px-3 py-2 text-left">Date</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Tickets Sold</th>
                    <th className="border border-gray-400 px-3 py-2 text-right">Amount Collected</th>
                    <th className="border border-gray-400 px-3 py-2 text-right">Organization Share</th>
                    <th className="border border-gray-400 px-3 py-2 text-right">Jackpot Share</th>
                    <th className="border border-gray-400 px-3 py-2 text-right">Cumulative Total</th>
                  </tr>
                </thead>
                <tbody>
                  {slipData.ticketSales && slipData.ticketSales.length > 0 ? 
                    slipData.ticketSales.map((sale: any, index: number) => (
                      <tr key={sale.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-400 px-3 py-2">{formatDate(sale.date)}</td>
                        <td className="border border-gray-400 px-3 py-2 text-center">{sale.tickets_sold || 0}</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(sale.amount_collected)}</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(sale.organization_total)}</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(sale.jackpot_total)}</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(sale.cumulative_collected)}</td>
                      </tr>
                    )) : (
                    <tr>
                      <td colSpan={6} className="border border-gray-400 px-3 py-2 text-center text-gray-500">
                        No daily entries found for this week
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="border border-gray-400 px-3 py-2">TOTALS</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">{weekTotalTickets}</td>
                    <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(weekTotalSales)}</td>
                    <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(weekOrganizationTotal)}</td>
                    <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(weekJackpotTotal)}</td>
                    <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payout Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Payout Information:</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Gross Winnings:</span>
                    <span className="font-bold text-lg">{formatCurrency(slipData.week?.weekly_payout || winnerData?.amountWon || 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold text-lg">Net Payout:</span>
                    <span className="font-bold text-xl text-green-600">{formatCurrency(slipData.week?.weekly_payout || winnerData?.amountWon || 0)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Card Selected:</span>
                    <span className="font-semibold">{slipData.week?.card_selected || winnerData?.cardSelected || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Slot Chosen:</span>
                    <span className="font-semibold">#{slipData.week?.slot_chosen || winnerData?.slotChosen || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Winner Present:</span>
                    <span className={`font-semibold ${(slipData.week?.winner_present || winnerData?.winnerPresent) ? 'text-green-600' : 'text-red-600'}`}>
                      {slipData.week?.winner_present !== undefined ? (slipData.week.winner_present ? '✓ Yes' : '✗ No') : 
                       winnerData?.winnerPresent !== undefined ? (winnerData.winnerPresent ? '✓ Yes' : '✗ No') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Section */}
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
