import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GameForm } from "@/components/GameForm";
import { ExpenseModal } from "@/components/ExpenseModal";
import { WinnerForm } from "@/components/WinnerForm";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { WinnerInformation } from "@/components/WinnerInformation";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { FinancialOverview } from "@/components/FinancialOverview";
import { AdminViewIcon } from "@/components/icons/AdminViewIcon";
import { DetailedFinancialTable } from "@/components/DetailedFinancialTable";
import { GameComparisonTable } from "@/components/GameComparisonTable";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { Calendar, CalendarDays, Users, Calculator, TrendingUp } from "lucide-react";
import { useJackpotCalculation } from "@/hooks/useJackpotCalculation";
import { useAuth } from "@/context/AuthContext";
import { createWeeksForGame, insertTicketSales, insertExpense } from "@/utils/databaseOperations";

export default function Dashboard() {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [ticketSales, setTicketSales] = useState<any[]>([]);
  const [showGameForm, setShowGameForm] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showWinnerForm, setShowWinnerForm] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [showPayoutSlip, setShowPayoutSlip] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const [dailyExpense, setDailyExpense] = useState({ date: new Date(), amount: '', memo: '' });
  const [dailyDonation, setDailyDonation] = useState({ date: new Date(), amount: '', memo: '' });
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  const [allGameData, setAllGameData] = useState<any[]>([]);
  const [newTicketEntry, setNewTicketEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    ticketsSold: '',
    ticketPrice: '',
  });

  const { toast } = useToast();

  // Fix jackpot calculation hook usage - only call when we have the required data
  const calculateDisplayedJackpot = useJackpotCalculation({
    jackpotContributions: 0,
    minimumJackpot: selectedGame?.minimum_starting_jackpot || 500,
    carryoverJackpot: selectedGame?.carryover_jackpot || 0
  });

  const fetchGames = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchAllGameData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setAllGameData(data || []);
    } catch (error: any) {
      console.error('Error fetching all game data:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchWeeks = useCallback(async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', gameId)
        .order('week_number', { ascending: false });

      if (error) throw error;
      setWeeks(data || []);
    } catch (error: any) {
      console.error('Error fetching weeks:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTicketSales = useCallback(async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', gameId)
        .order('date', { ascending: true });

      if (error) throw error;
      setTicketSales(data || []);
    } catch (error: any) {
      console.error('Error fetching ticket sales:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchGames();
    fetchAllGameData();
  }, [fetchGames, fetchAllGameData]);

  useEffect(() => {
    if (selectedGame) {
      fetchWeeks(selectedGame.id);
      fetchTicketSales(selectedGame.id);
    }
  }, [selectedGame, fetchWeeks, fetchTicketSales]);

  const createWeek = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const existingWeeks = await supabase
        .from('weeks')
        .select('week_number')
        .eq('game_id', gameId)
        .order('week_number', { ascending: false })
        .limit(1);

      const nextWeekNumber = existingWeeks.data && existingWeeks.data.length > 0 
        ? existingWeeks.data[0].week_number + 1 
        : 1;

      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const weeksToCreate = [{
        game_id: gameId,
        week_number: nextWeekNumber,
        start_date: startDate,
        end_date: endDate,
      }];

      if (!user?.id) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create weeks.",
          variant: "destructive",
        });
        return;
      }

      await createWeeksForGame(gameId, user.id, weeksToCreate);

      toast({
        title: "Success",
        description: `Week ${nextWeekNumber} created successfully.`,
      });

      await fetchWeeks(gameId);
    } catch (error: any) {
      console.error('Error creating week:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateDailyEntry = async () => {
    if (!selectedGame || !selectedWeek) return;

    try {
      if (!user?.id) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to update entries.",
          variant: "destructive",
        });
        return;
      }

      const existingEntry = ticketSales.find(ts => 
        ts.week_id === selectedWeek.id && 
        ts.date === newTicketEntry.date
      );

      if (existingEntry) {
        toast({
          title: "Entry Already Exists",
          description: "An entry for this date already exists in this week.",
          variant: "destructive",
        });
        return;
      }

      const currentTotalCollected = await supabase
        .from('ticket_sales')
        .select('cumulative_collected')
        .eq('game_id', selectedGame.id)
        .order('date', { ascending: false })
        .limit(1);

      const previousTotal = currentTotalCollected.data && currentTotalCollected.data.length > 0 
        ? parseFloat(currentTotalCollected.data[0].cumulative_collected) 
        : 0;

      const ticketsSold = parseInt(newTicketEntry.ticketsSold);
      const ticketPrice = parseFloat(newTicketEntry.ticketPrice) || selectedGame.ticket_price;
      const amountCollected = ticketsSold * ticketPrice;
      const cumulativeCollected = previousTotal + amountCollected;
      const organizationTotal = cumulativeCollected * (selectedGame.organization_percentage / 100);
      const jackpotTotal = cumulativeCollected * (selectedGame.jackpot_percentage / 100);
      
      const jackpotContributions = jackpotTotal;
      const displayedJackpot = calculateDisplayedJackpot({
        jackpotContributions: jackpotContributions,
        minimumJackpot: selectedGame.minimum_starting_jackpot || 500,
        carryoverJackpot: selectedGame.carryover_jackpot || 0
      });

      const weeklyPayout = selectedWeek.weekly_payout || 0;
      const endingJackpotTotal = displayedJackpot - weeklyPayout;

      const ticketSalesToInsert = [{
        game_id: selectedGame.id,
        week_id: selectedWeek.id,
        date: newTicketEntry.date,
        tickets_sold: ticketsSold,
        ticket_price: ticketPrice,
        amount_collected: amountCollected,
        cumulative_collected: cumulativeCollected,
        organization_total: organizationTotal,
        jackpot_total: jackpotTotal,
        ending_jackpot_total: endingJackpotTotal,
        jackpot_contributions_total: jackpotContributions,
        displayed_jackpot_total: displayedJackpot,
        weekly_payout_amount: weeklyPayout,
      }];

      await insertTicketSales(ticketSalesToInsert, user.id);

      await supabase
        .from('games')
        .update({
          total_sales: cumulativeCollected,
          organization_net_profit: organizationTotal - (selectedGame.total_expenses || 0)
        })
        .eq('id', selectedGame.id);

      setNewTicketEntry({
        date: new Date().toISOString().split('T')[0],
        ticketsSold: '',
        ticketPrice: '',
      });

      toast({
        title: "Success",
        description: "Daily entry added successfully.",
      });

      await fetchTicketSales(selectedGame.id);
      await fetchGames();
    } catch (error: any) {
      console.error('Error updating daily entry:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDailyDonation = async () => {
    if (!selectedGame || !dailyDonation.amount) return;

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add donations.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingDonation(true);
    try {
      const donationData = {
        game_id: selectedGame.id,
        date: dailyDonation.date.toISOString().split('T')[0],
        amount: parseFloat(dailyDonation.amount),
        memo: dailyDonation.memo,
        is_donation: true,
      };

      await insertExpense(donationData, user.id);

      const updatedTotalDonations = (selectedGame.total_donations || 0) + parseFloat(dailyDonation.amount);
      const updatedNetProfit = (selectedGame.organization_net_profit || 0) - parseFloat(dailyDonation.amount);

      await supabase
        .from('games')
        .update({
          total_donations: updatedTotalDonations,
          organization_net_profit: updatedNetProfit,
        })
        .eq('id', selectedGame.id);

      setDailyDonation({ date: new Date(), amount: '', memo: '' });

      toast({
        title: "Success",
        description: "Daily donation added successfully.",
      });

      await fetchGames();
    } catch (error: any) {
      console.error('Error adding daily donation:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  const handleDailyExpense = async () => {
    if (!selectedGame || !dailyExpense.amount) return;

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add expenses.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const expenseData = {
        game_id: selectedGame.id,
        date: dailyExpense.date.toISOString().split('T')[0],
        amount: parseFloat(dailyExpense.amount),
        memo: dailyExpense.memo,
        is_donation: false,
      };

      await insertExpense(expenseData, user.id);

      const updatedTotalExpenses = (selectedGame.total_expenses || 0) + parseFloat(dailyExpense.amount);
      const updatedNetProfit = (selectedGame.organization_net_profit || 0) - parseFloat(dailyExpense.amount);

      await supabase
        .from('games')
        .update({
          total_expenses: updatedTotalExpenses,
          organization_net_profit: updatedNetProfit,
        })
        .eq('id', selectedGame.id);

      setDailyExpense({ date: new Date(), amount: '', memo: '' });

      toast({
        title: "Success",
        description: "Daily expense added successfully.",
      });

      await fetchGames();
    } catch (error: any) {
      console.error('Error adding daily expense:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleGameCreated = () => {
    fetchGames();
  };

  const handleWinnerComplete = () => {
    if (selectedGame) {
      fetchWeeks(selectedGame.id);
      fetchTicketSales(selectedGame.id);
      fetchGames();
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (showAdminView) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin View - All Games</h1>
            <Button 
              onClick={() => setShowAdminView(false)}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
          <GameComparisonTable games={allGameData} formatCurrency={formatCurrency} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Queen of Hearts Manager</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowAdminView(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AdminViewIcon />
              Admin View
            </Button>
            <Button onClick={() => setShowGameForm(true)}>
              Create New Game
            </Button>
          </div>
        </div>

        <Tabs defaultValue="games" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="games">Game Management</TabsTrigger>
            <TabsTrigger value="financial">Financial Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="games">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Active Games
                    </CardTitle>
                    <CardDescription>Select a game to manage</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {games.map((game) => (
                      <Card 
                        key={game.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedGame?.id === game.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedGame(game)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{game.name}</h3>
                              <p className="text-sm text-gray-500">
                                Game #{game.game_number} • Started {new Date(game.start_date).toLocaleDateString()}
                              </p>
                              <div className="mt-2 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Total Sales:</span> ${game.total_sales?.toFixed(2) || '0.00'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Net Profit:</span> ${game.organization_net_profit?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                            </div>
                            <Badge variant={game.end_date ? "secondary" : "default"}>
                              {game.end_date ? "Completed" : "Active"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                {selectedGame ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          {selectedGame.name} - Week Management
                        </CardTitle>
                        <CardDescription>Manage weeks and daily entries for this game</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Button onClick={() => createWeek(selectedGame.id)}>
                            Create New Week
                          </Button>
                          <Button 
                            onClick={() => setShowExpenseModal(true)}
                            variant="outline"
                          >
                            Add Expense
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          {weeks.map((week) => (
                            <Card key={week.id} className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-semibold">Week {week.week_number}</h4>
                                    <p className="text-sm text-gray-500">
                                      {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedWeek(week);
                                        setShowWinnerForm(true);
                                      }}
                                    >
                                      Record Winner
                                    </Button>
                                  </div>
                                </div>
                                
                                {week.winner_name && (
                                  <WinnerInformation 
                                    winnerData={{
                                      winnerName: week.winner_name,
                                      slotChosen: week.slot_chosen,
                                      cardSelected: week.card_selected,
                                      payoutAmount: week.weekly_payout,
                                      date: week.end_date,
                                      gameNumber: selectedGame.game_number,
                                      gameName: selectedGame.name,
                                      weekNumber: week.week_number,
                                      weekId: week.id,
                                      weekStartDate: week.start_date,
                                      weekEndDate: week.end_date
                                    }}
                                    onViewPayout={(data) => {
                                      setPayoutSlipData(data);
                                      setShowPayoutSlip(true);
                                    }}
                                  />
                                )}

                                <div className="mt-4 space-y-2">
                                  <h5 className="font-medium">Daily Ticket Sales</h5>
                                  {ticketSales
                                    .filter(ts => ts.week_id === week.id)
                                    .map((sale) => (
                                      <div key={sale.id} className="p-3 bg-gray-50 rounded-lg">
                                        <div className="grid grid-cols-4 gap-4 text-sm">
                                          <div>
                                            <span className="font-medium">Date:</span> {new Date(sale.date).toLocaleDateString()}
                                          </div>
                                          <div>
                                            <span className="font-medium">Tickets:</span> {sale.tickets_sold}
                                          </div>
                                          <div>
                                            <span className="font-medium">Price:</span> ${sale.ticket_price}
                                          </div>
                                          <div>
                                            <span className="font-medium">Amount:</span> ${sale.amount_collected.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>

                                {selectedWeek?.id === week.id && (
                                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <h6 className="font-medium mb-3">Add Daily Entry</h6>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div>
                                        <Label htmlFor="entryDate">Date</Label>
                                        <Input
                                          id="entryDate"
                                          type="date"
                                          value={newTicketEntry.date}
                                          onChange={(e) => setNewTicketEntry({
                                            ...newTicketEntry,
                                            date: e.target.value
                                          })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="ticketsSold">Tickets Sold</Label>
                                        <Input
                                          id="ticketsSold"
                                          type="number"
                                          placeholder="0"
                                          value={newTicketEntry.ticketsSold}
                                          onChange={(e) => setNewTicketEntry({
                                            ...newTicketEntry,
                                            ticketsSold: e.target.value
                                          })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="ticketPrice">Ticket Price</Label>
                                        <Input
                                          id="ticketPrice"
                                          type="number"
                                          step="0.01"
                                          placeholder={selectedGame.ticket_price?.toString()}
                                          value={newTicketEntry.ticketPrice}
                                          onChange={(e) => setNewTicketEntry({
                                            ...newTicketEntry,
                                            ticketPrice: e.target.value
                                          })}
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <Button 
                                          onClick={updateDailyEntry}
                                          className="w-full"
                                        >
                                          Add Entry
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedWeek(selectedWeek?.id === week.id ? null : week)}
                                  >
                                    {selectedWeek?.id === week.id ? 'Hide Details' : 'Show Details'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-medium">Daily Donation</h4>
                            <div className="space-y-2">
                              <DatePickerWithInput
                                date={dailyDonation.date}
                                setDate={(date) => date && setDailyDonation({...dailyDonation, date})}
                                placeholder="Select date"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                value={dailyDonation.amount}
                                onChange={(e) => setDailyDonation({...dailyDonation, amount: e.target.value})}
                              />
                              <Input
                                placeholder="Memo (optional)"
                                value={dailyDonation.memo}
                                onChange={(e) => setDailyDonation({...dailyDonation, memo: e.target.value})}
                              />
                              <Button 
                                onClick={handleDailyDonation} 
                                className="w-full"
                                disabled={isSubmittingDonation}
                              >
                                {isSubmittingDonation ? "Adding..." : "Add Donation"}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium">Daily Expense</h4>
                            <div className="space-y-2">
                              <DatePickerWithInput
                                date={dailyExpense.date}
                                setDate={(date) => date && setDailyExpense({...dailyExpense, date})}
                                placeholder="Select date"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                value={dailyExpense.amount}
                                onChange={(e) => setDailyExpense({...dailyExpense, amount: e.target.value})}
                              />
                              <Input
                                placeholder="Memo (optional)"
                                value={dailyExpense.memo}
                                onChange={(e) => setDailyExpense({...dailyExpense, memo: e.target.value})}
                              />
                              <Button 
                                onClick={handleDailyExpense} 
                                className="w-full"
                                disabled={isSubmittingExpense}
                              >
                                {isSubmittingExpense ? "Adding..." : "Add Expense"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Game Selected</h3>
                      <p className="text-gray-500">Select a game from the left panel to manage its weeks and entries.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial">
            {selectedGame ? (
              <FinancialOverview game={selectedGame} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Game Selected</h3>
                  <p className="text-gray-500">Select a game to view its financial overview.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports">
            {selectedGame ? (
              <DetailedFinancialTable game={selectedGame} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Game Selected</h3>
                  <p className="text-gray-500">Select a game to view detailed reports.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <GameForm 
        open={showGameForm} 
        onOpenChange={setShowGameForm}
        games={games}
        onComplete={handleGameCreated}
      />

      <ExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        gameId={selectedGame?.id || ''}
        gameName={selectedGame?.name || ''}
      />

      {selectedWeek && (
        <WinnerForm
          open={showWinnerForm}
          onOpenChange={setShowWinnerForm}
          selectedWeek={selectedWeek}
          selectedGame={selectedGame}
          onComplete={handleWinnerComplete}
        />
      )}

      {payoutSlipData && (
        <PayoutSlipModal
          open={showPayoutSlip}
          onOpenChange={setShowPayoutSlip}
          winnerData={payoutSlipData}
        />
      )}
    </div>
  );
}
