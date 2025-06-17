
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Download, PlusCircle, BarChart3, TrendingUp, DollarSign, Target } from "lucide-react";
import jsPDF from "jspdf";
import { ExpenseModal } from "@/components/ExpenseModal";
import { KPICard } from "@/components/KPICard";
import { AdvancedChart } from "@/components/AdvancedChart";
import { EnhancedFilters } from "@/components/EnhancedFilters";

// Define types for data structure
type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

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
  const [reportType, setReportType] = useState<"weekly" | "game" | "cumulative">("cumulative");
  const [chartData, setChartData] = useState<ChartData[]>([]);

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
            Profit: game.organization_net_profit,
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

  // Chart configuration
  const chartConfig = {
    Sales: { label: "Sales", color: "#A1E96C" },
    Payouts: { label: "Payouts", color: "#1F4E4A" },
    Expenses: { label: "Expenses", color: "#132E2C" },
    Donations: { label: "Donations", color: "#7B8C8A" },
    Profit: { label: "Net Profit", color: "#F7F8FC" },
  };

  // Generate PDF report (simplified version)
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
      doc.text('Queen of Hearts Financial Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Add summary data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Total Sales: ${formatCurrency(summary.totalSales)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Total Payouts: ${formatCurrency(summary.totalPayouts)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Organization Net Profit: ${formatCurrency(summary.organizationNetProfit)}`, 20, yPosition);
      
      const fileName = `financial-report-${new Date().toISOString().split('T')[0]}.pdf`;
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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4E4A] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#F7F8FC] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F4E4A]">Financial Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive analysis of your Queen of Hearts games</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={generatePdfReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <ExpenseModal gameId={selectedGame !== "all" ? selectedGame : ""} />
        </div>
      </div>

      {/* Enhanced Filters */}
      <EnhancedFilters
        selectedGame={selectedGame}
        setSelectedGame={setSelectedGame}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        reportType={reportType}
        setReportType={setReportType}
        games={games}
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Sales"
          value={formatCurrency(summary.totalSales)}
          icon={<DollarSign className="h-6 w-6 text-[#1F4E4A]" />}
          trend="up"
        />
        <KPICard
          title="Total Payouts"
          value={formatCurrency(summary.totalPayouts)}
          icon={<TrendingUp className="h-6 w-6 text-[#1F4E4A]" />}
        />
        <KPICard
          title="Organization Profit"
          value={formatCurrency(summary.organizationNetProfit)}
          icon={<Target className="h-6 w-6 text-[#1F4E4A]" />}
          trend={summary.organizationNetProfit > 0 ? "up" : "down"}
        />
        <KPICard
          title="Tickets Sold"
          value={summary.totalTicketsSold.toLocaleString()}
          icon={<BarChart3 className="h-6 w-6 text-[#1F4E4A]" />}
        />
      </div>

      {/* Three-Column Summary Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Totals Column */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#A1E96C] to-[#1F4E4A] text-white">
            <CardTitle className="text-lg">Overall Totals</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Tickets Sold</span>
                <span className="text-lg font-bold">{summary.totalTicketsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Ticket Sales</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(summary.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Total Payouts</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(summary.totalPayouts)}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Total Expenses</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Donated</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalDonations)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Portion Column */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] text-white">
            <CardTitle className="text-lg">Payout Portion</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Jackpot Portion</span>
                <span className="text-lg font-bold">{formatCurrency(summary.jackpotTotalPortion)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Payouts</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(summary.totalPayouts)}</span>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Remaining Jackpot</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(summary.jackpotTotalPortion - summary.totalPayouts)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Portion Column */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#132E2C] to-[#1F4E4A] text-white">
            <CardTitle className="text-lg">Organization Portion</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Organization Portion</span>
                <span className="text-lg font-bold">{formatCurrency(summary.organizationTotalPortion)}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Total Expenses</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Total Donations</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalDonations)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Net Profit</span>
                <span className={`text-lg font-bold ${summary.organizationNetProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.organizationNetProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdvancedChart
          title="Financial Overview"
          description="Sales, payouts, and profit analysis by game"
          data={chartData}
          type="bar"
          config={chartConfig}
        />
        
        <AdvancedChart
          title="Revenue Trends"
          description="Revenue growth over time"
          data={chartData}
          type="line"
          config={{
            Sales: { label: "Sales", color: "#A1E96C" },
            Profit: { label: "Net Profit", color: "#1F4E4A" }
          }}
        />
      </div>

      {/* Detailed Game Analysis */}
      <Tabs defaultValue="games" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games">Game Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expenses & Donations</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="games">
          <Card>
            <CardHeader>
              <CardTitle>Game Performance Summary</CardTitle>
              <CardDescription>Detailed breakdown of each game's financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Total Payouts</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.filteredGames.map(game => {
                      const roi = game.total_sales > 0 ? ((game.organization_net_profit / game.total_sales) * 100) : 0;
                      return (
                        <TableRow key={game.id}>
                          <TableCell className="font-medium">{game.name}</TableCell>
                          <TableCell>{format(new Date(game.start_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{game.end_date ? format(new Date(game.end_date), 'MMM d, yyyy') : 'Active'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(game.total_sales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(game.total_payouts)}</TableCell>
                          <TableCell className="text-right">
                            <span className={game.organization_net_profit > 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(game.organization_net_profit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={roi > 0 ? 'text-green-600' : 'text-red-600'}>
                              {roi.toFixed(1)}%
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
        
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses & Donations Breakdown</CardTitle>
              <CardDescription>Track all expenses and donations across games</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.filteredGames.map(game => (
                  game.expenses.length > 0 && (
                    <div key={game.id} className="space-y-2">
                      <h4 className="font-medium text-lg">{game.name}</h4>
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
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  expense.is_donation ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
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
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators and efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">Average Sale per Ticket</h4>
                  <p className="text-2xl font-bold">
                    {summary.totalTicketsSold > 0 ? formatCurrency(summary.totalSales / summary.totalTicketsSold) : '$0.00'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">Payout Ratio</h4>
                  <p className="text-2xl font-bold">
                    {summary.totalSales > 0 ? ((summary.totalPayouts / summary.totalSales) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">Organization Margin</h4>
                  <p className="text-2xl font-bold">
                    {summary.organizationTotalPortion > 0 ? ((summary.organizationNetProfit / summary.organizationTotalPortion) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
