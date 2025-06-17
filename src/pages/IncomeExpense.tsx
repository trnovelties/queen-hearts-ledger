
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Download, Plus } from 'lucide-react';
import { ExpenseModal } from '@/components/ExpenseModal';

const IncomeExpense = () => {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportType, setReportType] = useState<string>('cumulative');
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

  // Calculate totals
  const calculateTotals = () => {
    if (!games || !ticketSales || !expenses) return null;

    let filteredGames = games;
    if (selectedGame !== 'all') {
      filteredGames = games.filter(game => game.id === selectedGame);
    }

    const totalTicketsSold = ticketSales
      .filter(sale => filteredGames.some(game => game.id === sale.game_id))
      .reduce((sum, sale) => sum + sale.tickets_sold, 0);

    const totalSales = filteredGames.reduce((sum, game) => sum + game.total_sales, 0);
    const totalPayouts = filteredGames.reduce((sum, game) => sum + game.total_payouts, 0);
    const totalExpenses = filteredGames.reduce((sum, game) => sum + game.total_expenses, 0);
    const totalDonations = filteredGames.reduce((sum, game) => sum + game.total_donations, 0);

    // Calculate portions
    const jackpotPortionTotal = totalSales * 0.6; // Assuming 60% jackpot portion
    const organizationPortionTotal = totalSales * 0.4; // Assuming 40% organization portion

    return {
      totalTicketsSold,
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      jackpotPortionTotal,
      organizationPortionTotal
    };
  };

  const totals = calculateTotals();

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

  if (!totals) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Income vs. Expense</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export as PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Game</Label>
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
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Report Type</Label>
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
        </CardContent>
      </Card>

      {/* Three Column Summary */}
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
            <CardDescription>60% of total sales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Sales (60%):</span>
              <span className="font-medium">{formatCurrency(totals.jackpotPortionTotal)}</span>
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
            <CardDescription>40% of total sales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Sales (40%):</span>
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
            <div className="flex justify-between">
              <span>Organization Net Profit:</span>
              <span className="font-medium">{formatCurrency(totals.organizationPortionTotal - totals.totalExpenses - totals.totalDonations)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Game Details</h2>
          <Button onClick={() => setShowExpenseModal('general')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense/Donation
          </Button>
        </div>

        {games?.map((game) => {
          const isExpanded = expandedGames.has(game.id);
          const gameWeeks = getWeeksForGame(game.id);
          const gameExpenses = getExpensesForGame(game.id);

          return (
            <Card key={game.id}>
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
                      <h3 className="text-lg font-semibold mb-3">Weeks</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 p-2 text-left">Week</th>
                              <th className="border border-gray-300 p-2 text-left">Start Date</th>
                              <th className="border border-gray-300 p-2 text-left">End Date</th>
                              <th className="border border-gray-300 p-2 text-left">Tickets Sold</th>
                              <th className="border border-gray-300 p-2 text-left">Weekly Sales</th>
                              <th className="border border-gray-300 p-2 text-left">Org Portion</th>
                              <th className="border border-gray-300 p-2 text-left">Jackpot Portion</th>
                              <th className="border border-gray-300 p-2 text-left">Weekly Payout</th>
                              <th className="border border-gray-300 p-2 text-left">Winner</th>
                              <th className="border border-gray-300 p-2 text-left">Slot</th>
                              <th className="border border-gray-300 p-2 text-left">Card</th>
                              <th className="border border-gray-300 p-2 text-left">Present</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameWeeks.map((week) => (
                              <tr key={week.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 p-2">{week.week_number}</td>
                                <td className="border border-gray-300 p-2">{format(new Date(week.start_date), 'MMM dd, yyyy')}</td>
                                <td className="border border-gray-300 p-2">{format(new Date(week.end_date), 'MMM dd, yyyy')}</td>
                                <td className="border border-gray-300 p-2">{week.weekly_tickets_sold}</td>
                                <td className="border border-gray-300 p-2">{formatCurrency(week.weekly_sales)}</td>
                                <td className="border border-gray-300 p-2">{formatCurrency(week.weekly_sales * 0.4)}</td>
                                <td className="border border-gray-300 p-2">{formatCurrency(week.weekly_sales * 0.6)}</td>
                                <td className="border border-gray-300 p-2">{formatCurrency(week.weekly_payout)}</td>
                                <td className="border border-gray-300 p-2">{week.winner_name || '-'}</td>
                                <td className="border border-gray-300 p-2">{week.slot_chosen || '-'}</td>
                                <td className="border border-gray-300 p-2">{week.card_selected || '-'}</td>
                                <td className="border border-gray-300 p-2">{week.winner_present !== null ? (week.winner_present ? 'Yes' : 'No') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Expenses Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Expenses & Donations</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 p-2 text-left">Date</th>
                              <th className="border border-gray-300 p-2 text-left">Amount</th>
                              <th className="border border-gray-300 p-2 text-left">Memo</th>
                              <th className="border border-gray-300 p-2 text-left">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameExpenses.map((expense) => (
                              <tr key={expense.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 p-2">{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                                <td className="border border-gray-300 p-2">{formatCurrency(expense.amount)}</td>
                                <td className="border border-gray-300 p-2">{expense.memo}</td>
                                <td className="border border-gray-300 p-2">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Sales</div>
                          <div className="font-semibold">{formatCurrency(game.total_sales)}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Payouts</div>
                          <div className="font-semibold">{formatCurrency(game.total_payouts)}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Expenses</div>
                          <div className="font-semibold">{formatCurrency(game.total_expenses)}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Donations</div>
                          <div className="font-semibold">{formatCurrency(game.total_donations)}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Org Net Profit</div>
                          <div className="font-semibold">{formatCurrency(game.organization_net_profit)}</div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Carryover Jackpot</div>
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

      {showExpenseModal && (
        <ExpenseModal 
          open={!!showExpenseModal}
          onOpenChange={(open) => setShowExpenseModal(open ? showExpenseModal : null)}
          gameId={showExpenseModal === 'general' ? games?.[0]?.id || '' : showExpenseModal}
          gameName={showExpenseModal === 'general' ? 'General' : games?.find(g => g.id === showExpenseModal)?.name || ''}
        />
      )}
    </div>
  );
};

export default IncomeExpense;
