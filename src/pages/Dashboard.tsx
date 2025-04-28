
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Game {
  id: string;
  gameName: string;
  startDate: string;
  ticketPrice: number;
  lodgePercentage: number;
  jackpotPercentage: number;
  totalSales: number;
  lodgeNetProfit: number;
  weeks: Week[];
}

interface Week {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weeklySales: number;
  weeklyTicketsSold: number;
  winnerName: string | null;
  slotChosen: number | null;
  cardSelected: string | null;
  weeklyPayout: number;
  dailyEntries: DailyEntry[];
}

interface DailyEntry {
  id: string;
  date: string;
  ticketsSold: number;
  ticketPrice: number;
  amountCollected: number;
  cumulativeCollected: number;
  lodgeTotal: number;
  jackpotTotal: number;
  weeklyPayoutAmount: number;
  endingJackpotTotal: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [newGame, setNewGame] = useState({
    gameName: "",
    ticketPrice: 2,
    lodgePercentage: 40,
    jackpotPercentage: 60,
  });
  const [newWeek, setNewWeek] = useState({
    gameId: "",
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

  // Function to create a new game
  const handleCreateGame = () => {
    // Validate percentages
    if (newGame.lodgePercentage + newGame.jackpotPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Lodge and Jackpot percentages must add up to 100%.",
        variant: "destructive",
      });
      return;
    }

    const gameId = Math.random().toString(36).substring(2, 9);
    const newGameData: Game = {
      id: gameId,
      gameName: newGame.gameName,
      startDate: new Date().toISOString().split("T")[0],
      ticketPrice: newGame.ticketPrice,
      lodgePercentage: newGame.lodgePercentage,
      jackpotPercentage: newGame.jackpotPercentage,
      totalSales: 0,
      lodgeNetProfit: 0,
      weeks: [],
    };

    setGames([...games, newGameData]);
    setCreateGameOpen(false);
    toast({
      title: "Game Created",
      description: `${newGame.gameName} has been created successfully.`,
    });
  };

  // Function to add a new week to a game
  const handleAddWeek = (gameId: string) => {
    const gameIndex = games.findIndex(game => game.id === gameId);
    if (gameIndex === -1) return;

    const weekNumber = games[gameIndex].weeks.length + 1;
    const weekId = Math.random().toString(36).substring(2, 9);
    
    const newWeekData: Week = {
      id: weekId,
      weekNumber,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "", // Will be set when week is complete
      weeklySales: 0,
      weeklyTicketsSold: 0,
      winnerName: null,
      slotChosen: null,
      cardSelected: null,
      weeklyPayout: 0,
      dailyEntries: [],
    };

    const updatedGames = [...games];
    updatedGames[gameIndex].weeks.push(newWeekData);
    setGames(updatedGames);
    
    toast({
      title: "Week Added",
      description: `Week ${weekNumber} has been added to ${games[gameIndex].gameName}.`,
    });
  };

