import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Calendar, DollarSign, Users, Trophy, Target, AlertCircle, TrendingUp, Activity } from "lucide-react";
import { format, addWeeks, differenceInDays } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { DistributionSlipModal } from "@/components/DistributionSlipModal";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;

interface GameWithDetails extends Game {
  weeks: (Week & {
    ticket_sales: TicketSale[];
  })[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [games, setGames] = useState<GameWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState<string[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  const [showGameForm, setShowGameForm] = useState(false);
  const [showWinnerForm, setShowWinnerForm] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [distributionSlipOpen, setDistributionSlipOpen] = useState(false);
  const [selectedWinnerData, setSelectedWinnerData] = useState<any>(null);

  const fetchGames = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: false });
      
      if (gamesError) throw gamesError;
      
      if (gamesData) {
        const gamesWithDetails: GameWithDetails[] = [];
        
        for (const game of gamesData) {
          const { data: weeksData, error: weeksError } = await supabase
            .from('weeks')
            .select('*')
            .eq('game_id', game.id)
            .order('week_number', { ascending: true });
          
          if (weeksError) throw weeksError;
          
          const weeksWithSales = [];
          for (const week of (weeksData || [])) {
            const { data: salesData, error: salesError } = await supabase
              .from('ticket_sales')
              .select('*')
              .eq('week_id', week.id)
              .order('date', { ascending: true });
            
            if (salesError) throw salesError;
            
            weeksWithSales.push({
              ...week,
              ticket_sales: salesData || [],
            });
          }
          
          gamesWithDetails.push({
            ...game,
            weeks: weeksWithSales,
          });
        }
        
        setGames(gamesWithDetails);
        
        if (gamesWithDetails.length > 0) {
          setExpandedGames([gamesWithDetails[0].id]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error Loading Games",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const toggleGame = (gameId: string) => {
    setExpandedGames(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks(prev => 
      prev.includes(weekId) 
        ? prev.filter(id => id !== weekId)
        : [...prev, weekId]
    );
  };

  const handleOpenDistributionSlip = (week: Week, game: Game) => {
    if (week.winner_name) {
      setSelectedWinnerData({
        winnerName: week.winner_name,
        slotChosen: week.slot_chosen,
        cardSelected: week.card_selected,
        distributionAmount: week.weekly_payout,
        date: week.end_date,
        gameNumber: game.game_number,
        gameName: game.name,
        weekNumber: week.week_number,
        weekId: week.id,
        weekStartDate: week.start_date,
        weekEndDate: week.end_date,
      });
      setDistributionSlipOpen(true);
    }
  };

  const createNewWeek = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const weekNumber = game.weeks.length + 1;
      const lastWeek = game.weeks[game.weeks.length - 1];
      
      let startDate: Date;
      if (lastWeek) {
        startDate = addWeeks(new Date(lastWeek.end_date), 1);
      } else {
        startDate = new Date(game.start_date);
      }
      
      const endDate = addWeeks(startDate, 1);
      endDate.setDate(endDate.getDate() - 1);

      const { data, error } = await supabase
        .from('weeks')
        .insert({
          game_id: gameId,
          week_number: weekNumber,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Week Created",
        description: `Week ${weekNumber} has been created successfully.`,
      });

      fetchGames();
      setExpandedWeeks(prev => [...prev, data.id]);
    } catch (error: any) {
      console.error('Error creating week:', error);
      toast({
        title: "Error Creating Week",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateGameMetrics = (game: GameWithDetails) => {
    const totalWeeks = game.weeks.length;
    const activeWeeks = game.weeks.filter(w => w.ticket_sales.length > 0).length;
    const completedWeeks = game.weeks.filter(w => w.winner_name).length;
    
    return {
      totalWeeks,
      activeWeeks,
      completedWeeks,
      completionRate: totalWeeks > 0 ? (completedWeeks / totalWeeks) * 100 : 0,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F8FC] via-white to-[#F7F8FC]/50">
        <div className="container mx-auto p-8">
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#A1E96C] border-t-[#1F4E4A]"></div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-[#1F4E4A] font-inter">Loading Dashboard</h3>
              <p className="text-[#132E2C]/60">Setting up your Queen of Hearts management system...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F8FC] via-white to-[#F7F8FC]/50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1F4E4A]/10">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-[#1F4E4A] font-inter tracking-tight">
              Queen of Hearts Dashboard
            </h1>
            <p className="text-lg text-[#132E2C]/70 font-medium">
              Manage your fundraising games, track ticket sales, and monitor weekly distributions
            </p>
          </div>
          <Button 
            onClick={() => setShowGameForm(true)}
            className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90 font-semibold px-6 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Game
          </Button>
        </div>

        {/* Games Overview */}
        {games.length === 0 ? (
          <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="w-24 h-24 bg-[#F7F8FC] rounded-full flex items-center justify-center">
                <Trophy className="h-12 w-12 text-[#1F4E4A]/60" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-[#1F4E4A] font-inter">No Games Created Yet</h3>
                <p className="text-[#132E2C]/60 max-w-md">
                  Get started by creating your first Queen of Hearts game. Set up ticket prices, 
                  distribution percentages, and begin tracking sales.
                </p>
              </div>
              <Button 
                onClick={() => setShowGameForm(true)}
                className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90 font-semibold px-8 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {games.map((game) => {
              const isExpanded = expandedGames.includes(game.id);
              const metrics = calculateGameMetrics(game);
              
              return (
                <Card key={game.id} className="bg-white border-[#1F4E4A]/10 shadow-sm hover:shadow-lg transition-all duration-300">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleGame(game.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/50 transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-[#1F4E4A]" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-[#1F4E4A]" />
                            )}
                            <div className="space-y-2">
                              <CardTitle className="text-xl text-[#1F4E4A] font-inter flex items-center gap-3">
                                <Trophy className="h-5 w-5 text-[#A1E96C]" />
                                {game.name}
                                {game.end_date && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                    Completed
                                  </Badge>
                                )}
                                {!game.end_date && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                    Active
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-6 text-sm text-[#132E2C]/70">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    Started: {format(new Date(game.start_date), 'MMM d, yyyy')}
                                    {game.end_date && ` | Ended: ${format(new Date(game.end_date), 'MMM d, yyyy')}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  <span>{metrics.totalWeeks} weeks</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right space-y-1">
                              <p className="text-sm font-semibold text-[#132E2C]/60">Total Sales</p>
                              <p className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-sm font-semibold text-[#132E2C]/60">Total Distributions</p>
                              <p className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_payouts)}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-sm font-semibold text-[#132E2C]/60">Net Profit</p>
                              <p className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.organization_net_profit)}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="space-y-6 pt-0">
                        {/* Game Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F7F8FC] rounded-lg">
                          <div className="text-center space-y-1">
                            <p className="text-xs font-semibold text-[#132E2C]/60 uppercase tracking-wide">Ticket Price</p>
                            <p className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.ticket_price)}</p>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-xs font-semibold text-[#132E2C]/60 uppercase tracking-wide">Organization %</p>
                            <p className="text-lg font-bold text-[#1F4E4A]">{formatPercentage(game.organization_percentage)}</p>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-xs font-semibold text-[#132E2C]/60 uppercase tracking-wide">Jackpot %</p>
                            <p className="text-lg font-bold text-[#1F4E4A]">{formatPercentage(game.jackpot_percentage)}</p>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-xs font-semibold text-[#132E2C]/60 uppercase tracking-wide">Carryover</p>
                            <p className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.carryover_jackpot)}</p>
                          </div>
                        </div>

                        {/* Week Cards */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[#1F4E4A] font-inter">Weekly Progress</h3>
                            {!game.end_date && (
                              <Button
                                onClick={() => createNewWeek(game.id)}
                                variant="outline"
                                size="sm"
                                className="border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/10"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Week
                              </Button>
                            )}
                          </div>
                          
                          {game.weeks.length === 0 ? (
                            <Card className="border-dashed border-2 border-[#1F4E4A]/20">
                              <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                <div className="w-16 h-16 bg-[#F7F8FC] rounded-full flex items-center justify-center">
                                  <Calendar className="h-8 w-8 text-[#1F4E4A]/60" />
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-lg font-semibold text-[#1F4E4A] font-inter">No Weeks Created</h4>
                                  <p className="text-[#132E2C]/60">Create your first week to start tracking ticket sales and distributions.</p>
                                </div>
                                <Button
                                  onClick={() => createNewWeek(game.id)}
                                  className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90 font-semibold"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create First Week
                                </Button>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="space-y-3">
                              {game.weeks.map((week) => {
                                const isWeekExpanded = expandedWeeks.includes(week.id);
                                const weekSales = week.ticket_sales.reduce((sum, sale) => sum + sale.amount_collected, 0);
                                const weekTickets = week.ticket_sales.reduce((sum, sale) => sum + sale.tickets_sold, 0);
                                
                                return (
                                  <Card key={week.id} className="border-[#1F4E4A]/10 bg-gradient-to-r from-white to-[#F7F8FC]/30">
                                    <Collapsible open={isWeekExpanded} onOpenChange={() => toggleWeek(week.id)}>
                                      <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/30 transition-colors duration-200 pb-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              {isWeekExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-[#1F4E4A]" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4 text-[#1F4E4A]" />
                                              )}
                                              <div className="space-y-1">
                                                <CardTitle className="text-lg text-[#1F4E4A] font-inter">
                                                  Week {week.week_number}
                                                </CardTitle>
                                                <p className="text-sm text-[#132E2C]/60">
                                                  {format(new Date(week.start_date), 'MMM d')} - {format(new Date(week.end_date), 'MMM d, yyyy')}
                                                </p>
                                              </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-6 text-right">
                                              <div className="space-y-1">
                                                <p className="text-xs font-semibold text-[#132E2C]/60 uppercase">Tickets Sold</p>
                                                <p className="text-sm font-bold text-[#1F4E4A]">{weekTickets.toLocaleString()}</p>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-xs font-semibold text-[#132E2C]/60 uppercase">Sales</p>
                                                <p className="text-sm font-bold text-[#1F4E4A]">{formatCurrency(weekSales)}</p>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-xs font-semibold text-[#132E2C]/60 uppercase">Winner</p>
                                                <p className="text-sm font-bold text-[#1F4E4A]">
                                                  {week.winner_name || 'TBD'}
                                                </p>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-xs font-semibold text-[#132E2C]/60 uppercase">Distribution</p>
                                                <p className="text-sm font-bold text-[#1F4E4A]">
                                                  {week.weekly_payout > 0 ? formatCurrency(week.weekly_payout) : 'TBD'}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {week.winner_name && (
                                            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <Trophy className="h-5 w-5 text-yellow-600" />
                                                  <div className="space-y-1">
                                                    <p className="font-semibold text-[#8B4513]">
                                                      {week.winner_name} • Slot #{week.slot_chosen} • {week.card_selected}
                                                    </p>
                                                    <p className="text-sm text-[#8B4513]/70">
                                                      Won {formatCurrency(week.weekly_payout)} • 
                                                      {week.winner_present ? ' Present' : ' Not Present'}
                                                    </p>
                                                  </div>
                                                </div>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenDistributionSlip(week, game);
                                                  }}
                                                  size="sm"
                                                  className="bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90 font-medium"
                                                >
                                                  View Distribution Slip
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </CardHeader>
                                      </CollapsibleTrigger>
                                      
                                      <CollapsibleContent>
                                        <CardContent className="pt-0 space-y-4">
                                          <TicketSalesRow
                                            weekId={week.id}
                                            gameId={game.id}
                                            ticketPrice={game.ticket_price}
                                            organizationPercentage={game.organization_percentage}
                                            jackpotPercentage={game.jackpot_percentage}
                                            onDataChange={fetchGames}
                                          />
                                          
                                          {week.ticket_sales.length >= 7 && !week.winner_name && (
                                            <div className="pt-4 border-t border-[#1F4E4A]/10">
                                              <Button
                                                onClick={() => {
                                                  setSelectedWeek(week);
                                                  setShowWinnerForm(true);
                                                }}
                                                className="w-full bg-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90 font-semibold py-3"
                                              >
                                                <Trophy className="h-5 w-5 mr-2" />
                                                Enter Winner Details for Week {week.week_number}
                                              </Button>
                                            </div>
                                          )}
                                        </CardContent>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modals */}
        <GameForm
          open={showGameForm}
          onOpenChange={setShowGameForm}
          onGameCreated={fetchGames}
        />

        {selectedWeek && (
          <WinnerForm
            open={showWinnerForm}
            onOpenChange={setShowWinnerForm}
            week={selectedWeek}
            onWinnerSubmitted={() => {
              fetchGames();
              setShowWinnerForm(false);
              setSelectedWeek(null);
            }}
          />
        )}

        <DistributionSlipModal
          open={distributionSlipOpen}
          onOpenChange={setDistributionSlipOpen}
          winnerData={selectedWinnerData}
        />
      </div>
    </div>
  );
}
