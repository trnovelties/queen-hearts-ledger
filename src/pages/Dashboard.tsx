
import { useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight, Edit, Trash2, DollarSign, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { ExpenseModal } from "@/components/ExpenseModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Game {
  id: string;
  name: string;
  game_number: number;
  start_date: string;
  end_date: string | null;
  ticket_price: number;
  organization_percentage: number;
  jackpot_percentage: number;
  minimum_starting_jackpot: number;
  carryover_jackpot: number;
  total_sales: number;
  total_payouts: number;
  total_expenses: number;
  total_donations: number;
  organization_net_profit: number;
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
  winner_name: string | null;
  slot_chosen: number | null;
  card_selected: string | null;
  winner_present: boolean | null;
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
  jackpot_contributions_total: number;
  displayed_jackpot_total: number;
  ending_jackpot_total: number;
  weekly_payout_amount: number;
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [weeks, setWeeks] = useState<Record<string, Week[]>>({});
  const [ticketSales, setTicketSales] = useState<Record<string, TicketSale[]>>({});
  const [openGames, setOpenGames] = useState<Record<string, boolean>>({});
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
  const [showGameForm, setShowGameForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState<string | null>(null);
  const [showWinnerForm, setShowWinnerForm] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState<{ gameId: string; gameName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: true });

      if (error) throw error;
      setGames(data || []);
      
      // Fetch weeks for all games
      if (data && data.length > 0) {
        await fetchWeeksForGames(data.map(g => g.id));
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeksForGames = async (gameIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .in('game_id', gameIds)
        .order('week_number', { ascending: true });

      if (error) throw error;
      
      const weeksByGame = (data || []).reduce((acc, week) => {
        if (!acc[week.game_id]) acc[week.game_id] = [];
        acc[week.game_id].push(week);
        return acc;
      }, {} as Record<string, Week[]>);
      
      setWeeks(weeksByGame);
      
      // Fetch ticket sales for all weeks
      const weekIds = (data || []).map(w => w.id);
      if (weekIds.length > 0) {
        await fetchTicketSalesForWeeks(weekIds);
      }
    } catch (error) {
      console.error('Error fetching weeks:', error);
      toast.error("Failed to load weeks");
    }
  };

  const fetchTicketSalesForWeeks = async (weekIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .in('week_id', weekIds)
        .order('date', { ascending: true });

      if (error) throw error;
      
      const salesByWeek = (data || []).reduce((acc, sale) => {
        if (!acc[sale.week_id]) acc[sale.week_id] = [];
        acc[sale.week_id].push(sale);
        return acc;
      }, {} as Record<string, TicketSale[]>);
      
      setTicketSales(salesByWeek);
    } catch (error) {
      console.error('Error fetching ticket sales:', error);
      toast.error("Failed to load ticket sales");
    }
  };

  const createWeek = async (gameId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const existingWeeks = weeks[gameId] || [];
      const weekNumber = existingWeeks.length + 1;
      
      // Calculate start and end dates for the week
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 6);
      
      const weekData = {
        game_id: gameId,
        user_id: user.id,
        week_number: weekNumber,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      };

      const { data, error } = await supabase
        .from('weeks')
        .insert([weekData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setWeeks(prev => ({
          ...prev,
          [gameId]: [...(prev[gameId] || []), data[0]]
        }));
        toast.success("Week created successfully!");
      }
    } catch (error) {
      console.error('Error creating week:', error);
      toast.error("Failed to create week");
    }
  };

  const getPreviousJackpotInfo = (gameId: string, weekId: string) => {
    const gameWeeks = weeks[gameId] || [];
    const currentWeekIndex = gameWeeks.findIndex(w => w.id === weekId);
    
    if (currentWeekIndex === 0) {
      // First week of the game
      const game = games.find(g => g.id === gameId);
      return {
        previousEndingJackpot: game?.carryover_jackpot || 0,
        previousJackpotContributions: 0
      };
    }
    
    // Get all previous weeks' ticket sales
    const previousWeeks = gameWeeks.slice(0, currentWeekIndex);
    let totalJackpotContributions = 0;
    let lastEndingJackpot = 0;
    
    previousWeeks.forEach(week => {
      const weekSales = ticketSales[week.id] || [];
      weekSales.forEach(sale => {
        totalJackpotContributions += sale.jackpot_contributions_total || sale.jackpot_total;
        lastEndingJackpot = sale.ending_jackpot_total;
      });
    });
    
    return {
      previousEndingJackpot: lastEndingJackpot,
      previousJackpotContributions: totalJackpotContributions
    };
  };

  const addTicketSaleEntry = async (gameId: string, weekId: string, saleData: any) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get cumulative collected for this game
      const { data: existingSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('amount_collected')
        .eq('game_id', gameId);

      if (salesError) throw salesError;

      const cumulativeCollected = (existingSales?.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0) || 0) + saleData.amount_collected;

      const ticketSaleEntry = {
        user_id: user.id,
        game_id: gameId,
        week_id: weekId,
        date: saleData.date,
        tickets_sold: saleData.tickets_sold,
        ticket_price: saleData.ticket_price,
        amount_collected: saleData.amount_collected,
        cumulative_collected: cumulativeCollected,
        organization_total: saleData.organization_total,
        jackpot_total: saleData.jackpot_total,
        ending_jackpot_total: saleData.ending_jackpot_total,
      };

      const { data, error } = await supabase
        .from('ticket_sales')
        .insert([ticketSaleEntry])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setTicketSales(prev => ({
          ...prev,
          [weekId]: [...(prev[weekId] || []), data[0]]
        }));
        
        // Update game total sales
        await supabase
          .from('games')
          .update({ total_sales: cumulativeCollected })
          .eq('id', gameId);
        
        toast.success("Ticket sale added successfully!");
        setShowTicketForm(null);
        await fetchGames(); // Refresh to get updated totals
      }
    } catch (error) {
      console.error('Error adding ticket sale:', error);
      toast.error("Failed to add ticket sale");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1F4E4A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1F4E4A] font-inter">Dashboard</h1>
            <p className="text-[#132E2C]/60 mt-2">Manage your Queen of Hearts games</p>
          </div>
          <Button
            onClick={() => setShowGameForm(true)}
            className="bg-[#A1E96C] hover:bg-[#8BC653] text-[#1F4E4A] font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Game
          </Button>
        </div>

        {games.length === 0 ? (
          <Card className="text-center py-12 border-[#1F4E4A]/20">
            <CardContent>
              <Trophy className="h-16 w-16 text-[#1F4E4A]/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#1F4E4A] mb-2">No Games Yet</h3>
              <p className="text-[#132E2C]/60 mb-6">Create your first Queen of Hearts game to get started</p>
              <Button
                onClick={() => setShowGameForm(true)}
                className="bg-[#A1E96C] hover:bg-[#8BC653] text-[#1F4E4A] font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {games.map((game) => (
              <Card key={game.id} className="border-[#1F4E4A]/20 shadow-lg overflow-hidden">
                <Collapsible 
                  open={openGames[game.id]} 
                  onOpenChange={(open) => setOpenGames(prev => ({ ...prev, [game.id]: open }))}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/50 transition-colors border-b border-[#1F4E4A]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {openGames[game.id] ? (
                            <ChevronDown className="h-6 w-6 text-[#1F4E4A]" />
                          ) : (
                            <ChevronRight className="h-6 w-6 text-[#1F4E4A]" />
                          )}
                          <div>
                            <CardTitle className="text-2xl font-bold text-[#1F4E4A] font-inter">
                              {game.name}
                            </CardTitle>
                            <CardDescription className="text-[#132E2C]/60 mt-1">
                              Started: {new Date(game.start_date).toLocaleDateString()}
                              {game.end_date && ` | Ended: ${new Date(game.end_date).toLocaleDateString()}`}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm text-[#132E2C]/60">Total Sales</div>
                            <div className="text-xl font-bold text-[#1F4E4A]">${game.total_sales.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-[#132E2C]/60">Net Profit</div>
                            <div className="text-xl font-bold text-[#A1E96C]">${game.organization_net_profit.toFixed(2)}</div>
                          </div>
                          {game.end_date ? (
                            <Badge variant="secondary" className="bg-[#132E2C] text-white">Completed</Badge>
                          ) : (
                            <Badge className="bg-[#A1E96C] text-[#1F4E4A]">Active</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 bg-white">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-[#1F4E4A]">Weeks</h3>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowExpenseModal({ gameId: game.id, gameName: game.name })}
                            variant="outline"
                            size="sm"
                            className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Add Expense
                          </Button>
                          <Button
                            onClick={() => createWeek(game.id)}
                            size="sm"
                            className="bg-[#A1E96C] hover:bg-[#8BC653] text-[#1F4E4A]"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Week
                          </Button>
                        </div>
                      </div>

                      {(!weeks[game.id] || weeks[game.id].length === 0) ? (
                        <div className="text-center py-8 bg-[#F7F8FC] rounded-lg border border-[#1F4E4A]/10">
                          <Users className="h-12 w-12 text-[#1F4E4A]/40 mx-auto mb-3" />
                          <p className="text-[#132E2C]/60">No weeks created yet</p>
                          <Button
                            onClick={() => createWeek(game.id)}
                            size="sm"
                            className="mt-3 bg-[#A1E96C] hover:bg-[#8BC653] text-[#1F4E4A]"
                          >
                            Create First Week
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {weeks[game.id].map((week) => (
                            <Card key={week.id} className="border-[#1F4E4A]/10">
                              <Collapsible 
                                open={openWeeks[week.id]} 
                                onOpenChange={(open) => setOpenWeeks(prev => ({ ...prev, [week.id]: open }))}
                              >
                                <CollapsibleTrigger asChild>
                                  <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/30 transition-colors pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        {openWeeks[week.id] ? (
                                          <ChevronDown className="h-5 w-5 text-[#1F4E4A]" />
                                        ) : (
                                          <ChevronRight className="h-5 w-5 text-[#1F4E4A]" />
                                        )}
                                        <div>
                                          <CardTitle className="text-lg font-semibold text-[#1F4E4A]">
                                            Week {week.week_number}
                                          </CardTitle>
                                          <CardDescription className="text-sm text-[#132E2C]/60">
                                            {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                                          </CardDescription>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-4 text-sm">
                                        <div className="text-center">
                                          <div className="text-[#132E2C]/60">Tickets</div>
                                          <div className="font-semibold text-[#1F4E4A]">{week.weekly_tickets_sold}</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-[#132E2C]/60">Sales</div>
                                          <div className="font-semibold text-[#1F4E4A]">${week.weekly_sales.toFixed(2)}</div>
                                        </div>
                                        {week.winner_name && (
                                          <div className="text-center">
                                            <div className="text-[#132E2C]/60">Winner</div>
                                            <div className="font-semibold text-[#A1E96C]">{week.winner_name}</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <CardContent className="pt-0">
                                    {/* Ticket Sales Table */}
                                    <div className="mb-4">
                                      <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-[#1F4E4A]">Daily Sales</h4>
                                        <Button
                                          onClick={() => setShowTicketForm(week.id)}
                                          size="sm"
                                          variant="outline"
                                          className="border-[#A1E96C] text-[#A1E96C] hover:bg-[#A1E96C] hover:text-[#1F4E4A]"
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add Sale
                                        </Button>
                                      </div>
                                      
                                      {(!ticketSales[week.id] || ticketSales[week.id].length === 0) ? (
                                        <div className="text-center py-6 bg-[#F7F8FC] rounded border border-[#1F4E4A]/10">
                                          <p className="text-[#132E2C]/60 mb-3">No sales recorded yet</p>
                                          <Button
                                            onClick={() => setShowTicketForm(week.id)}
                                            size="sm"
                                            className="bg-[#A1E96C] hover:bg-[#8BC653] text-[#1F4E4A]"
                                          >
                                            Add First Sale
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm border-collapse">
                                            <thead>
                                              <tr className="border-b border-[#1F4E4A]/20">
                                                <th className="text-left py-2 px-3 font-semibold text-[#1F4E4A]">Date</th>
                                                <th className="text-right py-2 px-3 font-semibold text-[#1F4E4A]">Tickets</th>
                                                <th className="text-right py-2 px-3 font-semibold text-[#1F4E4A]">Price</th>
                                                <th className="text-right py-2 px-3 font-semibold text-[#1F4E4A]">Amount</th>
                                                <th className="text-right py-2 px-3 font-semibold text-[#1F4E4A]">Org Total</th>
                                                <th className="text-right py-2 px-3 font-semibold text-[#A1E96C]">Jackpot</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {ticketSales[week.id].map((sale) => (
                                                <tr key={sale.id} className="border-b border-[#1F4E4A]/10">
                                                  <td className="py-2 px-3">{new Date(sale.date).toLocaleDateString()}</td>
                                                  <td className="text-right py-2 px-3">{sale.tickets_sold}</td>
                                                  <td className="text-right py-2 px-3">${sale.ticket_price.toFixed(2)}</td>
                                                  <td className="text-right py-2 px-3">${sale.amount_collected.toFixed(2)}</td>
                                                  <td className="text-right py-2 px-3">${sale.organization_total.toFixed(2)}</td>
                                                  <td className="text-right py-2 px-3 font-semibold text-[#A1E96C]">${sale.ending_jackpot_total.toFixed(2)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>

                                    {/* Winner Section */}
                                    {ticketSales[week.id] && ticketSales[week.id].length >= 7 && !week.winner_name && (
                                      <div className="mt-4 p-4 bg-[#A1E96C]/10 rounded-lg border border-[#A1E96C]/20">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <h4 className="font-semibold text-[#1F4E4A]">Week Complete - Select Winner</h4>
                                            <p className="text-sm text-[#132E2C]/60">7 days of sales recorded. Time for the drawing!</p>
                                          </div>
                                          <Button
                                            onClick={() => setShowWinnerForm(week.id)}
                                            className="bg-[#A1E96C] hover:bg-[#8BC653] text-[#1F4E4A]"
                                          >
                                            Select Winner
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {week.winner_name && (
                                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                        <h4 className="font-semibold text-green-800 mb-2">Week Winner</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                          <div>
                                            <span className="text-green-600">Winner:</span>
                                            <div className="font-semibold">{week.winner_name}</div>
                                          </div>
                                          <div>
                                            <span className="text-green-600">Slot:</span>
                                            <div className="font-semibold">{week.slot_chosen}</div>
                                          </div>
                                          <div>
                                            <span className="text-green-600">Card:</span>
                                            <div className="font-semibold">{week.card_selected}</div>
                                          </div>
                                          <div>
                                            <span className="text-green-600">Payout:</span>
                                            <div className="font-semibold">${week.weekly_payout.toFixed(2)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        {/* Modals */}
        <GameForm
          open={showGameForm}
          onOpenChange={setShowGameForm}
          games={games}
          onComplete={fetchGames}
        />

        {showTicketForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <TicketSalesRow
                gameId={weeks[Object.keys(weeks).find(gameId => 
                  weeks[gameId].some(w => w.id === showTicketForm)
                ) || ''] || ''}
                weekId={showTicketForm}
                gameData={games.find(g => 
                  weeks[g.id]?.some(w => w.id === showTicketForm)
                ) || games[0]}
                previousEndingJackpot={getPreviousJackpotInfo(
                  weeks[Object.keys(weeks).find(gameId => 
                    weeks[gameId].some(w => w.id === showTicketForm)
                  ) || ''] || '',
                  showTicketForm
                ).previousEndingJackpot}
                previousJackpotContributions={getPreviousJackpotInfo(
                  weeks[Object.keys(weeks).find(gameId => 
                    weeks[gameId].some(w => w.id === showTicketForm)
                  ) || ''] || '',
                  showTicketForm
                ).previousJackpotContributions}
                onSuccess={() => {
                  setShowTicketForm(null);
                  fetchGames();
                }}
                onCancel={() => setShowTicketForm(null)}
              />
            </div>
          </div>
        )}

        {showWinnerForm && (
          <WinnerForm
            open={!!showWinnerForm}
            onOpenChange={(open) => !open && setShowWinnerForm(null)}
            weekId={showWinnerForm}
            gameId={games.find(g => 
              weeks[g.id]?.some(w => w.id === showWinnerForm)
            )?.id || ''}
            onComplete={() => {
              setShowWinnerForm(null);
              fetchGames();
            }}
            onOpenPayoutSlip={() => {}}
          />
        )}

        {showExpenseModal && (
          <ExpenseModal
            open={!!showExpenseModal}
            onOpenChange={(open) => !open && setShowExpenseModal(null)}
            gameId={showExpenseModal.gameId}
            gameName={showExpenseModal.gameName}
          />
        )}
      </div>
    </div>
  );
}
