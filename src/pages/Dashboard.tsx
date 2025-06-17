
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Plus, Trash } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Game {
  id: string;
  name: string;
  game_number: number;
  start_date: string;
  end_date?: string;
  ticket_price: number;
  organization_percentage: number;
  jackpot_percentage: number;
  carryover_jackpot: number;
  total_sales: number;
  total_payouts: number;
  total_expenses: number;
  total_donations: number;
  organization_net_profit: number;
  minimum_starting_jackpot: number;
}

interface Week {
  id: string;
  game_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  weekly_sales: number;
  weekly_tickets_sold: number;
  weekly_payout: number;
  winner_name?: string;
  slot_chosen?: number;
  card_selected?: string;
  winner_present: boolean;
}

interface TicketSale {
  id: string;
  game_id: string;
  week_id: string;
  date: string;
  tickets_sold: number;
  ticket_price: number;
  amount_collected: number;
  cumulative_collected: number;
  organization_total: number;
  jackpot_total: number;
  weekly_payout_amount: number;
  ending_jackpot_total: number;
}

interface Expense {
  id: string;
  game_id: string;
  date: string;
  amount: number;
  memo: string;
  is_donation: boolean;
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [weeks, setWeeks] = useState<Record<string, Week[]>>({});
  const [ticketSales, setTicketSales] = useState<Record<string, TicketSale[]>>({});
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);
  const [newGameData, setNewGameData] = useState({
    name: '',
    ticket_price: 2,
    organization_percentage: 40,
    jackpot_percentage: 60,
    minimum_starting_jackpot: 500
  });

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive"
      });
    }
  };

  const fetchWeeks = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', gameId)
        .order('week_number', { ascending: true });

      if (error) throw error;
      
      setWeeks(prev => ({ ...prev, [gameId]: data || [] }));
      
      // Fetch ticket sales for each week
      data?.forEach(week => {
        fetchTicketSales(week.id);
      });
    } catch (error) {
      console.error('Error fetching weeks:', error);
    }
  };

  const fetchTicketSales = async (weekId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .order('date', { ascending: true });

      if (error) throw error;
      setTicketSales(prev => ({ ...prev, [weekId]: data || [] }));
    } catch (error) {
      console.error('Error fetching ticket sales:', error);
    }
  };

  const fetchExpenses = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', gameId)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(prev => ({ ...prev, [gameId]: data || [] }));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const toggleGameExpansion = (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      fetchWeeks(gameId);
      fetchExpenses(gameId);
    }
  };

  const toggleWeekExpansion = (weekId: string) => {
    if (expandedWeek === weekId) {
      setExpandedWeek(null);
    } else {
      setExpandedWeek(weekId);
    }
  };

  const handleCreateGame = async () => {
    if (!newGameData.name.trim()) {
      toast({
        title: "Error",
        description: "Game name is required",
        variant: "destructive"
      });
      return;
    }

    if (newGameData.organization_percentage + newGameData.jackpot_percentage !== 100) {
      toast({
        title: "Error",
        description: "Organization and jackpot percentages must total 100%",
        variant: "destructive"
      });
      return;
    }

    try {
      const gameNumber = games.length + 1;
      
      const { data, error } = await supabase
        .from('games')
        .insert([{
          name: newGameData.name,
          game_number: gameNumber,
          start_date: new Date().toISOString().split('T')[0],
          ticket_price: newGameData.ticket_price,
          organization_percentage: newGameData.organization_percentage,
          jackpot_percentage: newGameData.jackpot_percentage,
          minimum_starting_jackpot: newGameData.minimum_starting_jackpot,
          carryover_jackpot: 0,
          total_sales: 0,
          total_payouts: 0,
          total_expenses: 0,
          total_donations: 0,
          organization_net_profit: 0
        }])
        .select();

      if (error) throw error;

      setNewGameData({
        name: '',
        ticket_price: 2,
        organization_percentage: 40,
        jackpot_percentage: 60,
        minimum_starting_jackpot: 500
      });
      setNewGameDialogOpen(false);
      fetchGames();
      
      toast({
        title: "Success",
        description: "Game created successfully"
      });
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#132E2C' }}>
          Queen of Hearts Manager
        </h1>
        <Button 
          onClick={() => setNewGameDialogOpen(true)}
          className="flex items-center gap-2"
          style={{ backgroundColor: '#1F4E4A', color: 'white' }}
        >
          <Plus className="h-4 w-4" />
          Create Game
        </Button>
      </div>

      {games.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#132E2C' }}>
              No games found
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first Queen of Hearts game to get started
            </p>
            <Button 
              onClick={() => setNewGameDialogOpen(true)}
              style={{ backgroundColor: '#A1E96C', color: '#132E2C' }}
            >
              Create Your First Game
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {games.map(game => (
            <Card key={game.id} className="shadow-md">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleGameExpansion(game.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl" style={{ color: '#132E2C' }}>
                      {game.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(game.start_date).toLocaleDateString()}
                      {game.end_date && ` | Ended: ${new Date(game.end_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Sales</p>
                      <p className="font-semibold" style={{ color: '#1F4E4A' }}>
                        {formatCurrency(game.total_sales)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Organization Net</p>
                      <p className="font-semibold" style={{ color: '#A1E96C' }}>
                        {formatCurrency(game.organization_net_profit)}
                      </p>
                    </div>
                    {expandedGame === game.id ? 
                      <ChevronUp className="h-5 w-5" /> : 
                      <ChevronDown className="h-5 w-5" />
                    }
                  </div>
                </div>
              </CardHeader>

              {expandedGame === game.id && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Week cards will go here */}
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2" style={{ color: '#132E2C' }}>
                        Weeks
                      </h3>
                      {weeks[game.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {weeks[game.id].map(week => (
                            <Card key={week.id} className="border-l-4" style={{ borderLeftColor: '#A1E96C' }}>
                              <CardHeader 
                                className="cursor-pointer py-3"
                                onClick={() => toggleWeekExpansion(week.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">Week {week.week_number}</h4>
                                    <p className="text-sm text-gray-600">
                                      {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">Tickets Sold</p>
                                      <p className="font-medium">{week.weekly_tickets_sold}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">Sales</p>
                                      <p className="font-medium">{formatCurrency(week.weekly_sales)}</p>
                                    </div>
                                    {week.winner_name && (
                                      <div className="text-right">
                                        <p className="text-sm text-gray-600">Winner</p>
                                        <p className="font-medium">{week.winner_name}</p>
                                      </div>
                                    )}
                                    {expandedWeek === week.id ? 
                                      <ChevronUp className="h-4 w-4" /> : 
                                      <ChevronDown className="h-4 w-4" />
                                    }
                                  </div>
                                </div>
                              </CardHeader>
                              
                              {expandedWeek === week.id && (
                                <CardContent className="pt-0">
                                  <div className="space-y-2">
                                    {ticketSales[week.id]?.map(sale => (
                                      <div key={sale.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div>
                                          <span className="font-medium">{new Date(sale.date).toLocaleDateString()}</span>
                                          <span className="ml-2 text-gray-600">
                                            {sale.tickets_sold} tickets @ {formatCurrency(sale.ticket_price)}
                                          </span>
                                        </div>
                                        <span className="font-semibold">
                                          {formatCurrency(sale.amount_collected)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-center py-4">
                          No weeks created yet
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Game Dialog */}
      <Dialog open={newGameDialogOpen} onOpenChange={setNewGameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Game</DialogTitle>
            <DialogDescription>
              Set up a new Queen of Hearts game with your preferred settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="gameName">Game Name</Label>
              <Input
                id="gameName"
                value={newGameData.name}
                onChange={(e) => setNewGameData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Game 1, Summer 2024"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newGameData.ticket_price}
                  onChange={(e) => setNewGameData(prev => ({ ...prev, ticket_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="minimumJackpot">Minimum Starting Jackpot ($)</Label>
                <Input
                  id="minimumJackpot"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newGameData.minimum_starting_jackpot}
                  onChange={(e) => setNewGameData(prev => ({ ...prev, minimum_starting_jackpot: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orgPercentage">Organization Percentage (%)</Label>
                <Input
                  id="orgPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={newGameData.organization_percentage}
                  onChange={(e) => setNewGameData(prev => ({ 
                    ...prev, 
                    organization_percentage: parseInt(e.target.value) || 0,
                    jackpot_percentage: 100 - (parseInt(e.target.value) || 0)
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="jackpotPercentage">Jackpot Percentage (%)</Label>
                <Input
                  id="jackpotPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={newGameData.jackpot_percentage}
                  onChange={(e) => setNewGameData(prev => ({ 
                    ...prev, 
                    jackpot_percentage: parseInt(e.target.value) || 0,
                    organization_percentage: 100 - (parseInt(e.target.value) || 0)
                  }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGameDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGame}
              style={{ backgroundColor: '#1F4E4A', color: 'white' }}
            >
              Create Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
