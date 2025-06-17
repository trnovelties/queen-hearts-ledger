import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Download, Filter, ChevronDown, TrendingUp, DollarSign, Building, Calendar, Activity, FileText, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// Define types for data structure
type Game = Tables<"games">;
type Expense = Tables<"expenses">;

export default function IncomeExpense() {
  const [games, setGames] = useState<Game[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [reportType, setReportType] = useState<'weekly' | 'game' | 'cumulative'>('cumulative');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<{ date: string; amount: string; memo: string; is_donation: boolean }>({
    date: '',
    amount: '',
    memo: '',
    is_donation: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .order('game_number', { ascending: false });

        if (gamesError) throw gamesError;

        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });

        if (expensesError) throw expensesError;

        if (gamesData) setGames(gamesData);
        if (expensesData) setExpenses(expensesData);
      } catch (error: any) {
        toast({
          title: "Error Loading Data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleAddExpense = async () => {
    if (!newExpense.date || !newExpense.amount) {
      toast({
        title: "Missing Fields",
        description: "Please provide both date and amount.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase.from('expenses').insert({
        date: newExpense.date,
        amount: parseFloat(newExpense.amount),
        memo: newExpense.memo,
        is_donation: newExpense.is_donation,
        game_id: selectedGame === 'all' ? '' : selectedGame,
      });
      if (error) throw error;
      toast({
        title: "Expense Added",
        description: "New expense has been added successfully.",
      });
      setShowExpenseModal(false);
      setNewExpense({ date: '', amount: '', memo: '', is_donation: false });
      // Refresh data
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (expensesError) throw expensesError;
      if (expensesData) setExpenses(expensesData);
    } catch (error: any) {
      toast({
        title: "Error Adding Expense",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalMetrics = useMemo(() => {
    let totalSales = 0;
    let totalPayouts = 0;
    let totalExpenses = 0;
    let totalDonations = 0;

    games.forEach(game => {
      totalSales += game.total_sales;
      totalPayouts += game.total_payouts;
    });

    expenses.forEach(exp => {
      if (exp.is_donation) {
        totalDonations += exp.amount;
      } else {
        totalExpenses += exp.amount;
      }
    });

    const netProfit = totalSales - totalPayouts - totalExpenses;

    return { totalSales, totalPayouts, totalExpenses, totalDonations, netProfit };
  }, [games, expenses]);

  const COLORS = ['#A1E96C', '#1F4E4A', '#FF6B6B', '#4ECDC4'];

  const pieChartData = [
    { name: 'Sales', value: totalMetrics.totalSales },
    { name: 'Payouts', value: totalMetrics.totalPayouts },
    { name: 'Expenses', value: totalMetrics.totalExpenses },
    { name: 'Donations', value: totalMetrics.totalDonations },
  ];

  const chartData = useMemo(() => {
    // For simplicity, aggregate by game name
    return games.map(game => ({
      name: game.name,
      sales: game.total_sales,
      payouts: game.total_payouts,
      expenses: expenses.filter(e => e.game_id === game.id).reduce((acc, e) => acc + (e.is_donation ? 0 : e.amount), 0),
      donations: expenses.filter(e => e.game_id === game.id).reduce((acc, e) => acc + (e.is_donation ? e.amount : 0), 0),
    }));
  }, [games, expenses]);

  const sortedGames = useMemo(() => {
    const sorted = [...games];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'total_sales':
          aValue = a.total_sales;
          bValue = b.total_sales;
          break;
        case 'total_payouts':
          aValue = a.total_payouts;
          bValue = b.total_payouts;
          break;
        case 'organization_net_profit':
          aValue = a.organization_net_profit;
          bValue = b.organization_net_profit;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [games, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-[#132E2C]">Income vs Expense</h1>
            <p className="text-gray-600 mt-2">Comprehensive financial analytics and reporting</p>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={() => setShowExpenseModal(true)}
              className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
            <Button variant="outline" className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <Card className="border-[#A1E96C] border-2">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1F4E4A] flex items-center">
                    <Filter className="h-5 w-5 mr-2" />
                    Advanced Filters
                  </CardTitle>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[#132E2C] mb-2 block">Game Selection</label>
                    <select 
                      value={selectedGame} 
                      onChange={(e) => setSelectedGame(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                    >
                      <option value="all">All Games</option>
                      {games.map(game => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#132E2C] mb-2 block">Report Type</label>
                    <select 
                      value={reportType} 
                      onChange={(e) => setReportType(e.target.value as 'weekly' | 'game' | 'cumulative')}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                    >
                      <option value="cumulative">Cumulative</option>
                      <option value="game">By Game</option>
                      <option value="weekly">By Week</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#132E2C] mb-2 block">Date From</label>
                    <input 
                      type="date" 
                      value={dateFrom} 
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#132E2C] mb-2 block">Date To</label>
                    <input 
                      type="date" 
                      value={dateTo} 
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickFilter('today')}
                    className={quickFilter === 'today' ? 'bg-[#A1E96C] text-[#132E2C]' : ''}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickFilter('thisWeek')}
                    className={quickFilter === 'thisWeek' ? 'bg-[#A1E96C] text-[#132E2C]' : ''}
                  >
                    This Week
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickFilter('thisMonth')}
                    className={quickFilter === 'thisMonth' ? 'bg-[#A1E96C] text-[#132E2C]' : ''}
                  >
                    This Month
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickFilter('lastQuarter')}
                    className={quickFilter === 'lastQuarter' ? 'bg-[#A1E96C] text-[#132E2C]' : ''}
                  >
                    Last Quarter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickFilter('ytd')}
                    className={quickFilter === 'ytd' ? 'bg-[#A1E96C] text-[#132E2C]' : ''}
                  >
                    Year to Date
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Totals */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Overall Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Total Sales</span>
                <span className="font-bold text-blue-900">{formatCurrency(totalMetrics.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Total Payouts</span>
                <span className="font-bold text-blue-900">{formatCurrency(totalMetrics.totalPayouts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Total Expenses</span>
                <span className="font-bold text-blue-900">{formatCurrency(totalMetrics.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Total Donations</span>
                <span className="font-bold text-blue-900">{formatCurrency(totalMetrics.totalDonations)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">Net Profit</span>
                  <span className="font-bold text-lg text-blue-900">{formatCurrency(totalMetrics.netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Portion */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Payout Portion (60%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Allocated Amount</span>
                <span className="font-bold text-green-900">{formatCurrency(totalMetrics.totalSales * 0.6)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Total Payouts</span>
                <span className="font-bold text-green-900">{formatCurrency(totalMetrics.totalPayouts)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-800">Remaining</span>
                  <span className="font-bold text-lg text-green-900">
                    {formatCurrency((totalMetrics.totalSales * 0.6) - totalMetrics.totalPayouts)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Portion */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800 flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Organization Portion (40%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Allocated Amount</span>
                <span className="font-bold text-purple-900">{formatCurrency(totalMetrics.totalSales * 0.4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Total Expenses</span>
                <span className="font-bold text-purple-900">{formatCurrency(totalMetrics.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Total Donations</span>
                <span className="font-bold text-purple-900">{formatCurrency(totalMetrics.totalDonations)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-purple-800">Net Profit</span>
                  <span className="font-bold text-lg text-purple-900">{formatCurrency(totalMetrics.netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1F4E4A]">Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  <Bar dataKey="sales" fill="#A1E96C" name="Sales" />
                  <Bar dataKey="payouts" fill="#1F4E4A" name="Payouts" />
                  <Bar dataKey="expenses" fill="#FF6B6B" name="Expenses" />
                  <Bar dataKey="donations" fill="#4ECDC4" name="Donations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#1F4E4A]">Trends Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  <Line type="monotone" dataKey="sales" stroke="#A1E96C" strokeWidth={3} />
                  <Line type="monotone" dataKey="payouts" stroke="#1F4E4A" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#F7F8FC] border border-[#A1E96C]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#A1E96C] data-[state=active]:text-[#132E2C]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="games" className="data-[state=active]:bg-[#A1E96C] data-[state=active]:text-[#132E2C]">
              Games Analysis
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-[#A1E96C] data-[state=active]:text-[#132E2C]">
              Performance
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-[#A1E96C] data-[state=active]:text-[#132E2C]">
              Detailed Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1F4E4A]">Sales Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1F4E4A]">Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                      <Area type="monotone" dataKey="sales" stackId="1" stroke="#A1E96C" fill="#A1E96C" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="payouts" stackId="1" stroke="#1F4E4A" fill="#1F4E4A" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#1F4E4A] flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Game Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#F7F8FC] border-b-2 border-[#A1E96C]">
                        <th className="text-left p-3 font-semibold text-[#132E2C] cursor-pointer hover:bg-[#A1E96C]" onClick={() => handleSort('name')}>
                          Game Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left p-3 font-semibold text-[#132E2C] cursor-pointer hover:bg-[#A1E96C]" onClick={() => handleSort('total_sales')}>
                          Total Sales {sortField === 'total_sales' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left p-3 font-semibold text-[#132E2C] cursor-pointer hover:bg-[#A1E96C]" onClick={() => handleSort('total_payouts')}>
                          Total Payouts {sortField === 'total_payouts' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left p-3 font-semibold text-[#132E2C] cursor-pointer hover:bg-[#A1E96C]" onClick={() => handleSort('organization_net_profit')}>
                          Net Profit {sortField === 'organization_net_profit' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left p-3 font-semibold text-[#132E2C]">Performance Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGames.map((game, index) => (
                        <tr key={game.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium text-[#1F4E4A]">{game.name}</td>
                          <td className="p-3">{formatCurrency(game.total_sales)}</td>
                          <td className="p-3">{formatCurrency(game.total_payouts)}</td>
                          <td className={`p-3 font-semibold ${game.organization_net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(game.organization_net_profit)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-[#A1E96C] rounded-full" 
                                  style={{ width: `${Math.min(100, (game.organization_net_profit / Math.max(...games.map(g => g.organization_net_profit))) * 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">
                                {Math.round((game.organization_net_profit / Math.max(...games.map(g => g.organization_net_profit))) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700">Avg. Game Duration</p>
                      <p className="text-xl font-bold text-orange-900">
                        {games.length > 0 ? Math.round(games.reduce((acc, game) => {
                          if (game.end_date && game.start_date) {
                            const duration = (new Date(game.end_date).getTime() - new Date(game.start_date).getTime()) / (1000 * 60 * 60 * 24);
                            return acc + duration;
                          }
                          return acc;
                        }, 0) / games.filter(g => g.end_date).length) : 0} days
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-teal-700">Avg. Profit Margin</p>
                      <p className="text-xl font-bold text-teal-900">
                        {totalMetrics.totalSales > 0 ? ((totalMetrics.netProfit / totalMetrics.totalSales) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-teal-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-pink-700">Active Games</p>
                      <p className="text-xl font-bold text-pink-900">
                        {games.filter(g => !g.end_date).length}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-pink-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-700">Total Revenue</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {formatCurrency(totalMetrics.totalSales)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#1F4E4A] flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Detailed Financial Data
                  </span>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                    />
                    <select className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent">
                      <option value="all">All Types</option>
                      <option value="sales">Sales</option>
                      <option value="expenses">Expenses</option>
                      <option value="donations">Donations</option>
                      <option value="payouts">Payouts</option>
                    </select>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#F7F8FC] border-b-2 border-[#A1E96C]">
                          <th className="text-left p-3 font-semibold text-[#132E2C]">Date</th>
                          <th className="text-left p-3 font-semibold text-[#132E2C]">Type</th>
                          <th className="text-left p-3 font-semibold text-[#132E2C]">Game</th>
                          <th className="text-left p-3 font-semibold text-[#132E2C]">Description</th>
                          <th className="text-left p-3 font-semibold text-[#132E2C]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {games.map(game => (
                          <tr key={`game-${game.id}`} className="border-b hover:bg-gray-50">
                            <td className="p-3">{format(new Date(game.start_date), 'MMM d, yyyy')}</td>
                            <td className="p-3">
                              <Badge className="bg-blue-100 text-blue-800">Game Sales</Badge>
                            </td>
                            <td className="p-3 font-medium">{game.name}</td>
                            <td className="p-3">Total game revenue</td>
                            <td className="p-3 font-semibold text-green-600">{formatCurrency(game.total_sales)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-[#1F4E4A]">Add New Expense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[#132E2C] mb-2 block">Date</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#132E2C] mb-2 block">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#132E2C] mb-2 block">Description</label>
                  <input
                    type="text"
                    value={newExpense.memo}
                    onChange={(e) => setNewExpense({...newExpense, memo: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#132E2C] mb-2 block">Type</label>
                  <select
                    value={newExpense.is_donation ? 'donation' : 'expense'}
                    onChange={(e) => setNewExpense({...newExpense, is_donation: e.target.value === 'donation'})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#A1E96C] focus:border-transparent"
                  >
                    <option value="expense">Expense</option>
                    <option value="donation">Donation</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button 
                    onClick={handleAddExpense}
                    className="flex-1 bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
                  >
                    Add Expense
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
