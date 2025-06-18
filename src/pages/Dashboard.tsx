
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { ExpenseModal } from "@/components/ExpenseModal";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [archivedGames, setArchivedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());
  const [showGameForm, setShowGameForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(null);
  const [showWinnerForm, setShowWinnerForm] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(null);
  const [showPayoutSlip, setShowPayoutSlip] = useState(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          weeks (
            *,
            ticket_sales (*)
          ),
          expenses (*)
        `)
        .order('game_number', { ascending: false });

      if (gamesError) throw gamesError;

      const activeGames = gamesData?.filter(game => !game.end_date) || [];
      const archivedGames = gamesData?.filter(game => game.end_date) || [];
      
      setGames(activeGames);
      setArchivedGames(archivedGames);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const createWeek = async (gameId) => {
    if (!user?.id) {
      toast.error("You must be logged in to create weeks");
      return;
    }

    try {
      const game = games.find(g => g.id === gameId) || archivedGames.find(g => g.id === gameId);
      if (!game) return;

      const existingWeeks = game.weeks || [];
      const weekNumber = existingWeeks.length + 1;
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 6);

      const weekData = {
        game_id: gameId,
        user_id: user.id,
        week_number: weekNumber,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };

      const { error } = await supabase
        .from('weeks')
        .insert(weekData);

      if (error) throw error;

      toast.success(`Week ${weekNumber} created successfully!`);
      fetchGames();
    } catch (error) {
      console.error('Error creating week:', error);
      toast.error('Failed to create week');
    }
  };

  const toggleGameExpansion = (gameId) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  const toggleWeekExpansion = (weekId) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  };

  const addSeedData = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to add seed data");
      return;
    }

    try {
      // Create Game 11
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({
          game_number: 11,
          name: "Game 11",
          user_id: user.id,
          start_date: '2023-08-21',
          end_date: '2024-04-21',
          ticket_price: 2,
          organization_percentage: 40,
          jackpot_percentage: 60,
          minimum_starting_jackpot: 500,
          carryover_jackpot: 634.10,
          total_sales: 26552,
          total_payouts: 14461.6,
          total_expenses: 1485.08,
          total_donations: 5994,
          organization_net_profit: 4611.36
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Create Week 35
      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .insert({
          game_id: gameData.id,
          user_id: user.id,
          week_number: 35,
          start_date: '2024-04-15',
          end_date: '2024-04-21',
          weekly_sales: 3496,
          weekly_tickets_sold: 1748,
          weekly_payout: 14461.6,
          winner_name: "Buddy Dickson",
          slot_chosen: 31,
          card_selected: "Queen of Hearts",
          winner_present: true
        })
        .select()
        .single();

      if (weekError) throw weekError;

      // Create ticket sales data
      const ticketSalesData = [
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-15',
          tickets_sold: 250,
          ticket_price: 2,
          amount_collected: 500,
          cumulative_collected: 26052,
          organization_total: 200,
          jackpot_total: 300,
          ending_jackpot_total: 15631.2
        },
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-16',
          tickets_sold: 300,
          ticket_price: 2,
          amount_collected: 600,
          cumulative_collected: 26652,
          organization_total: 240,
          jackpot_total: 360,
          ending_jackpot_total: 15991.2
        },
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-17',
          tickets_sold: 200,
          ticket_price: 2,
          amount_collected: 400,
          cumulative_collected: 27052,
          organization_total: 160,
          jackpot_total: 240,
          ending_jackpot_total: 16231.2
        },
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-18',
          tickets_sold: 275,
          ticket_price: 2,
          amount_collected: 550,
          cumulative_collected: 27602,
          organization_total: 220,
          jackpot_total: 330,
          ending_jackpot_total: 16561.2
        },
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-19',
          tickets_sold: 350,
          ticket_price: 2,
          amount_collected: 700,
          cumulative_collected: 28302,
          organization_total: 280,
          jackpot_total: 420,
          ending_jackpot_total: 16981.2
        },
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-20',
          tickets_sold: 223,
          ticket_price: 2,
          amount_collected: 446,
          cumulative_collected: 28748,
          organization_total: 178.4,
          jackpot_total: 267.6,
          ending_jackpot_total: 17248.8
        },
        {
          game_id: gameData.id,
          week_id: weekData.id,
          user_id: user.id,
          date: '2024-04-21',
          tickets_sold: 150,
          ticket_price: 2,
          amount_collected: 300,
          cumulative_collected: 29048,
          organization_total: 120,
          jackpot_total: 180,
          ending_jackpot_total: 1606.84
        }
      ];

      const { error: salesError } = await supabase
        .from('ticket_sales')
        .insert(ticketSalesData);

      if (salesError) throw salesError;

      // Create expenses data
      const expensesData = [
        {
          game_id: gameData.id,
          user_id: user.id,
          date: '2024-04-15',
          amount: 50,
          memo: 'Ticket rolls',
          is_donation: false
        },
        {
          game_id: gameData.id,
          user_id: user.id,
          date: '2024-04-15',
          amount: 500,
          memo: 'Toys for Tots',
          is_donation: true
        }
      ];

      const { error: expensesError } = await supabase
        .from('expenses')
        .insert(expensesData);

      if (expensesError) throw expensesError;

      toast.success('Seed data added successfully!');
      fetchGames();
    } catch (error) {
      console.error('Error adding seed data:', error);
      toast.error('Failed to add seed data');
    }
  };

  const renderGameCard = (game) => {
    const isExpanded = expandedGames.has(game.id);
    const weeks = game.weeks || [];
    const sortedWeeks = weeks.sort((a, b) => a.week_number - b.week_number);

    return (
      <Card key={game.id} className="w-full border-[#1F4E4A]/20 shadow-sm hover:shadow-md transition-shadow">
        <Collapsible>
          <CollapsibleTrigger 
            className="w-full"
            onClick={() => toggleGameExpansion(game.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#1F4E4A]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#1F4E4A]" />
                )}
                <div className="text-left">
                  <CardTitle className="text-[#1F4E4A] font-inter text-lg">{game.name}</CardTitle>
                  <CardDescription className="text-[#132E2C]/60">
                    Start: {new Date(game.start_date).toLocaleDateString()}
                    {game.end_date && ` | End: ${new Date(game.end_date).toLocaleDateString()}`}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm font-semibold text-[#132E2C]">
                  Total Sales: <span className="text-[#A1E96C]">${(Number(game.total_sales) || 0).toFixed(2)}</span>
                </div>
                <div className="text-sm font-semibold text-[#132E2C]">
                  Net Profit: <span className="text-[#1F4E4A]">${(Number(game.organization_net_profit) || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-[#1F4E4A]">Weeks</h3>
                <div className="space-x-2">
                  <Button
                    onClick={() => createWeek(game.id)}
                    className="bg-[#A1E96C] hover:bg-[#A1E96C]/80 text-[#132E2C] font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Week
                  </Button>
                  <Button
                    onClick={() => setShowExpenseModal({ gameId: game.id, gameName: game.name })}
                    variant="outline"
                    className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                  >
                    Add Expense
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                {sortedWeeks.map((week) => renderWeekCard(week, game))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderWeekCard = (week, game) => {
    const isExpanded = expandedWeeks.has(week.id);
    const ticketSales = week.ticket_sales || [];
    const sortedTicketSales = ticketSales.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate current jackpot and contributions for the week
    const jackpotContributions = sortedTicketSales.reduce((total, sale) => {
      return total + (Number(sale.jackpot_total) || 0);
    }, 0);

    const currentJackpotTotal = sortedTicketSales.length > 0 
      ? (Number(sortedTicketSales[sortedTicketSales.length - 1].ending_jackpot_total) || 0)
      : (Number(game.carryover_jackpot) || 0) + (Number(game.minimum_starting_jackpot) || 0);

    return (
      <Card key={week.id} className="border-[#1F4E4A]/10 bg-[#F7F8FC]">
        <Collapsible>
          <CollapsibleTrigger 
            className="w-full"
            onClick={() => toggleWeekExpansion(week.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
              <div className="flex items-center space-x-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#1F4E4A]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#1F4E4A]" />
                )}
                <div className="text-left">
                  <CardTitle className="text-[#1F4E4A] font-inter text-base">
                    Week {week.week_number}
                  </CardTitle>
                  <CardDescription className="text-[#132E2C]/60 text-sm">
                    {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right text-xs">
                <div>
                  <div className="font-semibold text-[#132E2C]">Tickets Sold</div>
                  <div className="text-[#1F4E4A]">{week.weekly_tickets_sold || 0}</div>
                </div>
                <div>
                  <div className="font-semibold text-[#132E2C]">Ticket Sales</div>
                  <div className="text-[#A1E96C]">${(Number(week.weekly_sales) || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="font-semibold text-[#132E2C]">Winner</div>
                  <div className="text-[#1F4E4A]">{week.winner_name || 'TBD'}</div>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-[#1F4E4A]">Daily Ticket Sales</h4>
                <div className="space-x-2">
                  <Button
                    onClick={() => setShowTicketForm({ gameId: game.id, weekId: week.id, gameData: game })}
                    size="sm"
                    className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Row
                  </Button>
                  {sortedTicketSales.length >= 7 && !week.winner_name && (
                    <Button
                      onClick={() => setShowWinnerForm({ 
                        gameId: game.id, 
                        weekId: week.id, 
                        gameData: game, 
                        currentJackpotTotal: currentJackpotTotal, 
                        jackpotContributions: jackpotContributions 
                      })}
                      size="sm"
                      className="bg-[#A1E96C] hover:bg-[#A1E96C]/80 text-[#132E2C]"
                    >
                      Enter Winner
                    </Button>
                  )}
                  {week.winner_name && (
                    <Button
                      onClick={() => setShowPayoutSlip({ 
                        winnerData: {
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
                          weekEndDate: week.end_date
                        }
                      })}
                      size="sm"
                      variant="outline"
                      className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                    >
                      Print Payout Slip
                    </Button>
                  )}
                </div>
              </div>
              
              {sortedTicketSales.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1F4E4A]/20">
                        <th className="text-left py-2 text-[#132E2C] font-semibold">Date</th>
                        <th className="text-right py-2 text-[#132E2C] font-semibold">Tickets</th>
                        <th className="text-right py-2 text-[#132E2C] font-semibold">Price</th>
                        <th className="text-right py-2 text-[#132E2C] font-semibold">Collected</th>
                        <th className="text-right py-2 text-[#132E2C] font-semibold">Org Total</th>
                        <th className="text-right py-2 text-[#132E2C] font-semibold">Jackpot</th>
                        <th className="text-right py-2 text-[#132E2C] font-semibold">Ending Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTicketSales.map((sale, index) => (
                        <tr key={sale.id} className={index % 2 === 0 ? 'bg-white/50' : ''}>
                          <td className="py-2 text-[#132E2C]">{new Date(sale.date).toLocaleDateString()}</td>
                          <td className="text-right py-2 text-[#132E2C]">{sale.tickets_sold}</td>
                          <td className="text-right py-2 text-[#132E2C]">${(Number(sale.ticket_price) || 0).toFixed(2)}</td>
                          <td className="text-right py-2 text-[#A1E96C] font-semibold">${(Number(sale.amount_collected) || 0).toFixed(2)}</td>
                          <td className="text-right py-2 text-[#1F4E4A]">${(Number(sale.organization_total) || 0).toFixed(2)}</td>
                          <td className="text-right py-2 text-[#1F4E4A]">${(Number(sale.jackpot_total) || 0).toFixed(2)}</td>
                          <td className="text-right py-2 text-[#132E2C] font-semibold">${(Number(sale.ending_jackpot_total) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F8FC]">
        <div className="text-[#1F4E4A] font-inter">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1F4E4A] font-inter">Queen of Hearts Manager</h1>
            <p className="text-[#132E2C]/60 mt-2">Streamline your Queen of Hearts fundraiser with real-time tracking</p>
          </div>
          <div className="space-x-3">
            <Button
              onClick={addSeedData}
              variant="outline"
              className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C] hover:text-[#132E2C]"
            >
              Add Seed Data
            </Button>
            <Button
              onClick={() => setShowGameForm(true)}
              className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </Button>
          </div>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-[#1F4E4A]/20">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white text-[#1F4E4A]"
            >
              Active Games
            </TabsTrigger>
            <TabsTrigger 
              value="archived"
              className="data-[state=active]:bg-[#1F4E4A] data-[state=active]:text-white text-[#1F4E4A]"
            >
              Archived Games
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {games.length === 0 ? (
              <Card className="border-[#1F4E4A]/20 bg-white">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <h3 className="text-lg font-semibold text-[#1F4E4A] mb-2">No Active Games</h3>
                  <p className="text-[#132E2C]/60 text-center mb-4">
                    Create your first Queen of Hearts game to get started
                  </p>
                  <Button
                    onClick={() => setShowGameForm(true)}
                    className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Game
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {games.map(renderGameCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="archived" className="space-y-4">
            {archivedGames.length === 0 ? (
              <Card className="border-[#1F4E4A]/20 bg-white">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <h3 className="text-lg font-semibold text-[#1F4E4A] mb-2">No Archived Games</h3>
                  <p className="text-[#132E2C]/60 text-center">
                    Completed games will appear here once the Queen of Hearts is drawn
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {archivedGames.map(renderGameCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <GameForm
          open={showGameForm}
          onOpenChange={setShowGameForm}
          games={[...games, ...archivedGames]}
          onComplete={fetchGames}
        />

        {showTicketForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <TicketSalesRow
              gameId={showTicketForm.gameId}
              weekId={showTicketForm.weekId}
              gameData={showTicketForm.gameData}
              previousEndingJackpot={0}
              previousJackpotContributions={0}
              onSuccess={() => {
                setShowTicketForm(null);
                fetchGames();
              }}
              onCancel={() => setShowTicketForm(null)}
            />
          </div>
        )}

        {showWinnerForm && (
          <WinnerForm
            open={true}
            onOpenChange={() => setShowWinnerForm(null)}
            gameId={showWinnerForm.gameId}
            weekId={showWinnerForm.weekId}
            gameData={showWinnerForm.gameData}
            currentJackpotTotal={showWinnerForm.currentJackpotTotal}
            jackpotContributions={showWinnerForm.jackpotContributions}
            onComplete={() => {
              setShowWinnerForm(null);
              fetchGames();
            }}
            onOpenPayoutSlip={() => {}}
          />
        )}

        {showExpenseModal && (
          <ExpenseModal
            open={true}
            onOpenChange={() => setShowExpenseModal(null)}
            gameId={showExpenseModal.gameId}
            gameName={showExpenseModal.gameName}
          />
        )}

        {showPayoutSlip && (
          <PayoutSlipModal
            open={true}
            onOpenChange={() => setShowPayoutSlip(null)}
            winnerData={showPayoutSlip.winnerData}
          />
        )}
      </div>
    </div>
  );
}
