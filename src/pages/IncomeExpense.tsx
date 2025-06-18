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
import { useAdmin } from "@/context/AdminContext";
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
  const { getCurrentUserId, viewingOrganization } = useAdmin();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reportType, setReportType] = useState<"weekly" | "game" | "cumulative">("cumulative");
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  // Get the current user ID (either the logged-in user or the organization being viewed by admin)
  const currentUserId = getCurrentUserId();

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
      if (!currentUserId) return;
      
      setLoading(true);
      try {
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .eq('user_id', currentUserId)
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
  }, [currentUserId, toast]);

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
    let totalDistributions = 0;
    let totalExpenses = 0;
    let totalDonations = 0;
    let organizationTotalPortion = 0;
    let totalTicketsSold = 0;
    
    filteredGames.forEach(game => {
      if (startDate && endDate) {
        const sales = game.ticket_sales.reduce((sum, sale) => sum + sale.amount_collected, 0);
        totalSales += sales;
        totalDistributions += game.ticket_sales.reduce((sum, sale) => sum + sale.weekly_payout_amount, 0);
        
        const expenses = game.expenses.filter(e => !e.is_donation);
        const donations = game.expenses.filter(e => e.is_donation);
        
        totalExpenses += expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalDonations += donations.reduce((sum, expense) => sum + expense.amount, 0);
        
        const orgPortion = game.ticket_sales.reduce((sum, sale) => sum + sale.organization_total, 0);
        organizationTotalPortion += orgPortion;
        
        totalTicketsSold += game.ticket_sales.reduce((sum, sale) => sum + sale.tickets_sold, 0);
      } else {
        totalSales += game.total_sales;
        totalDistributions += game.total_payouts;
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
      totalDistributions,
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

  // Enhanced PDF generation with comprehensive structure
  const generatePdfReport = async () => {
    try {
      toast({
        title: "Generating Report",
        description: "Please wait while we prepare your comprehensive financial analysis...",
      });
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      const leftMargin = 20;
      const rightMargin = pageWidth - 20;
      const lineHeight = 7;
      
      // Helper function to add new page if needed
      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
      };
      
      // Header Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(31, 78, 74); // #1F4E4A
      doc.text('Queen of Hearts Financial Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Report metadata
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      
      const reportPeriod = startDate && endDate 
        ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
        : 'All Time';
      doc.text(`Report Period: ${reportPeriod}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      
      const gameScope = selectedGame === "all" ? "All Games" : games.find(g => g.id === selectedGame)?.name || "Unknown Game";
      doc.text(`Scope: ${gameScope}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Executive Summary Section
      checkNewPage(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(31, 78, 74);
      doc.text('Executive Summary', leftMargin, yPosition);
      yPosition += 10;
      
      // Summary metrics in a structured layout
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      const summaryData = [
        ['Total Tickets Sold', summary.totalTicketsSold.toLocaleString()],
        ['Total Revenue', formatCurrency(summary.totalSales)],
        ['Total Distributions', formatCurrency(summary.totalDistributions)],
        ['Total Expenses', formatCurrency(summary.totalExpenses)],
        ['Total Donations', formatCurrency(summary.totalDonations)],
        ['Organization Net Profit', formatCurrency(summary.organizationNetProfit)]
      ];
      
      summaryData.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label + ':', leftMargin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(value, leftMargin + 60, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += 10;
      
      // Financial Breakdown Section
      checkNewPage(80);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(31, 78, 74);
      doc.text('Financial Breakdown', leftMargin, yPosition);
      yPosition += 10;
      
      // Three-column structure as per requirements
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(19, 46, 44);
      
      // Column 1: Overall Totals
      doc.text('Overall Totals', leftMargin, yPosition);
      yPosition += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const overallTotals = [
        ['Tickets Sold', summary.totalTicketsSold.toLocaleString()],
        ['Ticket Sales', formatCurrency(summary.totalSales)],
        ['Total Distributions', formatCurrency(summary.totalDistributions)],
        ['Total Expenses', formatCurrency(summary.totalExpenses)],
        ['Total Donated', formatCurrency(summary.totalDonations)]
      ];
      
      overallTotals.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, leftMargin + 5, yPosition);
        yPosition += 5;
      });
      
      // Reset position for second column
      let column2Y = yPosition - (overallTotals.length * 5) - 8;
      
      // Column 2: Distribution Portion Allocation
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(19, 46, 44);
      doc.text('Distribution Portion (60%)', leftMargin + 70, column2Y);
      column2Y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      doc.text(`Total Sales: ${formatCurrency(summary.jackpotTotalPortion)}`, leftMargin + 75, column2Y);
      column2Y += 5;
      doc.text(`Total Distributions: ${formatCurrency(summary.totalDistributions)}`, leftMargin + 75, column2Y);
      column2Y += 5;
      
      // Column 3: Organization Portion Allocation
      let column3Y = yPosition - (overallTotals.length * 5) - 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(19, 46, 44);
      doc.text('Organization Portion (40%)', leftMargin + 130, column3Y);
      column3Y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const orgPortionData = [
        ['Total Sales', formatCurrency(summary.organizationTotalPortion)],
        ['Total Expenses', formatCurrency(summary.totalExpenses)],
        ['Total Donations', formatCurrency(summary.totalDonations)],
        ['Net Profit', formatCurrency(summary.organizationNetProfit)]
      ];
      
      orgPortionData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, leftMargin + 135, column3Y);
        column3Y += 5;
      });
      
      yPosition += 10;
      
      // Game Summary Section
      if (summary.filteredGames.length > 0) {
        checkNewPage(60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(31, 78, 74);
        doc.text('Game Summary', leftMargin, yPosition);
        yPosition += 10;
        
        summary.filteredGames.forEach((game, index) => {
          checkNewPage(30);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(19, 46, 44);
          doc.text(`${game.name}`, leftMargin, yPosition);
          yPosition += 8;
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          
          const gameData = [
            ['Start Date', format(new Date(game.start_date), 'MMM d, yyyy')],
            ['End Date', game.end_date ? format(new Date(game.end_date), 'MMM d, yyyy') : 'Ongoing'],
            ['Total Sales', formatCurrency(game.total_sales)],
            ['Total Distributions', formatCurrency(game.total_payouts)],
            ['Total Expenses', formatCurrency(game.total_expenses)],
            ['Total Donations', formatCurrency(game.total_donations)],
            ['Net Profit', formatCurrency(game.organization_net_profit)],
            ['Weeks Played', game.weeks.length.toString()]
          ];
          
          gameData.forEach(([label, value]) => {
            doc.text(`${label}: ${value}`, leftMargin + 10, yPosition);
            yPosition += 5;
          });
          
          yPosition += 5;
        });
      }
      
      // Winner Information Section
      if (winners.length > 0) {
        checkNewPage(60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(31, 78, 74);
        doc.text('Recent Winners', leftMargin, yPosition);
        yPosition += 10;
        
        // Show last 10 winners to avoid overwhelming the PDF
        const recentWinners = winners.slice(0, 10);
        
        recentWinners.forEach((winner) => {
          checkNewPage(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(19, 46, 44);
          doc.text(`${winner.name}`, leftMargin, yPosition);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          doc.text(`${winner.gameName} - Week ${winner.weekNumber}`, leftMargin + 50, yPosition);
          doc.text(`${winner.card} (Slot ${winner.slot})`, leftMargin + 110, yPosition);
          doc.text(`${formatCurrency(winner.amount)}`, leftMargin + 160, yPosition);
          yPosition += 6;
        });
        
        if (winners.length > 10) {
          yPosition += 5;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`... and ${winners.length - 10} more winners`, leftMargin, yPosition);
        }
      }
      
      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Queen of Hearts Financial Report', leftMargin, pageHeight - 10);
      }
      
      const filename = `queen-of-hearts-financial-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(filename);
      
      toast({
        title: "Report Generated Successfully",
        description: `Your comprehensive financial report has been downloaded as ${filename}`,
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
              {viewingOrganization && (
                <span className="block text-lg font-normal text-[#132E2C]/70 mt-2">
                  for {viewingOrganization.organization_name || viewingOrganization.email}
                </span>
              )}
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
              reportType="cumulative"
              selectedGame={selectedGame}
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
              selectedGame={selectedGame}
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
