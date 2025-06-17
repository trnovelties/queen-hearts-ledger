import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { 
  Download, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  BarChart3, 
  Filter, 
  Calendar,
  Receipt,
  Users,
  Trophy,
  Banknote,
  HeartHandshake,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity
} from "lucide-react";
import jsPDF from "jspdf";
import { ExpenseModal } from "@/components/ExpenseModal";
import { FinancialCharts } from "@/components/FinancialCharts";
import { GameComparisonTable } from "@/components/GameComparisonTable";
import { DetailedFinancialTable } from "@/components/DetailedFinancialTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { WinnerInformation } from "@/components/WinnerInformation";

// Define types
type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

export default function IncomeExpense() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reportType, setReportType] = useState<"weekly" | "game" | "cumulative">("cumulative");
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

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
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .order('game_number', { ascending: false });
        
        if (gamesError) throw gamesError;
        
        if (gamesData) {
          const gamesWithDetails: GameSummary[] = [];
          
          for (const game of gamesData) {
            const { data: weeksData, error: weeksError } = await supabase
              .from('weeks')
              .select('*')
              .eq('game_id', game.id)
              .order('week_number', { ascending: true });
            
            if (weeksError) throw weeksError;
            
            const { data: salesData, error: salesError } = await supabase
              .from('ticket_sales')
              .select('*')
              .eq('game_id', game.id)
              .order('date', { ascending: true });
            
            if (salesError) throw salesError;
            
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

  // Calculate summary data
  const calculateSummaryData = () => {
    let filteredGames = games;
    
    if (selectedGame !== "all") {
      filteredGames = games.filter(game => game.id === selectedGame);
    }
    
    if (startDate && endDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      filteredGames = filteredGames.map(game => {
        const filteredSales = game.ticket_sales.filter(sale => 
          sale.date >= startDateStr && sale.date <= endDateStr
        );
        
        const filteredExpenses = game.expenses.filter(expense => 
          expense.date >= startDateStr && expense.date <= endDateStr
        );
        
        const filteredWeeks = game.weeks.filter(week => 
          week.start_date >= startDateStr && week.end_date <= endDateStr
        );
        
        return {
          ...game,
          ticket_sales: filteredSales,
          expenses: filteredExpenses,
          weeks: filteredWeeks,
        };
      });
    }
    
    let totalSales = 0;
    let totalPayouts = 0;
    let totalExpenses = 0;
    let totalDonations = 0;
    let organizationTotalPortion = 0;
    let totalTicketsSold = 0;
    
    filteredGames.forEach(game => {
      if (startDate && endDate) {
        const sales = game.ticket_sales.reduce((sum, sale) => sum + sale.amount_collected, 0);
        totalSales += sales;
        totalPayouts += game.ticket_sales.reduce((sum, sale) => sum + sale.weekly_payout_amount, 0);
        
        const expenses = game.expenses.filter(e => !e.is_donation);
        const donations = game.expenses.filter(e => e.is_donation);
        
        totalExpenses += expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalDonations += donations.reduce((sum, expense) => sum + expense.amount, 0);
        
        const orgPortion = game.ticket_sales.reduce((sum, sale) => sum + sale.organization_total, 0);
        organizationTotalPortion += orgPortion;
        
        totalTicketsSold += game.ticket_sales.reduce((sum, sale) => sum + sale.tickets_sold, 0);
      } else {
        totalSales += game.total_sales;
        totalPayouts += game.total_payouts;
        totalExpenses += game.total_expenses;
        totalDonations += game.total_donations;
        
        const orgPortion = game.total_sales * (game.organization_percentage / 100);
        organizationTotalPortion += orgPortion;
        
        if (game.ticket_price > 0) {
          totalTicketsSold += Math.round(game.total_sales / game.ticket_price);
        }
      }
    });
    
    const organizationNetProfit = organizationTotalPortion - totalExpenses - totalDonations;
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

  // Get winner information based on selected game
  const getWinnerInformation = () => {
    const winners = [];
    
    if (selectedGame === "all") {
      // Show all winners from all games
      summary.filteredGames.forEach(game => {
        game.weeks.forEach(week => {
          if (week.winner_name) {
            winners.push({
              name: week.winner_name,
              slot: week.slot_chosen,
              card: week.card_selected,
              amount: week.weekly_payout,
              present: week.winner_present,
              date: week.end_date,
              gameName: game.name,
              gameNumber: game.game_number,
              weekNumber: week.week_number
            });
          }
        });
      });
      // Sort by date descending (most recent first)
      winners.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      // Show only winners from selected game
      const selectedGameData = summary.filteredGames.find(game => game.id === selectedGame);
      if (selectedGameData) {
        selectedGameData.weeks.forEach(week => {
          if (week.winner_name) {
            winners.push({
              name: week.winner_name,
              slot: week.slot_chosen,
              card: week.card_selected,
              amount: week.weekly_payout,
              present: week.winner_present,
              date: week.end_date,
              gameName: selectedGameData.name,
              gameNumber: selectedGameData.game_number,
              weekNumber: week.week_number
            });
          }
        });
        // Sort by week number descending (most recent first)
        winners.sort((a, b) => b.weekNumber - a.weekNumber);
      }
    }
    
    return winners;
  };

  const winners = getWinnerInformation();

  // Enhanced KPI Card Component
  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend = 0, 
    subtitle = "",
    variant = "default",
    percentage = 0 
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    subtitle?: string;
    variant?: "default" | "revenue" | "expense" | "profit";
    percentage?: number;
  }) => {
    const cardStyles = {
      default: "bg-white border-[#1F4E4A]/10",
      revenue: "bg-gradient-to-br from-[#A1E96C]/10 to-[#A1E96C]/5 border-[#A1E96C]/30",
      expense: "bg-gradient-to-br from-red-50 to-red-25 border-red-200",
      profit: "bg-gradient-to-br from-[#1F4E4A]/10 to-[#132E2C]/5 border-[#1F4E4A]/30"
    };

    return (
      <Card className={`${cardStyles[variant]} hover:shadow-lg transition-all duration-300 relative overflow-hidden`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-[#132E2C]/60 uppercase tracking-wider">{title}</p>
                {percentage > 0 && (
                  <Badge variant="secondary" className="text-xs bg-[#F7F8FC] text-[#132E2C]">
                    {percentage.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-[#1F4E4A] font-inter">
                {typeof value === 'number' ? formatCurrency(value) : value}
              </p>
              {subtitle && (
                <p className="text-xs text-[#132E2C]/50 font-medium">{subtitle}</p>
              )}
              {trend !== 0 && (
                <div className={`flex items-center text-xs font-medium ${
                  trend > 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {trend > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(trend).toFixed(1)}% vs last period
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${
              variant === 'revenue' ? 'bg-[#A1E96C]/20' :
              variant === 'expense' ? 'bg-red-100' :
              variant === 'profit' ? 'bg-[#1F4E4A]/20' :
              'bg-[#F7F8FC]'
            }`}>
              <Icon className={`h-6 w-6 ${
                variant === 'revenue' ? 'text-[#1F4E4A]' :
                variant === 'expense' ? 'text-red-600' :
                variant === 'profit' ? 'text-[#1F4E4A]' :
                'text-[#1F4E4A]'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Generate PDF report
  const generatePdfReport = async () => {
    try {
      toast({
        title: "Generating Report",
        description: "Please wait while we prepare your financial analysis...",
      });
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text('Queen of Hearts Financial Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Summary section
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, yPosition);
      yPosition += 10;
      
      doc.text(`Total Revenue: ${formatCurrency(summary.totalSales)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Payouts: ${formatCurrency(summary.totalPayouts)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Net Profit: ${formatCurrency(summary.organizationNetProfit)}`, 20, yPosition);
      
      doc.save(`financial-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Report Generated",
        description: "Your financial report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F8FC] via-white to-[#F7F8FC]/50">
        <div className="container mx-auto p-8">
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#A1E96C] border-t-[#1F4E4A]"></div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-[#1F4E4A] font-inter">Loading Financial Data</h3>
              <p className="text-[#132E2C]/60">Analyzing your Queen of Hearts performance...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F8FC] via-white to-[#F7F8FC]/50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Professional Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1F4E4A]/10">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-[#1F4E4A] font-inter tracking-tight">
              Financial Analytics & Reporting
            </h1>
            <p className="text-lg text-[#132E2C]/70 font-medium">
              Comprehensive financial insights and performance analytics for Queen of Hearts fundraising
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline"
              onClick={generatePdfReport}
              className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white font-medium shadow-lg">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Transaction
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
        </div>

        {/* Advanced Filters */}
        <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-[#1F4E4A]" />
              <div>
                <CardTitle className="text-[#1F4E4A] font-inter">Analysis Configuration</CardTitle>
                <CardDescription className="text-[#132E2C]/60">
                  Configure your financial analysis parameters and time ranges
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#132E2C] flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Game Selection
                </Label>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger className="border-[#1F4E4A]/20 focus:ring-[#A1E96C] font-medium">
                    <SelectValue placeholder="Select games" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games</SelectItem>
                    {games.map(game => (
                      <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#132E2C] flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <DatePickerWithInput
                  date={startDate}
                  setDate={setStartDate}
                  placeholder="Select start date"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#132E2C] flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <DatePickerWithInput
                  date={endDate}
                  setDate={setEndDate}
                  placeholder="Select end date"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#132E2C] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analysis Type
                </Label>
                <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                  <SelectTrigger className="border-[#1F4E4A]/20 focus:ring-[#A1E96C] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly Analysis</SelectItem>
                    <SelectItem value="game">Game Analysis</SelectItem>
                    <SelectItem value="cumulative">Cumulative Overview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview Section */}
        <FinancialOverview summary={summary} formatCurrency={formatCurrency} />

        {/* Winner Information Section */}
        {winners.length > 0 && (
          <WinnerInformation winners={winners} formatCurrency={formatCurrency} />
        )}

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-[#F7F8FC] p-1 rounded-xl h-12">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-semibold transition-all"
            >
              <PieChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="comparison" 
              className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-semibold transition-all"
            >
              <Target className="h-4 w-4 mr-2" />
              Game Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-semibold transition-all"
            >
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white rounded-lg font-semibold transition-all"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <FinancialCharts 
              games={summary.filteredGames}
              reportType={reportType}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <GameComparisonTable 
              games={summary.filteredGames}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <FinancialCharts 
              games={summary.filteredGames}
              reportType={reportType}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <DetailedFinancialTable 
              games={summary.filteredGames}
              formatCurrency={formatCurrency}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
