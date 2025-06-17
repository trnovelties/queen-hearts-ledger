import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Calendar, DollarSign, TrendingUp, Users, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DistributionSlipModal } from "@/components/PayoutSlipModal";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { WinnerInformation } from "@/components/WinnerInformation";
import { useAuth } from "@/context/AuthContext";

interface Game {
  id: string;
  game_number: number;
  week_number: number;
  week_id: string;
  week_start_date: string;
  week_end_date: string;
  created_at: string;
  ticket_price: number;
  total_tickets_sold: number;
  total_sales: number;
  total_distributions: number;
  total_expenses: number;
  total_donations: number;
  organization_total_portion: number;
  jackpot_total_portion: number;
  organization_net_profit: number;
  is_active: boolean;
  created_by: string;
  game_name: string;
}

interface Winner {
  id: string;
  game_id: string;
  game_number: number;
  week_number: number;
  week_id: string;
  name: string;
  slot: number | null;
  card: string | null;
  amount: number;
  present: boolean | null;
  date: string;
  created_at: string;
  created_by: string;
  game_name: string;
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGameFormOpen, setIsGameFormOpen] = useState(false);
  const [isWinnerFormOpen, setIsWinnerFormOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<Winner | null>(null);
  const [isDistributionSlipOpen, setIsDistributionSlipOpen] = useState(false);
  const [selectedWinnerData, setSelectedWinnerData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) {
      navigate("/login");
      return;
    }
    
    fetchGames();
    fetchWinners();
  }, [profile, navigate]);

  useEffect(() => {
    const filtered = games.filter(game =>
      game.game_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.game_number.toString().includes(searchTerm)
    );
    setFilteredGames(filtered);
  }, [searchTerm, games]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGames(data || []);
    } catch (error: any) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: "Failed to load games.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWinners = async () => {
    try {
      const { data, error } = await supabase
        .from('winners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWinners(data || []);
    } catch (error: any) {
      console.error('Error fetching winners:', error);
      toast({
        title: "Error",
        description: "Failed to load winners.",
        variant: "destructive",
      });
    }
  };

  const handleOpenGameForm = () => {
    setIsGameFormOpen(true);
  };

  const handleCloseGameForm = () => {
    setIsGameFormOpen(false);
    setSelectedGameId(null);
    fetchGames();
  };

  const handleOpenWinnerForm = (gameId: string) => {
    setSelectedGameId(gameId);
    setIsWinnerFormOpen(true);
  };

  const handleCloseWinnerForm = () => {
    setIsWinnerFormOpen(false);
    setSelectedGameId(null);
    setSelectedWinner(null);
    fetchWinners();
    fetchGames();
  };

  const handleEditGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setIsGameFormOpen(true);
  };

  const handleEditWinner = (winner: Winner) => {
    setSelectedWinner(winner);
    setSelectedGameId(winner.game_id);
    setIsWinnerFormOpen(true);
  };

  const handleViewDistributionSlip = (winner: Winner) => {
    setSelectedWinner(winner);
    
    const game = games.find(g => g.id === winner.game_id);
    if (!game) {
      toast({
        title: "Error",
        description: "Could not find the associated game data.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedWinnerData({
      winnerName: winner.name,
      slotChosen: winner.slot,
      cardSelected: winner.card,
      distributionAmount: winner.amount,
      date: winner.date,
      gameNumber: winner.game_number,
      gameName: winner.game_name,
      weekNumber: winner.week_number,
      weekId: winner.week_id,
      weekStartDate: game.week_start_date,
      weekEndDate: game.week_end_date
    });
    setIsDistributionSlipOpen(true);
  };

  const handleCloseDistributionSlip = () => {
    setIsDistributionSlipOpen(false);
    setSelectedWinnerData(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateGameSummary = (game: Game) => {
    const totalTicketsSold = game.total_tickets_sold || 0;
    const totalSales = game.total_sales || 0;
    const totalDistributions = game.total_distributions || 0;
    const totalExpenses = game.total_expenses || 0;
    const totalDonations = game.total_donations || 0;
    const organizationTotalPortion = game.organization_total_portion || 0;
    const jackpotTotalPortion = game.jackpot_total_portion || 0;
    const organizationNetProfit = game.organization_net_profit || 0;

    return {
      totalTicketsSold,
      totalSales,
      totalDistributions,
      totalExpenses,
      totalDonations,
      organizationTotalPortion,
      jackpotTotalPortion,
      organizationNetProfit,
    };
  };

  const mostRecentWinners = winners.slice(0, 3);

  return (
    <div className="space-y-6">
      <DistributionSlipModal
        open={isDistributionSlipOpen}
        onOpenChange={handleCloseDistributionSlip}
        winnerData={selectedWinnerData}
      />
      
      <GameForm
        open={isGameFormOpen}
        onOpenChange={handleCloseGameForm}
        gameId={selectedGameId}
      />
      
      <WinnerForm
        open={isWinnerFormOpen}
        onOpenChange={handleCloseWinnerForm}
        gameId={selectedGameId}
        winner={selectedWinner}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Track game progress, manage winners, and view key metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{profile?.organization_name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Revenue Overview</span>
            </CardTitle>
            <CardDescription>
              Track total sales, expenses, and net profit across all games
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Sales:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      games.reduce((sum, game) => sum + (game.total_sales || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Expenses:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      games.reduce((sum, game) => sum + (game.total_expenses || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Net Profit:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      games.reduce(
                        (sum, game) => sum + (game.organization_net_profit || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Game Management</span>
            </CardTitle>
            <CardDescription>
              Create new games, manage existing ones, and track their progress
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {loading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {filteredGames.length > 0 ? (
                    filteredGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between py-2 border-b last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">{game.game_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Game #{game.game_number}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGame(game.id)}
                        >
                          Edit
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No games found.
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button onClick={handleOpenGameForm} className="mt-4 w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Game
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Ticket Sales</span>
            </CardTitle>
            <CardDescription>
              View and manage ticket sales for each game
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGames.length > 0 ? (
                  filteredGames.map((game) => (
                    <Collapsible key={game.id}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-secondary">
                        {game.game_name} - Game #{game.game_number}
                        <ChevronDown className="h-4 w-4 shrink-0 ml-2 transition-transform duration-200 peer-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4">
                        <TicketSalesRow game={game} formatCurrency={formatCurrency} />
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No games found.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Winners</h2>
            <Button onClick={() => handleOpenWinnerForm(games[0]?.id)} disabled={games.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Winner
            </Button>
          </div>
          <WinnerInformation winners={mostRecentWinners} formatCurrency={formatCurrency} />
        </div>

        <div>
          <h2 className="text-xl font-bold">Game Details</h2>
          {filteredGames.length > 0 ? (
            filteredGames.map((game) => {
              const {
                totalTicketsSold,
                totalSales,
                totalDistributions,
                totalExpenses,
                totalDonations,
                organizationTotalPortion,
                jackpotTotalPortion,
                organizationNetProfit,
              } = calculateGameSummary(game);

              return (
                <Card key={game.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>{game.game_name} - Game #{game.game_number}</span>
                    </CardTitle>
                    <CardDescription>
                      View detailed metrics and manage winners for this game
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Total Tickets Sold</Label>
                        <p className="font-bold">{totalTicketsSold}</p>
                      </div>
                      <div>
                        <Label>Total Sales</Label>
                        <p className="font-bold">{formatCurrency(totalSales)}</p>
                      </div>
                      <div>
                        <Label>Total Distributions</Label>
                        <p className="font-bold">{formatCurrency(totalDistributions)}</p>
                      </div>
                      <div>
                        <Label>Total Expenses</Label>
                        <p className="font-bold">{formatCurrency(totalExpenses)}</p>
                      </div>
                      <div>
                        <Label>Total Donations</Label>
                        <p className="font-bold">{formatCurrency(totalDonations)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Organization Portion</Label>
                        <p className="font-bold">{formatCurrency(organizationTotalPortion)}</p>
                      </div>
                      <div>
                        <Label>Jackpot Portion</Label>
                        <p className="font-bold">{formatCurrency(jackpotTotalPortion)}</p>
                      </div>
                      <div>
                        <Label>Organization Net Profit</Label>
                        <p className="font-bold">{formatCurrency(organizationNetProfit)}</p>
                      </div>
                    </div>
                    <Button onClick={() => handleOpenWinnerForm(game.id)}>
                      <Crown className="h-4 w-4 mr-2" />
                      Add Winner
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent>No games available.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
