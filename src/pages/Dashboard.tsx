
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Game = Tables<"games"> & {
  weeks: (Tables<"weeks"> & {
    dailyEntries: Tables<"ticket_sales">[]
  })[]
};

export default function Dashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGame, setNewGame] = useState({
    gameName: "",
    ticketPrice: 2,
    lodgePercentage: 40,
    jackpotPercentage: 60,
  });
  const [newDailyEntry, setNewDailyEntry] = useState({
    weekId: "",
    date: new Date().toISOString().split("T")[0],
    ticketsSold: 0,
  });
  const [winnerDetails, setWinnerDetails] = useState({
    weekId: "",
    winnerName: "",
    slotChosen: 0,
    cardSelected: "",
    isPresent: true,
  });
  const [createGameOpen, setCreateGameOpen] = useState(false);
  const [addDailyEntryOpen, setAddDailyEntryOpen] = useState(false);
  const [addWinnerOpen, setAddWinnerOpen] = useState(false);
  const [configurations, setConfigurations] = useState<Tables<"configurations"> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'game' | 'week' | 'entry'>('game');
  const [deleteItemId, setDeleteItemId] = useState<string>('');

  useEffect(() => {
    async function fetchConfigurations() {
      try {
        const { data, error } = await supabase
          .from('configurations')
          .select('*')
          .single();
        
        if (error) throw error;
        if (data) setConfigurations(data);
      } catch (error) {
        console.error('Error fetching configurations:', error);
      }
    }
    
    fetchConfigurations();
  }, []);

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
        const gamesWithDetails: Game[] = [];
        
        for (const game of gamesData) {
          const { data: weeksData, error: weeksError } = await supabase
            .from('weeks')
            .select('*')
            .eq('game_id', game.id)
            .order('week_number', { ascending: true });
          
          if (weeksError) throw weeksError;
          
          const weeksWithEntries = [];
          
          if (weeksData) {
            for (const week of weeksData) {
              const { data: entriesData, error: entriesError } = await supabase
                .from('ticket_sales')
                .select('*')
                .eq('week_id', week.id)
                .order('date', { ascending: true });
              
              if (entriesError) throw entriesError;
              
              weeksWithEntries.push({
                ...week,
                dailyEntries: entriesData || []
              });
            }
          }
          
          gamesWithDetails.push({
            ...game,
            weeks: weeksWithEntries
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
  };

  useEffect(() => {
    fetchGames();
    
    // Set up realtime subscription for ticket_sales
    const ticketSalesChannel = supabase
      .channel('public:ticket_sales')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'ticket_sales' }, 
          () => {
            console.log('Ticket sales changed, refreshing data');
            fetchGames();
          })
      .subscribe();
      
    // Set up realtime subscription for weeks
    const weeksChannel = supabase
      .channel('public:weeks')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'weeks' }, 
          () => {
            console.log('Weeks changed, refreshing data');
            fetchGames();
          })
      .subscribe();
      
    // Set up realtime subscription for games
    const gamesChannel = supabase
      .channel('public:games')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'games' }, 
          () => {
            console.log('Games changed, refreshing data');
            fetchGames();
          })
      .subscribe();
    
    return () => {
      supabase.removeChannel(ticketSalesChannel);
      supabase.removeChannel(weeksChannel);
      supabase.removeChannel(gamesChannel);
    };
  }, [user, toast]);

  const handleCreateGame = async () => {
    if (newGame.lodgePercentage + newGame.jackpotPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Lodge and Jackpot percentages must add up to 100%.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data: lastGame, error: gameError } = await supabase
        .from('games')
        .select('game_number')
        .order('game_number', { ascending: false })
        .limit(1)
        .single();
      
      if (gameError && gameError.code !== 'PGRST116') {
        throw gameError;
      }
      
      const gameNumber = lastGame ? lastGame.game_number + 1 : 1;
      
      const { data: newGameData, error } = await supabase
        .from('games')
        .insert({
          game_number: gameNumber,
          name: newGame.gameName,
          start_date: new Date().toISOString().split('T')[0],
          ticket_price: newGame.ticketPrice,
          lodge_percentage: newGame.lodgePercentage,
          jackpot_percentage: newGame.jackpotPercentage,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (newGameData) {
        fetchGames();
      }
      
      setCreateGameOpen(false);
      toast({
        title: "Game Created",
        description: `${newGame.gameName} has been created successfully.`,
      });
      
      setNewGame({
        gameName: "",
        ticketPrice: 2,
        lodgePercentage: 40,
        jackpotPercentage: 60,
      });
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast({
        title: "Error Creating Game",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddWeek = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) return;
      
      const weekNumber = game.weeks.length + 1;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = addDays(new Date(startDate), 6).toISOString().split('T')[0];
      
      const { data: newWeekData, error } = await supabase
        .from('weeks')
        .insert({
          game_id: gameId,
          week_number: weekNumber,
          start_date: startDate,
          end_date: endDate,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      fetchGames();
      
      toast({
        title: "Week Added",
        description: `Week ${weekNumber} has been added to ${game.name}.`,
      });
    } catch (error: any) {
      console.error('Error adding week:', error);
      toast({
        title: "Error Adding Week",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddDailyEntry = async () => {
    try {
      const gameIndex = games.findIndex(game => 
        game.weeks.some(week => week.id === newDailyEntry.weekId)
      );
      
      if (gameIndex === -1) return;
      
      const weekIndex = games[gameIndex].weeks.findIndex(
        week => week.id === newDailyEntry.weekId
      );
      
      if (weekIndex === -1) return;
      
      const game = games[gameIndex];
      const week = game.weeks[weekIndex];
      
      const amountCollected = newDailyEntry.ticketsSold * game.ticket_price;
      const lodgeTotal = amountCollected * (game.lodge_percentage / 100);
      const jackpotTotal = amountCollected * (game.jackpot_percentage / 100);
      
      const previousEntries = week.dailyEntries || [];
      const previousCumulative = previousEntries.length > 0 
        ? previousEntries[previousEntries.length - 1].cumulative_collected
        : 0;
      const cumulativeCollected = previousCumulative + amountCollected;
      
      const previousJackpot = previousEntries.length > 0 
        ? previousEntries[previousEntries.length - 1].ending_jackpot_total
        : game.carryover_jackpot;
      const endingJackpotTotal = previousJackpot + jackpotTotal;
      
      const { data: newEntryData, error } = await supabase
        .from('ticket_sales')
        .insert({
          game_id: game.id,
          week_id: week.id,
          date: newDailyEntry.date,
          tickets_sold: newDailyEntry.ticketsSold,
          ticket_price: game.ticket_price,
          amount_collected: amountCollected,
          cumulative_collected: cumulativeCollected,
          lodge_total: lodgeTotal,
          jackpot_total: jackpotTotal,
          ending_jackpot_total: endingJackpotTotal,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const { error: weekUpdateError } = await supabase
        .from('weeks')
        .update({
          weekly_sales: week.weekly_sales + amountCollected,
          weekly_tickets_sold: week.weekly_tickets_sold + newDailyEntry.ticketsSold,
        })
        .eq('id', week.id);
      
      if (weekUpdateError) throw weekUpdateError;
      
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          total_sales: game.total_sales + amountCollected,
          lodge_net_profit: game.lodge_net_profit + lodgeTotal,
        })
        .eq('id', game.id);
      
      if (gameUpdateError) throw gameUpdateError;
      
      // Fetch fresh data after update
      fetchGames();
      
      setAddDailyEntryOpen(false);
      
      // Check if this is the 7th entry to prompt for winner details
      if (previousEntries.length === 6) {
        setWinnerDetails({ ...winnerDetails, weekId: newDailyEntry.weekId });
        setAddWinnerOpen(true);
      }
      
      toast({
        title: "Daily Entry Added",
        description: `Added ${newDailyEntry.ticketsSold} tickets sold for $${amountCollected}.`,
      });
      
      setNewDailyEntry({
        weekId: "",
        date: new Date().toISOString().split("T")[0],
        ticketsSold: 0,
      });
    } catch (error: any) {
      console.error('Error adding daily entry:', error);
      toast({
        title: "Error Adding Daily Entry",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddWinner = async () => {
    try {
      const gameIndex = games.findIndex(game => 
        game.weeks.some(week => week.id === winnerDetails.weekId)
      );
      
      if (gameIndex === -1) return;
      
      const weekIndex = games[gameIndex].weeks.findIndex(
        week => week.id === winnerDetails.weekId
      );
      
      if (weekIndex === -1) return;
      
      const game = games[gameIndex];
      const week = game.weeks[weekIndex];
      const dailyEntries = week.dailyEntries;
      const lastEntry = dailyEntries[dailyEntries.length - 1];
      
      let payoutAmount = 0;
      const cardPayouts = configurations?.card_payouts as Record<string, any> || {};
      
      if (winnerDetails.cardSelected === "Queen of Hearts") {
        payoutAmount = lastEntry.ending_jackpot_total;
      } else {
        const payoutValue = cardPayouts[winnerDetails.cardSelected];
        payoutAmount = typeof payoutValue === 'number' ? payoutValue : 10;
      }
      
      if (!winnerDetails.isPresent) {
        const penaltyPercentage = configurations?.penalty_percentage || 10;
        payoutAmount = payoutAmount * (1 - penaltyPercentage / 100);
      }
      
      const { error: weekUpdateError } = await supabase
        .from('weeks')
        .update({
          winner_name: winnerDetails.winnerName,
          slot_chosen: winnerDetails.slotChosen,
          card_selected: winnerDetails.cardSelected,
          weekly_payout: payoutAmount,
          winner_present: winnerDetails.isPresent,
        })
        .eq('id', week.id);
      
      if (weekUpdateError) throw weekUpdateError;
      
      const { error: saleUpdateError } = await supabase
        .from('ticket_sales')
        .update({
          weekly_payout_amount: payoutAmount,
          ending_jackpot_total: lastEntry.ending_jackpot_total - payoutAmount,
        })
        .eq('id', lastEntry.id);
      
      if (saleUpdateError) throw saleUpdateError;
      
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          total_payouts: game.total_payouts + payoutAmount,
        })
        .eq('id', game.id);
      
      if (gameUpdateError) throw gameUpdateError;
      
      if (winnerDetails.cardSelected === "Queen of Hearts") {
        const { error: endGameError } = await supabase
          .from('games')
          .update({
            end_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', game.id);
        
        if (endGameError) throw endGameError;
      }
      
      // Fetch fresh data after update
      fetchGames();
      
      setAddWinnerOpen(false);
      
      if (winnerDetails.cardSelected === "Queen of Hearts") {
        toast({
          title: "Game Over!",
          description: `${winnerDetails.winnerName} found the Queen of Hearts and won $${payoutAmount.toFixed(2)}!`,
        });
      } else {
        toast({
          title: "Winner Added",
          description: `${winnerDetails.winnerName} selected ${winnerDetails.cardSelected} and won $${payoutAmount.toFixed(2)}.`,
        });
      }
      
      setWinnerDetails({
        weekId: "",
        winnerName: "",
        slotChosen: 0,
        cardSelected: "",
        isPresent: true,
      });
    } catch (error: any) {
      console.error('Error adding winner:', error);
      toast({
        title: "Error Adding Winner",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewFinanceReport = (gameId: string) => {
    navigate(`/income-expense?game=${gameId}`);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'game') {
        // First delete related entries in ticket_sales
        const { data: weeks } = await supabase
          .from('weeks')
          .select('id')
          .eq('game_id', deleteItemId);
        
        if (weeks && weeks.length > 0) {
          const weekIds = weeks.map(week => week.id);
          
          // Delete ticket sales for these weeks
          await supabase
            .from('ticket_sales')
            .delete()
            .in('week_id', weekIds);
            
          // Delete expenses for this game
          await supabase
            .from('expenses')
            .delete()
            .eq('game_id', deleteItemId);
            
          // Delete the weeks
          await supabase
            .from('weeks')
            .delete()
            .in('id', weekIds);
        }
        
        // Finally delete the game
        await supabase
          .from('games')
          .delete()
          .eq('id', deleteItemId);
        
        toast({
          title: "Game Deleted",
          description: "Game and all associated data have been deleted.",
        });
        
      } else if (deleteType === 'week') {
        // First delete related entries in ticket_sales
        await supabase
          .from('ticket_sales')
          .delete()
          .eq('week_id', deleteItemId);
          
        // Then delete the week
        await supabase
          .from('weeks')
          .delete()
          .eq('id', deleteItemId);
          
        toast({
          title: "Week Deleted",
          description: "Week and all associated entries have been deleted.",
        });
        
      } else if (deleteType === 'entry') {
        // Get the entry details before deletion
        const { data: entry } = await supabase
          .from('ticket_sales')
          .select('*')
          .eq('id', deleteItemId)
          .single();
          
        if (entry) {
          const { game_id, week_id, amount_collected, tickets_sold } = entry;
          
          // Get the week and game
          const { data: week } = await supabase
            .from('weeks')
            .select('*')
            .eq('id', week_id)
            .single();
            
          const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', game_id)
            .single();
            
          // Delete the entry
          await supabase
            .from('ticket_sales')
            .delete()
            .eq('id', deleteItemId);
            
          if (week && game) {
            // Update the week
            await supabase
              .from('weeks')
              .update({
                weekly_sales: week.weekly_sales - amount_collected,
                weekly_tickets_sold: week.weekly_tickets_sold - tickets_sold,
              })
              .eq('id', week_id);
              
            // Update the game
            const lodgeTotal = amount_collected * (game.lodge_percentage / 100);
            await supabase
              .from('games')
              .update({
                total_sales: game.total_sales - amount_collected,
                lodge_net_profit: game.lodge_net_profit - lodgeTotal,
              })
              .eq('id', game_id);
          }
          
          toast({
            title: "Entry Deleted",
            description: "Daily entry has been deleted and totals updated.",
          });
        }
      }
      
      // Refresh data
      fetchGames();
      
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#1F4E4A]">Game Management</h2>
        
        <Dialog open={createGameOpen} onOpenChange={setCreateGameOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#1F4E4A]">
              <Plus className="h-4 w-4" /> Create Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
              <DialogDescription>
                Set up a new Queen of Hearts game with your desired parameters.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gameName" className="col-span-1">Game Name</Label>
                <Input
                  id="gameName"
                  value={newGame.gameName}
                  onChange={(e) => setNewGame({ ...newGame, gameName: e.target.value })}
                  placeholder="e.g., Game 1"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ticketPrice" className="col-span-1">Ticket Price ($)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  value={newGame.ticketPrice}
                  onChange={(e) => setNewGame({ ...newGame, ticketPrice: parseFloat(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lodgePercentage" className="col-span-1">Lodge %</Label>
                <Input
                  id="lodgePercentage"
                  type="number"
                  value={newGame.lodgePercentage}
                  onChange={(e) => {
                    const lodge = parseFloat(e.target.value) || 0;
                    setNewGame({
                      ...newGame,
                      lodgePercentage: lodge,
                      jackpotPercentage: 100 - lodge,
                    });
                  }}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="jackpotPercentage" className="col-span-1">Jackpot %</Label>
                <Input
                  id="jackpotPercentage"
                  type="number"
                  value={newGame.jackpotPercentage}
                  onChange={(e) => {
                    const jackpot = parseFloat(e.target.value) || 0;
                    setNewGame({
                      ...newGame,
                      jackpotPercentage: jackpot,
                      lodgePercentage: 100 - jackpot,
                    });
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" onClick={handleCreateGame} className="bg-[#1F4E4A]">Create Game</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1F4E4A] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading games...</p>
        </div>
      ) : games.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <h3 className="text-xl font-medium mb-2">No Games Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first Queen of Hearts game to get started.
            </p>
            <Button onClick={() => setCreateGameOpen(true)} className="bg-[#1F4E4A]">Create Game</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {games.map((game) => (
            <Card key={game.id} className="mb-4 overflow-hidden">
              <AccordionItem value={game.id} className="border-none">
                <CardHeader className="p-0 border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-accent/50 hover:no-underline">
                    <div className="flex flex-col text-left">
                      <CardTitle className="text-lg">{game.name}</CardTitle>
                      <CardDescription>
                        Started: {format(new Date(game.start_date), 'MMM d, yyyy')} 
                        • Total Sales: ${game.total_sales.toFixed(2)} 
                        • Net Profit: ${game.lodge_net_profit.toFixed(2)}
                      </CardDescription>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="pt-4 pb-0">
                    <div className="flex gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        onClick={() => handleAddWeek(game.id)}
                        className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Week
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleViewFinanceReport(game.id)}
                        className="border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                      >
                        <DollarSign className="h-4 w-4 mr-2" /> Finance Report
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setDeleteType('game');
                          setDeleteItemId(game.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white ml-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Game
                      </Button>
                    </div>
                    
                    {game.weeks.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No weeks added yet.</p>
                    ) : (
                      <Accordion type="single" collapsible className="space-y-2">
                        {game.weeks.map((week) => (
                          <Card key={week.id} className="overflow-hidden">
                            <AccordionItem value={week.id} className="border-none">
                              <CardHeader className="p-0 border-b">
                                <AccordionTrigger className="px-4 py-3 hover:bg-accent/50 hover:no-underline">
                                  <div className="flex flex-col text-left">
                                    <CardTitle className="text-base">Week {week.week_number}</CardTitle>
                                    <CardDescription className="text-sm">
                                      Sales: ${week.weekly_sales.toFixed(2)} • 
                                      Tickets: {week.weekly_tickets_sold} •
                                      {week.winner_name ? 
                                        ` Winner: ${week.winner_name} (${week.card_selected})` : 
                                        ' No winner yet'}
                                    </CardDescription>
                                  </div>
                                </AccordionTrigger>
                              </CardHeader>
                              <AccordionContent>
                                <CardContent className="pt-4 pb-0">
                                  <div className="flex justify-end mb-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setDeleteType('week');
                                        setDeleteItemId(week.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" /> Delete Week
                                    </Button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="px-2 py-2 text-left">Date</th>
                                          <th className="px-2 py-2 text-right">Tickets</th>
                                          <th className="px-2 py-2 text-right">Price</th>
                                          <th className="px-2 py-2 text-right">Collected</th>
                                          <th className="px-2 py-2 text-right">Cumulative</th>
                                          <th className="px-2 py-2 text-right">Lodge</th>
                                          <th className="px-2 py-2 text-right">Jackpot</th>
                                          <th className="px-2 py-2 text-right">Payout</th>
                                          <th className="px-2 py-2 text-right">Ending Jackpot</th>
                                          <th className="px-2 py-2 text-center">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {week.dailyEntries.length === 0 ? (
                                          <tr>
                                            <td colSpan={10} className="text-center py-4">
                                              No entries yet
                                            </td>
                                          </tr>
                                        ) : (
                                          week.dailyEntries.map((entry) => (
                                            <tr key={entry.id} className="border-b hover:bg-muted/50">
                                              <td className="px-2 py-2">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                                              <td className="px-2 py-2 text-right">{entry.tickets_sold}</td>
                                              <td className="px-2 py-2 text-right">${entry.ticket_price.toFixed(2)}</td>
                                              <td className="px-2 py-2 text-right">${entry.amount_collected.toFixed(2)}</td>
                                              <td className="px-2 py-2 text-right">${entry.cumulative_collected.toFixed(2)}</td>
                                              <td className="px-2 py-2 text-right">${entry.lodge_total.toFixed(2)}</td>
                                              <td className="px-2 py-2 text-right">${entry.jackpot_total.toFixed(2)}</td>
                                              <td className="px-2 py-2 text-right">
                                                {entry.weekly_payout_amount > 0 ? 
                                                  `$${entry.weekly_payout_amount.toFixed(2)}` : '-'}
                                              </td>
                                              <td className="px-2 py-2 text-right">${entry.ending_jackpot_total.toFixed(2)}</td>
                                              <td className="px-2 py-2 text-center">
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon"
                                                  onClick={() => {
                                                    setDeleteType('entry');
                                                    setDeleteItemId(entry.id);
                                                    setDeleteDialogOpen(true);
                                                  }}
                                                  className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {week.dailyEntries.length < 7 && !week.winner_name && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-4 border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                                      onClick={() => {
                                        setNewDailyEntry({
                                          ...newDailyEntry,
                                          weekId: week.id,
                                        });
                                        setAddDailyEntryOpen(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add Daily Entry
                                    </Button>
                                  )}
                                  
                                  {/* Show winner button if we have exactly 7 entries and no winner yet */}
                                  {week.dailyEntries.length === 7 && !week.winner_name && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-4 border-[#1F4E4A] text-[#1F4E4A] hover:bg-[#1F4E4A] hover:text-white"
                                      onClick={() => {
                                        setWinnerDetails({
                                          ...winnerDetails,
                                          weekId: week.id,
                                        });
                                        setAddWinnerOpen(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add Winner
                                    </Button>
                                  )}
                                </CardContent>
                              </AccordionContent>
                            </AccordionItem>
                          </Card>
                        ))}
                      </Accordion>
                    )}
                  </CardContent>
                  <CardFooter className="pb-4 pt-0 flex justify-between">
                    <div className="text-sm">
                      <strong>Configuration:</strong> 
                      ${game.ticket_price.toFixed(2)} per ticket • 
                      {game.lodge_percentage}% Lodge • 
                      {game.jackpot_percentage}% Jackpot
                    </div>
                  </CardFooter>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      )}
      
      <Dialog open={addDailyEntryOpen} onOpenChange={setAddDailyEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Daily Entry</DialogTitle>
            <DialogDescription>
              Record today's ticket sales for this week.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="entryDate" className="col-span-1">Date</Label>
              <Input
                id="entryDate"
                type="date"
                value={newDailyEntry.date}
                onChange={(e) => setNewDailyEntry({
                  ...newDailyEntry,
                  date: e.target.value,
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticketsSold" className="col-span-1">Tickets Sold</Label>
              <Input
                id="ticketsSold"
                type="number"
                min="0"
                value={newDailyEntry.ticketsSold}
                onChange={(e) => setNewDailyEntry({
                  ...newDailyEntry,
                  ticketsSold: parseInt(e.target.value) || 0,
                })}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" onClick={handleAddDailyEntry} className="bg-[#1F4E4A]">Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={addWinnerOpen} onOpenChange={setAddWinnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weekly Drawing</DialogTitle>
            <DialogDescription>
              Enter the winner details from this week's drawing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="winnerName" className="col-span-1">Winner Name</Label>
              <Input
                id="winnerName"
                value={winnerDetails.winnerName}
                onChange={(e) => setWinnerDetails({
                  ...winnerDetails,
                  winnerName: e.target.value,
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slotChosen" className="col-span-1">Slot Number</Label>
              <Input
                id="slotChosen"
                type="number"
                min="1"
                max="54"
                value={winnerDetails.slotChosen}
                onChange={(e) => setWinnerDetails({
                  ...winnerDetails,
                  slotChosen: parseInt(e.target.value) || 0,
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardSelected" className="col-span-1">Card Selected</Label>
              <select
                id="cardSelected"
                value={winnerDetails.cardSelected}
                onChange={(e) => setWinnerDetails({
                  ...winnerDetails,
                  cardSelected: e.target.value,
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
              >
                <option value="">Select a card...</option>
                {configurations && configurations.card_payouts && 
                  Object.keys(configurations.card_payouts as Record<string, any>).map(card => (
                    <option key={card} value={card}>{card}</option>
                  ))
                }
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPresent"
                checked={winnerDetails.isPresent}
                onChange={(e) => setWinnerDetails({
                  ...winnerDetails,
                  isPresent: e.target.checked,
                })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPresent">Winner was present for drawing</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" onClick={handleAddWinner} className="bg-[#1F4E4A]">Record Winner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'game' && "This will permanently delete the game and all associated weeks, entries, expenses, and donations."}
              {deleteType === 'week' && "This will permanently delete this week and all associated daily entries."}
              {deleteType === 'entry' && "This will delete this daily entry and update the totals accordingly."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
