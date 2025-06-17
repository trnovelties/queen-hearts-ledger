
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Download, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ExpenseModal } from "@/components/ExpenseModal";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const IncomeExpense = () => {
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportType, setReportType] = useState<string>("cumulative");
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [showExpenseModal, setShowExpenseModal] = useState<string | null>(null);

  // Fetch all data
  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: true });
      
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
    return weeks?.filter(week => week.game_id === gameId) || [];
  };

  const getExpensesForGame = (gameId: string) => {
    return expenses?.filter(expense => expense.game_id === gameId) || [];
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!games || !ticketSales || !expenses) {
      return {
        totalTicketsSold: 0,
        totalSales: 0,
        totalPayouts: 0,
        totalExpenses: 0,
        totalDonations: 0,
        payoutPortionTotal: 0,
        organizationPortionTotal: 0,
        organizationNetProfit: 0
      };
    }

    const filteredGames = selectedGame === "all" ? games : games.filter(g => g.id === selectedGame);
    
    const totalSales = filteredGames.reduce((sum, game) => sum + game.total_sales, 0);
    const totalPayouts = filteredGames.reduce((sum, game) => sum + game.total_payouts, 0);
    const totalExpenses = filteredGames.reduce((sum, game) => sum + game.total_expenses, 0);
    const totalDonations = filteredGames.reduce((sum, game) => sum + game.total_donations, 0);
    
    // Calculate portions based on average percentages
    const avgJackpotPercentage = filteredGames.length > 0 
      ? filteredGames.reduce((sum, game) => sum + game.jackpot_percentage, 0) / filteredGames.length
      : 60;
    const avgOrgPercentage = 100 - avgJackpotPercentage;
    
    const payoutPortionTotal = totalSales * (avgJackpotPercentage / 100);
    const organizationPortionTotal = totalSales * (avgOrgPercentage / 100);
    const organizationNetProfit = organizationPortionTotal - totalExpenses - totalDonations;

    // Calculate total tickets sold
    const gameTicketSales = ticketSales.filter(sale => 
      selectedGame === "all" || filteredGames.some(game => game.id === sale.game_id)
    );
    const totalTicketsSold = gameTicketSales.reduce((sum, sale) => sum + sale.tickets_sold, 0);

    return {
      totalTicketsSold,
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      payoutPortionTotal,
      organizationPortionTotal,
      organizationNetProfit
    };
  };

  const totals = calculateTotals();

  // Prepare chart data
  const chartData = [
    {
      name: 'Financial Overview',
      'Ticket Sales': totals.totalSales,
      'Total Payouts': totals.totalPayouts,
      'Total Expenses': totals.totalExpenses,
      'Total Donations': totals.totalDonations,
    }
  ];

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export PDF functionality to be implemented');
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Income vs. Expense</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameFilter">Game Number</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger id="gameFilter">
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

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="reportType">
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

          <div className="flex space-x-2 mt-4">
            <Button onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Three-Column Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Tickets Sold:</span>
              <span className="font-medium">{totals.totalTicketsSold.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket Sales:</span>
              <span className="font-medium">{formatCurrency(totals.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Payouts:</span>
              <span className="font-medium">{formatCurrency(totals.totalPayouts)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Expenses:</span>
              <span className="font-medium">{formatCurrency(totals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Donated:</span>
              <span className="font-medium">{formatCurrency(totals.totalDonations)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payout Portion Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Portion Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Sales (60% portion):</span>
              <span className="font-medium">{formatCurrency(totals.payoutPortionTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Payouts:</span>
              <span className="font-medium">{formatCurrency(totals.totalPayouts)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Organization Portion Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Portion Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Sales (40% portion):</span>
              <span className="font-medium">{formatCurrency(totals.organizationPortionTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Expenses:</span>
              <span className="font-medium">{formatCurrency(totals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Donations:</span>
              <span className="font-medium">{formatCurrency(totals.totalDonations)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Organization Net Profit:</span>
              <span className="font-bold">{formatCurrency(totals.organizationNetProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="Ticket Sales" fill="#8884d8" />
              <Bar dataKey="Total Payouts" fill="#82ca9d" />
              <Bar dataKey="Total Expenses" fill="#ffc658" />
              <Bar dataKey="Total Donations" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Game Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Game Details</h2>
        </div>

        {games?.map((game) => {
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
                        <span>Expenses: {formatCurrency(game.total_expenses)}</span>
                        <span>Donations: {formatCurrency(game.total_donations)}</span>
                        <span>Net: {formatCurrency(game.organization_net_profit)}</span>
                        <span>Carryover: {formatCurrency(game.carryover_jackpot)}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Weeks Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Weeks Table</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-2 py-1 text-left">Week</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Start Date</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">End Date</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Tickets Sold</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Weekly Sales</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Org Portion</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Jackpot Portion</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Weekly Payout</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Winner Name</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Slot</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Card</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Present</th>
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
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_sales * (game.organization_percentage / 100))}</td>
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_sales * (game.jackpot_percentage / 100))}</td>
                                <td className="border border-gray-300 px-2 py-1">{formatCurrency(week.weekly_payout)}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.winner_name || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.slot_chosen || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.card_selected || '-'}</td>
                                <td className="border border-gray-300 px-2 py-1">{week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Expenses Table */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold">Expenses Table</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowExpenseModal(game.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Expense/Donation
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-2 py-1 text-left">Date</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Amount</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Memo</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Type</th>
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
                    </div>

                    {/* Game Summary */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Game Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Total Sales</div>
                          <div className="font-medium">{formatCurrency(game.total_sales)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Total Payouts</div>
                          <div className="font-medium">{formatCurrency(game.total_payouts)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Total Expenses</div>
                          <div className="font-medium">{formatCurrency(game.total_expenses)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Total Donations</div>
                          <div className="font-medium">{formatCurrency(game.total_donations)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Org Net Profit</div>
                          <div className="font-medium">{formatCurrency(game.organization_net_profit)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Carryover Jackpot</div>
                          <div className="font-medium">{formatCurrency(game.carryover_jackpot)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          open={!!showExpenseModal}
          onOpenChange={() => setShowExpenseModal(null)}
          gameId={showExpenseModal}
          gameName={games?.find(g => g.id === showExpenseModal)?.name || ''}
        />
      )}
    </div>
  );
};

export default IncomeExpense;
