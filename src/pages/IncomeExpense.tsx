import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Download, PlusCircle, Filter, TrendingUp, DollarSign, Users, Calendar, ChevronDown, ChevronUp, BarChart3, PieChart as PieChartIcon, Activity, Target } from "lucide-react";
import jsPDF from "jspdf";
import { ExpenseModal } from "@/components/ExpenseModal";
import { formatCurrency } from "@/lib/utils";

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
  NetProfit: number;
};

interface KPIData {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  averageTicketSales: number;
  totalGames: number;
  activeGames: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export default function IncomeExpense() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportType, setReportType] = useState<"weekly" | "game" | "cumulative">("game");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [kpiData, setKPIData] = useState<KPIData>({} as KPIData);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "pie">("bar");
  const [comparisonMode, setComparisonMode] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  
  const reportContainerRef = useRef<HTMLDivElement>(null);
  
  // Color palette for charts
  const COLORS = ['#1F4E4A', '#A1E96C', '#132E2C', '#7B8C8A', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  
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
          
          // Generate chart data and KPIs
          generateChartData(gamesWithDetails);
          calculateKPIs(gamesWithDetails);
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
  
  // Generate chart data
  const generateChartData = (gameData: GameSummary[]) => {
    const chartDataArray = gameData.map(game => ({
      name: game.name,
      Sales: game.total_sales,
      Payouts: game.total_payouts,
      Expenses: game.total_expenses,
      Donations: game.total_donations,
      NetProfit: game.organization_net_profit,
    }));
    
    setChartData(chartDataArray);
  };
  
  // Calculate KPIs
  const calculateKPIs = (gameData: GameSummary[]) => {
    const totalRevenue = gameData.reduce((sum, game) => sum + game.total_sales, 0);
    const totalProfit = gameData.reduce((sum, game) => sum + game.organization_net_profit, 0);
    const totalGames = gameData.length;
    const activeGames = gameData.filter(game => !game.end_date).length;
    
    const kpis: KPIData = {
      totalRevenue,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      averageTicketSales: totalGames > 0 ? totalRevenue / totalGames : 0,
      totalGames,
      activeGames,
      revenueGrowth: 0, // Would need historical data for proper calculation
      profitGrowth: 0,  // Would need historical data for proper calculation
    };
    
    setKPIData(kpis);
  };
  
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
    
    // Filter by multiple games if in comparison mode
    if (comparisonMode && selectedGames.length > 0) {
      filteredGames = games.filter(game => selectedGames.includes(game.id));
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
    
    // Apply search filter
    if (searchTerm) {
      filteredGames = filteredGames.filter(game => 
        game.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
  
  // Sort table data
  const sortTableData = (data: any[], column: string) => {
    if (!sortColumn || sortColumn !== column) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[column] || 0;
      const bValue = b[column] || 0;
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };
  
  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  // Quick filter presets
  const applyQuickFilter = (preset: string) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    
    switch (preset) {
      case "thisMonth":
        setStartDate(startOfMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "thisQuarter":
        setStartDate(startOfQuarter.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "thisYear":
        setStartDate(startOfYear.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "allTime":
        setStartDate("");
        setEndDate("");
        break;
    }
  };
  
  // Generate advanced PDF report
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
      
      // Add game details section (if filtering for a specific game)
      if (selectedGame !== "all" && summary.filteredGames.length === 1) {
        const game = summary.filteredGames[0];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Game Details: ${game.name}`, 20, yPosition);
        yPosition += 10;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        
        if (game.start_date) {
          doc.text(`Start Date: ${format(new Date(game.start_date), 'MMM d, yyyy')}`, 20, yPosition);
          yPosition += 7;
        }
        
        if (game.end_date) {
          doc.text(`End Date: ${format(new Date(game.end_date), 'MMM d, yyyy')}`, 20, yPosition);
          yPosition += 7;
        }
        
        // Add game summary
        doc.text(`Total Sales: ${formatCurrency(game.total_sales)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Total Payouts: ${formatCurrency(game.total_payouts)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Total Expenses: ${formatCurrency(game.total_expenses)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Total Donations: ${formatCurrency(game.total_donations)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Organization Net Profit: ${formatCurrency(game.organization_net_profit)}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Carryover Jackpot: ${formatCurrency(game.carryover_jackpot)}`, 20, yPosition);
        yPosition += 15;
        
        // Add weeks table if there are weeks data
        if (game.weeks && game.weeks.length > 0) {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text('Weekly Summary', 20, yPosition);
          yPosition += 10;
          
          // Draw week table headers
          const weekHeaders = [
            { text: 'Week #', width: 15 },
            { text: 'Tickets', width: 20 },
            { text: 'Sales', width: 30 },
            { text: 'Winner', width: 40 },
            { text: 'Card', width: 40 },
            { text: 'Payout', width: 30 }
          ];
          
          doc.setFontSize(10);
          let xPos = 20;
          weekHeaders.forEach(header => {
            doc.text(header.text, xPos, yPosition);
            xPos += header.width;
          });
          yPosition += 5;
          
          // Draw a line under headers
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPosition, xPos, yPosition);
          yPosition += 5;
          
          // Draw week rows
          doc.setFont("helvetica", "normal");
          game.weeks.forEach(week => {
            // Check if we need a new page
            if (yPosition > pageHeight - 15) {
              doc.addPage();
              yPosition = 20;
              
              // Redraw headers on new page
              doc.setFont("helvetica", "bold");
              let xPos = 20;
              weekHeaders.forEach(header => {
                doc.text(header.text, xPos, yPosition);
                xPos += header.width;
              });
              yPosition += 5;
              doc.line(20, yPosition, xPos, yPosition);
              yPosition += 5;
              doc.setFont("helvetica", "normal");
            }
            
            xPos = 20;
            doc.text(`Week ${week.week_number}`, xPos, yPosition);
            xPos += weekHeaders[0].width;
            
            doc.text(`${week.weekly_tickets_sold}`, xPos, yPosition);
            xPos += weekHeaders[1].width;
            
            doc.text(`${formatCurrency(week.weekly_sales)}`, xPos, yPosition);
            xPos += weekHeaders[2].width;
            
            doc.text(`${week.winner_name || '-'}`, xPos, yPosition);
            xPos += weekHeaders[3].width;
            
            doc.text(`${week.card_selected || '-'}`, xPos, yPosition);
            xPos += weekHeaders[4].width;
            
            doc.text(`${formatCurrency(week.weekly_payout)}`, xPos, yPosition);
            
            yPosition += rowHeight;
          });
        }
        
        // Add expenses if there are any
        if (game.expenses && game.expenses.length > 0) {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }
          
          yPosition += 10;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text('Expenses & Donations', 20, yPosition);
          yPosition += 10;
          
          // Draw expense table headers
          const expenseHeaders = [
            { text: 'Date', width: 30 },
            { text: 'Type', width: 30 },
            { text: 'Amount', width: 30 },
            { text: 'Memo', width: 80 }
          ];
          
          doc.setFontSize(10);
          let xPos = 20;
          expenseHeaders.forEach(header => {
            doc.text(header.text, xPos, yPosition);
            xPos += header.width;
          });
          yPosition += 5;
          
          // Draw a line under headers
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPosition, xPos, yPosition);
          yPosition += 5;
          
          // Draw expense rows
          doc.setFont("helvetica", "normal");
          game.expenses.forEach(expense => {
            // Check if we need a new page
            if (yPosition > pageHeight - 15) {
              doc.addPage();
              yPosition = 20;
              
              // Redraw headers on new page
              doc.setFont("helvetica", "bold");
              let xPos = 20;
              expenseHeaders.forEach(header => {
                doc.text(header.text, xPos, yPosition);
                xPos += header.width;
              });
              yPosition += 5;
              doc.line(20, yPosition, xPos, yPosition);
              yPosition += 5;
              doc.setFont("helvetica", "normal");
            }
            
            xPos = 20;
            doc.text(format(new Date(expense.date), 'MM/dd/yyyy'), xPos, yPosition);
            xPos += expenseHeaders[0].width;
            
            doc.text(expense.is_donation ? 'Donation' : 'Expense', xPos, yPosition);
            xPos += expenseHeaders[1].width;
            
            doc.text(formatCurrency(expense.amount), xPos, yPosition);
            xPos += expenseHeaders[2].width;
            
            // Limit memo text to fit in the column
            const memo = expense.memo || '-';
            const truncatedMemo = memo.length > 40 ? memo.substring(0, 37) + '...' : memo;
            doc.text(truncatedMemo, xPos, yPosition);
            
            yPosition += rowHeight;
          });
        }
      } else if (summary.filteredGames.length > 0) {
        // If showing multiple games, add a games summary table
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text('Games Summary', 20, yPosition);
        yPosition += 10;
        
        // Draw game table headers
        const gameHeaders = [
          { text: 'Game', width: 25 },
          { text: 'Sales', width: 30 },
          { text: 'Payouts', width: 30 },
          { text: 'Net Profit', width: 30 }
        ];
        
        doc.setFontSize(10);
        let xPos = 20;
        gameHeaders.forEach(header => {
          doc.text(header.text, xPos, yPosition);
          xPos += header.width;
        });
        yPosition += 5;
        
        // Draw a line under headers
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, xPos, yPosition);
        yPosition += 5;
        
        // Draw game rows
        doc.setFont("helvetica", "normal");
        summary.filteredGames.forEach(game => {
          // Check if we need a new page
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;
            
            // Redraw headers on new page
            doc.setFont("helvetica", "bold");
            let xPos = 20;
            gameHeaders.forEach(header => {
              doc.text(header.text, xPos, yPosition);
              xPos += header.width;
            });
            yPosition += 5;
            doc.line(20, yPosition, xPos, yPosition);
            yPosition += 5;
            doc.setFont("helvetica", "normal");
          }
          
          xPos = 20;
          doc.text(game.name, xPos, yPosition);
          xPos += gameHeaders[0].width;
          
          doc.text(formatCurrency(game.total_sales), xPos, yPosition);
          xPos += gameHeaders[1].width;
          
          doc.text(formatCurrency(game.total_payouts), xPos, yPosition);
          xPos += gameHeaders[2].width;
          
          doc.text(formatCurrency(game.organization_net_profit), xPos, yPosition);
          
          yPosition += rowHeight;
        });
      }
      
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
  
  // Render performance indicators
  const renderKPICards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(kpiData.totalRevenue || 0)}</p>
              <p className="text-xs text-blue-600 mt-1">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                {kpiData.revenueGrowth || 0}% vs last period
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Net Profit</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(kpiData.totalProfit || 0)}</p>
              <p className="text-xs text-green-600 mt-1">
                <Target className="w-3 h-3 inline mr-1" />
                {kpiData.profitMargin?.toFixed(1) || 0}% margin
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Active Games</p>
              <p className="text-2xl font-bold text-purple-900">{kpiData.activeGames || 0}</p>
              <p className="text-xs text-purple-600 mt-1">
                <Activity className="w-3 h-3 inline mr-1" />
                of {kpiData.totalGames || 0} total games
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Avg. Game Revenue</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(kpiData.averageTicketSales || 0)}</p>
              <p className="text-xs text-orange-600 mt-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                per game average
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render advanced chart
  const renderAdvancedChart = () => {
    const data = chartData.filter(item => 
      !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Financial Analytics</CardTitle>
              <CardDescription>Interactive visualization of financial performance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger className="w-32">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" && (
                <BarChart
                  data={data}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)} 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="Sales" fill="#A1E96C" name="Sales" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Payouts" fill="#1F4E4A" name="Payouts" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#132E2C" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Donations" fill="#7B8C8A" name="Donations" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="NetProfit" fill="#4ECDC4" name="Net Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
              
              {chartType === "line" && (
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="Sales" stroke="#A1E96C" strokeWidth={3} dot={{ r: 6 }} />
                  <Line type="monotone" dataKey="NetProfit" stroke="#1F4E4A" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              )}
              
              {chartType === "area" && (
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area type="monotone" dataKey="Sales" stackId="1" stroke="#A1E96C" fill="#A1E96C" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Expenses" stackId="1" stroke="#132E2C" fill="#132E2C" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Donations" stackId="1" stroke="#7B8C8A" fill="#7B8C8A" fillOpacity={0.6} />
                </AreaChart>
              )}
              
              {chartType === "pie" && (
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Sales', value: summary.totalSales, fill: '#A1E96C' },
                      { name: 'Payouts', value: summary.totalPayouts, fill: '#1F4E4A' },
                      { name: 'Expenses', value: summary.totalExpenses, fill: '#132E2C' },
                      { name: 'Donations', value: summary.totalDonations, fill: '#7B8C8A' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 bg-[#F7F8FC] min-h-screen p-6" id="report-container" ref={reportContainerRef}>
      {/* Header Section */}
      <div className="flex items-center justify-between bg-white rounded-lg p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-[#1F4E4A]">Financial Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive financial insights and performance analysis</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={generatePdfReport}
            className="bg-white border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
          <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1F4E4A] hover:bg-[#132E2C]">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Expense/Donation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ExpenseModal 
                open={addExpenseOpen} 
                onOpenChange={setAddExpenseOpen}
                gameId=""
                gameName="Selected Game"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Advanced Filter Panel */}
      <Card className="bg-white shadow-sm">
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-[#1F4E4A]" />
                  <CardTitle className="text-lg">Advanced Filters & Controls</CardTitle>
                </div>
                {filtersExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              <CardDescription>
                Customize your data view with advanced filtering options
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Quick Filter Buttons */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Quick Filters</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyQuickFilter("thisMonth")}
                    className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]"
                  >
                    This Month
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyQuickFilter("thisQuarter")}
                    className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]"
                  >
                    This Quarter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyQuickFilter("thisYear")}
                    className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]"
                  >
                    This Year
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyQuickFilter("allTime")}
                    className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]"
                  >
                    All Time
                  </Button>
                </div>
              </div>
              
              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="searchGames">Search Games</Label>
                  <Input
                    id="searchGames"
                    placeholder="Search by game name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gameFilter">Game Selection</Label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      {games.map(game => (
                        <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly Analysis</SelectItem>
                      <SelectItem value="game">Game Analysis</SelectItem>
                      <SelectItem value="cumulative">Cumulative Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Comparison Mode Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="comparisonMode"
                  checked={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="comparisonMode">Enable Game Comparison Mode</Label>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F4E4A] mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading financial analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          {renderKPICards()}
          
          {/* Three-Column Summary Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Overall Totals Column */}
            <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Overall Totals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Tickets Sold</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {summary.totalTicketsSold.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Ticket Sales</span>
                    <span className="font-bold text-lg text-green-600">{formatCurrency(summary.totalSales)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Total Payouts</span>
                    <span className="font-bold text-lg text-red-600">{formatCurrency(summary.totalPayouts)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Total Expenses</span>
                    <span className="font-bold text-lg text-orange-600">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Donated</span>
                    <span className="font-bold text-lg text-purple-600">{formatCurrency(summary.totalDonations)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout Portion Column */}
            <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Payout Portion
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Total Sales (Jackpot Portion)</span>
                    <span className="font-bold text-lg text-green-600">{formatCurrency(summary.jackpotTotalPortion)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Payouts</span>
                    <span className="font-bold text-lg text-red-600">{formatCurrency(summary.totalPayouts)}</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-700">
                      <strong>Payout Efficiency:</strong>
                    </div>
                    <div className="text-lg font-bold text-green-800">
                      {summary.jackpotTotalPortion > 0 ? 
                        ((summary.totalPayouts / summary.jackpotTotalPortion) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Portion Column */}
            <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Organization Portion
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Total Sales (Organization Portion)</span>
                    <span className="font-bold text-lg text-blue-600">{formatCurrency(summary.organizationTotalPortion)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Total Expenses</span>
                    <span className="font-bold text-lg text-orange-600">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="font-medium">Total Donations</span>
                    <span className="font-bold text-lg text-purple-600">{formatCurrency(summary.totalDonations)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Organization Net Profit</span>
                    <span className="font-bold text-lg text-green-600">{formatCurrency(summary.organizationNetProfit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Advanced Chart */}
          {renderAdvancedChart()}
          
          {/* Enhanced Tabs Section */}
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-[500px] bg-white shadow-sm">
              <TabsTrigger value="summary" className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white">
                Game Details
              </TabsTrigger>
              <TabsTrigger value="comparison" className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white">
                Comparison
              </TabsTrigger>
              <TabsTrigger value="trends" className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white">
                Trends
              </TabsTrigger>
              <TabsTrigger value="data" className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white">
                Raw Data
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Game Performance Details</CardTitle>
                  <CardDescription>
                    Comprehensive breakdown of each game's financial performance with detailed insights.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {summary.filteredGames.map(game => (
                      <div key={game.id} className="border-l-4 border-[#A1E96C] pl-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-[#1F4E4A]">{game.name}</h3>
                            <p className="text-gray-600">
                              {game.start_date && `Start: ${format(new Date(game.start_date), 'MMM d, yyyy')}`}
                              {game.end_date && ` | End: ${format(new Date(game.end_date), 'MMM d, yyyy')}`}
                              {!game.end_date && " | Active"}
                            </p>
                          </div>
                          <Badge variant={game.end_date ? "secondary" : "default"} className="text-sm">
                            {game.end_date ? "Completed" : "Active"}
                          </Badge>
                        </div>
                        
                        <div className="space-y-6">
                          {/* Game Summary with Enhanced Styling */}
                          <div>
                            <h4 className="text-lg font-semibold mb-4 text-[#1F4E4A]">Financial Summary</h4>
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                              <Table>
                                <TableHeader className="bg-gray-50">
                                  <TableRow>
                                    <TableHead className="font-semibold">Total Sales</TableHead>
                                    <TableHead className="font-semibold">Total Payouts</TableHead>
                                    <TableHead className="font-semibold">Total Expenses</TableHead>
                                    <TableHead className="font-semibold">Total Donations</TableHead>
                                    <TableHead className="font-semibold">Net Profit</TableHead>
                                    <TableHead className="font-semibold">Carryover</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow className="hover:bg-gray-50">
                                    <TableCell className="font-medium text-green-600">{formatCurrency(game.total_sales)}</TableCell>
                                    <TableCell className="font-medium text-red-600">{formatCurrency(game.total_payouts)}</TableCell>
                                    <TableCell className="font-medium text-orange-600">{formatCurrency(game.total_expenses)}</TableCell>
                                    <TableCell className="font-medium text-purple-600">{formatCurrency(game.total_donations)}</TableCell>
                                    <TableCell className="font-medium text-blue-600">{formatCurrency(game.organization_net_profit)}</TableCell>
                                    <TableCell className="font-medium text-gray-600">{formatCurrency(game.carryover_jackpot)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                          
                          {/* Enhanced Weeks Table */}
                          {game.weeks.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-4 text-[#1F4E4A]">Weekly Performance</h4>
                              <div className="overflow-auto rounded-lg border border-gray-200">
                                <Table>
                                  <TableHeader className="bg-gray-50">
                                    <TableRow>
                                      <TableHead 
                                        className="cursor-pointer hover:bg-gray-100 font-semibold"
                                        onClick={() => handleSort('week_number')}
                                      >
                                        Week # {sortColumn === 'week_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                                      </TableHead>
                                      <TableHead className="font-semibold">Period</TableHead>
                                      <TableHead 
                                        className="cursor-pointer hover:bg-gray-100 font-semibold"
                                        onClick={() => handleSort('weekly_tickets_sold')}
                                      >
                                        Tickets {sortColumn === 'weekly_tickets_sold' && (sortDirection === 'asc' ? '↑' : '↓')}
                                      </TableHead>
                                      <TableHead 
                                        className="cursor-pointer hover:bg-gray-100 font-semibold"
                                        onClick={() => handleSort('weekly_sales')}
                                      >
                                        Sales {sortColumn === 'weekly_sales' && (sortDirection === 'asc' ? '↑' : '↓')}
                                      </TableHead>
                                      <TableHead className="font-semibold">Org. Portion</TableHead>
                                      <TableHead className="font-semibold">Jackpot Portion</TableHead>
                                      <TableHead 
                                        className="cursor-pointer hover:bg-gray-100 font-semibold"
                                        onClick={() => handleSort('weekly_payout')}
                                      >
                                        Payout {sortColumn === 'weekly_payout' && (sortDirection === 'asc' ? '↑' : '↓')}
                                      </TableHead>
                                      <TableHead className="font-semibold">Winner</TableHead>
                                      <TableHead className="font-semibold">Card</TableHead>
                                      <TableHead className="font-semibold">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sortTableData(game.weeks, sortColumn).map(week => {
                                      const organizationPortion = week.weekly_sales * (game.organization_percentage / 100);
                                      const jackpotPortion = week.weekly_sales * (game.jackpot_percentage / 100);
                                      
                                      return (
                                        <TableRow key={week.id} className="hover:bg-gray-50">
                                          <TableCell className="font-medium">Week {week.week_number}</TableCell>
                                          <TableCell className="text-sm">
                                            {format(new Date(week.start_date), 'MMM d')} - {format(new Date(week.end_date), 'MMM d, yyyy')}
                                          </TableCell>
                                          <TableCell>{week.weekly_tickets_sold?.toLocaleString() || 0}</TableCell>
                                          <TableCell className="font-medium">{formatCurrency(week.weekly_sales)}</TableCell>
                                          <TableCell className="text-blue-600">{formatCurrency(organizationPortion)}</TableCell>
                                          <TableCell className="text-green-600">{formatCurrency(jackpotPortion)}</TableCell>
                                          <TableCell className="font-medium text-red-600">{formatCurrency(week.weekly_payout)}</TableCell>
                                          <TableCell>{week.winner_name || '-'}</TableCell>
                                          <TableCell>
                                            {week.card_selected ? (
                                              <Badge variant={week.card_selected === 'Queen of Hearts' ? 'default' : 'secondary'}>
                                                {week.card_selected}
                                              </Badge>
                                            ) : '-'}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={week.winner_present ? 'default' : 'destructive'}>
                                              {week.winner_present ? 'Present' : 'Absent'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                          
                          {/* Enhanced Expenses Table */}
                          {game.expenses.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-4 text-[#1F4E4A]">Expenses & Donations</h4>
                              <div className="overflow-hidden rounded-lg border border-gray-200">
                                <Table>
                                  <TableHeader className="bg-gray-50">
                                    <TableRow>
                                      <TableHead className="font-semibold">Date</TableHead>
                                      <TableHead className="font-semibold">Type</TableHead>
                                      <TableHead className="font-semibold">Amount</TableHead>
                                      <TableHead className="font-semibold">Description</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {game.expenses.map(expense => (
                                      <TableRow key={expense.id} className="hover:bg-gray-50">
                                        <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>
                                          <Badge variant={expense.is_donation ? 'default' : 'secondary'}>
                                            {expense.is_donation ? 'Donation' : 'Expense'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className={`font-medium ${expense.is_donation ? 'text-purple-600' : 'text-orange-600'}`}>
                                          {formatCurrency(expense.amount)}
                                        </TableCell>
                                        <TableCell>{expense.memo || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="comparison">
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Game Comparison Analysis</CardTitle>
                  <CardDescription>
                    Compare performance metrics across multiple games to identify trends and opportunities.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <p className="text-center text-gray-500 py-8">
                      Select "Enable Game Comparison Mode" in the filters above to access advanced comparison features.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trends">
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Trend Analysis</CardTitle>
                  <CardDescription>
                    Analyze performance trends over time to make data-driven decisions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Line type="monotone" dataKey="Sales" stroke="#A1E96C" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="monotone" dataKey="NetProfit" stroke="#1F4E4A" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Expenses" stroke="#132E2C" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Donations" stroke="#7B8C8A" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="data">
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Raw Financial Data</CardTitle>
                  <CardDescription>
                    Detailed transaction-level data for comprehensive analysis and audit purposes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {summary.filteredGames.map(game => (
                      <div key={game.id} className="space-y-6">
                        <h3 className="text-lg font-bold text-[#1F4E4A] border-b pb-2">{game.name}</h3>
                        
                        {/* Detailed Ticket Sales Table */}
                        {game.ticket_sales.length > 0 && (
                          <div>
                            <h4 className="text-md font-semibold mb-3 text-gray-700">Daily Ticket Sales Records</h4>
                            <div className="overflow-auto rounded-lg border border-gray-200">
                              <Table>
                                <TableHeader className="bg-gray-50">
                                  <TableRow>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="font-semibold">Tickets Sold</TableHead>
                                    <TableHead className="font-semibold">Ticket Price</TableHead>
                                    <TableHead className="font-semibold">Amount Collected</TableHead>
                                    <TableHead className="font-semibold">Organization Total</TableHead>
                                    <TableHead className="font-semibold">Jackpot Total</TableHead>
                                    <TableHead className="font-semibold">Weekly Payout</TableHead>
                                    <TableHead className="font-semibold">Ending Jackpot</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {game.ticket_sales.map(sale => (
                                    <TableRow key={sale.id} className="hover:bg-gray-50">
                                      <TableCell>{format(new Date(sale.date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>{sale.tickets_sold?.toLocaleString()}</TableCell>
                                      <TableCell>{formatCurrency(sale.ticket_price)}</TableCell>
                                      <TableCell className="font-medium">{formatCurrency(sale.amount_collected)}</TableCell>
                                      <TableCell className="text-blue-600">{formatCurrency(sale.organization_total)}</TableCell>
                                      <TableCell className="text-green-600">{formatCurrency(sale.jackpot_total)}</TableCell>
                                      <TableCell className="text-red-600">{formatCurrency(sale.weekly_payout_amount)}</TableCell>
                                      <TableCell className="font-medium">{formatCurrency(sale.ending_jackpot_total)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
