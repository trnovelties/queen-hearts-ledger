
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
    if (open && winnerData && user?.id) {
      console.log('PayoutSlipModal opening with winnerData:', winnerData);
      fetchComprehensiveSlipData();
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
      console.log('Fetching comprehensive data with winnerData:', winnerData);

      // First, try to find the game and week using the provided information
      let gameData = null;
      let weekData = null;

      // Try to find the game by name and game number
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', winnerData.gameName || '')
        .eq('game_number', winnerData.gameNumber || 0);

      if (gamesError) {
        console.error('Games fetch error:', gamesError);
        throw new Error(`Failed to fetch games: ${gamesError.message}`);
      }

      if (games && games.length > 0) {
        gameData = games[0];
        console.log('Found game:', gameData);

        // Now find the week for this game
        const { data: weeks, error: weeksError } = await supabase
          .from('weeks')
          .select('*')
          .eq('game_id', gameData.id)
          .eq('user_id', user.id)
          .eq('week_number', winnerData.weekNumber || 0);

        if (weeksError) {
          console.error('Weeks fetch error:', weeksError);
          throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
        }

        if (weeks && weeks.length > 0) {
          weekData = weeks[0];
          console.log('Found week:', weekData);
        }
      }

      // If we couldn't find the game/week, use the provided data as fallback
      if (!gameData || !weekData) {
        console.log('Could not find game/week in database, using provided data');
        setSlipData({
          game: {
            id: 'fallback',
            name: winnerData.gameName || 'N/A',
            game_number: winnerData.gameNumber || 'N/A',
            ticket_price: 2,
            organization_percentage: 40,
            jackpot_percentage: 60
          },
          week: {
            id: 'fallback',
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
          expenses: [],
          winnerData: winnerData
        });
        setLoading(false);
        return;
      }

      // Fetch ALL ticket sales for this week
      const { data: ticketSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekData.id)
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
        .eq('game_id', gameData.id)
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
      
      const fileName = `distribution-slip-${slipData?.week?.winner_name || 'winner'}-week-${slipData?.week?.week_number || 'N/A'}.pdf`;
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
        <DialogContent className="max-w-4xl" aria-describedby="distribution-slip-loading">
          <DialogHeader>
            <DialogTitle>Distribution Slip</DialogTitle>
            <DialogDescription id="distribution-slip-loading">
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
        <DialogContent className="max-w-4xl" aria-describedby="distribution-slip-error">
          <DialogHeader>
            <DialogTitle>Distribution Slip</DialogTitle>
            <DialogDescription id="distribution-slip-error">
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
        <DialogContent className="max-w-4xl" aria-describedby="distribution-slip-no-data">
          <DialogHeader>
            <DialogTitle>Distribution Slip</DialogTitle>
            <DialogDescription id="distribution-slip-no-data">
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
  
  // Calculate ending jackpot (previous + contributions - distribution)
  const endingJackpot = (slipData.week?.ending_jackpot || 0);

  // Calculate shortfall logic for winner payout
  const calculateWinnerPayout = () => {
    const weeklyPayout = slipData.week?.weekly_payout || winnerData?.payoutAmount || 0;
    const minimumStartingJackpot = slipData.game?.minimum_starting_jackpot || 500;
    const netAvailableForWinner = slipData.game?.net_available_for_final_winner;
    
    // Check if there's a shortfall based on net available vs minimum
    const isShortfall = netAvailableForWinner !== undefined && netAvailableForWinner < minimumStartingJackpot;
    
    // If shortfall and this is a Queen of Hearts winner, show minimum starting jackpot
    const isQueenOfHearts = (slipData.week?.card_selected || winnerData?.cardSelected) === 'Queen of Hearts';
    if (isShortfall && isQueenOfHearts) {
      return minimumStartingJackpot;
    }
    
    // For regular cases, show the net available amount for the winner
    // (total jackpot - weekly distributions - next game contribution)
    return netAvailableForWinner || weeklyPayout;
  };

  const winnerPayoutAmount = calculateWinnerPayout();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto" aria-describedby="distribution-slip-content">
        <DialogHeader>
          <DialogTitle>Comprehensive Distribution Slip</DialogTitle>
          <DialogDescription id="distribution-slip-content">
            Complete distribution slip for {slipData.week?.winner_name || winnerData?.winnerName || 'N/A'} - Week {slipData.week?.week_number || winnerData?.weekNumber || 'N/A'}
          </DialogDescription>
        </DialogHeader>
        
        <div ref={slipRef} className="bg-white p-8 space-y-8 print:p-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F4E4A]">Queen of Hearts Game</h1>
              <p className="text-lg text-gray-600">Official Distribution Slip</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-semibold text-lg">Prepared By: Finance Department</p>
              <p className="text-sm text-gray-600">Date Prepared: {formatDate(new Date().toISOString().split('T')[0])}</p>
              <p className="text-sm text-gray-600">Game: {slipData.game?.name || winnerData?.gameName || 'N/A'}</p>
            </div>
          </div>
          
          {/* Game & Week Info */}
          <div className="text-center space-y-3 bg-[#A1E96C]/10 p-6 rounded-lg border-2 border-[#A1E96C]">
            <h2 className="text-3xl font-bold text-[#1F4E4A]">WEEK {slipData.week?.week_number || winnerData?.weekNumber || 'N/A'} DISTRIBUTION</h2>
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

          {/* Winner Prize Amount */}
          <div className="text-center space-y-4 bg-green-50 border-2 border-green-300 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-green-800">WINNER PRIZE AMOUNT</h3>
            <div className="text-6xl font-bold text-green-700">
              {formatCurrency(slipData.week?.weekly_payout || winnerData?.payoutAmount || 0)}
            </div>
            <p className="text-lg text-green-600">Amount to be distributed to winner</p>
          </div>
          
          <div className="text-center text-sm text-gray-600 pt-6 border-t">
            <p className="font-semibold">This document serves as official record of distribution.</p>
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
