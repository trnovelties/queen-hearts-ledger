import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Download, PlusCircle, TrendingUp, TrendingDown, DollarSign, Users, Trophy, Target, RefreshCw, Calendar, Filter, Search, Grid, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon } from "lucide-react";
import jsPDF from "jspdf";
import { ExpenseModal } from "@/components/ExpenseModal";

// Define types for data structure
type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

// Define aggregate data types
interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

type ChartData = {
  name: string;
  Sales: number;
  Payouts: number;
  Expenses: number;
  Donations: number;
  Profit: number;
  date?: string;
};

type KPIData = {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  averageTicketPrice: number;
  totalTicketsSold: number;
  revenuePerTicket: number;
  payoutRatio: number;
  expenseRatio: number;
  donationRatio: number;
  roi: number;
  growthRate: number;
};

const COLORS = ['#A1E96C', '#1F4E4A', '#132E2C', '#7B8C8A', '#F7F8FC'];

export default function IncomeExpense() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportType, setReportType] = useState<"weekly" | "game" | "cumulative">("cumulative");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [trendData, setTrendData] = useState<ChartData[]>([]);
  const [pieData, setPieData] = useState<{name: string, value: number}[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    totalProfit: 0,
    profitMargin: 0,
    averageTicketPrice: 0,
    totalTicketsSold: 0,
    revenuePerTicket: 0,
    payoutRatio: 0,
    expenseRatio: 0,
    donationRatio: 0,
    roi: 0,
    growthRate: 0,
  });
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "area">("bar");
  const [viewMode, setViewMode] = useState<"detailed" | "summary">("summary");
  
  const reportContainerRef = useRef<HTMLDivElement>(null);
  
  // Set selected game from URL parameter
  useEffect(() => {
    const gameId = searchParams.get("game");
    if (gameId) {
      setSelectedGame(gameId);
    }
  }, [searchParams]);
  
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
  
  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchFinancialData();
    setRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Financial data has been updated.",
    });
  };
  
  // Fetch all games and related data
  const fetchFinancialData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all games
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: false });
      
      if (gamesError) throw gamesError;
      
      if (gamesData) {
        const gamesWithDetails: GameSummary[] = [];
        
        // Fetch additional data for each game
        for (const game of gamesData) {
          // Fetch weeks
          const { data: weeksData, error: weeksError } = await supabase
            .from('weeks')
            .select('*')
            .eq('game_id', game.id)
            .order('week_number', { ascending: true });
          
          if (weeksError) throw weeksError;
          
          // Fetch ticket sales
          const { data: salesData, error: salesError } = await supabase
            .from('ticket_sales')
            .select('*')
            .eq('game_id', game.id)
            .order('date', { ascending: true });
          
          if (salesError) throw salesError;
          
          // Fetch expenses
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('game_id', game.id)
            .order('date', { ascending: true });
          
          if (expensesError) throw expensesError;
          
          gamesWithDetails.push({
            ...game,
            weeks: weeksData || [],
            ticket_sales: salesData || [],
            expenses: expensesData || [],
          });
        }
        
        setGames(gamesWithDetails);
        generateChartData(gamesWithDetails);
      }
    } catch (error: any) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error Loading Data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [user, toast]);
  
  // Generate chart data and KPIs
  const generateChartData = (gamesData: GameSummary[]) => {
    // Bar chart data
    const chartDataArray = gamesData.map(game => ({
      name: game.name,
      Sales: game.total_sales,
      Payouts: game.total_payouts,
      Expenses: game.total_expenses,
      Donations: game.total_donations,
      Profit: game.organization_net_profit,
    }));
    
    setChartData(chartDataArray);
    
    // Trend data (weekly aggregation)
    const weeklyData: { [key: string]: ChartData } = {};
    gamesData.forEach(game => {
      game.weeks.forEach(week => {
        const weekKey = format(new Date(week.start_date), 'MMM dd');
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            name: weekKey,
            date: week.start_date,
            Sales: 0,
            Payouts: 0,
            Expenses: 0,
            Donations: 0,
            Profit: 0,
          };
        }
        weeklyData[weekKey].Sales += week.weekly_sales;
        weeklyData[weekKey].Payouts += week.weekly_payout;
        
        // Add expenses for this week
        const weekExpenses = game.expenses.filter(expense => 
          expense.date >= week.start_date && expense.date <= week.end_date
        );
        weekExpenses.forEach(expense => {
          if (expense.is_donation) {
            weeklyData[weekKey].Donations += expense.amount;
          } else {
            weeklyData[weekKey].Expenses += expense.amount;
          }
        });
        
        weeklyData[weekKey].Profit = (week.weekly_sales * (game.organization_percentage / 100)) - 
          weeklyData[weekKey].Expenses - weeklyData[weekKey].Donations;
      });
    });
    
    const sortedTrendData = Object.values(weeklyData).sort((a, b) => 
      new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
    );
    setTrendData(sortedTrendData);
    
    // Pie chart data (expense breakdown)
    const totalExpenses = gamesData.reduce((sum, game) => sum + game.total_expenses, 0);
    const totalDonations = gamesData.reduce((sum, game) => sum + game.total_donations, 0);
    const totalPayouts = gamesData.reduce((sum, game) => sum + game.total_payouts, 0);
    const totalProfit = gamesData.reduce((sum, game) => sum + game.organization_net_profit, 0);
    
    setPieData([
      { name: 'Payouts', value: totalPayouts },
      { name: 'Expenses', value: totalExpenses },
      { name: 'Donations', value: totalDonations },
      { name: 'Organization Profit', value: totalProfit },
    ]);
    
    // Calculate KPIs
    const totalRevenue = gamesData.reduce((sum, game) => sum + game.total_sales, 0);
    const totalTicketsSold = gamesData.reduce((sum, game) => {
      if (game.ticket_price > 0) {
        return sum + Math.round(game.total_sales / game.ticket_price);
      }
      return sum;
    }, 0);
    
    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const payoutRatio = totalRevenue > 0 ? (totalPayouts / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    const donationRatio = totalRevenue > 0 ? (totalDonations / totalRevenue) * 100 : 0;
    
    // Calculate growth rate (comparing first and last month)
    let growthRate = 0;
    if (sortedTrendData.length > 4) {
      const firstMonth = sortedTrendData.slice(0, 4).reduce((sum, week) => sum + week.Sales, 0);
      const lastMonth = sortedTrendData.slice(-4).reduce((sum, week) => sum + week.Sales, 0);
      if (firstMonth > 0) {
        growthRate = ((lastMonth - firstMonth) / firstMonth) * 100;
      }
    }
    
    setKpiData({
      totalRevenue,
      totalProfit,
      profitMargin,
      averageTicketPrice,
      totalTicketsSold,
      revenuePerTicket: averageTicketPrice,
      payoutRatio,
      expenseRatio,
      donationRatio,
      roi: totalRevenue > 0 ? (totalProfit / (totalRevenue - totalProfit)) * 100 : 0,
      growthRate,
    });
  };
  
  // Calculate summary data for the selected filter
  const calculateSummaryData = () => {
    let filteredGames = games;
    
    // Filter by selected game
    if (selectedGame !== "all") {
      filteredGames = games.filter(game => game.id === selectedGame);
    }
    
    // Filter by search query
    if (searchQuery) {
      filteredGames = filteredGames.filter(game => 
        game.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by date range if set
    if (startDate && endDate) {
      filteredGames = filteredGames.map(game => {
        const filteredSales = game.ticket_sales.filter(sale => 
          sale.date >= startDate && sale.date <= endDate
        );
        
        const filteredExpenses = game.expenses.filter(expense => 
          expense.date >= startDate && expense.date <= endDate
        );
        
        const filteredWeeks = game.weeks.filter(week => 
          week.start_date >= startDate && week.end_date <= endDate
        );
        
        return {
          ...game,
          ticket_sales: filteredSales,
          expenses: filteredExpenses,
          weeks: filteredWeeks,
        };
      });
    }
    
    // Calculate totals
    let totalSales = 0;
    let totalPayouts = 0;
    let totalExpenses = 0;
    let totalDonations = 0;
    let organizationTotalPortion = 0;
    let totalTicketsSold = 0;
    
    filteredGames.forEach(game => {
      // If using date filters, calculate from filtered data
      if (startDate && endDate) {
        const sales = game.ticket_sales.reduce((sum, sale) => sum + sale.amount_collected, 0);
        totalSales += sales;
        totalPayouts += game.ticket_sales.reduce((sum, sale) => sum + sale.weekly_payout_amount, 0);
        
        const expenses = game.expenses.filter(e => !e.is_donation);
        const donations = game.expenses.filter(e => e.is_donation);
        
        totalExpenses += expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalDonations += donations.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Calculate organization portion
        const orgPortion = game.ticket_sales.reduce((sum, sale) => sum + sale.organization_total, 0);
        organizationTotalPortion += orgPortion;
        
        // Calculate tickets sold
        totalTicketsSold += game.ticket_sales.reduce((sum, sale) => sum + sale.tickets_sold, 0);
      } else {
        // Use pre-calculated totals
        totalSales += game.total_sales;
        totalPayouts += game.total_payouts;
        totalExpenses += game.total_expenses;
        totalDonations += game.total_donations;
        
        // Calculate organization portion (total_sales * organization_percentage / 100)
        const orgPortion = game.total_sales * (game.organization_percentage / 100);
        organizationTotalPortion += orgPortion;
        
        // Calculate tickets sold (approximate based on ticket price)
        if (game.ticket_price > 0) {
          totalTicketsSold += Math.round(game.total_sales / game.ticket_price);
        }
      }
    });
    
    // Calculate net profit
    const organizationNetProfit = organizationTotalPortion - totalExpenses - totalDonations;
    
    // Calculate jackpot portion (total_sales - organizationTotalPortion)
    const jackpotTotalPortion = totalSales - organizationTotalPortion;
    
    return {
      totalTicketsSold,
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      organizationTotalPortion,
      jackpotTotalPortion,
      organizationNetProfit,
      filteredGames,
    };
  };
  
  const summary = calculateSummaryData();
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Generate PDF report (simplified for space)
  const generatePdfReport = async () => {
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your report...",
      });
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;
      
      // Add title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text('Queen of Hearts Financial Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Add date and filters
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, yPosition);
      yPosition += 8;
      
      const selectedGameName = selectedGame === "all" 
        ? "All Games" 
        : games.find(g => g.id === selectedGame)?.name || "Unknown";
      doc.text(`Game: ${selectedGameName}`, 20, yPosition);
      yPosition += 15;
      
      // Add KPIs
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Key Performance Indicators', 20, yPosition);
      yPosition += 10;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const kpis = [
        [`Total Revenue: ${formatCurrency(kpiData.totalRevenue)}`, `Total Profit: ${formatCurrency(kpiData.totalProfit)}`],
        [`Profit Margin: ${formatPercentage(kpiData.profitMargin)}`, `Revenue per Ticket: ${formatCurrency(kpiData.revenuePerTicket)}`],
        [`Tickets Sold: ${kpiData.totalTicketsSold.toLocaleString()}`, `Growth Rate: ${formatPercentage(kpiData.growthRate)}`],
      ];
      
      kpis.forEach(([left, right]) => {
        doc.text(left, 20, yPosition);
        doc.text(right, 120, yPosition);
        yPosition += 7;
      });
      
      // Add summary section
      yPosition += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Financial Summary', 20, yPosition);
      yPosition += 10;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const summaryData = [
        ['Total Sales', formatCurrency(summary.totalSales)],
        ['Total Payouts', formatCurrency(summary.totalPayouts)],
        ['Total Expenses', formatCurrency(summary.totalExpenses)],
        ['Total Donations', formatCurrency(summary.totalDonations)],
        ['Organization Net Profit', formatCurrency(summary.organizationNetProfit)],
      ];
      
      summaryData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 20, yPosition);
        yPosition += 7;
      });
      
      const fileName = `queen-of-hearts-analytics-${selectedGameName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Generated",
        description: `Your analytics report has been downloaded as ${fileName}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4E4A] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="report-container" ref={reportContainerRef}>
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Financial Analytics</h1>
            <p className="text-[#A1E96C] mt-2">Comprehensive insights into your Queen of Hearts performance</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={generatePdfReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
        
        {/* Quick Date Filters */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter("all")}
            className={`text-white border-white/20 hover:bg-white/10 ${!startDate && !endDate ? 'bg-white/20' : ''}`}>
            All Time
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter("7d")}
            className="text-white border-white/20 hover:bg-white/10">
            Last 7 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter("30d")}
            className="text-white border-white/20 hover:bg-white/10">
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter("90d")}
            className="text-white border-white/20 hover:bg-white/10">
            Last 90 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter("1y")}
            className="text-white border-white/20 hover:bg-white/10">
            Last Year
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(kpiData.totalRevenue)}</p>
                <p className="text-xs text-blue-500 mt-1">
                  {kpiData.growthRate >= 0 ? (
                    <span className="flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> +{formatPercentage(kpiData.growthRate)}</span>
                  ) : (
                    <span className="flex items-center"><TrendingDown className="h-3 w-3 mr-1" /> {formatPercentage(kpiData.growthRate)}</span>
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Profit Margin</p>
                <p className="text-2xl font-bold text-green-900">{formatPercentage(kpiData.profitMargin)}</p>
                <p className="text-xs text-green-500 mt-1">{formatCurrency(kpiData.totalProfit)} profit</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Tickets Sold</p>
                <p className="text-2xl font-bold text-purple-900">{kpiData.totalTicketsSold.toLocaleString()}</p>
                <p className="text-xs text-purple-500 mt-1">{formatCurrency(kpiData.revenuePerTicket)}/ticket</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">ROI</p>
                <p className="text-2xl font-bold text-orange-900">{formatPercentage(kpiData.roi)}</p>
                <p className="text-xs text-orange-500 mt-1">Return on Investment</p>
              </div>
              <Trophy className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters & Search
              </CardTitle>
              <CardDescription>Customize your analytics view with powerful filtering options</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "summary" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("summary")}
              >
                <Grid className="h-4 w-4 mr-2" />
                Summary
              </Button>
              <Button
                variant={viewMode === "detailed" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("detailed")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Detailed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search Games</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="gameFilter">Game Selection</Label>
              <select
                id="gameFilter"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Games</option>
                {games.map(game => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="reportType">Analysis Type</Label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as "weekly" | "game" | "cumulative")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="weekly">Weekly Analysis</option>
                <option value="game">Game Analysis</option>
                <option value="cumulative">Cumulative Analysis</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Three-Column Summary Layout - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#F7F8FC] to-white border-2 border-[#A1E96C]/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1F4E4A]">
              <DollarSign className="h-5 w-5" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Tickets Sold</span>
                <span className="font-bold text-[#1F4E4A]">{summary.totalTicketsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Sales</span>
                <span className="font-bold text-green-600">{formatCurrency(summary.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Payouts</span>
                <span className="font-bold text-blue-600">{formatCurrency(summary.totalPayouts)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Expenses</span>
                <span className="font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Donated</span>
                <span className="font-bold text-purple-600">{formatCurrency(summary.totalDonations)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
              <Trophy className="h-5 w-5" />
              Payout Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Jackpot Portion</span>
                <span className="font-bold text-blue-600">{formatCurrency(summary.jackpotTotalPortion)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Payouts</span>
                <span className="font-bold text-blue-800">{formatCurrency(summary.totalPayouts)}</span>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Payout Efficiency</p>
                <p className="text-2xl font-bold text-blue-800">{formatPercentage(kpiData.payoutRatio)}</p>
                <p className="text-xs text-blue-500">of total revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5" />
              Organization Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Organization Portion</span>
                <span className="font-bold text-green-600">{formatCurrency(summary.organizationTotalPortion)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Expenses</span>
                <span className="font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-medium">Total Donations</span>
                <span className="font-bold text-purple-600">{formatCurrency(summary.totalDonations)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border-2 border-green-300">
                <span className="font-bold text-green-800">Net Profit</span>
                <span className="font-bold text-green-800">{formatCurrency(summary.organizationNetProfit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Enhanced Charts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Financial Analytics Charts
              </CardTitle>
              <CardDescription>Interactive visualizations of your financial data</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "pie" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("pie")}
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("area")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" && (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Sales" fill="#A1E96C" name="Sales" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Payouts" fill="#1F4E4A" name="Payouts" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#132E2C" name="Expenses" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Donations" fill="#7B8C8A" name="Donations" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
              
              {chartType === "line" && (
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="Sales" stroke="#A1E96C" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Payouts" stroke="#1F4E4A" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Profit" stroke="#132E2C" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              )}
              
              {chartType === "pie" && (
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              )}
              
              {chartType === "area" && (
                <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="Sales" stackId="1" stroke="#A1E96C" fill="#A1E96C" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Expenses" stackId="1" stroke="#132E2C" fill="#132E2C" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Donations" stackId="1" stroke="#7B8C8A" fill="#7B8C8A" fillOpacity={0.6} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Data Tables */}
      {viewMode === "detailed" && (
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-[400px]">
            <TabsTrigger value="summary">Game Summary</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
            <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Game Performance Summary</CardTitle>
                <CardDescription>Comprehensive overview of each game's financial performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {summary.filteredGames.map(game => (
                    <div key={game.id} className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-lg border-l-4 border-[#A1E96C]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#1F4E4A]">{game.name}</h3>
                        <div className="text-sm text-gray-500">
                          {game.start_date && `${format(new Date(game.start_date), 'MMM d, yyyy')}`}
                          {game.end_date && ` - ${format(new Date(game.end_date), 'MMM d, yyyy')}`}
                          {!game.end_date && ' - Ongoing'}
                        </div>
                      </div>
                      
                      {/* Game KPIs */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600">Sales</p>
                          <p className="font-bold text-green-600">{formatCurrency(game.total_sales)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600">Payouts</p>
                          <p className="font-bold text-blue-600">{formatCurrency(game.total_payouts)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600">Expenses</p>
                          <p className="font-bold text-red-600">{formatCurrency(game.total_expenses)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600">Donations</p>
                          <p className="font-bold text-purple-600">{formatCurrency(game.total_donations)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600">Net Profit</p>
                          <p className="font-bold text-[#1F4E4A]">{formatCurrency(game.organization_net_profit)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-600">Carryover</p>
                          <p className="font-bold text-orange-600">{formatCurrency(game.carryover_jackpot)}</p>
                        </div>
                      </div>
                      
                      {/* Performance Indicators */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="text-sm text-gray-600 mb-2">Profit Margin</p>
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (game.organization_net_profit / game.total_sales) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {game.total_sales > 0 ? formatPercentage((game.organization_net_profit / game.total_sales) * 100) : '0%'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="text-sm text-gray-600 mb-2">Payout Ratio</p>
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (game.total_payouts / game.total_sales) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {game.total_sales > 0 ? formatPercentage((game.total_payouts / game.total_sales) * 100) : '0%'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="text-sm text-gray-600 mb-2">Expense Ratio</p>
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className="bg-red-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, ((game.total_expenses + game.total_donations) / game.total_sales) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {game.total_sales > 0 ? formatPercentage(((game.total_expenses + game.total_donations) / game.total_sales) * 100) : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Trend Analysis</CardTitle>
                <CardDescription>Track performance patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="Sales" fill="#A1E96C" name="Weekly Sales" />
                      <Line type="monotone" dataKey="Profit" stroke="#1F4E4A" strokeWidth={3} name="Weekly Profit" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Trend Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Best Performing Week</h4>
                      {trendData.length > 0 && (
                        <div>
                          <p className="text-lg font-bold text-blue-900">
                            {trendData.reduce((best, week) => week.Sales > best.Sales ? week : best, trendData[0]).name}
                          </p>
                          <p className="text-sm text-blue-600">
                            {formatCurrency(Math.max(...trendData.map(w => w.Sales)))} in sales
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-green-800 mb-2">Average Weekly Sales</h4>
                      <p className="text-lg font-bold text-green-900">
                        {trendData.length > 0 ? formatCurrency(trendData.reduce((sum, week) => sum + week.Sales, 0) / trendData.length) : '$0'}
                      </p>
                      <p className="text-sm text-green-600">Across all weeks</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-purple-800 mb-2">Growth Trend</h4>
                      <p className="text-lg font-bold text-purple-900">
                        {kpiData.growthRate >= 0 ? '+' : ''}{formatPercentage(kpiData.growthRate)}
                      </p>
                      <p className="text-sm text-purple-600">Monthly growth rate</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="breakdown">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Detailed Financial Breakdown</CardTitle>
                    <CardDescription>Complete transaction-level data analysis</CardDescription>
                  </div>
                  <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#1F4E4A]">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Expense/Donation
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <ExpenseModal 
                        open={addExpenseOpen} 
                        onOpenChange={setAddExpenseOpen}
                        gameId=""
                        gameName="All Games"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {summary.filteredGames.map(game => (
                  <div key={game.id} className="space-y-6">
                    <h3 className="text-lg font-medium">{game.name}</h3>
                    
                    {/* Ticket Sales Table */}
                    {game.ticket_sales.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Daily Ticket Sales</h4>
                        <div className="overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Tickets Sold</TableHead>
                                <TableHead>Ticket Price</TableHead>
                                <TableHead>Amount Collected</TableHead>
                                <TableHead>Organization Total</TableHead>
                                <TableHead>Jackpot Total</TableHead>
                                <TableHead>Weekly Payout</TableHead>
                                <TableHead>Ending Jackpot</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {game.ticket_sales.map(sale => (
                                <TableRow key={sale.id}>
                                  <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                                  <TableCell>{sale.tickets_sold}</TableCell>
                                  <TableCell>{formatCurrency(sale.ticket_price)}</TableCell>
                                  <TableCell>{formatCurrency(sale.amount_collected)}</TableCell>
                                  <TableCell>{formatCurrency(sale.organization_total)}</TableCell>
                                  <TableCell>{formatCurrency(sale.jackpot_total)}</TableCell>
                                  <TableCell>{formatCurrency(sale.weekly_payout_amount)}</TableCell>
                                  <TableCell>{formatCurrency(sale.ending_jackpot_total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Expenses Table */}
                    {game.expenses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Expenses & Donations</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Memo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {game.expenses.map(expense => (
                              <TableRow key={expense.id}>
                                <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{expense.is_donation ? 'Donation' : 'Expense'}</TableCell>
                                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                <TableCell>{expense.memo || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
