
import { useState, useEffect } from "react";
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
      
      const reportElement = document.getElementById('report-container');
      if (!reportElement) return;
      
      const canvas = await html2canvas(reportElement, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate required height for the PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      const doc = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      
      // Add title
      doc.setFontSize(18);
      doc.text('Queen of Hearts Financial Report', 105, 15, { align: 'center' });
      
      // Add report type and date range
      doc.setFontSize(12);
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 30);
      
      if (startDate && endDate) {
        doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 38);
      }
      
      // Add summary data
      doc.setFontSize(14);
      doc.text('Summary', 14, 48);
      
      doc.setFontSize(10);
      let y = 58;
      doc.text(`Total Tickets Sold: ${summary.totalTicketsSold}`, 14, y); y += 8;
      doc.text(`Total Sales: ${formatCurrency(summary.totalSales)}`, 14, y); y += 8;
      doc.text(`Total Payouts: ${formatCurrency(summary.totalPayouts)}`, 14, y); y += 8;
      doc.text(`Total Expenses: ${formatCurrency(summary.totalExpenses)}`, 14, y); y += 8;
      doc.text(`Total Donations: ${formatCurrency(summary.totalDonations)}`, 14, y); y += 8;
      doc.text(`Organization Net Profit: ${formatCurrency(summary.organizationNetProfit)}`, 14, y); y += 16;
      
      // Add image of the report
      doc.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
      
      // Download the PDF
      doc.save(`queen-of-hearts-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "Your report has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6" id="report-container">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#1F4E4A]">Income vs. Expense</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
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
              <DialogHeader>
                <DialogTitle>Add Expense or Donation</DialogTitle>
                <DialogDescription>
                  Record a new expense or donation for a game.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="gameSelect" className="col-span-1">Game</Label>
                  <select
                    id="gameSelect"
                    value={newExpense.gameId}
                    onChange={(e) => setNewExpense({ ...newExpense, gameId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                  >
                    <option value="">Select a game</option>
                    {games.map(game => (
                      <option key={game.id} value={game.id}>{game.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expenseDate" className="col-span-1">Date</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expenseAmount" className="col-span-1">Amount</Label>
                  <Input
                    id="expenseAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expenseMemo" className="col-span-1">Memo</Label>
                  <Input
                    id="expenseMemo"
                    value={newExpense.memo}
                    onChange={(e) => setNewExpense({ ...newExpense, memo: e.target.value })}
                    placeholder="e.g., Ticket rolls, Toys for Tots donation"
                    className="col-span-3"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDonation"
                    checked={newExpense.isDonation}
                    onChange={(e) => setNewExpense({
                      ...newExpense,
                      isDonation: e.target.checked,
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isDonation">This is a donation</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit" onClick={handleAddExpense} className="bg-[#1F4E4A]">
                  Add {newExpense.isDonation ? "Donation" : "Expense"}
                </Button>
              </DialogFooter>
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
