import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Calendar, DollarSign, Trophy, Users } from "lucide-react";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { ExpenseModal } from "@/components/ExpenseModal";
import { formatCurrency } from "@/lib/utils";

const Dashboard = () => {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showGameForm, setShowGameForm] = useState(false);
  const [showWeekForm, setShowWeekForm] = useState<string | null>(null);
  const [weekFormData, setWeekFormData] = useState({ startDate: '', endDate: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  // Week deletion mutation
  const deleteWeekMutation = useMutation({
    mutationFn: async (weekId: string) => {
      // First delete all ticket sales for this week
      const { error: ticketSalesError } = await supabase
        .from('ticket_sales')
        .delete()
        .eq('week_id', weekId);

      if (ticketSalesError) throw ticketSalesError;

      // Then delete the week
      const { error: weekError } = await supabase
        .from('weeks')
        .delete()
        .eq('id', weekId);

      if (weekError) throw weekError;

      return weekId;
    },
    onSuccess: (deletedWeekId) => {
      // Refresh all data
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      queryClient.invalidateQueries({ queryKey: ['ticket_sales'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // Remove from expanded weeks
      setExpandedWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletedWeekId);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: "Week deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete week: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create week mutation
  const createWeekMutation = useMutation({
    mutationFn: async ({ gameId, weekData }: { gameId: string; weekData: any }) => {
      const gameWeeks = weeks?.filter(w => w.game_id === gameId) || [];
      const nextWeekNumber = gameWeeks.length + 1;

      const { data, error } = await supabase
        .from('weeks')
        .insert({
          game_id: gameId,
          week_number: nextWeekNumber,
          start_date: weekData.startDate,
          end_date: weekData.endDate,
          weekly_sales: 0,
          weekly_tickets_sold: 0,
          weekly_payout: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      setShowWeekForm(null);
      setWeekFormData({ startDate: '', endDate: '' });
      toast({
        title: "Success",
        description: "Week created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create week: ${error.message}`,
        variant: "destructive",
      });
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

  const handleCreateWeek = (gameId: string) => {
    createWeekMutation.mutate({ gameId, weekData: weekFormData });
  };

  const handleDeleteWeek = (weekId: string) => {
    if (window.confirm('Are you sure you want to delete this week? This will also delete all ticket sales for this week.')) {
      deleteWeekMutation.mutate(weekId);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Queen of Hearts Manager</h1>
        <Dialog open={showGameForm} onOpenChange={setShowGameForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
            </DialogHeader>
            <GameForm onClose={() => setShowGameForm(false)} />
          </DialogContent>
        </Dialog>
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
                      <Dialog 
                        open={showWeekForm === game.id} 
                        onOpenChange={(open) => setShowWeekForm(open ? game.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Week
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Week</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="startDate">Start Date</Label>
                              <Input
                                id="startDate"
                                type="date"
                                value={weekFormData.startDate}
                                onChange={(e) => setWeekFormData(prev => ({
                                  ...prev,
                                  startDate: e.target.value
                                }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="endDate">End Date</Label>
                              <Input
                                id="endDate"
                                type="date"
                                value={weekFormData.endDate}
                                onChange={(e) => setWeekFormData(prev => ({
                                  ...prev,
                                  endDate: e.target.value
                                }))}
                              />
                            </div>
                            <Button 
                              onClick={() => handleCreateWeek(game.id)}
                              disabled={!weekFormData.startDate || !weekFormData.endDate}
                            >
                              Create Week
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                                          handleDeleteWeek(week.id);
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
                                          <TicketSalesRow 
                                            key={sale.id} 
                                            sale={sale} 
                                            gameId={game.id}
                                            weekId={week.id}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500 text-sm">No ticket sales recorded</p>
                                    )}
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
                                        <PayoutSlipModal 
                                          week={week} 
                                          game={game}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex space-x-2">
                                    <WinnerForm 
                                      gameId={game.id}
                                      weekId={week.id}
                                      weekNumber={week.week_number}
                                      disabled={!!week.winner_name}
                                    />
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
                        <ExpenseModal gameId={game.id} />
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
    </div>
  );
};

export default Dashboard;
