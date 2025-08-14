import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, FileDown, Settings, Clock, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { FinancialOverview } from "@/components/FinancialOverview";
import { FinancialCharts } from "@/components/FinancialCharts";
import { DetailedFinancialTable } from "@/components/DetailedFinancialTable";
import { ExpenseModal } from "@/components/ExpenseModal";
import { DonationModal } from "@/components/DonationModal";
import { CalculationAuditModal } from "@/components/CalculationAuditModal";
import { ExpenseDonationSummary } from "@/components/ExpenseDonationSummary";
import { useCalculationValidation } from "@/hooks/useCalculationValidation";
import { formatDateStringForDisplay } from "@/lib/dateUtils";
import { useAuth } from "@/context/AuthContext";
type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;
interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}
interface SummaryData {
  totalTicketsSold: number;
  totalSales: number;
  totalDistributions: number;
  totalExpenses: number;
  totalDonations: number;
  organizationTotalPortion: number;
  jackpotTotalPortion: number;
  organizationNetProfit: number;
  totalActualOrganizationNetProfit: number;
  totalJackpotContributions: number;
  totalContributionsToNextGame: number;
  totalWeeklyPayoutsDistributed: number;
  totalNetAvailableForFinalWinner: number;
  filteredGames: any[];
}
interface Filters {
  gameNumber: string;
}
export default function IncomeExpense() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [filteredGamesForOverview, setFilteredGamesForOverview] = useState<GameSummary[]>([]);
  const [filters, setFilters] = useState<Filters>({
    gameNumber: "all"
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedGameForExpense, setSelectedGameForExpense] = useState<string | null>(null);
  const [selectedGameForDonation, setSelectedGameForDonation] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const {
    validateGame
  } = useCalculationValidation();
  const {
    user
  } = useAuth();
  useEffect(() => {
    fetchGames();
  }, []);
  useEffect(() => {
    applyFiltersForOverview();
  }, [games, filters]);
  const fetchGames = async () => {
    if (!user?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('games').select(`
          *,
          weeks (*),
          ticket_sales (*),
          expenses (*)
        `).eq('user_id', user.id).order('start_date', {
        ascending: false
      });
      if (error) {
        throw error;
      }
      if (data) {
        const gamesWithTotals = data.map((game: any) => {
          const totalSales = game.ticket_sales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
          const totalPayouts = game.weeks.reduce((sum: number, week: any) => sum + week.weekly_payout, 0);
          const totalExpenses = game.expenses.filter((expense: any) => !expense.is_donation).reduce((sum: number, expense: any) => sum + expense.amount, 0);
          const totalDonations = game.expenses.filter((expense: any) => expense.is_donation).reduce((sum: number, expense: any) => sum + expense.amount, 0);
          const organizationTotalPortion = game.ticket_sales.reduce((sum: number, sale: any) => sum + sale.organization_total, 0);
          const organizationNetProfit = organizationTotalPortion - totalExpenses - totalDonations;
          const actualOrganizationNetProfit = game.actual_organization_net_profit || organizationNetProfit;
          return {
            ...game,
            total_sales: totalSales,
            total_payouts: totalPayouts,
            total_expenses: totalExpenses,
            total_donations: totalDonations,
            organization_net_profit: organizationNetProfit,
            actual_organization_net_profit: actualOrganizationNetProfit
          };
        });
        setGames(gamesWithTotals);
      }
    } catch (error: any) {
      toast.error(`Error fetching games: ${error.message}`);
    }
  };
  const applyFiltersForOverview = () => {
    let filtered = [...games];
    if (filters.gameNumber !== "all") {
      filtered = filtered.filter(game => game.id === filters.gameNumber);
    }
    setFilteredGamesForOverview(filtered);
  };
  const handleExportPDF = () => {
    toast.info("Exporting PDF functionality coming soon!");
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Summary for filtered overview section only
  const summaryForOverview: SummaryData = {
    totalTicketsSold: filteredGamesForOverview.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.tickets_sold, 0), 0),
    totalSales: filteredGamesForOverview.reduce((sum, game) => sum + game.total_sales, 0),
    totalDistributions: filteredGamesForOverview.reduce((sum, game) => sum + game.total_payouts, 0),
    totalExpenses: filteredGamesForOverview.reduce((sum, game) => sum + game.total_expenses, 0),
    totalDonations: filteredGamesForOverview.reduce((sum, game) => sum + game.total_donations, 0),
    organizationTotalPortion: filteredGamesForOverview.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.organization_total, 0), 0),
    jackpotTotalPortion: filteredGamesForOverview.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.jackpot_total, 0), 0),
    organizationNetProfit: filteredGamesForOverview.reduce((sum, game) => sum + game.organization_net_profit, 0),
    totalActualOrganizationNetProfit: filteredGamesForOverview.reduce((sum, game) => sum + (game.actual_organization_net_profit || 0), 0),
    totalJackpotContributions: filteredGamesForOverview.reduce((sum, game) => sum + (game.total_jackpot_contributions || 0), 0),
    totalContributionsToNextGame: filteredGamesForOverview.reduce((sum, game) => sum + (game.jackpot_contribution_to_next_game || 0), 0),
    totalWeeklyPayoutsDistributed: filteredGamesForOverview.reduce((sum, game) => sum + (game.weekly_payouts_distributed || 0), 0),
    totalNetAvailableForFinalWinner: filteredGamesForOverview.reduce((sum, game) => sum + (game.net_available_for_final_winner || 0), 0),
    filteredGames: filteredGamesForOverview
  };

  // Summary for all games (unfiltered) for charts and details
  const summaryForAll: SummaryData = {
    totalTicketsSold: games.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.tickets_sold, 0), 0),
    totalSales: games.reduce((sum, game) => sum + game.total_sales, 0),
    totalDistributions: games.reduce((sum, game) => sum + game.total_payouts, 0),
    totalExpenses: games.reduce((sum, game) => sum + game.total_expenses, 0),
    totalDonations: games.reduce((sum, game) => sum + game.total_donations, 0),
    organizationTotalPortion: games.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.organization_total, 0), 0),
    jackpotTotalPortion: games.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.jackpot_total, 0), 0),
    organizationNetProfit: games.reduce((sum, game) => sum + game.organization_net_profit, 0),
    totalActualOrganizationNetProfit: games.reduce((sum, game) => sum + (game.actual_organization_net_profit || 0), 0),
    totalJackpotContributions: games.reduce((sum, game) => sum + (game.total_jackpot_contributions || 0), 0),
    totalContributionsToNextGame: games.reduce((sum, game) => sum + (game.jackpot_contribution_to_next_game || 0), 0),
    totalWeeklyPayoutsDistributed: games.reduce((sum, game) => sum + (game.weekly_payouts_distributed || 0), 0),
    totalNetAvailableForFinalWinner: games.reduce((sum, game) => sum + (game.net_available_for_final_winner || 0), 0),
    filteredGames: games
  };
  const validateGameTotals = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    const ticketSales = game.ticket_sales.map(sale => ({
      amount_collected: sale.amount_collected,
      organization_total: sale.organization_total,
      jackpot_total: sale.jackpot_total
    }));
    const expenses = game.expenses.map(expense => ({
      amount: expense.amount,
      is_donation: expense.is_donation
    }));
    const payouts = game.weeks.map(week => ({
      weekly_payout: week.weekly_payout
    }));
    validateGame(ticketSales, expenses, payouts);
  };

  const downloadWeeklyPerformancePDF = async (game: GameSummary) => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      
      // Header information
      const startDate = formatDateStringForDisplay(game.start_date);
      const endDate = game.end_date ? formatDateStringForDisplay(game.end_date) : 'Ongoing';
      const numberOfWeeks = game.weeks.length;
      
      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Weekly Performance Report', 20, 20);
      
      // Game information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Game: ${game.name}`, 20, 35);
      doc.text(`Period: ${startDate} - ${endDate}`, 20, 45);
      doc.text(`Number of Weeks: ${numberOfWeeks}`, 20, 55);
      
      // Prepare table data
      const tableHeaders = ['Week', 'Period', 'Tickets Sold', 'Sales', 'Winner', 'Slot', 'Card', 'Distribution', 'Present'];
      
      const tableData = game.weeks.map((week: any) => {
        const weekTicketSales = game.ticket_sales.filter((sale: any) => sale.week_id === week.id);
        const weeklyTicketsFromSales = weekTicketSales.reduce((sum: number, sale: any) => sum + sale.tickets_sold, 0);
        const weeklySalesFromSales = weekTicketSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
        
        return [
          `Week ${week.week_number}`,
          `${formatDateStringForDisplay(week.start_date)} - ${formatDateStringForDisplay(week.end_date)}`,
          (weeklyTicketsFromSales || week.weekly_tickets_sold || 0).toLocaleString(),
          formatCurrency(weeklySalesFromSales || week.weekly_sales || 0),
          week.winner_name || 'No winner',
          week.slot_chosen ? `#${week.slot_chosen}` : '-',
          week.card_selected || '-',
          formatCurrency(week.weekly_payout),
          week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : '-'
        ];
      });
      
      // Add table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 70,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [31, 78, 74], // #1F4E4A
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [247, 248, 252] // #F7F8FC
        }
      });
      
      // Save the PDF
      doc.save(`${game.name}_Weekly_Performance.pdf`);
      toast.success('Weekly performance report downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF report');
    }
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#F7F8FC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F4E4A] font-inter">Income vs. Expense</h1>
          <p className="text-[#132E2C]/60 mt-1">Comprehensive financial analysis and reporting</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A] font-inter">Filters</CardTitle>
          <CardDescription>Customize your financial view</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            
            <Select value={filters.gameNumber} onValueChange={value => setFilters({
            ...filters,
            gameNumber: value
          })}>
              <SelectTrigger className="bg-white border-[#1F4E4A]/20">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#1F4E4A]/20 z-50">
                <SelectItem value="all">All Games</SelectItem>
                {games.map(game => <SelectItem key={game.id} value={game.id}>
                    {game.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            {games.length === 0 && <p className="text-xs text-[#132E2C]/60">Loading games...</p>}
            {games.length > 0 && <p className="text-xs text-[#132E2C]/60">{games.length} games available</p>}
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview - Filtered */}
      <FinancialOverview summary={summaryForOverview} formatCurrency={formatCurrency} />

      {/* Charts - All Games */}
      <FinancialCharts games={games} reportType="game" selectedGame="all" />

      {/* Expense-Donation Summary */}
      <ExpenseDonationSummary games={games} formatCurrency={formatCurrency} />

      {/* Games List */}
      <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A] font-inter">Game Details</CardTitle>
          <CardDescription>Detailed breakdown by game and week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {games.map(game => <Collapsible key={game.id} className="space-y-2">
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-[#1F4E4A]/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-[#1F4E4A]">{game.name}</h3>
                          <ChevronDown className="h-4 w-4 text-[#132E2C]/60" />
                        </div>
                        <div className="text-sm text-[#132E2C]/60">
                          <span>Start: {formatDateStringForDisplay(game.start_date)}</span>
                          {game.end_date && <span> | End: {formatDateStringForDisplay(game.end_date)}</span>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-center w-full sm:w-auto">
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Total Sales</div>
                          <div className="font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                          <div className="text-xs text-[#132E2C]/60 mt-1">
                            {game.ticket_sales.reduce((sum: number, sale: any) => sum + sale.tickets_sold, 0).toLocaleString()} tickets sold
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Jackpot Contributions</div>
                          <div className="font-bold text-orange-600">{formatCurrency(game.total_jackpot_contributions || 0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Winner Received</div>
                          <div className="font-bold text-blue-600">{formatCurrency(game.net_available_for_final_winner || 0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Expenses</div>
                          <div className="font-bold text-red-600">{formatCurrency(game.total_expenses)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Donations</div>
                          <div className="font-bold text-purple-600">{formatCurrency(game.total_donations)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Net Profit</div>
                          <div className="font-bold text-green-600">{formatCurrency(game.actual_organization_net_profit || game.organization_net_profit)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Carryover</div>
                          <div className="font-bold text-[#A1E96C]">{formatCurrency(game.carryover_jackpot)}</div>
                        </div>
                      </div>
                     </div>
                   </CardContent>
                 </Card>
               </CollapsibleTrigger>
               
               <CollapsibleContent className="space-y-6 p-4 bg-[#F7F8FC] rounded-lg">

                 {/* Weekly Performance Table */}
                 {game.weeks.length > 0 && <div className="bg-white rounded-lg shadow-sm p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-[#132E2C]">Weekly Performance</h4>
                        <Button
                          onClick={() => downloadWeeklyPerformancePDF(game)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-3 border-[#1F4E4A]/20 hover:bg-[#1F4E4A]/5"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download PDF
                        </Button>
                      </div>
                     <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#1F4E4A]/20">
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Week</th>
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Period</th>
                              <th className="text-center p-2 font-semibold text-[#132E2C]">Tickets Sold</th>
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Sales</th>
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Winner</th>
                              <th className="text-center p-2 font-semibold text-[#132E2C]">Slot</th>
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Card</th>
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Distribution</th>
                              <th className="text-left p-2 font-semibold text-[#132E2C]">Present</th>
                            </tr>
                          </thead>
                          <tbody>
                            {game.weeks.map((week: any) => {
                              // Calculate week totals from ticket sales for this week
                              const weekTicketSales = game.ticket_sales.filter((sale: any) => sale.week_id === week.id);
                              const weeklyTicketsFromSales = weekTicketSales.reduce((sum: number, sale: any) => sum + sale.tickets_sold, 0);
                              const weeklySalesFromSales = weekTicketSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
                              
                              return (
                                <tr key={week.id} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                                  <td className="p-2 font-medium text-[#1F4E4A]">Week {week.week_number}</td>
                                  <td className="p-2 text-sm">{formatDateStringForDisplay(week.start_date)} - {formatDateStringForDisplay(week.end_date)}</td>
                                  <td className="p-2 text-center font-medium">{weeklyTicketsFromSales.toLocaleString() || week.weekly_tickets_sold?.toLocaleString() || 0}</td>
                                  <td className="p-2 font-medium text-[#1F4E4A]">{formatCurrency(weeklySalesFromSales || week.weekly_sales || 0)}</td>
                                  <td className="p-2 font-medium">{week.winner_name || <span className="text-[#132E2C]/50">No winner</span>}</td>
                                  <td className="p-2 text-center font-medium">
                                    {week.slot_chosen ? <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                                        #{week.slot_chosen}
                                      </span> : <span className="text-[#132E2C]/50">-</span>}
                                  </td>
                                  <td className="p-2">
                                    {week.card_selected ? <span className={`px-2 py-1 rounded text-xs font-medium ${week.card_selected === "Queen of Hearts" ? "bg-[#A1E96C]/20 text-[#132E2C]" : "bg-gray-100 text-gray-800"}`}>
                                        {week.card_selected}
                                      </span> : <span className="text-[#132E2C]/50">-</span>}
                                  </td>
                                  <td className="p-2 font-medium text-[#1F4E4A]">{formatCurrency(week.weekly_payout)}</td>
                                  <td className="p-2">
                                    {week.winner_present !== null ? <span className={`px-2 py-1 rounded text-xs font-medium ${week.winner_present ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                        {week.winner_present ? 'Yes' : 'No'}
                                      </span> : <span className="text-[#132E2C]/50">-</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                       </table>
                     </div>
                   </div>}

                 {/* Expenses & Donations Table */}
                 {game.expenses.length > 0 && <div className="bg-white rounded-lg shadow-sm p-4">
                     <h4 className="text-sm font-semibold mb-3 text-[#132E2C]">Expenses & Donations</h4>
                     <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                         <thead>
                           <tr className="border-b border-[#1F4E4A]/20">
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Date</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Type</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Amount</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Description</th>
                           </tr>
                         </thead>
                         <tbody>
                           {game.expenses.map((expense: any) => <tr key={expense.id} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                               <td className="p-2 font-medium text-[#132E2C]">{formatDateStringForDisplay(expense.date)}</td>
                               <td className="p-2">
                                 <span className={`px-2 py-1 rounded text-xs font-medium ${expense.is_donation ? "bg-purple-100 text-purple-800" : "bg-red-100 text-red-800"}`}>
                                   {expense.is_donation ? 'Donation' : 'Expense'}
                                 </span>
                               </td>
                               <td className={`p-2 font-medium ${expense.is_donation ? 'text-purple-600' : 'text-red-600'}`}>
                                 {formatCurrency(expense.amount)}
                               </td>
                               <td className="p-2 text-[#132E2C]/80">{expense.memo || <span className="text-[#132E2C]/50">No description</span>}</td>
                             </tr>)}
                         </tbody>
                       </table>
                     </div>
                   </div>}
               </CollapsibleContent>
            </Collapsible>)}
          
          {games.length === 0 && <div className="text-center py-8 text-[#132E2C]/60">
              No games found.
            </div>}
        </CardContent>
      </Card>

      {/* Modals */}
      <ExpenseModal open={showExpenseModal} onOpenChange={setShowExpenseModal} gameId={selectedGameForExpense || ""} gameName={selectedGameForExpense ? games.find(g => g.id === selectedGameForExpense)?.name || "" : ""} />

      <DonationModal open={showDonationModal} onOpenChange={setShowDonationModal} gameId={selectedGameForDonation || ""} gameName={selectedGameForDonation ? games.find(g => g.id === selectedGameForDonation)?.name || "" : ""} />

      <CalculationAuditModal open={showAuditModal} onOpenChange={setShowAuditModal} />
    </div>;
}