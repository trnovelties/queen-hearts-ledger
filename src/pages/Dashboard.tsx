
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Trophy, DollarSign, Users, Calendar, Target, TrendingUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GameForm } from "@/components/GameForm";
import { WinnerForm } from "@/components/WinnerForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { WinnerInformation } from "@/components/WinnerInformation";
import { GameComparisonTable } from "@/components/GameComparisonTable";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfWeek, addDays } from "date-fns";
import { useJackpotCalculation } from "@/hooks/useJackpotCalculation";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

interface GameWithRelations extends Game {
  weeks: (Week & {
    ticket_sales: TicketSale[];
  })[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

interface Winner {
  name: string;
  slot: number | null;
  card: string | null;
  amount: number;
  present: boolean | null;
  date: string;
  gameName: string;
  gameNumber?: number;
  weekNumber?: number;
}

const Dashboard = () => {
  const [games, setGames] = useState<GameWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGameForm, setShowGameForm] = useState(false);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showWinnerForm, setShowWinnerForm] = useState<string | null>(null);
  const [distributionSlipData, setDistributionSlipData] = useState<any>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  
  const { toast } = useToast();
  const { calculateDisplayedJackpot } = useJackpotCalculation();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select(`
          *,
          weeks (
            *,
            ticket_sales (*)
          ),
          ticket_sales (*),
          expenses (*)
        `)
        .order("game_number", { ascending: false });

      if (gamesError) throw gamesError;

      const gamesWithCalculations = (gamesData || []).map(game => {
        const totalSales = game.ticket_sales?.reduce((sum: number, sale: any) => sum + (sale.amount_collected || 0), 0) || 0;
        const totalDistributions = game.weeks?.reduce((sum: number, week: any) => sum + (week.weekly_distribution_amount || 0), 0) || 0;
        const totalExpenses = game.expenses?.filter((exp: any) => !exp.is_donation).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
        const totalDonations = game.expenses?.filter((exp: any) => exp.is_donation).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
        const organizationNetProfit = (totalSales * (game.organization_percentage / 100)) - totalExpenses - totalDonations;

        return {
          ...game,
          total_sales: totalSales,
          total_distributions: totalDistributions,
          total_expenses: totalExpenses,
          total_donations: totalDonations,
          organization_net_profit: organizationNetProfit
        };
      });

      setGames(gamesWithCalculations);

      // Extract winners for the WinnerInformation component
      const allWinners: Winner[] = [];
      gamesWithCalculations.forEach(game => {
        game.weeks?.forEach(week => {
          if (week.winner_name && week.card_selected) {
            allWinners.push({
              name: week.winner_name,
              slot: week.slot_chosen,
              card: week.card_selected,
              amount: week.weekly_distribution_amount || 0,
              present: week.winner_present,
              date: week.end_date,
              gameName: game.name,
              gameNumber: game.game_number,
              weekNumber: week.week_number
            });
          }
        });
      });

      setWinners(allWinners.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Error fetching games:", error);
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const toggleGameExpansion = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  const toggleWeekExpansion = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  };

  const createWeek = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const weekNumber = (game.weeks?.length || 0) + 1;
      const startDate = game.weeks?.length === 0 
        ? new Date() 
        : addDays(new Date(game.weeks[game.weeks.length - 1].end_date), 1);
      
      const endDate = addDays(startDate, 6);

      const { error } = await supabase
        .from("weeks")
        .insert({
          game_id: gameId,
          week_number: weekNumber,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        });

      if (error) throw error;

