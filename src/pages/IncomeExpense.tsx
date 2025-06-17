import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Download, PlusCircle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

  return (
    <div className="space-y-6" id="report-container" ref={reportContainerRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#1F4E4A]">Income vs. Expense</h2>
        <div className="flex gap-2">
          <Button 
            variant="export" 
            onClick={generatePdfReport}
          >
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1F4E4A]">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Expense/Donation
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
      
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Filter the financial data by game, date range, and report type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="gameFilter">Game</Label>
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
              <Label htmlFor="reportType">Report Type</Label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as "weekly" | "game" | "cumulative")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="weekly">Weekly</option>
                <option value="game">Game</option>
                <option value="cumulative">Cumulative</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4E4A] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      ) : (
        <>
          {/* Three-Column Summary Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Totals Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overall Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Tickets Sold</span>
                    <span className="font-medium">{summary.totalTicketsSold.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Ticket Sales</span>
                    <span className="font-medium">{formatCurrency(summary.totalSales)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Total Payouts</span>
                    <span className="font-medium">{formatCurrency(summary.totalPayouts)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Total Expenses</span>
                    <span className="font-medium">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Donated</span>
                    <span className="font-medium">{formatCurrency(summary.totalDonations)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout Portion Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payout Portion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Total Sales (Jackpot Portion)</span>
                    <span className="font-medium">{formatCurrency(summary.jackpotTotalPortion)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Payouts</span>
                    <span className="font-medium">{formatCurrency(summary.totalPayouts)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Portion Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization Portion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Total Sales (Organization Portion)</span>
                    <span className="font-medium">{formatCurrency(summary.organizationTotalPortion)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Total Expenses</span>
                    <span className="font-medium">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span>Total Donations</span>
                    <span className="font-medium">{formatCurrency(summary.totalDonations)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Organization Net Profit</span>
                    <span className="font-medium">{formatCurrency(summary.organizationNetProfit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="summary">
            <TabsList className="grid grid-cols-3 w-[400px]">
              <TabsTrigger value="summary">Details</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="data">Raw Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Game Details</CardTitle>
                  <CardDescription>
                    Breakdown by game with detailed financial information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {summary.filteredGames.map(game => (
                      <div key={game.id} className="space-y-4">
                        <h3 className="text-lg font-medium">{game.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {game.start_date && `Start: ${format(new Date(game.start_date), 'MMM d, yyyy')}`}
                          {game.end_date && ` | End: ${format(new Date(game.end_date), 'MMM d, yyyy')}`}
                        </p>
                        
                        <div className="space-y-6">
                          {/* Game Summary */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Game Summary</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Total Sales</TableHead>
                                  <TableHead>Total Payouts</TableHead>
                                  <TableHead>Total Expenses</TableHead>
                                  <TableHead>Total Donations</TableHead>
                                  <TableHead>Organization Net Profit</TableHead>
                                  <TableHead>Carryover Jackpot</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell>{formatCurrency(game.total_sales)}</TableCell>
                                  <TableCell>{formatCurrency(game.total_payouts)}</TableCell>
                                  <TableCell>{formatCurrency(game.total_expenses)}</TableCell>
                                  <TableCell>{formatCurrency(game.total_donations)}</TableCell>
                                  <TableCell>{formatCurrency(game.organization_net_profit)}</TableCell>
                                  <TableCell>{formatCurrency(game.carryover_jackpot)}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          
                          {/* Weeks Table */}
                          {game.weeks.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Weeks</h4>
                              <div className="overflow-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Week #</TableHead>
                                      <TableHead>Start Date</TableHead>
                                      <TableHead>End Date</TableHead>
                                      <TableHead>Tickets Sold</TableHead>
                                      <TableHead>Weekly Sales</TableHead>
                                      <TableHead>Organization Portion</TableHead>
                                      <TableHead>Jackpot Portion</TableHead>
                                      <TableHead>Weekly Payout</TableHead>
                                      <TableHead>Winner</TableHead>
                                      <TableHead>Card Selected</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {game.weeks.map(week => {
                                      const organizationPortion = week.weekly_sales * (game.organization_percentage / 100);
                                      const jackpotPortion = week.weekly_sales * (game.jackpot_percentage / 100);
                                      
                                      return (
                                        <TableRow key={week.id}>
                                          <TableCell>Week {week.week_number}</TableCell>
                                          <TableCell>{format(new Date(week.start_date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell>{format(new Date(week.end_date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell>{week.weekly_tickets_sold}</TableCell>
                                          <TableCell>{formatCurrency(week.weekly_sales)}</TableCell>
                                          <TableCell>{formatCurrency(organizationPortion)}</TableCell>
                                          <TableCell>{formatCurrency(jackpotPortion)}</TableCell>
                                          <TableCell>{formatCurrency(week.weekly_payout)}</TableCell>
                                          <TableCell>{week.winner_name || '-'}</TableCell>
                                          <TableCell>{week.card_selected || '-'}</TableCell>
                                        </TableRow>
                                      );
                                    })}
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="chart">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Chart</CardTitle>
                  <CardDescription>
                    Visual representation of financial data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Bar dataKey="Sales" fill="#A1E96C" />
                        <Bar dataKey="Payouts" fill="#1F4E4A" />
                        <Bar dataKey="Expenses" fill="#132E2C" />
                        <Bar dataKey="Donations" fill="#7B8C8A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Raw Financial Data</CardTitle>
                  <CardDescription>
                    Detailed financial records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {summary.filteredGames.map(game => (
                      <div key={game.id} className="space-y-4">
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
