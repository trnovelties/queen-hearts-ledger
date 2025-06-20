import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, DollarSign, Users, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { formatDateForDatabase } from "@/lib/dateUtils";

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
  card_payouts?: any;
  configuration_version?: number;
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
  winner_present?: boolean;
  authorized_signature_name?: string;
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
  jackpot_contributions_total: number;
  displayed_jackpot_total: number;
}

const Dashboard = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [weeks, setWeeks] = useState<{ [gameId: string]: Week[] }>({});
  const [ticketSales, setTicketSales] = useState<{ [weekId: string]: TicketSale[] }>({});
  const [isGameFormOpen, setIsGameFormOpen] = useState(false);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [isWinnerFormOpen, setIsWinnerFormOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedGameData, setSelectedGameData] = useState<Game | null>(null);
  const [currentJackpotTotal, setCurrentJackpotTotal] = useState(0);
  const [jackpotContributions, setJackpotContributions] = useState(0);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const [isPayoutSlipOpen, setIsPayoutSlipOpen] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadGames();
    }
  }, [currentUser]);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', currentUser?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
      
      // Load weeks for each game
      for (const game of data || []) {
        await loadWeeks(game.id);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      toast.error("Failed to load games");
    }
  };

  const loadWeeks = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', currentUser?.id)
        .order('week_number', { ascending: true });

      if (error) throw error;
      
      setWeeks(prev => ({ ...prev, [gameId]: data || [] }));
      
      // Load ticket sales for each week
      for (const week of data || []) {
        await loadTicketSales(week.id);
      }
    } catch (error) {
      console.error('Error loading weeks:', error);
      toast.error("Failed to load weeks");
    }
  };

  const loadTicketSales = async (weekId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .eq('user_id', currentUser?.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setTicketSales(prev => ({ ...prev, [weekId]: data || [] }));
    } catch (error) {
      console.error('Error loading ticket sales:', error);
      toast.error("Failed to load ticket sales");
    }
  };

  const createGame = async (gameData: any) => {
    try {
      if (!currentUser) {
        toast.error("You must be logged in to create a game");
        return;
      }

      // Get current user configuration for card payouts
      const { data: config, error: configError } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', currentUser.id)
        .limit(1)
        .single();

      if (configError) {
        console.error("Error fetching configuration:", configError);
        toast.error("Failed to load configuration");
        return;
      }

      // Get the highest game number and increment
      const { data: existingGames, error: gamesError } = await supabase
        .from('games')
        .select('game_number')
        .eq('user_id', currentUser.id)
        .order('game_number', { ascending: false })
        .limit(1);

      if (gamesError) throw gamesError;

      const nextGameNumber = existingGames && existingGames.length > 0 
        ? existingGames[0].game_number + 1 
        : 1;

      const { data, error } = await supabase
        .from('games')
        .insert([{
          ...gameData,
          game_number: nextGameNumber,
          user_id: currentUser.id,
          card_payouts: config.card_payouts,
          configuration_version: config.version || 1
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Game created successfully!");
      setIsGameFormOpen(false);
      loadGames();
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error("Failed to create game");
    }
  };

  const createWeek = async (gameId: string) => {
    try {
      if (!currentUser) {
        toast.error("You must be logged in to create a week");
        return;
      }

      // Get current weeks for this game to determine next week number
      const currentWeeks = weeks[gameId] || [];
      const nextWeekNumber = currentWeeks.length + 1;

      // Calculate start date (Monday of current week)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so -6; Monday = 1, so 0; etc.
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);

      // Calculate end date (Sunday)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const { data, error } = await supabase
        .from('weeks')
        .insert([{
          game_id: gameId,
          week_number: nextWeekNumber,
          start_date: formatDateForDatabase(monday),
          end_date: formatDateForDatabase(sunday),
          user_id: currentUser.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(`Week ${nextWeekNumber} created successfully!`);
      await loadWeeks(gameId);
      
      // Auto-expand the week that was just created
      setExpandedWeeks(prev => new Set([...prev, data.id]));
    } catch (error) {
      console.error('Error creating week:', error);
      toast.error("Failed to create week");
    }
  };

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

  const updateDailyEntry = async (weekId: string, gameId: string, entryData: any) => {
    try {
      if (!currentUser) {
        console.error("No current user");
        return;
      }

      console.log("Updating daily entry:", { weekId, gameId, entryData });

      // Get game data for calculations
      const game = games.find(g => g.id === gameId);
      if (!game) {
        console.error("Game not found");
        return;
      }

      // Get all existing ticket sales for this week to calculate cumulative values
      const { data: existingSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .eq('user_id', currentUser.id)
        .order('date', { ascending: true });

      if (salesError) {
        console.error("Error fetching existing sales:", salesError);
        throw salesError;
      }

      // Calculate basic amounts
      const amountCollected = entryData.ticketsSold * entryData.ticketPrice;
      const organizationTotal = amountCollected * (game.organization_percentage / 100);
      const jackpotTotal = amountCollected * (game.jackpot_percentage / 100);

      // Calculate cumulative values across all games up to this point
      const { data: allPreviousSales, error: allSalesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', currentUser.id)
        .lte('date', entryData.date)
        .order('date', { ascending: true });

      if (allSalesError) {
        console.error("Error fetching all sales:", allSalesError);
        throw allSalesError;
      }

      // Calculate cumulative collected including current entry
      const previousCumulative = allPreviousSales?.reduce((sum, sale) => sum + (sale.amount_collected || 0), 0) || 0;
      const cumulativeCollected = previousCumulative + amountCollected;

      // Calculate jackpot contributions (cumulative jackpot portions)
      const previousJackpotContributions = allPreviousSales?.reduce((sum, sale) => sum + (sale.jackpot_total || 0), 0) || 0;
      const jackpotContributionsTotal = previousJackpotContributions + jackpotTotal;

      // Calculate displayed jackpot using the minimum jackpot logic
      const displayedJackpot = Math.max(
        jackpotContributionsTotal + game.carryover_jackpot,
        game.minimum_starting_jackpot + game.carryover_jackpot
      );

      // For ending jackpot, start with displayed jackpot (no payout deducted yet)
      const endingJackpotTotal = displayedJackpot;

      const newSaleData = {
        game_id: gameId,
        week_id: weekId,
        date: entryData.date,
        tickets_sold: entryData.ticketsSold,
        ticket_price: entryData.ticketPrice,
        amount_collected: amountCollected,
        cumulative_collected: cumulativeCollected,
        organization_total: organizationTotal,
        jackpot_total: jackpotTotal,
        weekly_payout_amount: 0,
        ending_jackpot_total: endingJackpotTotal,
        jackpot_contributions_total: jackpotContributionsTotal,
        displayed_jackpot_total: displayedJackpot,
        user_id: currentUser.id
      };

      console.log("New sale data:", newSaleData);

      // Insert the new ticket sale
      const { data: newSale, error: insertError } = await supabase
        .from('ticket_sales')
        .insert([newSaleData])
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting sale:", insertError);
        throw insertError;
      }

      // Update week totals
      const weekSales = [...(existingSales || []), newSale];
      const weeklyTicketsSold = weekSales.reduce((sum, sale) => sum + sale.tickets_sold, 0);
      const weeklySales = weekSales.reduce((sum, sale) => sum + sale.amount_collected, 0);

      const { error: weekUpdateError } = await supabase
        .from('weeks')
        .update({
          weekly_tickets_sold: weeklyTicketsSold,
          weekly_sales: weeklySales
        })
        .eq('id', weekId);

      if (weekUpdateError) {
        console.error("Error updating week:", weekUpdateError);
        throw weekUpdateError;
      }

      // Update game totals
      const { data: allGameSales, error: gamesSalesError } = await supabase
        .from('ticket_sales')
        .select('amount_collected')
        .eq('game_id', gameId)
        .eq('user_id', currentUser.id);

      if (gamesSalesError) {
        console.error("Error fetching game sales:", gamesSalesError);
        throw gamesSalesError;
      }

      const gameTotalSales = allGameSales?.reduce((sum, sale) => sum + (sale.amount_collected || 0), 0) || 0;

      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          total_sales: gameTotalSales
        })
        .eq('id', gameId);

      if (gameUpdateError) {
        console.error("Error updating game:", gameUpdateError);
        throw gameUpdateError;
      }

      // Reload data
      await loadTicketSales(weekId);
      await loadWeeks(gameId);
      await loadGames();

      toast.success("Daily entry added successfully!");
    } catch (error) {
      console.error('Error updating daily entry:', error);
      toast.error("Failed to add daily entry");
    }
  };

  const openWinnerForm = (gameId: string, weekId: string) => {
    const game = games.find(g => g.id === gameId);
    const weekSales = ticketSales[weekId] || [];
    
    // Calculate current jackpot total and contributions
    const totalJackpotContributions = weekSales.reduce((sum, sale) => sum + (sale.jackpot_contributions_total || 0), 0);
    const latestSale = weekSales[weekSales.length - 1];
    const currentJackpot = latestSale?.displayed_jackpot_total || 0;
    
    setSelectedGameId(gameId);
    setSelectedWeekId(weekId);
    setSelectedGameData(game || null);
    setCurrentJackpotTotal(currentJackpot);
    setJackpotContributions(totalJackpotContributions);
    setIsWinnerFormOpen(true);
  };

  const handleWinnerFormComplete = () => {
    // Reload all data after winner is recorded
    if (selectedGameId && selectedWeekId) {
      loadTicketSales(selectedWeekId);
      loadWeeks(selectedGameId);
      loadGames();
    }
  };

  const handleOpenPayoutSlip = (winnerData: any) => {
    setPayoutSlipData(winnerData);
    setIsPayoutSlipOpen(true);
  };

  // Filter games based on selected filter
  const displayGames = gameFilter === 'all' ? games : games.filter(game => game.id === gameFilter);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Loading...</h2>
          <p className="text-gray-600">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Queen of Hearts Manager</h1>
          <p className="text-gray-600">Manage your fundraising games and track performance</p>
        </div>
        <Button onClick={() => setIsGameFormOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Game
        </Button>
      </div>

      {/* Game Filter */}
      <div className="flex items-center gap-4">
        <label htmlFor="gameFilter" className="text-sm font-medium text-gray-700">
          Filter by Game:
        </label>
        <select
          id="gameFilter"
          value={gameFilter}
          onChange={(e) => setGameFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Games</option>
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </div>

      {/* Games List */}
      <div className="space-y-4">
        {displayGames.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No games yet</h3>
              <p className="text-gray-600 text-center mb-4">
                Create your first Queen of Hearts game to get started
              </p>
              <Button onClick={() => setIsGameFormOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          displayGames.map((game) => (
            <Card key={game.id} className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleGameExpansion(game.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {game.name}
                      <span className="text-sm font-normal text-gray-500">
                        (#{game.game_number})
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Start: {new Date(game.start_date).toLocaleDateString()}
                      {game.end_date && ` | End: ${new Date(game.end_date).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">
                          ${game.total_sales.toFixed(2)}
                        </div>
                        <div className="text-gray-500">Total Sales</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">
                          ${game.organization_net_profit.toFixed(2)}
                        </div>
                        <div className="text-gray-500">Org Net Profit</div>
                      </div>
                    </div>
                    {expandedGames.has(game.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedGames.has(game.id) && (
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold">Weeks</h4>
                    <Button 
                      onClick={() => createWeek(game.id)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Week
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(weeks[game.id] || []).map((week) => {
                      const weekTicketSales = ticketSales[week.id] || [];
                      const hasWinner = week.winner_name && week.card_selected;
                      
                      return (
                        <Card key={week.id} className="border-l-4 border-l-blue-500">
                          <CardHeader 
                            className="cursor-pointer py-3"
                            onClick={() => toggleWeekExpansion(week.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  Week {week.week_number}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                                </CardDescription>
                              </div>
                              <div className="grid grid-cols-4 gap-4 text-xs">
                                <div className="text-center">
                                  <div className="font-semibold">{week.weekly_tickets_sold}</div>
                                  <div className="text-gray-500">Tickets Sold</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold">${week.weekly_sales.toFixed(2)}</div>
                                  <div className="text-gray-500">Ticket Sales</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-green-600">
                                    ${(week.weekly_sales * (game.organization_percentage / 100)).toFixed(2)}
                                  </div>
                                  <div className="text-gray-500">Org Net Profit</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-blue-600">
                                    ${weekTicketSales.length > 0 ? weekTicketSales[weekTicketSales.length - 1]?.displayed_jackpot_total?.toFixed(2) || '0.00' : '0.00'}
                                  </div>
                                  <div className="text-gray-500">Jackpot Total</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasWinner && (
                                  <div className="text-xs text-green-600 font-medium">
                                    Winner: {week.winner_name}
                                    <br />
                                    Slot: {week.slot_chosen} | Card: {week.card_selected}
                                    <br />
                                    Payout: ${week.weekly_payout.toFixed(2)}
                                    <br />
                                    Present: {week.winner_present ? 'Yes' : 'No'}
                                  </div>
                                )}
                                {expandedWeeks.has(week.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          {expandedWeeks.has(week.id) && (
                            <CardContent className="pt-0">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Date</th>
                                      <th className="text-left p-2">Tickets Sold</th>
                                      <th className="text-left p-2">Ticket Price ($)</th>
                                      <th className="text-left p-2">Amount Collected ($)</th>
                                      <th className="text-left p-2">Organization Total ($)</th>
                                      <th className="text-left p-2">Jackpot Total ($)</th>
                                      <th className="text-left p-2">Weekly Payout Amount ($)</th>
                                      <th className="text-left p-2">Ending Jackpot Total ($)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {weekTicketSales.map((sale) => (
                                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2">{new Date(sale.date).toLocaleDateString()}</td>
                                        <td className="p-2">{sale.tickets_sold}</td>
                                        <td className="p-2">${sale.ticket_price.toFixed(2)}</td>
                                        <td className="p-2">${sale.amount_collected.toFixed(2)}</td>
                                        <td className="p-2">${sale.organization_total.toFixed(2)}</td>
                                        <td className="p-2">${sale.jackpot_total.toFixed(2)}</td>
                                        <td className="p-2">${sale.weekly_payout_amount.toFixed(2)}</td>
                                        <td className="p-2">${sale.ending_jackpot_total.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              <div className="mt-4 flex gap-2">
                                <TicketSalesRow
                                  gameId={game.id}
                                  weekId={week.id}
                                  gameData={{
                                    ticket_price: game.ticket_price,
                                    organization_percentage: game.organization_percentage,
                                    jackpot_percentage: game.jackpot_percentage,
                                    minimum_starting_jackpot: game.minimum_starting_jackpot,
                                    carryover_jackpot: game.carryover_jackpot
                                  }}
                                  previousEndingJackpot={weekTicketSales.length > 0 ? weekTicketSales[weekTicketSales.length - 1]?.ending_jackpot_total || 0 : 0}
                                  previousJackpotContributions={weekTicketSales.length > 0 ? weekTicketSales[weekTicketSales.length - 1]?.jackpot_contributions_total || 0 : 0}
                                  onSuccess={() => {
                                    loadTicketSales(week.id);
                                    loadWeeks(game.id);
                                    loadGames();
                                  }}
                                  onCancel={() => {}}
                                />
                                
                                {weekTicketSales.length >= 7 && !hasWinner && (
                                  <Button 
                                    onClick={() => openWinnerForm(game.id, week.id)}
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2"
                                  >
                                    <Trophy className="h-4 w-4" />
                                    Enter Winner Details
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <GameForm 
        open={isGameFormOpen}
        onOpenChange={setIsGameFormOpen}
        games={games}
        onComplete={() => {
          setIsGameFormOpen(false);
          loadGames();
        }}
      />

      <WinnerForm
        open={isWinnerFormOpen}
        onOpenChange={setIsWinnerFormOpen}
        gameId={selectedGameId}
        weekId={selectedWeekId}
        gameData={selectedGameData}
        currentJackpotTotal={currentJackpotTotal}
        jackpotContributions={jackpotContributions}
        onComplete={handleWinnerFormComplete}
        onOpenPayoutSlip={handleOpenPayoutSlip}
      />

      <PayoutSlipModal
        open={isPayoutSlipOpen}
        onOpenChange={setIsPayoutSlipOpen}
        winnerData={payoutSlipData}
      />
    </div>
  );
};

export default Dashboard;
