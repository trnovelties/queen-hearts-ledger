import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Plus, Download } from "lucide-react";
import { ExpenseModal } from "@/components/ExpenseModal";
import jsPDF from "jspdf";

const IncomeExpense = () => {
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportType, setReportType] = useState<string>("cumulative");
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedGameForExpense, setSelectedGameForExpense] = useState<string>('');
  const [selectedGameNameForExpense, setSelectedGameNameForExpense] = useState<string>('');

  // Fetch games
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

  // Fetch weeks
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

  // Fetch ticket sales
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

  // Fetch expenses
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

  // Calculate totals
  const overallTotals = useMemo(() => {
    if (!games || !ticketSales || !expenses) return null;
    
    const gameIds = games.map(g => g.id);
    const filteredTicketSales = ticketSales.filter(ts => gameIds.includes(ts.game_id));
    const filteredExpenses = expenses.filter(e => gameIds.includes(e.game_id));
    
    const totalTicketsSold = filteredTicketSales.reduce((sum, ts) => sum + ts.tickets_sold, 0);
    const totalSales = filteredTicketSales.reduce((sum, ts) => sum + ts.amount_collected, 0);
    const totalPayouts = games.reduce((sum, g) => sum + g.total_payouts, 0);
    const totalExpenses = filteredExpenses.filter(e => !e.is_donation).reduce((sum, e) => sum + e.amount, 0);
    const totalDonations = filteredExpenses.filter(e => e.is_donation).reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalTicketsSold,
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
    };
  }, [games, ticketSales, expenses]);

  // Calculate payout portion allocation
  const payoutPortionAllocation = useMemo(() => {
    if (!overallTotals || !games) return null;
    
    const jackpotPercentage = games[0]?.jackpot_percentage || 60;
    const payoutPortionTotal = overallTotals.totalSales * (jackpotPercentage / 100);
    
    return {
      payoutPortionTotal,
      totalPayouts: overallTotals.totalPayouts,
    };
  }, [overallTotals, games]);

  // Calculate organization portion allocation
  const organizationPortionAllocation = useMemo(() => {
    if (!overallTotals || !games) return null;
    
    const organizationPercentage = games[0]?.organization_percentage || 40;
    const organizationPortionTotal = overallTotals.totalSales * (organizationPercentage / 100);
    const organizationNetProfit = organizationPortionTotal - overallTotals.totalExpenses - overallTotals.totalDonations;
    
    return {
      organizationPortionTotal,
      totalExpenses: overallTotals.totalExpenses,
      totalDonations: overallTotals.totalDonations,
      organizationNetProfit,
    };
  }, [overallTotals, games]);

  // Quick date filters
  const setQuickDateFilter = (period: string) => {
    const today = new Date();
    let start = new Date();
    
    switch (period) {
      case "7d":
        start.setDate(today.getDate() - 7);
        break;
      case "30d":
        start.setDate(today.getDate() - 30);
        break;
      case "90d":
        start.setDate(today.getDate() - 90);
        break;
      case "1y":
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        setStartDate("");
        setEndDate("");
        return;
    }
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };
  
  // Toggle game expansion
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

  // Get weeks for a game
  const getWeeksForGame = (gameId: string) => {
    return weeks?.filter(week => week.game_id === gameId) || [];
  };

  // Get expenses for a game
  const getExpensesForGame = (gameId: string) => {
    return expenses?.filter(expense => expense.game_id === gameId) || [];
  };

  // Open expense modal
  const handleOpenExpenseModal = (gameId: string, gameName: string) => {
    setSelectedGameForExpense(gameId);
    setSelectedGameNameForExpense(gameName);
    setShowExpenseModal(true);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Income vs. Expense Report', 20, 20);
    
    // Add date range
    doc.setFontSize(12);
    if (startDate && endDate) {
      doc.text(`Date Range: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`, 20, 35);
    }
    
    // Add overall totals
    if (overallTotals) {
      let yPos = 50;
      doc.setFontSize(14);
      doc.text('Overall Totals', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(11);
      doc.text(`Total Tickets Sold: ${overallTotals.totalTicketsSold.toLocaleString()}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Sales: ${formatCurrency(overallTotals.totalSales)}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Payouts: ${formatCurrency(overallTotals.totalPayouts)}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Expenses: ${formatCurrency(overallTotals.totalExpenses)}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Donations: ${formatCurrency(overallTotals.totalDonations)}`, 20, yPos);
    }
    
    // Save the PDF
    doc.save(`income-expense-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Income vs. Expense</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleOpenExpenseModal('', 'General')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense/Donation
          </Button>
          <Button onClick={exportToPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gameSelect">Game Number</Label>
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger id="gameSelect">
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
        </CardContent>
      </Card>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overallTotals && (
              <>
                <div className="flex justify-between">
                  <span>Tickets Sold:</span>
                  <span className="font-medium">{overallTotals.totalTicketsSold.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ticket Sales:</span>
                  <span className="font-medium">{formatCurrency(overallTotals.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Payouts:</span>
                  <span className="font-medium">{formatCurrency(overallTotals.totalPayouts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-medium">{formatCurrency(overallTotals.totalExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Donated:</span>
                  <span className="font-medium">{formatCurrency(overallTotals.totalDonations)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payout Portion Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Portion Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payoutPortionAllocation && (
              <>
                <div className="flex justify-between">
                  <span>Total Sales (60% portion):</span>
                  <span className="font-medium">{formatCurrency(payoutPortionAllocation.payoutPortionTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Payouts:</span>
                  <span className="font-medium">{formatCurrency(payoutPortionAllocation.totalPayouts)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Organization Portion Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Portion Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizationPortionAllocation && (
              <>
                <div className="flex justify-between">
                  <span>Total Sales (40% portion):</span>
                  <span className="font-medium">{formatCurrency(organizationPortionAllocation.organizationPortionTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-medium">{formatCurrency(organizationPortionAllocation.totalExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Donations:</span>
                  <span className="font-medium">{formatCurrency(organizationPortionAllocation.totalDonations)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Organization Net Profit:</span>
                  <span className="font-medium">{formatCurrency(organizationPortionAllocation.organizationNetProfit)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Game Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Game Details</h2>
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
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Weeks Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Weeks</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left border-b">Week</th>
                              <th className="px-4 py-2 text-left border-b">Start Date</th>
                              <th className="px-4 py-2 text-left border-b">End Date</th>
                              <th className="px-4 py-2 text-left border-b">Tickets Sold</th>
                              <th className="px-4 py-2 text-left border-b">Weekly Sales</th>
                              <th className="px-4 py-2 text-left border-b">Organization Portion</th>
                              <th className="px-4 py-2 text-left border-b">Jackpot Portion</th>
                              <th className="px-4 py-2 text-left border-b">Weekly Payout</th>
                              <th className="px-4 py-2 text-left border-b">Winner Name</th>
                              <th className="px-4 py-2 text-left border-b">Card Selected</th>
                              <th className="px-4 py-2 text-left border-b">Present</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameWeeks.map((week) => (
                              <tr key={week.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border-b">{week.week_number}</td>
                                <td className="px-4 py-2 border-b">{format(new Date(week.start_date), 'MMM dd, yyyy')}</td>
                                <td className="px-4 py-2 border-b">{format(new Date(week.end_date), 'MMM dd, yyyy')}</td>
                                <td className="px-4 py-2 border-b">{week.weekly_tickets_sold}</td>
                                <td className="px-4 py-2 border-b">{formatCurrency(week.weekly_sales)}</td>
                                <td className="px-4 py-2 border-b">{formatCurrency(week.weekly_sales * (game.organization_percentage / 100))}</td>
                                <td className="px-4 py-2 border-b">{formatCurrency(week.weekly_sales * (game.jackpot_percentage / 100))}</td>
                                <td className="px-4 py-2 border-b">{formatCurrency(week.weekly_payout)}</td>
                                <td className="px-4 py-2 border-b">{week.winner_name || '-'}</td>
                                <td className="px-4 py-2 border-b">{week.card_selected || '-'}</td>
                                <td className="px-4 py-2 border-b">{week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Expenses Table */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold">Expenses & Donations</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenExpenseModal(game.id, game.name)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Expense
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left border-b">Date</th>
                              <th className="px-4 py-2 text-left border-b">Amount</th>
                              <th className="px-4 py-2 text-left border-b">Memo</th>
                              <th className="px-4 py-2 text-left border-b">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameExpenses.length > 0 ? (
                              gameExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 border-b">{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                                  <td className="px-4 py-2 border-b">{formatCurrency(expense.amount)}</td>
                                  <td className="px-4 py-2 border-b">{expense.memo}</td>
                                  <td className="px-4 py-2 border-b">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      expense.is_donation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {expense.is_donation ? 'Donation' : 'Expense'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                  No expenses recorded for this game
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Game Summary */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Game Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-sm text-blue-600">Total Sales</div>
                          <div className="font-semibold">{formatCurrency(game.total_sales)}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-sm text-green-600">Total Payouts</div>
                          <div className="font-semibold">{formatCurrency(game.total_payouts)}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <div className="text-sm text-red-600">Total Expenses</div>
                          <div className="font-semibold">{formatCurrency(game.total_expenses)}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-sm text-purple-600">Total Donations</div>
                          <div className="font-semibold">{formatCurrency(game.total_donations)}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded">
                          <div className="text-sm text-yellow-600">Organization Net</div>
                          <div className="font-semibold">{formatCurrency(game.organization_net_profit)}</div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded">
                          <div className="text-sm text-indigo-600">Carryover Jackpot</div>
                          <div className="font-semibold">{formatCurrency(game.carryover_jackpot)}</div>
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

      <ExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        gameId={selectedGameForExpense}
        gameName={selectedGameNameForExpense}
      />
    </div>
  );
};

export default IncomeExpense;
