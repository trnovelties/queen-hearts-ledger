
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Plus, Calendar, Users, DollarSign, Trophy, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { GameForm } from "@/components/GameForm";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { ExpenseModal } from "@/components/ExpenseModal";

const Dashboard = () => {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showGameForm, setShowGameForm] = useState(false);
  const [showWinnerForm, setShowWinnerForm] = useState<string | null>(null);
  const [showPayoutSlip, setShowPayoutSlip] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const [showTicketSalesForm, setShowTicketSalesForm] = useState<string | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState<{open: boolean, gameId: string, gameName: string}>({
    open: false,
    gameId: '',
    gameName: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Format currency helper function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Fetch games
  const { data: games, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch weeks for each game
  const { data: weeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .order('week_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch ticket sales
  const { data: ticketSales } = useQuery({
    queryKey: ['ticket_sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const toggleWeekExpansion = (weekId: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekId)) {
        newSet.delete(weekId);
      } else {
        newSet.add(weekId);
      }
      return newSet;
    });
  };

  const getWeeksForGame = (gameId: string) => {
    return weeks?.filter(week => week.game_id === gameId) || [];
  };

  const getTicketSalesForWeek = (weekId: string) => {
    return ticketSales?.filter(sale => sale.week_id === weekId) || [];
  };

  const getExpensesForGame = (gameId: string) => {
    return expenses?.filter(expense => expense.game_id === gameId) || [];
  };

  const handleGameFormComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['games'] });
    setShowGameForm(false);
  };

  const handleOpenPayoutSlip = (winnerData: any) => {
    setPayoutSlipData(winnerData);
    setShowPayoutSlip(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Queen of Hearts Manager</h1>
        <Button onClick={() => setShowGameForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Game
        </Button>
      </div>

      <div className="space-y-4">
        {games?.map((game) => {
          const gameWeeks = getWeeksForGame(game.id);
          const gameExpenses = getExpensesForGame(game.id);
          const isExpanded = expandedGames.has(game.id);

          return (
            <Card key={game.id} className="border shadow-sm">
              <Collapsible open={isExpanded} onOpenChange={() => toggleGameExpansion(game.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span>{game.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Start: {format(new Date(game.start_date), 'MMM dd, yyyy')}</span>
                        {game.end_date && <span>End: {format(new Date(game.end_date), 'MMM dd, yyyy')}</span>}
                        <span>Sales: {formatCurrency(game.total_sales)}</span>
                        <span>Net: {formatCurrency(game.organization_net_profit)}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Weeks</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Create week logic here
                          toast({
                            title: "Feature Coming Soon",
                            description: "Week creation will be available soon",
                          });
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Week
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {gameWeeks.map((week) => {
                        const weekTicketSales = getTicketSalesForWeek(week.id);
                        const isWeekExpanded = expandedWeeks.has(week.id);

                        return (
                          <Card key={week.id} className="border-l-4 border-l-blue-500">
                            <Collapsible open={isWeekExpanded} onOpenChange={() => toggleWeekExpansion(week.id)}>
                              <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                                  <CardTitle className="flex items-center justify-between text-base">
                                    <div className="flex items-center space-x-2">
                                      {isWeekExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <span>Week {week.week_number}</span>
                                      <span className="text-sm text-gray-600">
                                        {format(new Date(week.start_date), 'MMM dd')} - {format(new Date(week.end_date), 'MMM dd, yyyy')}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                                        <span>Tickets: {week.weekly_tickets_sold}</span>
                                        <span>Sales: {formatCurrency(week.weekly_sales)}</span>
                                        <span>Payout: {formatCurrency(week.weekly_payout)}</span>
                                        {week.winner_name && <span>Winner: {week.winner_name}</span>}
                                        {week.card_selected && <span>Card: {week.card_selected}</span>}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (window.confirm('Are you sure you want to delete this week?')) {
                                            // Delete week logic here
                                            toast({
                                              title: "Feature Coming Soon",
                                              description: "Week deletion will be available soon",
                                            });
                                          }
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <CardContent className="space-y-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">Ticket Sales</h4>
                                    {weekTicketSales.length > 0 ? (
                                      <div className="space-y-1">
                                        {weekTicketSales.map((sale) => (
                                          <div key={sale.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <div className="flex items-center space-x-3">
                                              <span className="text-sm">{format(new Date(sale.date), 'MMM dd, yyyy')}</span>
                                              <span className="text-sm">Tickets: {sale.tickets_sold}</span>
                                              <span className="text-sm">Price: {formatCurrency(sale.ticket_price)}</span>
                                            </div>
                                            <span className="font-medium">{formatCurrency(sale.amount_collected)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-sm">No ticket sales recorded</p>
                                    )}
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        toast({
                                          title: "Feature Coming Soon",
                                          description: "Ticket sales entry will be available soon",
                                        });
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add Ticket Sales
                                    </Button>
                                  </div>

                                  {week.winner_name && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Winner Information</h4>
                                      <div className="bg-green-50 p-3 rounded-md">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          <div><strong>Winner:</strong> {week.winner_name}</div>
                                          <div><strong>Slot:</strong> {week.slot_chosen}</div>
                                          <div><strong>Card:</strong> {week.card_selected}</div>
                                          <div><strong>Present:</strong> {week.winner_present ? 'Yes' : 'No'}</div>
                                          <div><strong>Payout:</strong> {formatCurrency(week.weekly_payout)}</div>
                                        </div>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="mt-2"
                                          onClick={() => handleOpenPayoutSlip({
                                            winnerName: week.winner_name,
                                            slotChosen: week.slot_chosen,
                                            cardSelected: week.card_selected,
                                            payoutAmount: week.weekly_payout,
                                            date: week.end_date,
                                            gameNumber: game.game_number,
                                            gameName: game.name,
                                            weekNumber: week.week_number,
                                            weekId: week.id,
                                            weekStartDate: week.start_date,
                                            weekEndDate: week.end_date,
                                          })}
                                        >
                                          Print Payout Slip
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        toast({
                                          title: "Feature Coming Soon",
                                          description: "Winner form will be available soon",
                                        });
                                      }}
                                      disabled={!!week.winner_name}
                                    >
                                      {week.winner_name ? 'Winner Recorded' : 'Record Winner'}
                                    </Button>
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Expenses & Donations</h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setExpenseModalOpen({
                            open: true,
                            gameId: game.id,
                            gameName: game.name
                          })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Expense
                        </Button>
                      </div>
                      {gameExpenses.length > 0 ? (
                        <div className="space-y-1">
                          {gameExpenses.map((expense) => (
                            <div key={expense.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm">{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                                <span className="text-sm">{expense.memo}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  expense.is_donation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {expense.is_donation ? 'Donation' : 'Expense'}
                                </span>
                              </div>
                              <span className="font-medium">{formatCurrency(expense.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No expenses recorded</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      <GameForm 
        open={showGameForm}
        onOpenChange={setShowGameForm}
        games={games || []}
        onComplete={handleGameFormComplete}
      />

      <PayoutSlipModal 
        open={showPayoutSlip}
        onOpenChange={setShowPayoutSlip}
        winnerData={payoutSlipData}
      />

      <ExpenseModal 
        open={expenseModalOpen.open}
        onOpenChange={(open) => setExpenseModalOpen(prev => ({...prev, open}))}
        gameId={expenseModalOpen.gameId}
        gameName={expenseModalOpen.gameName}
      />
    </div>
  );
};

export default Dashboard;
