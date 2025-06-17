
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Download, Plus } from 'lucide-react';
import { ExpenseModal } from '@/components/ExpenseModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const IncomeExpense = () => {
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportType, setReportType] = useState<string>('cumulative');
  const [showExpenseModal, setShowExpenseModal] = useState(false);

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

    const filteredGames = selectedGame === 'all' ? games : games.filter(g => g.id === selectedGame);
    const gameIds = filteredGames.map(g => g.id);

    const filteredSales = ticketSales.filter(s => gameIds.includes(s.game_id));
    const filteredExpenses = expenses.filter(e => gameIds.includes(e.game_id));

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.amount_collected, 0);
    const totalPayouts = filteredGames.reduce((sum, game) => sum + (game.total_payouts || 0), 0);
    const totalExpenses = filteredExpenses.filter(e => !e.is_donation).reduce((sum, expense) => sum + expense.amount, 0);
    const totalDonations = filteredExpenses.filter(e => e.is_donation).reduce((sum, expense) => sum + expense.amount, 0);

    const organizationPortionTotal = filteredSales.reduce((sum, sale) => sum + (sale.organization_total || 0), 0);
    const jackpotPortionTotal = filteredSales.reduce((sum, sale) => sum + (sale.jackpot_total || 0), 0);

    return {
      totalTicketsSold: filteredSales.reduce((sum, sale) => sum + sale.tickets_sold, 0),
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      organizationPortionTotal,
      jackpotPortionTotal,
      organizationNetProfit: organizationPortionTotal - totalExpenses - totalDonations
    };
  };

  const totals = calculateTotals();

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export PDF functionality to be implemented');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#1F4E4A]">Income vs. Expense</h1>
        <div className="flex gap-2">
          <Button variant="export" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export as PDF
          </Button>
          <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
            <DialogTrigger asChild>
              <Button className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense/Donation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense/Donation</DialogTitle>
              </DialogHeader>
              <ExpenseModal
                open={showExpenseModal}
                onOpenChange={setShowExpenseModal}
                gameId={selectedGame !== 'all' ? selectedGame : games?.[0]?.id || ''}
                gameName={selectedGame !== 'all' ? games?.find(g => g.id === selectedGame)?.name || '' : 'All Games'}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[#F7F8FC] border-[#1F4E4A]/20">
        <CardHeader>
          <CardTitle className="text-[#1F4E4A]">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameSelect" className="text-[#1F4E4A]">Game Number</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger className="border-[#1F4E4A]/20 focus:border-[#A1E96C]">
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#1F4E4A]/20">
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
              <Label htmlFor="startDate" className="text-[#1F4E4A]">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-[#1F4E4A]/20 focus:border-[#A1E96C]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-[#1F4E4A]">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-[#1F4E4A]/20 focus:border-[#A1E96C]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportType" className="text-[#1F4E4A]">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="border-[#1F4E4A]/20 focus:border-[#A1E96C]">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#1F4E4A]/20">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="game">Game</SelectItem>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three Column Summary */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Totals */}
          <Card className="border-[#1F4E4A]/20">
            <CardHeader className="bg-[#F7F8FC]">
              <CardTitle className="text-[#1F4E4A]">Overall Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Tickets Sold:</span>
                <span className="font-semibold">{totals.totalTicketsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Ticket Sales:</span>
                <span className="font-semibold">{formatCurrency(totals.totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Payouts:</span>
                <span className="font-semibold">{formatCurrency(totals.totalPayouts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Expenses:</span>
                <span className="font-semibold">{formatCurrency(totals.totalExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Donated:</span>
                <span className="font-semibold">{formatCurrency(totals.totalDonations)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payout Portion Allocation */}
          <Card className="border-[#1F4E4A]/20">
            <CardHeader className="bg-[#A1E96C]/20">
              <CardTitle className="text-[#1F4E4A]">Payout Portion Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Sales (60% portion):</span>
                <span className="font-semibold">{formatCurrency(totals.jackpotPortionTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Payouts:</span>
                <span className="font-semibold">{formatCurrency(totals.totalPayouts)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Organization Portion Allocation */}
          <Card className="border-[#1F4E4A]/20">
            <CardHeader className="bg-[#1F4E4A]/10">
              <CardTitle className="text-[#1F4E4A]">Organization Portion Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Sales (40% portion):</span>
                <span className="font-semibold">{formatCurrency(totals.organizationPortionTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Expenses:</span>
                <span className="font-semibold">{formatCurrency(totals.totalExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#132E2C]">Total Donations:</span>
                <span className="font-semibold">{formatCurrency(totals.totalDonations)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-[#132E2C] font-semibold">Organization Net Profit:</span>
                <span className="font-bold text-[#A1E96C]">{formatCurrency(totals.organizationNetProfit)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game Cards */}
      <div className="space-y-4">
        {games?.map((game) => {
          const gameWeeks = weeks?.filter(w => w.game_id === game.id) || [];
          const gameExpenses = expenses?.filter(e => e.game_id === game.id) || [];

          return (
            <Card key={game.id} className="border-[#1F4E4A]/20">
              <CardHeader className="bg-[#F7F8FC]">
                <CardTitle className="text-[#1F4E4A] flex justify-between items-center">
                  <span>{game.name}</span>
                  <div className="text-sm font-normal space-x-4">
                    <span>Start: {format(new Date(game.start_date), 'MMM dd, yyyy')}</span>
                    {game.end_date && <span>End: {format(new Date(game.end_date), 'MMM dd, yyyy')}</span>}
                    <span>Sales: {formatCurrency(game.total_sales)}</span>
                    <span>Net: {formatCurrency(game.organization_net_profit || 0)}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Weeks Table */}
                <div>
                  <h4 className="font-semibold text-[#1F4E4A] mb-3">Weeks</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-[#1F4E4A]/20">
                      <thead>
                        <tr className="bg-[#F7F8FC]">
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Week</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Start Date</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">End Date</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Tickets Sold</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Weekly Sales</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Organization Portion</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Jackpot Portion</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Weekly Payout</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Winner</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Slot</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Card</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameWeeks.map((week) => {
                          const weekSales = ticketSales?.filter(s => s.week_id === week.id) || [];
                          const organizationPortion = weekSales.reduce((sum, sale) => sum + (sale.organization_total || 0), 0);
                          const jackpotPortion = weekSales.reduce((sum, sale) => sum + (sale.jackpot_total || 0), 0);
                          
                          return (
                            <tr key={week.id} className="hover:bg-[#F7F8FC]/50">
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{week.week_number}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{format(new Date(week.start_date), 'MMM dd, yyyy')}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{format(new Date(week.end_date), 'MMM dd, yyyy')}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{week.weekly_tickets_sold}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{formatCurrency(week.weekly_sales)}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{formatCurrency(organizationPortion)}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{formatCurrency(jackpotPortion)}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{formatCurrency(week.weekly_payout)}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{week.winner_name || '-'}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{week.slot_chosen || '-'}</td>
                              <td className="border border-[#1F4E4A]/20 px-3 py-2">{week.card_selected || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expenses Table */}
                <div>
                  <h4 className="font-semibold text-[#1F4E4A] mb-3">Expenses & Donations</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-[#1F4E4A]/20">
                      <thead>
                        <tr className="bg-[#F7F8FC]">
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Date</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Amount</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Memo</th>
                          <th className="border border-[#1F4E4A]/20 px-3 py-2 text-left text-[#1F4E4A]">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-[#F7F8FC]/50">
                            <td className="border border-[#1F4E4A]/20 px-3 py-2">{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                            <td className="border border-[#1F4E4A]/20 px-3 py-2">{formatCurrency(expense.amount)}</td>
                            <td className="border border-[#1F4E4A]/20 px-3 py-2">{expense.memo}</td>
                            <td className="border border-[#1F4E4A]/20 px-3 py-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                expense.is_donation 
                                  ? 'bg-[#A1E96C]/20 text-[#1F4E4A]' 
                                  : 'bg-red-100 text-red-800'
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
                  <h4 className="font-semibold text-[#1F4E4A] mb-3">Game Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div className="bg-[#F7F8FC] p-3 rounded">
                      <div className="text-[#132E2C]">Total Sales</div>
                      <div className="font-semibold">{formatCurrency(game.total_sales)}</div>
                    </div>
                    <div className="bg-[#F7F8FC] p-3 rounded">
                      <div className="text-[#132E2C]">Total Payouts</div>
                      <div className="font-semibold">{formatCurrency(game.total_payouts || 0)}</div>
                    </div>
                    <div className="bg-[#F7F8FC] p-3 rounded">
                      <div className="text-[#132E2C]">Total Expenses</div>
                      <div className="font-semibold">{formatCurrency(game.total_expenses || 0)}</div>
                    </div>
                    <div className="bg-[#F7F8FC] p-3 rounded">
                      <div className="text-[#132E2C]">Total Donations</div>
                      <div className="font-semibold">{formatCurrency(game.total_donations || 0)}</div>
                    </div>
                    <div className="bg-[#F7F8FC] p-3 rounded">
                      <div className="text-[#132E2C]">Organization Net</div>
                      <div className="font-semibold">{formatCurrency(game.organization_net_profit || 0)}</div>
                    </div>
                    <div className="bg-[#F7F8FC] p-3 rounded">
                      <div className="text-[#132E2C]">Carryover Jackpot</div>
                      <div className="font-semibold">{formatCurrency(game.carryover_jackpot || 0)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default IncomeExpense;
