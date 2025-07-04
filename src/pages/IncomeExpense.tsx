
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, FileDown, Settings, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { FinancialOverview } from "@/components/FinancialOverview";
import { FinancialCharts } from "@/components/FinancialCharts";
import { DetailedFinancialTable } from "@/components/DetailedFinancialTable";
import { ExpenseModal } from "@/components/ExpenseModal";
import { DonationModal } from "@/components/DonationModal";
import { CalculationAuditModal } from "@/components/CalculationAuditModal";
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
  timePeriod: "7D" | "30D" | "365D" | "all";
}

export default function IncomeExpense() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [filteredGames, setFilteredGames] = useState<GameSummary[]>([]);
  const [filters, setFilters] = useState<Filters>({
    gameNumber: "all",
    timePeriod: "all",
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedGameForExpense, setSelectedGameForExpense] = useState<string | null>(null);
  const [selectedGameForDonation, setSelectedGameForDonation] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const { validateGame } = useCalculationValidation();
  const { user } = useAuth();

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [games, filters]);

  const fetchGames = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          weeks (*),
          ticket_sales (*),
          expenses (*)
        `)
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

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

  const applyFilters = () => {
    let filtered = [...games];

    if (filters.gameNumber !== "all") {
      filtered = filtered.filter((game) => game.id === filters.gameNumber);
    }

    // Apply time period filter
    if (filters.timePeriod !== "all") {
      const currentDate = new Date();
      let cutoffDate: Date;
      
      switch (filters.timePeriod) {
        case "7D":
          cutoffDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30D":
          cutoffDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "365D":
          cutoffDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter((game) => new Date(game.start_date) >= cutoffDate);
    }

    setFilteredGames(filtered);
  };

  const handleExportPDF = () => {
    toast.info("Exporting PDF functionality coming soon!");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const summary: SummaryData = {
    totalTicketsSold: filteredGames.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.tickets_sold, 0), 0),
    totalSales: filteredGames.reduce((sum, game) => sum + game.total_sales, 0),
    totalDistributions: filteredGames.reduce((sum, game) => sum + game.total_payouts, 0),
    totalExpenses: filteredGames.reduce((sum, game) => sum + game.total_expenses, 0),
    totalDonations: filteredGames.reduce((sum, game) => sum + game.total_donations, 0),
    organizationTotalPortion: filteredGames.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.organization_total, 0), 0),
    jackpotTotalPortion: filteredGames.reduce((sum, game) => sum + game.ticket_sales.reduce((weekSum: number, ticketSale: any) => weekSum + ticketSale.jackpot_total, 0), 0),
    organizationNetProfit: filteredGames.reduce((sum, game) => sum + game.organization_net_profit, 0),
    totalActualOrganizationNetProfit: filteredGames.reduce((sum, game) => sum + (game.actual_organization_net_profit || 0), 0),
    totalJackpotContributions: filteredGames.reduce((sum, game) => sum + (game.total_jackpot_contributions || 0), 0),
    totalContributionsToNextGame: filteredGames.reduce((sum, game) => sum + (game.jackpot_contribution_to_next_game || 0), 0),
    totalWeeklyPayoutsDistributed: filteredGames.reduce((sum, game) => sum + (game.weekly_payouts_distributed || 0), 0),
    totalNetAvailableForFinalWinner: filteredGames.reduce((sum, game) => sum + (game.net_available_for_final_winner || 0), 0),
    filteredGames: filteredGames
  };

  const validateGameTotals = (gameId: string) => {
    const game = filteredGames.find(g => g.id === gameId);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#F7F8FC] min-h-screen">
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
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gameNumber" className="text-sm font-semibold text-[#132E2C]">Game Number</Label>
            <Select value={filters.gameNumber} onValueChange={(value) => setFilters({ ...filters, gameNumber: value })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id}>
                    {game.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timePeriod" className="text-sm font-semibold text-[#132E2C]">Time Period</Label>
            <Select value={filters.timePeriod} onValueChange={(value) => setFilters({ ...filters, timePeriod: value as "7D" | "30D" | "365D" | "all" })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7D">Last 7 Days</SelectItem>
                <SelectItem value="30D">Last 30 Days</SelectItem>
                <SelectItem value="365D">Last 365 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <FinancialOverview 
        summary={summary} 
        formatCurrency={formatCurrency}
      />

      {/* Charts */}
      <FinancialCharts 
        games={filteredGames} 
        reportType="game"
        selectedGame={filters.gameNumber}
      />

      {/* Games List */}
      <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A] font-inter">Game Details</CardTitle>
          <CardDescription>Detailed breakdown by game and week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredGames.map((game) => (
            <Collapsible key={game.id} className="space-y-2">
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
                          {game.end_date && (
                            <span> | End: {formatDateStringForDisplay(game.end_date)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-center w-full sm:w-auto">
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Total Sales</div>
                          <div className="font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
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
                 {game.weeks.length > 0 && (
                   <div className="bg-white rounded-lg shadow-sm p-4">
                     <h4 className="text-sm font-semibold mb-3 text-[#132E2C]">Weekly Performance</h4>
                     <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                         <thead>
                           <tr className="border-b border-[#1F4E4A]/20">
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Week</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Period</th>
                             <th className="text-center p-2 font-semibold text-[#132E2C]">Tickets Sold</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Sales</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Winner</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Card</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Distribution</th>
                             <th className="text-left p-2 font-semibold text-[#132E2C]">Present</th>
                           </tr>
                         </thead>
                         <tbody>
                           {game.weeks.map((week: any) => (
                             <tr key={week.id} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                               <td className="p-2 font-medium text-[#1F4E4A]">Week {week.week_number}</td>
                               <td className="p-2 text-sm">{formatDateStringForDisplay(week.start_date)} - {formatDateStringForDisplay(week.end_date)}</td>
                               <td className="p-2 text-center font-medium">{week.weekly_tickets_sold?.toLocaleString() || 0}</td>
                               <td className="p-2 font-medium text-[#1F4E4A]">{formatCurrency(week.weekly_sales)}</td>
                               <td className="p-2 font-medium">{week.winner_name || <span className="text-[#132E2C]/50">No winner</span>}</td>
                               <td className="p-2">
                                 {week.card_selected ? (
                                   <span className={`px-2 py-1 rounded text-xs font-medium ${
                                     week.card_selected === "Queen of Hearts" ? 
                                     "bg-[#A1E96C]/20 text-[#132E2C]" : 
                                     "bg-gray-100 text-gray-800"
                                   }`}>
                                     {week.card_selected}
                                   </span>
                                 ) : (
                                   <span className="text-[#132E2C]/50">-</span>
                                 )}
                               </td>
                               <td className="p-2 font-medium text-[#1F4E4A]">{formatCurrency(week.weekly_payout)}</td>
                               <td className="p-2">
                                 {week.winner_present !== null ? (
                                   <span className={`px-2 py-1 rounded text-xs font-medium ${
                                     week.winner_present ? 
                                     "bg-green-100 text-green-800" : 
                                     "bg-red-100 text-red-800"
                                   }`}>
                                     {week.winner_present ? 'Yes' : 'No'}
                                   </span>
                                 ) : (
                                   <span className="text-[#132E2C]/50">-</span>
                                 )}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}

                 {/* Expenses & Donations Table */}
                 {game.expenses.length > 0 && (
                   <div className="bg-white rounded-lg shadow-sm p-4">
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
                           {game.expenses.map((expense: any) => (
                             <tr key={expense.id} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                               <td className="p-2 font-medium text-[#132E2C]">{formatDateStringForDisplay(expense.date)}</td>
                               <td className="p-2">
                                 <span className={`px-2 py-1 rounded text-xs font-medium ${
                                   expense.is_donation ? 
                                   "bg-purple-100 text-purple-800" : 
                                   "bg-red-100 text-red-800"
                                 }`}>
                                   {expense.is_donation ? 'Donation' : 'Expense'}
                                 </span>
                               </td>
                               <td className={`p-2 font-medium ${expense.is_donation ? 'text-purple-600' : 'text-red-600'}`}>
                                 {formatCurrency(expense.amount)}
                               </td>
                               <td className="p-2 text-[#132E2C]/80">{expense.memo || <span className="text-[#132E2C]/50">No description</span>}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
               </CollapsibleContent>
            </Collapsible>
          ))}
          
          {filteredGames.length === 0 && (
            <div className="text-center py-8 text-[#132E2C]/60">
              No games found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        gameId={selectedGameForExpense || ""}
        gameName={selectedGameForExpense ? games.find(g => g.id === selectedGameForExpense)?.name || "" : ""}
      />

      <DonationModal
        open={showDonationModal}
        onOpenChange={setShowDonationModal}
        gameId={selectedGameForDonation || ""}
        gameName={selectedGameForDonation ? games.find(g => g.id === selectedGameForDonation)?.name || "" : ""}
      />

      <CalculationAuditModal
        open={showAuditModal}
        onOpenChange={setShowAuditModal}
      />
    </div>
  );
}
