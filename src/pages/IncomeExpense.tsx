
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/datepicker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Download, Plus, Filter, ChevronDown, ChevronUp, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

const COLORS = ['#1F4E4A', '#A1E96C', '#F7F8FC', '#132E2C'];

export default function IncomeExpense() {
  const [games, setGames] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [reportType, setReportType] = useState('cumulative');
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('bar');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [newExpense, setNewExpense] = useState({
    gameId: '',
    date: new Date(),
    amount: '',
    memo: '',
    type: 'expense'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch games with related data
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          weeks (*),
          ticket_sales (*)
        `)
        .order('game_number', { ascending: false });

      if (gamesError) throw gamesError;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      setGames(gamesData || []);
      setExpenses(expensesData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error Loading Data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.gameId || !newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          game_id: newExpense.gameId,
          date: newExpense.date.toISOString().split('T')[0],
          amount: parseFloat(newExpense.amount),
          memo: newExpense.memo || null,
          is_donation: newExpense.type === 'donation',
        });

      if (error) throw error;

      // Update game totals
      const game = games.find(g => g.id === newExpense.gameId);
      if (game) {
        const amount = parseFloat(newExpense.amount);
        const isDonation = newExpense.type === 'donation';
        
        const updatedTotals = {
          total_expenses: isDonation ? game.total_expenses : game.total_expenses + amount,
          total_donations: isDonation ? game.total_donations + amount : game.total_donations,
          organization_net_profit: game.organization_net_profit - amount,
        };
        
        await supabase
          .from('games')
          .update(updatedTotals)
          .eq('id', newExpense.gameId);
      }

      toast({
        title: "Success",
        description: `${newExpense.type === 'donation' ? 'Donation' : 'Expense'} has been added successfully.`,
      });

      setNewExpense({
        gameId: '',
        date: new Date(),
        amount: '',
        memo: '',
        type: 'expense',
      });

      setIsAddExpenseOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    const filteredGames = selectedGame === 'all' ? games : games.filter(g => g.id === selectedGame);
    
    const totalSales = filteredGames.reduce((sum, game) => sum + (game.total_sales || 0), 0);
    const totalPayouts = filteredGames.reduce((sum, game) => sum + (game.total_payouts || 0), 0);
    const totalExpenses = filteredGames.reduce((sum, game) => sum + (game.total_expenses || 0), 0);
    const totalDonations = filteredGames.reduce((sum, game) => sum + (game.total_donations || 0), 0);
    const totalTicketsSold = filteredGames.reduce((sum, game) => {
      return sum + game.ticket_sales.reduce((ticketSum: number, sale: any) => ticketSum + sale.tickets_sold, 0);
    }, 0);

    const payoutPortion = totalSales * 0.6; // Assuming 60% goes to payouts
    const organizationPortion = totalSales * 0.4; // Assuming 40% goes to organization

    return {
      totalTicketsSold,
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      payoutPortion,
      organizationPortion,
      organizationNetProfit: organizationPortion - totalExpenses - totalDonations
    };
  };

  const summary = calculateSummary();

  // Prepare chart data
  const prepareChartData = () => {
    return games.map(game => ({
      name: game.name,
      sales: game.total_sales || 0,
      payouts: game.total_payouts || 0,
      expenses: game.total_expenses || 0,
      donations: game.total_donations || 0,
      profit: game.organization_net_profit || 0
    }));
  };

  const chartData = prepareChartData();

  const pieChartData = [
    { name: 'Payouts', value: summary.totalPayouts, color: COLORS[0] },
    { name: 'Expenses', value: summary.totalExpenses, color: COLORS[1] },
    { name: 'Donations', value: summary.totalDonations, color: COLORS[2] },
    { name: 'Net Profit', value: summary.organizationNetProfit, color: COLORS[3] }
  ];

  const toggleExpand = (id: string) => {
    setExpandedGameId(expandedGameId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F4E4A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1F4E4A] mb-2">Income vs Expense Analytics</h1>
            <p className="text-gray-600">Professional financial analysis and reporting dashboard</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Expense or Donation</DialogTitle>
                  <DialogDescription>
                    Record a new expense or charitable donation for tracking.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gameSelect" className="text-right">Game</Label>
                    <Select value={newExpense.gameId} onValueChange={(value) => setNewExpense({...newExpense, gameId: value})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                      <SelectContent>
                        {games.map((game) => (
                          <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expenseDate" className="text-right">Date</Label>
                    <div className="col-span-3">
                      <DatePicker
                        date={newExpense.date}
                        setDate={(date) => setNewExpense({...newExpense, date: date || new Date()})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expenseType" className="text-right">Type</Label>
                    <Select value={newExpense.type} onValueChange={(value) => setNewExpense({...newExpense, type: value})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="donation">Donation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expenseAmount" className="text-right">Amount</Label>
                    <Input
                      id="expenseAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expenseMemo" className="text-right">Memo</Label>
                    <Input
                      id="expenseMemo"
                      placeholder="Description..."
                      value={newExpense.memo}
                      onChange={(e) => setNewExpense({...newExpense, memo: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddExpense} className="bg-[#1F4E4A]">
                    Add {newExpense.type === 'donation' ? 'Donation' : 'Expense'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        <Card className="border-[#1F4E4A]/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#1F4E4A] flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters & Controls
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-[#1F4E4A]"
              >
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gameFilter">Game Filter</Label>
                    <Select value={selectedGame} onValueChange={setSelectedGame}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select game" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Games</SelectItem>
                        {games.map((game) => (
                          <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportType">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="cumulative">Cumulative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chartType">Chart Type</Label>
                    <Select value={selectedChartType} onValueChange={setSelectedChartType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="area">Area Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quick Filters</Label>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="cursor-pointer hover:bg-[#A1E96C]">This Month</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-[#A1E96C]">YTD</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Overall Totals Column */}
          <Card className="border-[#1F4E4A]/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Overall Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tickets Sold</span>
                <span className="font-bold text-[#1F4E4A]">{summary.totalTicketsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ticket Sales</span>
                <span className="font-bold text-[#1F4E4A]">{formatCurrency(summary.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Payouts</span>
                <span className="font-bold text-red-600">{formatCurrency(summary.totalPayouts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-bold text-orange-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Donated</span>
                <span className="font-bold text-blue-600">{formatCurrency(summary.totalDonations)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payout Portion Column */}
          <Card className="border-[#A1E96C]/30 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#A1E96C] to-[#1F4E4A] text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Payout Portion (60%)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Allocated Amount</span>
                <span className="font-bold text-[#1F4E4A]">{formatCurrency(summary.payoutPortion)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Paid Out</span>
                <span className="font-bold text-red-600">{formatCurrency(summary.totalPayouts)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-semibold">Remaining</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(summary.payoutPortion - summary.totalPayouts)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Portion Column */}
          <Card className="border-[#132E2C]/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#132E2C] to-[#1F4E4A] text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organization Portion (40%)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Allocated Amount</span>
                <span className="font-bold text-[#1F4E4A]">{formatCurrency(summary.organizationPortion)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-bold text-orange-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Donations</span>
                <span className="font-bold text-blue-600">{formatCurrency(summary.totalDonations)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-semibold">Net Profit</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(summary.organizationNetProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Charts Section */}
        <Card className="border-[#1F4E4A]/20 shadow-lg">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-xl font-semibold text-[#1F4E4A] flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Financial Analytics Dashboard
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={selectedChartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChartType('bar')}
                  className={selectedChartType === 'bar' ? 'bg-[#1F4E4A]' : ''}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedChartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChartType('line')}
                  className={selectedChartType === 'line' ? 'bg-[#1F4E4A]' : ''}
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedChartType === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChartType('pie')}
                  className={selectedChartType === 'pie' ? 'bg-[#1F4E4A]' : ''}
                >
                  <PieChartIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {selectedChartType === 'bar' && (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #1F4E4A',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill={COLORS[0]} name="Sales" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payouts" fill={COLORS[1]} name="Payouts" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill={COLORS[2]} name="Expenses" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="donations" fill={COLORS[3]} name="Donations" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
                {selectedChartType === 'line' && (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #1F4E4A',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke={COLORS[0]} strokeWidth={3} dot={{ fill: COLORS[0], strokeWidth: 2, r: 6 }} />
                    <Line type="monotone" dataKey="payouts" stroke={COLORS[1]} strokeWidth={3} dot={{ fill: COLORS[1], strokeWidth: 2, r: 6 }} />
                    <Line type="monotone" dataKey="profit" stroke={COLORS[3]} strokeWidth={3} dot={{ fill: COLORS[3], strokeWidth: 2, r: 6 }} />
                  </LineChart>
                )}
                {selectedChartType === 'area' && (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #1F4E4A',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="sales" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="payouts" stackId="2" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} />
                  </AreaChart>
                )}
                {selectedChartType === 'pie' && (
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Game Cards with Enhanced Data Tables */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-[#1F4E4A] mb-4">Detailed Game Analysis</h3>
          {games.map((game) => (
            <Collapsible key={game.id} open={expandedGameId === game.id} onOpenChange={() => toggleExpand(game.id)}>
              <Card className="border-[#1F4E4A]/20 shadow-md hover:shadow-lg transition-shadow">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CardTitle className="text-xl font-semibold text-[#1F4E4A]">{game.name}</CardTitle>
                        <Badge variant={game.end_date ? "secondary" : "default"} className="bg-[#A1E96C] text-[#1F4E4A]">
                          {game.end_date ? 'Completed' : 'Active'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>Start: {format(new Date(game.start_date), 'MMM d, yyyy')}</span>
                        {game.end_date && <span>End: {format(new Date(game.end_date), 'MMM d, yyyy')}</span>}
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">{formatCurrency(game.organization_net_profit)}</span>
                        </div>
                        {expandedGameId === game.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="weeks">Weekly Data</TabsTrigger>
                        <TabsTrigger value="expenses">Expenses</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                      </TabsList>
                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card className="p-4">
                            <div className="text-sm text-gray-600">Total Sales</div>
                            <div className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                          </Card>
                          <Card className="p-4">
                            <div className="text-sm text-gray-600">Total Payouts</div>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(game.total_payouts)}</div>
                          </Card>
                          <Card className="p-4">
                            <div className="text-sm text-gray-600">Total Expenses</div>
                            <div className="text-2xl font-bold text-orange-600">{formatCurrency(game.total_expenses)}</div>
                          </Card>
                          <Card className="p-4">
                            <div className="text-sm text-gray-600">Net Profit</div>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</div>
                          </Card>
                        </div>
                      </TabsContent>
                      <TabsContent value="weeks">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-[#F7F8FC] border-b-2 border-[#1F4E4A]">
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">Week #</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">Start Date</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">End Date</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">Tickets Sold</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">Weekly Sales</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">Winner</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A] cursor-pointer hover:bg-[#A1E96C]/20">Payout</th>
                              </tr>
                            </thead>
                            <tbody>
                              {game.weeks?.map((week: any, index: number) => (
                                <tr key={week.id} className={`border-b hover:bg-[#F7F8FC] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <td className="p-3 font-medium text-[#1F4E4A]">{week.week_number}</td>
                                  <td className="p-3">{format(new Date(week.start_date), 'MMM d, yyyy')}</td>
                                  <td className="p-3">{format(new Date(week.end_date), 'MMM d, yyyy')}</td>
                                  <td className="p-3 font-semibold">{week.weekly_tickets_sold.toLocaleString()}</td>
                                  <td className="p-3 font-semibold text-green-600">{formatCurrency(week.weekly_sales)}</td>
                                  <td className="p-3">{week.winner_name || 'TBD'}</td>
                                  <td className="p-3 font-semibold text-red-600">{formatCurrency(week.weekly_payout)}</td>
                                </tr>
                              )) || (
                                <tr>
                                  <td colSpan={7} className="p-6 text-center text-gray-500">No weekly data available</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>
                      <TabsContent value="expenses">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-[#F7F8FC] border-b-2 border-[#1F4E4A]">
                                <th className="p-3 text-left font-semibold text-[#1F4E4A]">Date</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A]">Amount</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A]">Memo</th>
                                <th className="p-3 text-left font-semibold text-[#1F4E4A]">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expenses
                                .filter((expense) => expense.game_id === game.id)
                                .map((expense, index) => (
                                  <tr key={expense.id} className={`border-b hover:bg-[#F7F8FC] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-3">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                                    <td className="p-3 font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                                    <td className="p-3">{expense.memo || 'No memo'}</td>
                                    <td className="p-3">
                                      <Badge variant={expense.is_donation ? "secondary" : "outline"} className={expense.is_donation ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>
                                        {expense.is_donation ? 'Donation' : 'Expense'}
                                      </Badge>
                                    </td>
                                  </tr>
                                )) || (
                                <tr>
                                  <td colSpan={4} className="p-6 text-center text-gray-500">No expenses recorded</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>
                      <TabsContent value="analytics">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="p-4">
                            <h4 className="font-semibold text-[#1F4E4A] mb-3">Performance Metrics</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Profit Margin</span>
                                <span className="font-semibold">
                                  {game.total_sales > 0 ? ((game.organization_net_profit / game.total_sales) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Payout Ratio</span>
                                <span className="font-semibold">
                                  {game.total_sales > 0 ? ((game.total_payouts / game.total_sales) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Expense Ratio</span>
                                <span className="font-semibold">
                                  {game.total_sales > 0 ? ((game.total_expenses / game.total_sales) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </div>
                          </Card>
                          <Card className="p-4">
                            <h4 className="font-semibold text-[#1F4E4A] mb-3">Financial Health</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Revenue</span>
                                <span className="font-semibold text-green-600">{formatCurrency(game.total_sales)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Costs</span>
                                <span className="font-semibold text-red-600">
                                  {formatCurrency(game.total_payouts + game.total_expenses + game.total_donations)}
                                </span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Net Result</span>
                                <span className="font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</span>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}