      await fetchGames();
      toast({
        title: "Success",
        description: "Week created successfully",
      });
    } catch (error) {
      console.error("Error creating week:", error);
      toast({
        title: "Error",
        description: "Failed to create week",
        variant: "destructive",
      });
    }
  };

  const handleWinnerSubmit = async (weekId: string, winnerData: any) => {
    try {
      const week = games.flatMap(g => g.weeks).find(w => w.id === weekId);
      const game = games.find(g => g.weeks?.some(w => w.id === weekId));
      
      if (!week || !game) return;

      // Get the current jackpot total from ticket sales
      const weekTicketSales = week.ticket_sales || [];
      const weeklyJackpotContribution = weekTicketSales.reduce((sum, sale) => 
        sum + (sale.amount_collected * (game.jackpot_percentage / 100)), 0
      );

      // Calculate current jackpot (this should come from your jackpot calculation logic)
      const currentJackpot = calculateDisplayedJackpot(
        weeklyJackpotContribution,
        game.minimum_starting_jackpot || 0,
        game.carryover_jackpot || 0
      );

      let distributionAmount = 0;
      
      // Get distribution amount based on card
      if (winnerData.cardSelected === 'Queen of Hearts') {
        distributionAmount = currentJackpot;
        if (!winnerData.present && game.penalty_percentage) {
          distributionAmount = distributionAmount * (1 - game.penalty_percentage / 100);
        }
      } else {
        // Get from card distributions configuration
        const { data: config } = await supabase
          .from("configurations")
          .select("card_distributions")
          .single();
        
        const cardDistributions = config?.card_distributions || {};
        distributionAmount = cardDistributions[winnerData.cardSelected] || 0;
        
        if (!winnerData.present && game.penalty_percentage) {
          distributionAmount = distributionAmount * (1 - game.penalty_percentage / 100);
        }
      }

      // Update week with winner information
      const { error: weekError } = await supabase
        .from("weeks")
        .update({
          winner_name: winnerData.winnerName,
          slot_chosen: winnerData.slotChosen,
          card_selected: winnerData.cardSelected,
          winner_present: winnerData.present,
          weekly_distribution_amount: distributionAmount,
        })
        .eq("id", weekId);

      if (weekError) throw weekError;

      // If Queen of Hearts was drawn, end the game
      if (winnerData.cardSelected === 'Queen of Hearts') {
        const { error: gameError } = await supabase
          .from("games")
          .update({
            end_date: week.end_date,
          })
          .eq("id", game.id);

        if (gameError) throw gameError;
      }

      // Prepare distribution slip data
      setDistributionSlipData({
        winnerName: winnerData.winnerName,
        slotChosen: winnerData.slotChosen,
        cardSelected: winnerData.cardSelected,
        amountWon: distributionAmount,
        drawingDate: week.end_date,
        gameNumber: game.game_number,
        weekNumber: week.week_number,
        weekStartDate: week.start_date,
        weekEndDate: week.end_date,
      });

      await fetchGames();
      setShowWinnerForm(null);
      
      toast({
        title: "Success",
        description: "Winner information saved successfully",
      });
    } catch (error) {
      console.error("Error saving winner:", error);
      toast({
        title: "Error",
        description: "Failed to save winner information",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const activeGames = games.filter(game => !game.end_date);
  const completedGames = games.filter(game => game.end_date);
  const totalRevenue = games.reduce((sum, game) => sum + (game.total_sales || 0), 0);
  const totalDistributions = games.reduce((sum, game) => sum + (game.total_distributions || 0), 0);
  const totalProfit = games.reduce((sum, game) => sum + (game.organization_net_profit || 0), 0);

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-[#1F4E4A]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#132E2C]/60">Active Games</p>
                  <p className="text-2xl font-bold text-[#1F4E4A]">{activeGames.length}</p>
                </div>
                <Target className="h-8 w-8 text-[#A1E96C]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#1F4E4A]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#132E2C]/60">Total Revenue</p>
                  <p className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#A1E96C]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#1F4E4A]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#132E2C]/60">Total Distributions</p>
                  <p className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(totalDistributions)}</p>
                </div>
                <Trophy className="h-8 w-8 text-[#A1E96C]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#1F4E4A]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#132E2C]/60">Net Profit</p>
                  <p className="text-2xl font-bold text-[#1F4E4A]">{formatCurrency(totalProfit)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#A1E96C]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Information */}
        <WinnerInformation winners={winners} formatCurrency={formatCurrency} />

        {/* Game Comparison Table */}
        <GameComparisonTable games={games} formatCurrency={formatCurrency} />

        {/* Create Game Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowGameForm(true)}
            className="bg-[#A1E96C] hover:bg-[#8FD659] text-[#1F4E4A] font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Game
          </Button>
        </div>

        {/* Games List */}
        <div className="space-y-4">
          {games.map((game) => (
            <Card key={game.id} className="bg-white border-[#1F4E4A]/10">
              <Collapsible 
                open={expandedGames.has(game.id)}
                onOpenChange={() => toggleGameExpansion(game.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {expandedGames.has(game.id) ? (
                          <ChevronDown className="h-5 w-5 text-[#1F4E4A]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#1F4E4A]" />
                        )}
                        <div>
                          <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-2">
                            {game.name}
                            {game.end_date && <Crown className="h-5 w-5 text-yellow-500" />}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-[#132E2C]/60">
                              Start: {format(new Date(game.start_date), 'MMM d, yyyy')}
                            </span>
                            {game.end_date && (
                              <span className="text-sm text-[#132E2C]/60">
                                End: {format(new Date(game.end_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm text-[#132E2C]/60">Total Sales</p>
                          <p className="font-semibold text-[#1F4E4A]">{formatCurrency(game.total_sales || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#132E2C]/60">Net Profit</p>
                          <p className="font-semibold text-[#1F4E4A]">{formatCurrency(game.organization_net_profit || 0)}</p>
                        </div>
                        <Badge 
                          variant={game.end_date ? "secondary" : "default"}
                          className={game.end_date ? "bg-gray-100 text-gray-800" : "bg-[#A1E96C]/20 text-[#132E2C]"}
                        >
                          {game.end_date ? "Completed" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Add Week Button */}
                      {!game.end_date && (
                        <div className="flex justify-end">
                          <Button
                            onClick={() => createWeek(game.id)}
                            variant="outline"
                            className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Week
                          </Button>
                        </div>
                      )}

                      {/* Weeks */}
                      {game.weeks?.map((week) => (
                        <Card key={week.id} className="border-[#1F4E4A]/5 bg-[#F7F8FC]/30">
                          <Collapsible
                            open={expandedWeeks.has(week.id)}
                            onOpenChange={() => toggleWeekExpansion(week.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-white/50 transition-colors pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    {expandedWeeks.has(week.id) ? (
                                      <ChevronDown className="h-4 w-4 text-[#1F4E4A]" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-[#1F4E4A]" />
                                    )}
                                    <div>
                                      <h4 className="font-semibold text-[#1F4E4A]">Week {week.week_number}</h4>
                                      <p className="text-sm text-[#132E2C]/60">
                                        {format(new Date(week.start_date), 'MMM d, yyyy')} - {format(new Date(week.end_date), 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-4 text-right">
                                    <div>
                                      <p className="text-xs text-[#132E2C]/60">Tickets Sold</p>
                                      <p className="font-semibold text-[#1F4E4A]">{week.weekly_tickets_sold || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#132E2C]/60">Weekly Sales</p>
                                      <p className="font-semibold text-[#1F4E4A]">{formatCurrency(week.weekly_sales || 0)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#132E2C]/60">Winner</p>
                                      <p className="font-semibold text-[#1F4E4A]">{week.winner_name || "Pending"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#132E2C]/60">Distribution Amount</p>
                                      <p className="font-semibold text-[#1F4E4A]">{formatCurrency(week.weekly_distribution_amount || 0)}</p>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <TicketSalesRow 
                                  weekId={week.id}
                                  gameId={game.id}
                                  onRefresh={fetchGames}
                                  onWinnerFormOpen={() => setShowWinnerForm(week.id)}
                                />
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Modals */}
        {showGameForm && (
          <GameForm
            onClose={() => setShowGameForm(false)}
            onSuccess={() => {
              setShowGameForm(false);
              fetchGames();
            }}
          />
        )}

        {showWinnerForm && (
          <WinnerForm
            weekId={showWinnerForm}
            onClose={() => setShowWinnerForm(null)}
            onSubmit={handleWinnerSubmit}
          />
        )}

        {distributionSlipData && (
          <PayoutSlipModal
            isOpen={!!distributionSlipData}
            onClose={() => setDistributionSlipData(null)}
            distributionSlipData={distributionSlipData}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
