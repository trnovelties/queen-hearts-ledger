
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronDown, ChevronRight, Download, Plus } from "lucide-react";
import { ExpenseModal } from "@/components/ExpenseModal";

const IncomeExpense = () => {
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reportType, setReportType] = useState<string>("cumulative");
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expenseModalOpen, setExpenseModalOpen] = useState<{open: boolean, gameId: string, gameName: string}>({
    open: false,
    gameId: '',
    gameName: ''
  });

  // Format currency helper function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Fetch all data
  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: weeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .order('week_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: ticketSales } = useQuery({
    queryKey: ['ticket_sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Filter data based on selections
  const filteredData = useMemo(() => {
    if (!games || !weeks || !ticketSales || !expenses) return null;

    let filteredGames = games;
    let filteredWeeks = weeks;
    let filteredTicketSales = ticketSales;
    let filteredExpenses = expenses;

    // Filter by game
    if (selectedGame !== "all") {
      filteredGames = games.filter(game => game.id === selectedGame);
      filteredWeeks = weeks.filter(week => week.game_id === selectedGame);
      filteredTicketSales = ticketSales.filter(sale => sale.game_id === selectedGame);
      filteredExpenses = expenses.filter(expense => expense.game_id === selectedGame);
    }

    // Filter by date range
    if (dateRange.start && dateRange.end) {
      filteredWeeks = filteredWeeks.filter(week => 
        week.start_date >= dateRange.start && week.end_date <= dateRange.end
      );
      filteredTicketSales = filteredTicketSales.filter(sale => 
        sale.date >= dateRange.start && sale.date <= dateRange.end
      );
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.date >= dateRange.start && expense.date <= dateRange.end
      );
    }

    return {
      games: filteredGames,
      weeks: filteredWeeks,
      ticketSales: filteredTicketSales,
      expenses: filteredExpenses,
    };
  }, [games, weeks, ticketSales, expenses, selectedGame, dateRange]);

  // Calculate cumulative totals
  const cumulativeTotals = useMemo(() => {
    if (!filteredData) return null;

    const totalSales = filteredData.ticketSales.reduce((sum, sale) => sum + sale.amount_collected, 0);
    const totalPayouts = filteredData.weeks.reduce((sum, week) => sum + (week.weekly_payout || 0), 0);
    const totalExpenses = filteredData.expenses.filter(exp => !exp.is_donation).reduce((sum, exp) => sum + exp.amount, 0);
    const totalDonations = filteredData.expenses.filter(exp => exp.is_donation).reduce((sum, exp) => sum + exp.amount, 0);
    
    // Calculate organization portions
    const organizationPortionTotal = filteredData.ticketSales.reduce((sum, sale) => sum + (sale.organization_total || 0), 0);
    const jackpotPortionTotal = filteredData.ticketSales.reduce((sum, sale) => sum + (sale.jackpot_total || 0), 0);
    const organizationNetProfit = organizationPortionTotal - totalExpenses - totalDonations;

    return {
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      organizationPortionTotal,
      jackpotPortionTotal,
      organizationNetProfit,
    };
  }, [filteredData]);

  // Chart data
  const chartData = useMemo(() => {
    if (!filteredData || !cumulativeTotals) return [];

    return [
      {
        name: 'Financial Summary',
        Sales: cumulativeTotals.totalSales,
        Payouts: cumulativeTotals.totalPayouts,
        Expenses: cumulativeTotals.totalExpenses,
        Donations: cumulativeTotals.totalDonations,
      },
    ];
  }, [filteredData, cumulativeTotals]);

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const getWeeksForGame = (gameId: string) => {
    return filteredData?.weeks.filter(week => week.game_id === gameId) || [];
  };

  const getExpensesForGame = (gameId: string) => {
    return filteredData?.expenses.filter(expense => expense.game_id === gameId) || [];
  };

  if (!filteredData || !cumulativeTotals) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Income vs. Expense</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button 
            onClick={() => setExpenseModalOpen({
              open: true,
              gameId: selectedGame !== "all" ? selectedGame : "",
              gameName: selectedGame !== "all" ? (games?.find(g => g.id === selectedGame)?.name || "") : "All Games"
            })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense/Donation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="gameSelect">Game Number</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games?.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="game">Game</SelectItem>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Tickets Sold:</span>
              <span>{filteredData.ticketSales.reduce((sum, sale) => sum + sale.tickets_sold, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket Sales:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Payouts:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalPayouts)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Expenses:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Donated:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalDonations)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payout Portion Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Portion Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Sales (60% portion):</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.jackpotPortionTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Payouts:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalPayouts)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Organization Portion Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Portion Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Sales (40% portion):</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.organizationPortionTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Expenses:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Donations:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.totalDonations)}</span>
            </div>
            <div className="flex justify-between">
              <span>Organization Net Profit:</span>
              <span className="font-semibold">{formatCurrency(cumulativeTotals.organizationNetProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="Sales" fill="#8884d8" />
              <Bar dataKey="Payouts" fill="#82ca9d" />
              <Bar dataKey="Expenses" fill="#ffc658" />
              <Bar dataKey="Donations" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Game Cards */}
      <div className="space-y-4">
        {filteredData.games.map((game) => {
          const gameWeeks = getWeeksForGame(game.id);
          const gameExpenses = getExpensesForGame(game.id);
          const isExpanded = expandedGames.has(game.id);

          return (
            <Card key={game.id} className="border shadow-sm">
              <Collapsible open={isExpanded} onOpenChange={() => toggleGameExpansion(game.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span>{game.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Start: {format(new Date(game.start_date), 'MMM dd, yyyy')}</span>
                        {game.end_date && <span>End: {format(new Date(game.end_date), 'MMM dd, yyyy')}</span>}
                        <span>Sales: {formatCurrency(game.total_sales)}</span>
                        <span>Payouts: {formatCurrency(game.total_payouts)}</span>
                        <span>Net: {formatCurrency(game.organization_net_profit)}</span>
                        <span>Carryover: {formatCurrency(game.carryover_jackpot)}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Weeks Table */}
                    <div>
                      <h4 className="font-medium mb-2">Weeks</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-2 py-1">Week</th>
                              <th className="border border-gray-300 px-2 py-1">Start Date</th>
                              <th className="border border-gray-300 px-2 py-1">End Date</th>
                              <th className="border border-gray-300 px-2 py-1">Tickets Sold</th>
                              <th className="border border-gray-300 px-2 py-1">Weekly Sales</th>
                              <th className="border border-gray-300 px-2 py-1">Organization Portion</th>
                              <th className="border border-gray-300 px-2 py-1">Jackpot Portion</th>
                              <th className="border border-gray-300 px-2 py-1">Weekly Payout</th>
                              <th className="border border-gray-300 px-2 py-1">Winner Name</th>
                              <th className="border border-gray-300 px-2 py-1">Slot</th>
                              <th className="border border-gray-300 px-2 py-1">Card</th>
                              <th className="border border-gray-300 px-2 py-1">Present</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameWeeks.map((week) => (
                              <tr key={week.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-2 py-1">{week.week_number}</td>
                                <td className="border border-gray-300 px-2 py-1">{format(new Date(week.start_date), 'MMM dd, yyyy')}</td>
                                <td className="border border-gray-300 px-2 py-1">{format(new Date(week.end_date), 'MMM dd, yyyy')}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.weekly_tickets_sold}</td>
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_sales)}</td>
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_sales * 0.4)}</td>
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_sales * 0.6)}</td>
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_payout)}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.winner_name || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.slot_chosen || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.card_selected || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.winner_present ? 'Yes' : 'No'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Expenses Table */}
                    <div>
                      <h4 className="font-medium mb-2">Expenses & Donations</h4>
                      {gameExpenses.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-2 py-1">Date</th>
                                <th className="border border-gray-300 px-2 py-1">Amount</th>
                                <th className="border border-gray-300 px-2 py-1">Memo</th>
                                <th className="border border-gray-300 px-2 py-1">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gameExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-2 py-1">{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                                  <td className="border border-gray-300 px-2 py-1">{formatCurrency(expense.amount)}</td>
                                  <td className="border border-gray-300 px-2 py-1">{expense.memo}</td>
                                  <td className="border border-gray-300 px-2 py-1">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      expense.is_donation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {expense.is_donation ? 'Donation' : 'Expense'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No expenses recorded</p>
                      )}
                    </div>

                    {/* Game Summary */}
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="font-medium mb-2">Game Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div><strong>Total Sales:</strong> {formatCurrency(game.total_sales)}</div>
                        <div><strong>Total Payouts:</strong> {formatCurrency(game.total_payouts)}</div>
                        <div><strong>Total Expenses:</strong> {formatCurrency(game.total_expenses)}</div>
                        <div><strong>Total Donations:</strong> {formatCurrency(game.total_donations)}</div>
                        <div><strong>Organization Net Profit:</strong> {formatCurrency(game.organization_net_profit)}</div>
                        <div><strong>Carryover Jackpot:</strong> {formatCurrency(game.carryover_jackpot)}</div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      <ExpenseModal 
        open={expenseModalOpen.open}
        onOpenChange={(open) => setExpenseModalOpen(prev => ({...prev, open}))}
        gameId={expenseModalOpen.gameId}
        gameName={expenseModalOpen.gameName}
      />
    </div>
  );
};

export default IncomeExpense;