  // Function to add a daily entry to a week
  const handleAddDailyEntry = () => {
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
    
    // Calculate financial values
    const amountCollected = newDailyEntry.ticketsSold * game.ticketPrice;
    const lodgeTotal = amountCollected * (game.lodgePercentage / 100);
    const jackpotTotal = amountCollected * (game.jackpotPercentage / 100);
    
    // Calculate cumulative collected for this game
    const previousCumulative = week.dailyEntries.length > 0 
      ? week.dailyEntries[week.dailyEntries.length - 1].cumulativeCollected
      : 0;
    const cumulativeCollected = previousCumulative + amountCollected;
    
    // Calculate ending jackpot (for now, no payouts yet)
    const previousJackpot = week.dailyEntries.length > 0 
      ? week.dailyEntries[week.dailyEntries.length - 1].endingJackpotTotal
      : 0;
    const endingJackpotTotal = previousJackpot + jackpotTotal;

    const dailyEntry: DailyEntry = {
      id: Math.random().toString(36).substring(2, 9),
      date: newDailyEntry.date,
      ticketsSold: newDailyEntry.ticketsSold,
      ticketPrice: game.ticketPrice,
      amountCollected,
      cumulativeCollected,
      lodgeTotal,
      jackpotTotal,
      weeklyPayoutAmount: 0, // Will be updated when winner is selected
      endingJackpotTotal,
    };

    // Add the daily entry
    const updatedGames = [...games];
    updatedGames[gameIndex].weeks[weekIndex].dailyEntries.push(dailyEntry);
    
    // Update week totals
    updatedGames[gameIndex].weeks[weekIndex].weeklySales += amountCollected;
    updatedGames[gameIndex].weeks[weekIndex].weeklyTicketsSold += newDailyEntry.ticketsSold;
    
    // Update game totals
    updatedGames[gameIndex].totalSales += amountCollected;
    updatedGames[gameIndex].lodgeNetProfit += lodgeTotal;

    setGames(updatedGames);
    setAddDailyEntryOpen(false);
    
    // Check if this is the 7th daily entry, if so prompt for winner
    if (updatedGames[gameIndex].weeks[weekIndex].dailyEntries.length === 7) {
      setWinnerDetails({ ...winnerDetails, weekId: newDailyEntry.weekId });
      setAddWinnerOpen(true);
    }
    
    toast({
      title: "Daily Entry Added",
      description: `Added ${newDailyEntry.ticketsSold} tickets sold for $${amountCollected}.`,
    });
  };

