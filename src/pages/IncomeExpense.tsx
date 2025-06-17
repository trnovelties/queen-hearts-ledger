import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Download, PlusCircle, TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3, ArrowUpRight, ArrowDownRight, Filter, Calendar, GamepadIcon } from "lucide-react";
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
};

export default function IncomeExpense() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportType, setReportType] = useState<"weekly" | "game" | "cumulative">("game");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    gameId: "",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    memo: "",
    isDonation: false,
  });
  
  const reportContainerRef = useRef<HTMLDivElement>(null);
  
  // Set selected game from URL parameter
  useEffect(() => {
    const gameId = searchParams.get("game");
    if (gameId) {
      setSelectedGame(gameId);
    }
  }, [searchParams]);
  
  // Fetch all games and related data
  useEffect(() => {
    async function fetchFinancialData() {
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
          
          // Generate chart data
          const chartDataArray = gamesWithDetails.map(game => ({
            name: game.name,
            Sales: game.total_sales,
            Payouts: game.total_payouts,
            Expenses: game.total_expenses,
            Donations: game.total_donations,
          }));
          
          setChartData(chartDataArray);
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
    }
    
    fetchFinancialData();
  }, [user, toast]);
  
  // Handle adding a new expense/donation
  const handleAddExpense = async () => {
    try {
      if (!newExpense.gameId || !newExpense.date || newExpense.amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields.",
          variant: "destructive",
        });
        return;
      }
      
      // Get selected game
      const gameIndex = games.findIndex(game => game.id === newExpense.gameId);
      if (gameIndex === -1) return;
      const game = games[gameIndex];
      
      // Insert new expense into Supabase
      const { data: newExpenseData, error } = await supabase
        .from('expenses')
        .insert({
          game_id: newExpense.gameId,
          date: newExpense.date,
          amount: newExpense.amount,
          memo: newExpense.memo,
          is_donation: newExpense.isDonation,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update game totals
      const updatedDonations = newExpense.isDonation ? 
        game.total_donations + newExpense.amount : 
        game.total_donations;
      
      const updatedExpenses = !newExpense.isDonation ? 
        game.total_expenses + newExpense.amount : 
        game.total_expenses;
      
      const updatedOrganizationNetProfit = game.organization_net_profit - newExpense.amount;
      
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          total_donations: updatedDonations,
          total_expenses: updatedExpenses,
          organization_net_profit: updatedOrganizationNetProfit,
        })
        .eq('id', newExpense.gameId);
      
      if (gameUpdateError) throw gameUpdateError;
      
      // Update local state
      const updatedGames = [...games];
      if (newExpense.isDonation) {
        updatedGames[gameIndex].total_donations = updatedDonations;
      } else {
        updatedGames[gameIndex].total_expenses = updatedExpenses;
      }
      
      updatedGames[gameIndex].organization_net_profit = updatedOrganizationNetProfit;
      updatedGames[gameIndex].expenses = [...updatedGames[gameIndex].expenses, newExpenseData];
      
      setGames(updatedGames);
      
      // Update chart data
      const updatedChartData = chartData.map(item => {
        if (item.name === game.name) {
          return {
            ...item,
            Expenses: !newExpense.isDonation ? item.Expenses + newExpense.amount : item.Expenses,
            Donations: newExpense.isDonation ? item.Donations + newExpense.amount : item.Donations,
          };
        }
        return item;
      });
      
      setChartData(updatedChartData);
      
      setAddExpenseOpen(false);
      toast({
        title: `${newExpense.isDonation ? "Donation" : "Expense"} Added`,
        description: `Added $${newExpense.amount.toFixed(2)} ${newExpense.isDonation ? "donation" : "expense"} to ${game.name}.`,
      });
      
      // Reset form
      setNewExpense({
        gameId: "",
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        memo: "",
        isDonation: false,
      });
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error Adding Record",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  // Calculate summary data for the selected filter
  const calculateSummaryData = () => {
    let filteredGames = games;
    
    // Filter by selected game
    if (selectedGame !== "all") {
      filteredGames = games.filter(game => game.id === selectedGame);
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
  
  // Enhanced KPI Card Component
  const KPICard = ({ title, value, icon: Icon, trend = 0, subtitle = "" }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    subtitle?: string;
  }) => (
    <Card className="bg-gradient-to-br from-white to-[#F7F8FC] border-[#1F4E4A]/10 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#132E2C]/70 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-[#1F4E4A]">
              {typeof value === 'number' ? formatCurrency(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-[#132E2C]/60">{subtitle}</p>
            )}
            {trend !== 0 && (
              <div className={`flex items-center text-xs ${trend > 0 ? 'text-[#A1E96C]' : 'text-red-500'}`}>
                {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {Math.abs(trend)}% from last period
              </div>
            )}
          </div>
          <div className="p-3 bg-[#1F4E4A]/5 rounded-xl">
            <Icon className="h-6 w-6 text-[#1F4E4A]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Enhanced chart colors
  const chartColors = {
    primary: '#1F4E4A',
    secondary: '#A1E96C',
    accent: '#132E2C',
    muted: '#F7F8FC',
    expense: '#ef4444',
    donation: '#8b5cf6'
  };

  // Generate PDF report
  const generatePdfReport = async () => {
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your report...",
      });
      
      // Create a new PDF document
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      
      // Add title and report information - centered with proper spacing
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text('Queen of Hearts Financial Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Add report type and date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Report Date: ${format(new Date(), 'MMM d, yyyy')}`, 20, yPosition);
      yPosition += 8;
      
      // Add filter information
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Report Filters', 20, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, yPosition);
      yPosition += 7;
      
      const selectedGameName = selectedGame === "all" 
        ? "All Games" 
        : games.find(g => g.id === selectedGame)?.name || "Unknown";
        
      doc.text(`Game Selection: ${selectedGameName}`, 20, yPosition);
      yPosition += 7;
      
      if (startDate && endDate) {
        doc.text(`Date Range: ${format(new Date(startDate), 'MMM d, yyyy')} to ${format(new Date(endDate), 'MMM d, yyyy')}`, 20, yPosition);
        yPosition += 10;
      } else {
        doc.text("Date Range: All dates", 20, yPosition);
        yPosition += 10;
      }
      
      // Add summary section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Financial Summary', 20, yPosition);
      yPosition += 10;
      
      // Summary table setup
      const summaryData = [
        { label: 'Total Tickets Sold', value: summary.totalTicketsSold.toLocaleString() },
        { label: 'Total Sales', value: formatCurrency(summary.totalSales) },
        { label: 'Total Payouts', value: formatCurrency(summary.totalPayouts) },
        { label: 'Total Expenses', value: formatCurrency(summary.totalExpenses) },
        { label: 'Total Donations', value: formatCurrency(summary.totalDonations) },
        { label: 'Organization Portion', value: formatCurrency(summary.organizationTotalPortion) },
        { label: 'Jackpot Portion', value: formatCurrency(summary.jackpotTotalPortion) },
        { label: 'Organization Net Profit', value: formatCurrency(summary.organizationNetProfit) },
      ];
      
      // Draw summary table
      const colWidth1 = 80;
      const colWidth2 = 60;
      const rowHeight = 8;
      
      // Create table headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text('Metric', 20, yPosition);
      doc.text('Value', 20 + colWidth1, yPosition);
      yPosition += 5;
      
      // Draw a line under headers
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 20 + colWidth1 + colWidth2, yPosition);
      yPosition += 5;
      
      // Draw summary table data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      summaryData.forEach(row => {
        // Check if we need a new page
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(row.label, 20, yPosition);
        doc.text(row.value, 20 + colWidth1, yPosition);
        yPosition += rowHeight;
      });
      yPosition += 10;
      
      // Add footer with timestamp
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const timestamp = `Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}`;
      doc.text(timestamp, pageWidth - 20, pageHeight - 10, { align: 'right' });
      
      // Save the PDF
      const fileName = `queen-of-hearts-report-${selectedGameName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Generated",
        description: `Your report has been downloaded as ${fileName}`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F8FC] to-white">
      <div className="container mx-auto p-6 space-y-8" id="report-container" ref={reportContainerRef}>
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[#1F4E4A] tracking-tight">
              Financial Analytics
            </h1>
            <p className="text-[#132E2C]/70 text-lg">
              Comprehensive insights into your Queen of Hearts performance
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={generatePdfReport}
              className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
            <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white shadow-lg">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <ExpenseModal 
                  open={addExpenseOpen} 
                  onOpenChange={setAddExpenseOpen}
                  gameId={newExpense.gameId}
                  gameName={games.find(g => g.id === newExpense.gameId)?.name || "Selected Game"}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Enhanced Filters Section */}
        <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#1F4E4A]" />
              <CardTitle className="text-[#1F4E4A]">Report Filters</CardTitle>
            </div>
            <CardDescription className="text-[#132E2C]/70">
              Customize your analysis by selecting specific games, date ranges, and report types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="gameFilter" className="text-sm font-medium text-[#132E2C]">
                  <GamepadIcon className="h-4 w-4 inline mr-1" />
                  Game Selection
                </Label>
                <select
                  id="gameFilter"
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-[#1F4E4A]/20 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1E96C] focus-visible:ring-offset-2"
                >
                  <option value="all">All Games</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium text-[#132E2C]">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-[#1F4E4A]/20 focus-visible:ring-[#A1E96C]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium text-[#132E2C]">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-[#1F4E4A]/20 focus-visible:ring-[#A1E96C]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reportType" className="text-sm font-medium text-[#132E2C]">
                  <BarChart3 className="h-4 w-4 inline mr-1" />
                  Report Type
                </Label>
                <select
                  id="reportType"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "weekly" | "game" | "cumulative")}
                  className="flex h-11 w-full rounded-lg border border-[#1F4E4A]/20 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1E96C] focus-visible:ring-offset-2"
                >
                  <option value="weekly">Weekly Analysis</option>
                  <option value="game">Game Analysis</option>
                  <option value="cumulative">Cumulative Overview</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#A1E96C] border-t-[#1F4E4A]"></div>
            <p className="text-[#132E2C]/70 text-lg">Loading financial analytics...</p>
          </div>
        ) : (
          <>
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Revenue"
                value={summary.totalSales}
                icon={DollarSign}
                trend={5.2}
                subtitle={`${summary.totalTicketsSold.toLocaleString()} tickets sold`}
              />
              <KPICard
                title="Total Payouts"
                value={summary.totalPayouts}
                icon={Target}
                trend={-2.1}
                subtitle="Winner payments"
              />
              <KPICard
                title="Organization Profit"
                value={summary.organizationNetProfit}
                icon={TrendingUp}
                trend={12.8}
                subtitle="After expenses & donations"
              />
              <KPICard
                title="Active Games"
                value={summary.filteredGames.length}
                icon={Users}
                subtitle="Total games tracked"
              />
            </div>

            {/* Three-Column Enhanced Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall Totals */}
              <Card className="bg-gradient-to-br from-[#1F4E4A] to-[#132E2C] text-white">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Overall Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-white/80">Tickets Sold</span>
                      <span className="font-semibold">{summary.totalTicketsSold.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-white/80">Total Revenue</span>
                      <span className="font-semibold">{formatCurrency(summary.totalSales)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-white/80">Total Payouts</span>
                      <span className="font-semibold">{formatCurrency(summary.totalPayouts)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <span className="text-white/80">Total Expenses</span>
                      <span className="font-semibold">{formatCurrency(summary.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Total Donated</span>
                      <span className="font-semibold">{formatCurrency(summary.totalDonations)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payout Portion */}
              <Card className="bg-gradient-to-br from-[#A1E96C] to-[#A1E96C]/80 text-[#132E2C]">
                <CardHeader>
                  <CardTitle className="text-[#132E2C] flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Payout Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#132E2C]/20 pb-2">
                      <span className="text-[#132E2C]/80">Jackpot Portion</span>
                      <span className="font-semibold">{formatCurrency(summary.jackpotTotalPortion)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#132E2C]/80">Total Payouts</span>
                      <span className="font-semibold">{formatCurrency(summary.totalPayouts)}</span>
                    </div>
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                      <div className="text-xs text-[#132E2C]/70 mb-1">Payout Efficiency</div>
                      <div className="text-lg font-bold">
                        {summary.jackpotTotalPortion > 0 ? 
                          ((summary.totalPayouts / summary.jackpotTotalPortion) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Portion */}
              <Card className="bg-gradient-to-br from-white to-[#F7F8FC] border-[#1F4E4A]/20">
                <CardHeader>
                  <CardTitle className="text-[#1F4E4A] flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Organization Portion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#1F4E4A]/20 pb-2">
                      <span className="text-[#132E2C]/80">Total Revenue</span>
                      <span className="font-semibold text-[#1F4E4A]">{formatCurrency(summary.organizationTotalPortion)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#1F4E4A]/20 pb-2">
                      <span className="text-[#132E2C]/80">Total Expenses</span>
                      <span className="font-semibold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#1F4E4A]/20 pb-2">
                      <span className="text-[#132E2C]/80">Total Donations</span>
                      <span className="font-semibold text-purple-600">{formatCurrency(summary.totalDonations)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#A1E96C]/10 p-2 rounded">
                      <span className="font-medium text-[#132E2C]">Net Profit</span>
                      <span className="font-bold text-[#1F4E4A]">{formatCurrency(summary.organizationNetProfit)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Enhanced Analytics Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-[#F7F8FC] p-1 rounded-xl">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-medium"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-medium"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-medium"
                >
                  Comparison
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-medium"
                >
                  Details
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Enhanced Revenue Chart */}
                  <Card className="bg-white border-[#1F4E4A]/10">
                    <CardHeader>
                      <CardTitle className="text-[#1F4E4A]">Revenue Breakdown</CardTitle>
                      <CardDescription>Sales, payouts, and profit analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1F4E4A20" />
                            <XAxis dataKey="name" stroke="#132E2C" fontSize={12} />
                            <YAxis stroke="#132E2C" fontSize={12} />
                            <Tooltip 
                              formatter={(value) => formatCurrency(value as number)}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #1F4E4A20',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Bar dataKey="Sales" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Payouts" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                            <Line 
                              type="monotone" 
                              dataKey="Expenses" 
                              stroke={chartColors.expense} 
                              strokeWidth={3}
                              dot={{ fill: chartColors.expense, r: 4 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expense Breakdown Pie Chart */}
                  <Card className="bg-white border-[#1F4E4A]/10">
                    <CardHeader>
                      <CardTitle className="text-[#1F4E4A]">Expense Distribution</CardTitle>
                      <CardDescription>How organization funds are allocated</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Donations', value: summary.totalDonations, fill: chartColors.donation },
                                { name: 'Expenses', value: summary.totalExpenses, fill: chartColors.expense },
                                { name: 'Net Profit', value: summary.organizationNetProfit, fill: chartColors.secondary }
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-6">
                {/* Trend Analysis */}
                <Card className="bg-white border-[#1F4E4A]/10">
                  <CardHeader>
                    <CardTitle className="text-[#1F4E4A]">Performance Trends</CardTitle>
                    <CardDescription>Track performance over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="payoutsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F4E4A20" />
                          <XAxis dataKey="name" stroke="#132E2C" />
                          <YAxis stroke="#132E2C" />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="Sales" 
                            stroke={chartColors.secondary} 
                            fillOpacity={1} 
                            fill="url(#salesGradient)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Payouts" 
                            stroke={chartColors.primary} 
                            fillOpacity={1} 
                            fill="url(#payoutsGradient)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="comparison" className="space-y-6">
                {/* Game Comparison Table */}
                <Card className="bg-white border-[#1F4E4A]/10">
                  <CardHeader>
                    <CardTitle className="text-[#1F4E4A]">Game Performance Comparison</CardTitle>
                    <CardDescription>Compare key metrics across all games</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#1F4E4A]/20">
                            <TableHead className="font-semibold text-[#132E2C]">Game</TableHead>
                            <TableHead className="font-semibold text-[#132E2C]">Revenue</TableHead>
                            <TableHead className="font-semibold text-[#132E2C]">Payouts</TableHead>
                            <TableHead className="font-semibold text-[#132E2C]">Profit Margin</TableHead>
                            <TableHead className="font-semibold text-[#132E2C]">ROI</TableHead>
                            <TableHead className="font-semibold text-[#132E2C]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.filteredGames.map(game => {
                            const profitMargin = game.total_sales > 0 ? 
                              ((game.organization_net_profit / game.total_sales) * 100) : 0;
                            const roi = game.total_expenses > 0 ? 
                              ((game.organization_net_profit / game.total_expenses) * 100) : 0;
                            
                            return (
                              <TableRow key={game.id} className="border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/50">
                                <TableCell className="font-medium text-[#1F4E4A]">{game.name}</TableCell>
                                <TableCell>{formatCurrency(game.total_sales)}</TableCell>
                                <TableCell>{formatCurrency(game.total_payouts)}</TableCell>
                                <TableCell>
                                  <span className={profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {profitMargin.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {roi.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    game.end_date ? 
                                    'bg-gray-100 text-gray-800' : 
                                    'bg-[#A1E96C]/20 text-[#132E2C]'
                                  }`}>
                                    {game.end_date ? 'Completed' : 'Active'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details">
                {/* Detailed Game Information */}
                <div className="space-y-6">
                  {summary.filteredGames.map(game => (
                    <Card key={game.id} className="bg-white border-[#1F4E4A]/10">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-[#1F4E4A]">{game.name}</CardTitle>
                            <CardDescription>
                              {game.start_date && `Started: ${format(new Date(game.start_date), 'MMM d, yyyy')}`}
                              {game.end_date && ` | Ended: ${format(new Date(game.end_date), 'MMM d, yyyy')}`}
                            </CardDescription>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            game.end_date ? 
                            'bg-gray-100 text-gray-800' : 
                            'bg-[#A1E96C]/20 text-[#132E2C]'
                          }`}>
                            {game.end_date ? 'Completed' : 'Active'}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Game Summary Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div className="text-center p-3 bg-[#F7F8FC] rounded-lg">
                            <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                            <div className="text-xs text-[#132E2C]/70">Total Sales</div>
                          </div>
                          <div className="text-center p-3 bg-[#F7F8FC] rounded-lg">
                            <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_payouts)}</div>
                            <div className="text-xs text-[#132E2C]/70">Payouts</div>
                          </div>
                          <div className="text-center p-3 bg-[#F7F8FC] rounded-lg">
                            <div className="text-lg font-bold text-red-600">{formatCurrency(game.total_expenses)}</div>
                            <div className="text-xs text-[#132E2C]/70">Expenses</div>
                          </div>
                          <div className="text-center p-3 bg-[#F7F8FC] rounded-lg">
                            <div className="text-lg font-bold text-purple-600">{formatCurrency(game.total_donations)}</div>
                            <div className="text-xs text-[#132E2C]/70">Donations</div>
                          </div>
                          <div className="text-center p-3 bg-[#A1E96C]/20 rounded-lg">
                            <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.organization_net_profit)}</div>
                            <div className="text-xs text-[#132E2C]/70">Net Profit</div>
                          </div>
                          <div className="text-center p-3 bg-[#F7F8FC] rounded-lg">
                            <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.carryover_jackpot)}</div>
                            <div className="text-xs text-[#132E2C]/70">Carryover</div>
                          </div>
                        </div>

                        {/* Weeks Table - if there are weeks */}
                        {game.weeks.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 text-[#132E2C]">Weekly Performance</h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Week</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Sales</TableHead>
                                    <TableHead>Winner</TableHead>
                                    <TableHead>Card</TableHead>
                                    <TableHead>Payout</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {game.weeks.map(week => (
                                    <TableRow key={week.id}>
                                      <TableCell>Week {week.week_number}</TableCell>
                                      <TableCell>
                                        {format(new Date(week.start_date), 'MM/dd')} - {format(new Date(week.end_date), 'MM/dd')}
                                      </TableCell>
                                      <TableCell>{formatCurrency(week.weekly_sales)}</TableCell>
                                      <TableCell>{week.winner_name || '-'}</TableCell>
                                      <TableCell>{week.card_selected || '-'}</TableCell>
                                      <TableCell>{formatCurrency(week.weekly_payout)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Expenses Table - if there are expenses */}
                        {game.expenses.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 text-[#132E2C]">Expenses & Donations</h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Description</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {game.expenses.map(expense => (
                                    <TableRow key={expense.id}>
                                      <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          expense.is_donation ? 
                                          'bg-purple-100 text-purple-800' : 
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {expense.is_donation ? 'Donation' : 'Expense'}
                                        </span>
                                      </TableCell>
                                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                      <TableCell>{expense.memo || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
