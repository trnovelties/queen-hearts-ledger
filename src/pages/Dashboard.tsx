import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, ChevronUp, Plus, TrendingUp, DollarSign, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { ExpenseModal } from "@/components/ExpenseModal";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/utils";

// Define types for data structure
type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;

// Define aggregate data types
interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
}

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isWinnerFormOpen, setIsWinnerFormOpen] = useState(false);
  const [isPayoutSlipModalOpen, setIsPayoutSlipModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGames() {
      if (!user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('game_number', { ascending: false });

        if (error) throw error;

        if (data) {
          const gamesWithDetails: GameSummary[] = [];

          for (const game of data) {
            const { data: weeksData, error: weeksError } = await supabase
              .from('weeks')
              .select('*')
              .eq('game_id', game.id)
              .order('week_number', { ascending: true });

            if (weeksError) throw weeksError;

            const { data: salesData, error: salesError } = await supabase
              .from('ticket_sales')
              .select('*')
              .eq('game_id', game.id)
              .order('date', { ascending: true });

            if (salesError) throw salesError;

            gamesWithDetails.push({
              ...game,
              weeks: weeksData || [],
              ticket_sales: salesData || [],
            });
          }

          setGames(gamesWithDetails);
        }
      } catch (error: any) {
        console.error('Error fetching games:', error);
        toast({
          title: "Error Loading Data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [user, toast]);

  const handleGameCreated = (newGame: Game) => {
    setGames([newGame, ...games]);
    toast({
      title: "Game Created",
      description: `Successfully created game ${newGame.name}.`,
    });
  };

  const handleGameUpdated = (updatedGame: Game) => {
    setGames(games.map(game => game.id === updatedGame.id ? updatedGame : game));
    toast({
      title: "Game Updated",
      description: `Successfully updated game ${updatedGame.name}.`,
    });
  };

  const handleGameDeleted = (id: string) => {
    setGames(games.filter(game => game.id !== id));
    toast({
      title: "Game Deleted",
      description: "Successfully deleted the game.",
    });
  };

  const handleSalesUpdated = (gameId: string, updatedSales: TicketSale[]) => {
    setGames(games.map(game => {
      if (game.id === gameId) {
        return { ...game, ticket_sales: updatedSales };
      }
      return game;
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedGameId(expandedGameId === id ? null : id);
  };

  const handleOpenWinnerForm = (game: Game) => {
    setSelectedGame(game);
    setIsWinnerFormOpen(true);
  };

  const handleCloseWinnerForm = () => {
    setSelectedGame(null);
    setIsWinnerFormOpen(false);
  };

  const handleOpenPayoutSlipModal = (game: Game) => {
    setSelectedGame(game);
    setIsPayoutSlipModalOpen(true);
  };

  const handleClosePayoutSlipModal = () => {
    setSelectedGame(null);
    setIsPayoutSlipModalOpen(false);
  };

  const handleOpenExpenseModal = (game: Game) => {
    setSelectedGame(game);
    setIsExpenseModalOpen(true);
  };

  const handleCloseExpenseModal = () => {
    setSelectedGame(null);
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <Button onClick={() => navigate("/IncomeExpense")} className="bg-[#1F4E4A]">View Income vs Expense</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1F4E4A]">
              <Plus className="h-4 w-4 mr-2" /> Add Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <GameForm onCreate={handleGameCreated} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.filter(game => !game.end_date).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.filter(game => game.end_date).length}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4E4A] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        ) : (
          games.map((game) => (
            <Collapsible key={game.id} open={expandedGameId === game.id} onOpenChange={() => toggleExpand(game.id)}>
              <CollapsibleTrigger className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center py-4 border-b">
                <div className="flex items-center">
                  <CardTitle className="text-lg font-semibold">{game.name}</CardTitle>
                  {game.end_date ? (
                    <Badge className="ml-2">Completed</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {game.start_date && `Start Date: ${format(new Date(game.start_date), 'MMM d, yyyy')}`}
                </div>
                <div className="justify-self-end">
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 peer-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Total Sales</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-bold">{formatCurrency(game.total_sales)}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Total Payouts</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-bold">{formatCurrency(game.total_payouts)}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Organization Net Profit</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-bold">{formatCurrency(game.organization_net_profit)}</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button size="sm" onClick={() => handleOpenWinnerForm(game)} className="bg-[#1F4E4A]">
                          <Users className="h-4 w-4 mr-2" /> Add Winner
                        </Button>
                        <Button size="sm" onClick={() => handleOpenPayoutSlipModal(game)} className="bg-[#1F4E4A]">
                          <DollarSign className="h-4 w-4 mr-2" /> Payout Slip
                        </Button>
                        <Button size="sm" onClick={() => handleOpenExpenseModal(game)} className="bg-[#1F4E4A]">
                          <TrendingUp className="h-4 w-4 mr-2" /> Add Expense
                        </Button>
                        <Dialog open={gameId === game.id} onOpenChange={(isOpen) => {
                          setGameId(isOpen ? game.id : null);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary">
                              <Calendar className="h-4 w-4 mr-2" /> Edit Game
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <GameForm game={game} onUpdate={handleGameUpdated} onDelete={handleGameDeleted} />
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Ticket Sales</h3>
                        {game.ticket_sales.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tickets Sold
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount Collected
                                  </th>
                                  {/* Add more headers as needed */}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {game.ticket_sales.map((sale) => (
                                  <TicketSalesRow key={sale.id} sale={sale} onSalesUpdated={(updatedSales) => handleSalesUpdated(game.id, updatedSales)} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No ticket sales recorded for this game.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>

      {selectedGame && (
        <WinnerForm
          open={isWinnerFormOpen}
          onOpenChange={setIsWinnerFormOpen}
          game={selectedGame}
          onClose={handleCloseWinnerForm}
        />
      )}

      {selectedGame && (
        <PayoutSlipModal
          open={isPayoutSlipModalOpen}
          onOpenChange={setIsPayoutSlipModalOpen}
          game={selectedGame}
          onClose={handleClosePayoutSlipModal}
        />
      )}

      {selectedGame && (
        <ExpenseModal
          open={isExpenseModalOpen}
          onOpenChange={setIsExpenseModalOpen}
          gameId={selectedGame.id}
          gameName={selectedGame.name}
          onClose={handleCloseExpenseModal}
        />
      )}
    </div>
  );
}