  // Function to add winner details
  const handleAddWinner = () => {
    const gameIndex = games.findIndex(game => 
      game.weeks.some(week => week.id === winnerDetails.weekId)
    );
    
    if (gameIndex === -1) return;
    
    const weekIndex = games[gameIndex].weeks.findIndex(
      week => week.id === winnerDetails.weekId
    );
    
    if (weekIndex === -1) return;

    // Get the current jackpot from the last daily entry
    const dailyEntries = games[gameIndex].weeks[weekIndex].dailyEntries;
    const lastEntry = dailyEntries[dailyEntries.length - 1];
    
    // Determine payout based on card selected (simplified for now)
    let payoutAmount = 0;
    if (winnerDetails.cardSelected === "Queen of Hearts") {
      payoutAmount = lastEntry.endingJackpotTotal;
    } else {
      // For demo, other cards get a fixed payout
      const cardPayouts: Record<string, number> = {
        "Joker": 100,
        "Ace of Hearts": 50,
        "King of Hearts": 25,
        // More card payouts would be defined here
      };
      payoutAmount = cardPayouts[winnerDetails.cardSelected] || 10; // Default payout
    }
    
    // Apply penalty if winner is not present
    if (!winnerDetails.isPresent) {
      // 10% penalty, payoutAmount is reduced
      payoutAmount = payoutAmount * 0.9;
    }

    const updatedGames = [...games];
    const week = updatedGames[gameIndex].weeks[weekIndex];
    
    // Update winner details
    week.winnerName = winnerDetails.winnerName;
    week.slotChosen = winnerDetails.slotChosen;
    week.cardSelected = winnerDetails.cardSelected;
    week.weeklyPayout = payoutAmount;
    week.endDate = new Date().toISOString().split("T")[0];
    
    // Update the last daily entry with payout amount
    const lastDailyEntry = week.dailyEntries[week.dailyEntries.length - 1];
    lastDailyEntry.weeklyPayoutAmount = payoutAmount;
    lastDailyEntry.endingJackpotTotal -= payoutAmount;
    
    setGames(updatedGames);
    setAddWinnerOpen(false);

    // If Queen of Hearts was found, end the game
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-primary">Game Management</h2>
        
        {/* Create Game Dialog */}
        <Dialog open={createGameOpen} onOpenChange={setCreateGameOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
                  onChange={(e) => setNewGame({ ...newGame, ticketPrice: parseFloat(e.target.value) })}
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
                    const lodge = parseFloat(e.target.value);
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
                    const jackpot = parseFloat(e.target.value);
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
              <Button type="submit" onClick={handleCreateGame}>Create Game</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Games List */}
      {games.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <h3 className="text-xl font-medium mb-2">No Games Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first Queen of Hearts game to get started.
            </p>
            <Button onClick={() => setCreateGameOpen(true)}>Create Game</Button>
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
                      <CardTitle className="text-lg">{game.gameName}</CardTitle>
                      <CardDescription>
                        Started: {game.startDate} • Total Sales: ${game.totalSales.toFixed(2)} • Net Profit: ${game.lodgeNetProfit.toFixed(2)}
                      </CardDescription>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="pt-4 pb-0">
                    {/* Add Week Button */}
                    <Button 
                      variant="outline" 
                      className="mb-4"
                      onClick={() => handleAddWeek(game.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Week
                    </Button>
                    
                    {/* Weeks List */}
                    <div className="space-y-4">
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
                                      <CardTitle className="text-base">Week {week.weekNumber}</CardTitle>
                                      <CardDescription className="text-sm">
                                        Sales: ${week.weeklySales.toFixed(2)} • 
                                        Tickets: {week.weeklyTicketsSold} •
                                        {week.winnerName ? 
                                          ` Winner: ${week.winnerName} (${week.cardSelected})` : 
                                          ' No winner yet'}
                                      </CardDescription>
                                    </div>
                                  </AccordionTrigger>
                                </CardHeader>
                                <AccordionContent>
                                  <CardContent className="pt-4 pb-0">
                                    {/* Daily Entries Table */}
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
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {week.dailyEntries.length === 0 ? (
                                            <tr>
                                              <td colSpan={9} className="text-center py-4">
                                                No entries yet
                                              </td>
                                            </tr>
                                          ) : (
                                            week.dailyEntries.map((entry) => (
                                              <tr key={entry.id} className="border-b hover:bg-muted/50">
                                                <td className="px-2 py-2">{entry.date}</td>
                                                <td className="px-2 py-2 text-right">{entry.ticketsSold}</td>
                                                <td className="px-2 py-2 text-right">${entry.ticketPrice.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">${entry.amountCollected.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">${entry.cumulativeCollected.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">${entry.lodgeTotal.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">${entry.jackpotTotal.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">
                                                  {entry.weeklyPayoutAmount > 0 ? 
                                                    `$${entry.weeklyPayoutAmount.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-2 py-2 text-right">${entry.endingJackpotTotal.toFixed(2)}</td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                    
                                    {/* Add Daily Entry Button */}
                                    {week.dailyEntries.length < 7 && !week.winnerName && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
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
                                  </CardContent>
                                </AccordionContent>
                              </AccordionItem>
                            </Card>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pb-4 pt-0 flex justify-between">
                    <div className="text-sm">
                      <strong>Configuration:</strong> 
                      ${game.ticketPrice.toFixed(2)} per ticket • 
                      {game.lodgePercentage}% Lodge • 
                      {game.jackpotPercentage}% Jackpot
                    </div>
                  </CardFooter>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      )}
      
      {/* Add Daily Entry Dialog */}
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
                  ticketsSold: parseInt(e.target.value),
                })}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" onClick={handleAddDailyEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Winner Dialog */}
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
                  slotChosen: parseInt(e.target.value),
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
                <option value="Queen of Hearts">Queen of Hearts</option>
                <option value="King of Hearts">King of Hearts</option>
                <option value="Jack of Hearts">Jack of Hearts</option>
                <option value="Ace of Hearts">Ace of Hearts</option>
                <option value="10 of Hearts">10 of Hearts</option>
                <option value="Joker">Joker</option>
                {/* More card options would be added here */}
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
            <Button type="submit" onClick={handleAddWinner}>Record Winner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
