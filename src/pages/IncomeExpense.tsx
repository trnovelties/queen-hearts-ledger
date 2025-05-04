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
    
    filteredGames.forEach(game => {
      // If using date filters, calculate from filtered data
      if (startDate && endDate) {
        totalSales += game.ticket_sales.reduce((sum, sale) => sum + sale.amount_collected, 0);
        totalPayouts += game.ticket_sales.reduce((sum, sale) => sum + sale.weekly_payout_amount, 0);
        
        const expenses = game.expenses.filter(e => !e.is_donation);
        const donations = game.expenses.filter(e => e.is_donation);
        
        totalExpenses += expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalDonations += donations.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Calculate organization portion
        const orgPortion = game.ticket_sales.reduce((sum, sale) => sum + sale.organization_total, 0);
        organizationTotalPortion += orgPortion;
      } else {
        // Use pre-calculated totals
        totalSales += game.total_sales;
        totalPayouts += game.total_payouts;
        totalExpenses += game.total_expenses;
        totalDonations += game.total_donations;
        
        // Calculate organization portion (total_sales * organization_percentage / 100)
        const orgPortion = game.total_sales * (game.organization_percentage / 100);
        organizationTotalPortion += orgPortion;
      }
    });
    
    // Calculate net profit
    const organizationNetProfit = organizationTotalPortion - totalExpenses - totalDonations;
    
    // Calculate percentages
    const donationsPercentage = organizationTotalPortion > 0 ? (totalDonations / organizationTotalPortion) * 100 : 0;
    const expensesPercentage = organizationTotalPortion > 0 ? (totalExpenses / organizationTotalPortion) * 100 : 0;
    const netProfitPercentage = organizationTotalPortion > 0 ? (organizationNetProfit / organizationTotalPortion) * 100 : 0;
    
    return {
      totalSales,
      totalPayouts,
      totalExpenses,
      totalDonations,
      organizationTotalPortion,
      organizationNetProfit,
      donationsPercentage,
      expensesPercentage,
      netProfitPercentage,
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
  
  // Generate PDF report (mock functionality for now)
  const generatePdfReport = () => {
    toast({
      title: "PDF Export",
      description: "Exporting to PDF is not implemented yet.",
    });
  };

  return (
    <div className="space-y-6">
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
        <Tabs defaultValue="summary">
          <TabsList className="grid grid-cols-3 w-[400px]">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Overview of financial performance across {selectedGame === "all" ? "all games" : "selected game"}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Overall Totals</h3>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Total Sales</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.totalSales)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Total Payouts</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.totalPayouts)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Total Expenses</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.totalExpenses)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Total Donations</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.totalDonations)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-medium">Organization Net Profit</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(summary.organizationNetProfit)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Organization Portion Allocation</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Organization Portion Total</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.organizationTotalPortion)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Donations</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.totalDonations)}</TableCell>
                          <TableCell className="text-right">{summary.donationsPercentage.toFixed(2)}%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Expenses</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.totalExpenses)}</TableCell>
                          <TableCell className="text-right">{summary.expensesPercentage.toFixed(2)}%</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-medium">Organization Net Profit</TableCell>
                          <TableCell className="text-right">{formatCurrency(summary.organizationNetProfit)}</TableCell>
                          <TableCell className="text-right">{summary.netProfitPercentage.toFixed(2)}%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Financial Reports</CardTitle>
                <CardDescription>
                  Detailed breakdown by game and week.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {summary.filteredGames.map(game => (
                    <div key={game.id} className="space-y-4">
                      <h3 className="text-lg font-medium">{game.name}</h3>
                      
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
        </Tabs>
      )}
    </div>
  );
}
