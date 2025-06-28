
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    if (open && winnerData) {
      console.log('PayoutSlipModal opening with winnerData:', winnerData);
      
      // Check if we have database IDs to fetch additional data
      const gameId = winnerData.gameId || winnerData.game_id;
      const weekId = winnerData.weekId || winnerData.week_id;
      
      if (gameId && weekId && user?.id) {
        console.log('Found IDs, fetching comprehensive database data...');
        fetchComprehensiveSlipData();
      } else {
        console.log('No database IDs found, using provided winnerData directly');
        // Use the winnerData directly if no database IDs are available
        setSlipData({
          game: {
            name: winnerData.gameName || 'N/A',
            game_number: winnerData.gameNumber || 'N/A',
            ticket_price: 2,
            organization_percentage: 40,
            jackpot_percentage: 60
          },
          week: {
            week_number: winnerData.weekNumber || 'N/A',
            start_date: winnerData.weekStartDate || null,
            end_date: winnerData.weekEndDate || null,
            winner_name: winnerData.winnerName || 'N/A',
            slot_chosen: winnerData.slotChosen || 'N/A',
            card_selected: winnerData.cardSelected || 'N/A',
            weekly_payout: winnerData.payoutAmount || 0,
            winner_present: winnerData.winnerPresent !== false,
            authorized_signature_name: winnerData.authorizedSignatureName || 'Finance Manager'
          },
          ticketSales: [],
          winnerData: winnerData
        });
      }
    }
  }, [open, winnerData, user?.id]);

  const fetchComprehensiveSlipData = async () => {
    if (!user?.id || !winnerData) {
      setError('Missing user or winner data');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const gameId = winnerData.gameId || winnerData.game_id;
      const weekId = winnerData.weekId || winnerData.week_id;
      
      if (!gameId || !weekId) {
        throw new Error(`Missing game or week ID. GameId: ${gameId}, WeekId: ${weekId}`);
      }

      console.log('Fetching comprehensive data for gameId:', gameId, 'weekId:', weekId);

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

      // Fetch ALL ticket sales for this week
      const { data: ticketSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (salesError) {
        console.error('Ticket sales fetch error:', salesError);
        // Don't throw error for ticket sales, just use empty array
      }

      console.log('Fetched ticket sales:', ticketSales);

      // Fetch expenses for this game (for complete financial picture)
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (expensesError) {
        console.error('Expenses fetch error:', expensesError);
      }

      // Combine all data
      const combinedData = {
        game: gameData,
        week: weekData,
        ticketSales: ticketSales || [],
        expenses: expenses || [],
        winnerData: winnerData
      };

      console.log('Final comprehensive slip data:', combinedData);
      setSlipData(combinedData);

    } catch (error: any) {
      console.error('Error in fetchComprehensiveSlipData:', error);
      setError(error.message || 'Failed to fetch comprehensive slip data');
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
        height: slipRef.current.scrollHeight,
        windowHeight: slipRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add multiple pages if content is too long
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payout Distribution Slip</DialogTitle>
            <DialogDescription>
              Loading comprehensive slip data, please wait...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading comprehensive data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payout Distribution Slip</DialogTitle>
            <DialogDescription>
              There was an error loading the comprehensive slip data
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col justify-center items-center p-8">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <Button onClick={fetchComprehensiveSlipData} variant="outline">
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payout Distribution Slip</DialogTitle>
            <DialogDescription>
              No comprehensive slip data available
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            <div>No data available</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate comprehensive totals from ticket sales
  const weekTotalTickets = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.tickets_sold || 0), 0) || 0;
  const weekTotalSales = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.amount_collected || 0), 0) || 0;
  const weekOrganizationTotal = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.organization_total || 0), 0) || 0;
  const weekJackpotTotal = slipData.ticketSales?.reduce((sum: number, sale: any) => sum + (sale.jackpot_total || 0), 0) || 0;
  const organizationNetProfit = weekOrganizationTotal - (slipData.expenses?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprehensive Payout Distribution Slip</DialogTitle>
          <DialogDescription>
            Complete distribution slip for {slipData.week?.winner_name || winnerData?.winnerName || 'N/A'} - Week {slipData.week?.week_number || winnerData?.weekNumber || 'N/A'}
          </DialogDescription>
        </DialogHeader>
        
        <div ref={slipRef} className="bg-white p-8 space-y-8 print:p-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F4E4A]">Queen of Hearts Game</h1>
              <p className="text-lg text-gray-600">Official Payout Distribution Slip</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-semibold text-lg">Prepared By: Finance Department</p>
              <p className="text-sm text-gray-600">Date Prepared: {formatDate(new Date().toISOString().split('T')[0])}</p>
              <p className="text-sm text-gray-600">Game: {slipData.game?.name || winnerData?.gameName || 'N/A'}</p>
            </div>
          </div>
          
          {/* Game & Week Info */}
          <div className="text-center space-y-3 bg-[#A1E96C]/10 p-6 rounded-lg border-2 border-[#A1E96C]">
            <h2 className="text-3xl font-bold text-[#1F4E4A]">WEEK {slipData.week?.week_number || winnerData?.weekNumber || 'N/A'} PAYOUT</h2>
            <p className="text-xl font-semibold text-[#1F4E4A]">{slipData.game?.name || winnerData?.gameName || 'N/A'}</p>
            <p className="text-base text-gray-700">
              Week Period: {formatDate(slipData.week?.start_date || winnerData?.weekStartDate)} - {formatDate(slipData.week?.end_date || winnerData?.weekEndDate)}
            </p>
          </div>

          {/* Winner Information */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-800 mb-4 text-center">🏆 WINNER INFORMATION</h3>
            <div className="grid grid-cols-2 gap-8 text-base">
              <div className="space-y-4">
                <div>
                  <span className="font-semibold text-gray-700">Winner Name:</span>
                  <div className="border-b-2 border-gray-400 pb-2 mt-2 text-xl font-bold text-[#1F4E4A]">
                    {slipData.week?.winner_name || winnerData?.winnerName || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Date of Drawing:</span>
                  <div className="border-b-2 border-gray-400 pb-2 mt-2 text-lg">
                    {formatDate(winnerData?.date || new Date().toISOString().split('T')[0])}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Slot Selected:</span>
                  <div className="border-b-2 border-gray-400 pb-2 mt-2 text-lg font-semibold">
                    #{slipData.week?.slot_chosen || winnerData?.slotChosen || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="font-semibold text-gray-700">Card Drawn:</span>
                  <div className="border-b-2 border-gray-400 pb-2 mt-2 text-xl font-bold text-red-600">
                    {slipData.week?.card_selected || winnerData?.cardSelected || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Winner Present:</span>
                  <div className="border-b-2 border-gray-400 pb-2 mt-2 text-lg">
                    <span className={`font-bold ${(slipData.week?.winner_present !== false || winnerData?.winnerPresent !== false) ? 'text-green-600' : 'text-red-600'}`}>
                      {slipData.week?.winner_present !== undefined ? (slipData.week.winner_present ? '✓ YES' : '✗ NO') : 
                       winnerData?.winnerPresent !== undefined ? (winnerData.winnerPresent ? '✓ YES' : '✗ NO') : '✓ YES'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Authorized By:</span>
                  <div className="border-b-2 border-gray-400 pb-2 mt-2 text-lg">
                    {slipData.week?.authorized_signature_name || winnerData?.authorizedSignatureName || 'Finance Manager'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Week Financial Summary */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#1F4E4A] border-b-2 pb-2">Week {slipData.week?.week_number || winnerData?.weekNumber || 'N/A'} Financial Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-700">{weekTotalTickets}</div>
                <div className="text-sm text-blue-600 font-medium">Tickets Sold</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="text-2xl font-bold text-green-700">{formatCurrency(weekTotalSales)}</div>
                <div className="text-sm text-green-600 font-medium">Total Sales</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{formatCurrency(weekOrganizationTotal)}</div>
                <div className="text-sm text-purple-600 font-medium">Organization Share</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{formatCurrency(weekJackpotTotal)}</div>
                <div className="text-sm text-orange-600 font-medium">Jackpot Contribution</div>
              </div>
            </div>
          </div>

          {/* Daily Entries Table */}
          {slipData.ticketSales && slipData.ticketSales.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#1F4E4A] border-b-2 pb-2">Daily Entries (7 Days)</h3>
              <div className="overflow-x-auto bg-white rounded-lg border-2 border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold text-gray-800 border-r">Date</TableHead>
                      <TableHead className="font-bold text-gray-800 text-center border-r">Day</TableHead>
                      <TableHead className="font-bold text-gray-800 text-center border-r">Tickets Sold</TableHead>
                      <TableHead className="font-bold text-gray-800 text-right border-r">Amount Collected</TableHead>
                      <TableHead className="font-bold text-gray-800 text-right border-r">Organization Share</TableHead>
                      <TableHead className="font-bold text-gray-800 text-right border-r">Jackpot Share</TableHead>
                      <TableHead className="font-bold text-gray-800 text-right">Cumulative Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slipData.ticketSales.map((sale: any, index: number) => (
                      <TableRow key={sale.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium border-r">{formatDate(sale.date)}</TableCell>
                        <TableCell className="text-center border-r">{format(new Date(sale.date), 'EEEE')}</TableCell>
                        <TableCell className="text-center font-semibold border-r">{sale.tickets_sold || 0}</TableCell>
                        <TableCell className="text-right font-semibold border-r">{formatCurrency(sale.amount_collected)}</TableCell>
                        <TableCell className="text-right font-semibold border-r">{formatCurrency(sale.organization_total)}</TableCell>
                        <TableCell className="text-right font-semibold border-r">{formatCurrency(sale.jackpot_total)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(sale.cumulative_collected)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableRow className="bg-[#1F4E4A] text-white font-bold">
                    <TableCell className="font-bold border-r">WEEK TOTALS</TableCell>
                    <TableCell className="border-r"></TableCell>
                    <TableCell className="text-center font-bold border-r">{weekTotalTickets}</TableCell>
                    <TableCell className="text-right font-bold border-r">{formatCurrency(weekTotalSales)}</TableCell>
                    <TableCell className="text-right font-bold border-r">{formatCurrency(weekOrganizationTotal)}</TableCell>
                    <TableCell className="text-right font-bold border-r">{formatCurrency(weekJackpotTotal)}</TableCell>
                    <TableCell className="text-right font-bold">-</TableCell>
                  </TableRow>
                </Table>
              </div>
            </div>
          )}

          {/* Payout Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#1F4E4A] border-b-2 pb-2">Payout Information</h3>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white rounded border">
                    <span className="font-semibold text-lg">Gross Winnings:</span>
                    <span className="font-bold text-2xl text-green-600">{formatCurrency(slipData.week?.weekly_payout || winnerData?.payoutAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded border border-green-400">
                    <span className="font-bold text-xl">NET PAYOUT:</span>
                    <span className="font-bold text-3xl text-green-700">{formatCurrency(slipData.week?.weekly_payout || winnerData?.payoutAmount || 0)}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-base">
                    <div>
                      <span className="font-semibold text-gray-700">Card Selected:</span>
                      <div className="font-bold text-lg text-red-600">{slipData.week?.card_selected || winnerData?.cardSelected || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Slot Chosen:</span>
                      <div className="font-bold text-lg">#{slipData.week?.slot_chosen || winnerData?.slotChosen || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded border">
                    <span className="font-semibold text-gray-700">Organization Net Profit:</span>
                    <div className="font-bold text-xl text-purple-600">{formatCurrency(organizationNetProfit)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="flex justify-between items-end border-t-2 pt-8">
            <div className="space-y-3 text-center">
              <p className="font-bold text-lg">Authorized Signature:</p>
              <div className="border-b-2 border-gray-400 w-64 h-12 mb-2"></div>
              <p className="font-semibold">{slipData.week?.authorized_signature_name || winnerData?.authorizedSignatureName || 'Finance Manager'}</p>
              <p className="text-sm text-gray-600">Date: _______________</p>
            </div>
            <div className="space-y-3 text-center">
              <p className="font-bold text-lg">Winner's Signature:</p>
              <div className="border-b-2 border-gray-400 w-64 h-12 mb-2"></div>
              <p className="font-semibold">{slipData.week?.winner_name || winnerData?.winnerName || 'N/A'}</p>
              <p className="text-sm text-gray-600">Date Received: _______________</p>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-600 pt-6 border-t">
            <p className="font-semibold">This document serves as official record of payout distribution.</p>
            <p>Please retain for your records and tax purposes.</p>
            <p className="text-xs mt-2">Generated on {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={generatePDF} disabled={isGeneratingPdf || loading} className="bg-[#1F4E4A] hover:bg-[#132E2C]">
            {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
