import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { WinnerForm } from "@/components/WinnerForm";
import { PayoutSlip } from "@/components/PayoutSlip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { getTodayDateString } from "@/lib/dateUtils";

interface Game {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  ticket_price: number;
  organization_percentage: number;
  jackpot_percentage: number;
  minimum_starting_jackpot: number;
  carryover_jackpot: number;
  total_payouts: number;
  user_id?: string;
  weeks?: Week[];
}

interface Week {
  id: string;
  game_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  winner_name: string | null;
  card_selected: string | null;
  slot_chosen: number | null;
  winner_present: boolean | null;
  authorized_signature_name: string | null;
  weekly_payout: number | null;
  ticket_sales?: TicketSale[];
}

interface TicketSale {
  id: string;
  week_id: string;
  date: string;
  tickets_sold: number;
  jackpot_total: number;
  weekly_payout_amount: number | null;
  ending_jackpot_total: number | null;
  displayed_jackpot_total: number | null;
}

interface WinnerData {
  winnerName: string;
  cardSelected: string;
  slotChosen: number;
  amountWon: number;
  authorizedSignatureName: string;
  gameId: string;
  weekId: string;
  date: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  winnerPresent: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const calculateJackpot = (ticketsSold: number, ticketPrice: number, jackpotPercentage: number): number => {
  return ticketsSold * ticketPrice * (jackpotPercentage / 100);
};

const calculateTotalSales = (ticketsSold: number, ticketPrice: number): number => {
  return ticketsSold * ticketPrice;
};

const Dashboard = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  })
  const [ticketsSold, setTicketsSold] = useState<number>(0);
  const [isWinnerFormOpen, setIsWinnerFormOpen] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [isPayoutSlipOpen, setIsPayoutSlipOpen] = useState(false);
  const [winnerData, setWinnerData] = useState<WinnerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allGameSales, setAllGameSales] = useState<TicketSale[] | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: gamesData, error } = await supabase
          .from('games')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });

        if (error) {
          console.error("Error fetching games:", error);
          toast.error("Failed to load games");
          return;
        }

        if (gamesData && gamesData.length > 0) {
          setGames(gamesData);
          setSelectedGame(gamesData[0]); // Select the most recent game by default
        } else {
          console.log('No games found for this user.');
          toast.error("No games found. Please create a game first.");
        }
      } catch (error) {
        console.error("Error fetching games:", error);
        toast.error("Failed to load games");
      }
    };

    fetchGames();
  }, []);

  useEffect(() => {
    const fetchWeeksAndSales = async () => {
      if (!selectedGame) return;

      try {
        // Fetch weeks for the selected game
        const { data: weeksData, error: weeksError } = await supabase
          .from('weeks')
          .select('*')
          .eq('game_id', selectedGame.id)
          .order('week_number', { ascending: false });

        if (weeksError) {
          console.error("Error fetching weeks:", weeksError);
          toast.error("Failed to load weeks");
          return;
        }

        setWeeks(weeksData || []);

        // Fetch all ticket sales for the selected game
        const { data: allSalesData, error: allSalesError } = await supabase
          .from('ticket_sales')
          .select('*')
          .in('week_id', (weeksData || []).map(week => week.id))
          .order('date', { ascending: true });

        if (allSalesError) {
          console.error("Error fetching ticket sales:", allSalesError);
          toast.error("Failed to load ticket sales");
          return;
        }

        setAllGameSales(allSalesData || []);
        setTicketSales(allSalesData || []);
      } catch (error) {
        console.error("Error fetching weeks and sales:", error);
        toast.error("Failed to load weeks and sales");
      }
    };

    fetchWeeksAndSales();
  }, [selectedGame]);

  const handleGameChange = (gameId: string) => {
    const game = games.find(game => game.id === gameId);
    setSelectedGame(game || null);
  };

  const handleDateSelect = (date: DateRange | undefined) => {
    setDate(date);
  };

  const handleTicketsSoldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketsSold(parseInt(e.target.value) || 0);
  };

  const createNewWeek = async () => {
    if (!selectedGame) {
      toast.error("Please select a game first.");
      return;
    }

    setIsLoading(true);

    try {
      // Determine the next week number
      const nextWeekNumber = weeks.length > 0 ? Math.max(...weeks.map(week => week.week_number)) + 1 : 1;

      // Get today's date as a string in "YYYY-MM-DD" format
      const todayDateString = getTodayDateString();

      // Insert the new week record
      const { data: newWeek, error } = await supabase
        .from('weeks')
        .insert([{
          game_id: selectedGame.id,
          week_number: nextWeekNumber,
          start_date: todayDateString, // Use the formatted date string
          end_date: todayDateString // Use the formatted date string
        }])
        .select('*')
        .single();

      if (error) {
        console.error("Error creating week:", error);
        toast.error("Failed to create week");
        return;
      }

      // Update the local state with the new week
      setWeeks(prevWeeks => [newWeek, ...prevWeeks]);
      toast.success("New week created successfully!");
    } catch (error) {
      console.error("Error creating week:", error);
      toast.error("Failed to create week");
    } finally {
      setIsLoading(false);
    }
  };

  const updateDailyEntry = async (
    gameId: string,
    weekId: string,
    entryDate: string,
    ticketsSold: number,
    ticketPrice: number,
    existingEntry?: any
  ) => {
    try {
      if (!gameId || !weekId) {
        toast.error("Missing game or week information");
        return;
      }

      if (!date?.from || !date?.to) {
        toast.error("Please select a valid date range");
        return;
      }

      if (ticketsSold <= 0) {
        toast.error("Tickets sold must be greater than zero");
        return;
      }

      if (!selectedGame?.jackpot_percentage || !selectedGame?.organization_percentage) {
        toast.error("Please configure jackpot and organization percentages for the game");
        return;
      }

      const jackpotTotal = calculateJackpot(ticketsSold, ticketPrice, selectedGame.jackpot_percentage);
      const totalSales = calculateTotalSales(ticketsSold, ticketPrice);

      // Calculate ending jackpot total correctly
      let previousJackpotTotal = selectedGame.carryover_jackpot || 0;
      
      // Get all sales for this game up to (but not including) this entry, ordered by date
      const salesBeforeThisEntry = allGameSales?.filter(sale => {
        const saleDate = new Date(sale.date);
        const currentEntryDate = new Date(entryDate);
        // Include entries before this date, or same date but different entry (if updating)
        return saleDate < currentEntryDate || 
               (saleDate.toDateString() === currentEntryDate.toDateString() && sale.id !== existingEntry?.id);
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

      // Calculate running jackpot: start with carryover, add all previous contributions
      let runningJackpotTotal = selectedGame.carryover_jackpot || 0;
      for (const prevSale of salesBeforeThisEntry) {
        runningJackpotTotal += prevSale.jackpot_total;
      }

      // Subtract any completed weekly payouts (from weeks that have winners)
      if (selectedGame.weeks) {
        for (const week of selectedGame.weeks) {
          if (week.weekly_payout > 0) {
            // Check if this week's sales are all before our current entry
            const weekSales = week.ticket_sales || [];
            const lastWeekSaleDate = weekSales.length > 0 
              ? Math.max(...weekSales.map((sale: any) => new Date(sale.date).getTime()))
              : 0;
            const currentEntryTime = new Date(entryDate).getTime();
            
            // If the week's last sale is before our current entry, subtract the payout
            if (lastWeekSaleDate < currentEntryTime) {
              runningJackpotTotal -= week.weekly_payout;
            }
          }
        }
      }

      // Add this entry's jackpot contribution to get the ending total
      const endingJackpotTotal = runningJackpotTotal + jackpotTotal;

      // Optimistically update the state
      const newTicketSale = {
        id: existingEntry?.id || 'temp_' + Date.now(),
        week_id: weekId,
        date: entryDate,
        tickets_sold: ticketsSold,
        jackpot_total: jackpotTotal,
        weekly_payout_amount: existingEntry?.weekly_payout_amount || null,
        ending_jackpot_total: endingJackpotTotal,
        displayed_jackpot_total: endingJackpotTotal
      };

      setTicketSales(prevSales => {
        // If updating an existing entry
        if (existingEntry) {
          return prevSales.map(sale => sale.id === existingEntry.id ? newTicketSale : sale);
        }
        // If adding a new entry
        return [newTicketSale, ...prevSales];
      });

      // Update the database
      const upsertData = {
        week_id: weekId,
        date: entryDate,
        tickets_sold: ticketsSold,
        jackpot_total: jackpotTotal,
        weekly_payout_amount: existingEntry?.weekly_payout_amount || null,
        ending_jackpot_total: endingJackpotTotal,
        displayed_jackpot_total: endingJackpotTotal
      };

      const { data, error } = await supabase
        .from('ticket_sales')
        .upsert([upsertData], { onConflict: 'week_id, date' })
        .select('*');

      if (error) {
        console.error("Error updating ticket sales:", error);
        toast.error("Failed to update entry");

        // Revert the optimistic update on error
        setTicketSales(prevSales => {
          if (existingEntry) {
            return prevSales.map(sale => sale.id === existingEntry.id ? existingEntry : sale);
          } else {
            return prevSales.filter(sale => sale.id !== newTicketSale.id);
          }
        });
        return;
      }

      toast.success("Entry saved successfully!");
    } catch (error) {
      console.error('Error updating daily entry:', error);
      toast.error("Failed to update entry");
    }
  };

  const handleSaveEntry = async () => {
    if (!selectedGame || !selectedGame.id) {
      toast.error("Please select a game first.");
      return;
    }

    if (!weeks || weeks.length === 0) {
      toast.error("No weeks available. Please create a week first.");
      return;
    }

    if (!date?.from || !date?.to) {
      toast.error("Please select a valid date range.");
      return;
    }

    // Use the first day in the range as the entry date
    const entryDate = format(date.from, 'yyyy-MM-dd');

    // Find the week that includes the selected date
    const targetWeek = weeks.find(week => {
      const startDate = new Date(week.start_date);
      const endDate = new Date(week.end_date);
      const selectedDate = new Date(entryDate);
      return selectedDate >= startDate && selectedDate <= endDate;
    });

    if (!targetWeek) {
      toast.error("No week found for the selected date. Please create a week that includes this date.");
      return;
    }

    await updateDailyEntry(selectedGame.id, targetWeek.id, entryDate, ticketsSold, selectedGame.ticket_price);
  };

  const handleOpenWinnerForm = (weekId: string) => {
    setSelectedWeekId(weekId);
    setIsWinnerFormOpen(true);
  };

  const handleCloseWinnerForm = () => {
    setIsWinnerFormOpen(false);
    setSelectedWeekId(null);
  };

  const handleWinnerFormComplete = () => {
    // Refresh data after winner details are saved
    fetchUpdatedData();
  };

  const fetchUpdatedData = async () => {
    if (!selectedGame) return;

    try {
      // Fetch the updated game data
      const { data: updatedGameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', selectedGame.id)
        .single();

      if (gameError) {
        console.error("Error fetching updated game:", gameError);
        toast.error("Failed to refresh game data");
        return;
      }

      // Fetch the updated weeks data
      const { data: updatedWeeksData, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', selectedGame.id)
        .order('week_number', { ascending: false });

      if (weeksError) {
        console.error("Error fetching updated weeks:", weeksError);
        toast.error("Failed to refresh weeks data");
        return;
      }

      // Fetch all ticket sales for the selected game
      const { data: allSalesData, error: allSalesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .in('week_id', (updatedWeeksData || []).map(week => week.id))
        .order('date', { ascending: true });

      if (allSalesError) {
        console.error("Error fetching ticket sales:", allSalesError);
        toast.error("Failed to load ticket sales");
        return;
      }

      // Update the state with the new data
      setGames(prevGames =>
        prevGames.map(game => (game.id === selectedGame.id ? { ...game, ...updatedGameData } : game))
      );
      setSelectedGame({ ...selectedGame, ...updatedGameData });
      setWeeks(updatedWeeksData || []);
      setAllGameSales(allSalesData || []);
      setTicketSales(allSalesData || []);

      toast.success("Data refreshed successfully!");
    } catch (error) {
      console.error("Error fetching updated data:", error);
      toast.error("Failed to refresh data");
    }
  };

  const handleOpenPayoutSlip = (winnerData: WinnerData) => {
    setWinnerData(winnerData);
    setIsPayoutSlipOpen(true);
  };

  const handleClosePayoutSlip = () => {
    setIsPayoutSlipOpen(false);
    setWinnerData(null);
  };

  const getWeekDetails = (weekId: string) => {
    return weeks.find(week => week.id === weekId);
  };

  const getGameDetails = (gameId: string) => {
    return games.find(game => game.id === gameId);
  };

  const calculateTotalJackpotContributions = useCallback(() => {
    return ticketSales.reduce((total, sale) => total + sale.jackpot_total, 0);
  }, [ticketSales]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Game Dashboard</h1>

      {/* Game Selection */}
      <div className="mb-4">
        <Label htmlFor="gameSelect">Select Game</Label>
        <Select onValueChange={handleGameChange}>
          <SelectTrigger id="gameSelect">
            <SelectValue placeholder="Select a game" />
          </SelectTrigger>
          <SelectContent>
            {games.map((game) => (
              <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGame && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Date Picker */}
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>Pick a date to record ticket sales for.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date?.to ? (
                          `${format(date.from, "MMM dd, yyyy")} - ${format(date.to, "MMM dd, yyyy")}`
                        ) : (
                          format(date.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center" side="bottom">
                    <Calendar
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={handleDateSelect}
                      disabled={(date) =>
                        date > new Date() || date < new Date(selectedGame.start_date)
                      }
                      numberOfMonths={2}
                      pagedNavigation
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Ticket Sales Input */}
            <Card>
              <CardHeader>
                <CardTitle>Record Ticket Sales</CardTitle>
                <CardDescription>Enter the number of tickets sold for the selected date.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="ticketsSold">Tickets Sold</Label>
                  <Input
                    type="number"
                    id="ticketsSold"
                    value={ticketsSold}
                    onChange={handleTicketsSoldChange}
                    placeholder="Enter number of tickets sold"
                  />
                  <Button onClick={handleSaveEntry} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Entry"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Week Management */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Week Management</CardTitle>
              <CardDescription>Create and manage weekly records for the game.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Button onClick={createNewWeek} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create New Week"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Display */}
          <Card>
            <CardHeader>
              <CardTitle>Game Data</CardTitle>
              <CardDescription>View and manage game related data.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableCaption>A list of all ticket sales.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Week</TableHead>
                    <TableHead className="text-left">Date</TableHead>
                    <TableHead className="text-left">Tickets Sold</TableHead>
                    <TableHead className="text-left">Jackpot Total</TableHead>
                    <TableHead className="text-left">Weekly Payout</TableHead>
                    <TableHead className="text-left">Ending Jackpot Total</TableHead>
                    <TableHead className="text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketSales.map((sale) => {
                    const weekDetails = getWeekDetails(sale.week_id);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{weekDetails?.week_number}</TableCell>
                        <TableCell>{formatDate(sale.date)}</TableCell>
                        <TableCell>{sale.tickets_sold}</TableCell>
                        <TableCell>${sale.jackpot_total.toFixed(2)}</TableCell>
                        <TableCell>${sale.weekly_payout_amount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>${sale.ending_jackpot_total?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          {weekDetails && !weekDetails.winner_name ? (
                            <Button variant="secondary" size="sm" onClick={() => handleOpenWinnerForm(sale.week_id)}>
                              Record Winner
                            </Button>
                          ) : (
                            <span className="text-green-500">Winner Recorded</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell>${calculateTotalJackpotContributions().toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Winner Form Dialog */}
          <WinnerForm
            open={isWinnerFormOpen}
            onOpenChange={setIsWinnerFormOpen}
            gameId={selectedGame.id}
            weekId={selectedWeekId}
            gameData={selectedGame}
            currentJackpotTotal={ticketSales.length > 0 ? ticketSales[0].ending_jackpot_total : selectedGame.carryover_jackpot}
            jackpotContributions={calculateTotalJackpotContributions()}
            onComplete={handleWinnerFormComplete}
            onOpenPayoutSlip={handleOpenPayoutSlip}
          />

          {/* Payout Slip Dialog */}
          {winnerData && (
            <PayoutSlip
              open={isPayoutSlipOpen}
              onOpenChange={handleClosePayoutSlip}
              winnerData={winnerData}
              gameDetails={getGameDetails(winnerData.gameId)}
              weekDetails={getWeekDetails(winnerData.weekId)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
