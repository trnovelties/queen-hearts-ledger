
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
  filteredGames: any[];
}

interface Filters {
  gameNumber: string;
  startDate: string;
  endDate: string;
  reportType: "weekly" | "game" | "cumulative";
}

export default function IncomeExpense() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [filteredGames, setFilteredGames] = useState<GameSummary[]>([]);
  const [filters, setFilters] = useState<Filters>({
    gameNumber: "all",
    startDate: "",
    endDate: "",
    reportType: "weekly",
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedGameForExpense, setSelectedGameForExpense] = useState<string | null>(null);
  const [selectedGameForDonation, setSelectedGameForDonation] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const { validateGame } = useCalculationValidation();

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [games, filters]);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          weeks (*),
          ticket_sales (*),
          expenses (*)
        `)
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

          return {
            ...game,
            total_sales: totalSales,
            total_payouts: totalPayouts,
            total_expenses: totalExpenses,
            total_donations: totalDonations,
            organization_net_profit: organizationNetProfit
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

    if (filters.startDate) {
      filtered = filtered.filter((game) => game.start_date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((game) => game.start_date <= filters.endDate);
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAuditModal(true)}
            className="border-[#1F4E4A]/20 text-[#1F4E4A] hover:bg-[#1F4E4A]/10"
          >
            <Clock className="h-4 w-4 mr-2" />
            Audit Trail
          </Button>
          <Button 
            onClick={handleExportPDF}
            className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A] font-inter">Filters</CardTitle>
          <CardDescription>Customize your financial view</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            <Label htmlFor="startDate" className="text-sm font-semibold text-[#132E2C]">Start Date</Label>
            <Input
              type="date"
              id="startDate"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm font-semibold text-[#132E2C]">End Date</Label>
            <Input
              type="date"
              id="endDate"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType" className="text-sm font-semibold text-[#132E2C]">Report Type</Label>
            <Select value={filters.reportType} onValueChange={(value) => setFilters({ ...filters, reportType: value as "weekly" | "game" | "cumulative" })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="game">Game</SelectItem>
                <SelectItem value="cumulative">Cumulative</SelectItem>
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
        reportType={filters.reportType}
        selectedGame={filters.gameNumber}
      />

      {/* Games List */}
      <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-[#1F4E4A] font-inter">Game Details</CardTitle>
              <CardDescription>Detailed breakdown by game and week</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setSelectedGameForExpense(filters.gameNumber === "all" ? null : filters.gameNumber);
                  setShowExpenseModal(true);
                }}
                size="sm"
                className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
              <Button 
                onClick={() => {
                  setSelectedGameForDonation(filters.gameNumber === "all" ? null : filters.gameNumber);
                  setShowDonationModal(true);
                }}
                size="sm"
                variant="outline"
                className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Donation
              </Button>
            </div>
          </div>
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
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center w-full sm:w-auto">
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Total Sales</div>
                          <div className="font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Payouts</div>
                          <div className="font-bold text-orange-600">{formatCurrency(game.total_payouts)}</div>
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
                          <div className="font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#132E2C]/60">Carryover</div>
                          <div className="font-bold text-[#A1E96C]">{formatCurrency(game.carryover_jackpot)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-[#1F4E4A]/10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          validateGameTotals(game.id);
                        }}
                        className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/10"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Validate Calculations
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4">
                <DetailedFinancialTable games={[game]} formatCurrency={formatCurrency} />
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
