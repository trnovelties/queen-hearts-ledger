import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
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
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"


import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencyUtils";
import { CreateWeekModal } from "@/components/CreateWeekModal";
import { DonationModal } from "@/components/DonationModal";
import { ExpenseModal } from "@/components/ExpenseModal";
import { EditGameModal } from "@/components/EditGameModal";
import { getTodayDateString } from "@/lib/dateUtils";

interface Game {
  id: string;
  name: string;
  organization_id: string;
  total_donations: number;
  organization_net_profit: number;
  carryover_jackpot: number;
}

interface Week {
  id: string;
  game_id: string;
  week_number: number;
  weekly_payout: number;
  ticket_sales: any[];
}

export default function Dashboard() {
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isCreateWeekModalOpen, setIsCreateWeekModalOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditGameModalOpen, setIsEditGameModalOpen] = useState(false);
  const [selectedGameName, setSelectedGameName] = useState<string>("");
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [expandedGames, setExpandedGames] = useState(new Set<string>());

  const [date, setDate] = useState<Date>();

  const toggleGameExpanded = (gameId: string) => {
    const newExpandedGames = new Set(expandedGames);
    if (newExpandedGames.has(gameId)) {
      newExpandedGames.delete(gameId);
    } else {
      newExpandedGames.add(gameId);
    }
    setExpandedGames(newExpandedGames);
  };

  const fetchGames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view games.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('organization_id', user.id);

      if (error) {
        throw error;
      }

      setGames(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchWeeks = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*, ticket_sales(*)')
        .eq('game_id', gameId)
        .order('week_number', { ascending: true });

      if (error) {
        throw error;
      }

      setWeeks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCreateGame = async () => {
    if (!newGameName.trim()) {
      toast({
        title: "Validation Error",
        description: "Game name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a game.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('games')
        .insert([{ name: newGameName, organization_id: user.id }])
        .select();

      if (error) {
        throw error;
      }

      setGames([...games, data![0]]);
      setNewGameName("");
      setIsModalOpen(false);

      toast({
        title: "Success",
        description: "Game created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between space-x-2">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-[#1F4E4A] text-white hover:bg-[#317873] hover:text-white">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Game
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Game</DialogTitle>
                <DialogDescription>
                  Enter the name of the new game to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" onClick={handleCreateGame} className="bg-[#1F4E4A]">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-6">
        {games.map((game) => (
          <div key={game.id} className="bg-white rounded-lg shadow-md border border-gray-200">
            {/* Game Header Section */}
            <div className="flex items-center justify-between p-4">
              <div className="text-lg font-semibold">{game.name}</div>
              <div className="flex items-center space-x-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedGameName(game.name);
                    setIsDonationModalOpen(true);
                  }}
                  className="bg-green-500 text-white hover:bg-green-700"
                >
                  Add Donation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedGameName(game.name);
                    setIsExpenseModalOpen(true);
                  }}
                  className="bg-red-500 text-white hover:bg-red-700"
                >
                  Add Expense
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setSelectedGameName(game.name);
                    setIsEditGameModalOpen(true);
                  }}
                  className="bg-blue-500 text-white hover:bg-blue-700"
                >
                  Edit Game
                </Button>
                <CollapsibleTrigger asChild>
                  <Button size="sm" variant="ghost">
                    {expandedGames.has(game.id) ? "Collapse" : "Expand"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <Collapsible open={expandedGames.has(game.id)} onOpenChange={(open) => toggleGameExpanded(game.id)}>
              <CollapsibleContent>
                <div className="p-6 border-t border-gray-100">
                  {/* Create Week Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setSelectedGameName(game.name);
                      setIsCreateWeekModalOpen(true);
                    }}
                    className="mb-4 bg-[#1F4E4A] text-white hover:bg-[#317873] hover:text-white"
                  >
                    Create Week
                  </Button>

                  {/* Weeks Mapping */}
                  {weeks.map((week) => {
                    // Week calculations
                    const weekTotalTickets = week.ticket_sales?.reduce((sum, sale) => sum + sale.number_of_tickets, 0) || 0;
                    const weekTotalSales = week.ticket_sales?.reduce((sum, sale) => sum + sale.total_value, 0) || 0;
                    const weekOrganizationTotal = week.ticket_sales?.reduce((sum, sale) => sum + sale.organization_net, 0) || 0;
                    const weekJackpotTotal = week.ticket_sales?.reduce((sum, sale) => sum + sale.jackpot_total, 0) || 0;
                    
                    // Calculate proper ending jackpot total
                    let endingJackpotTotal = 0;
                    
                    if (week.ticket_sales && week.ticket_sales.length > 0) {
                      // Get the previous week's ending jackpot or game carryover
                      const previousWeeks = weeks.filter(w => w.game_id === game.id && w.week_number < week.week_number);
                      const previousWeek = previousWeeks.sort((a, b) => b.week_number - a.week_number)[0];
                      
                      let startingJackpot = 0;
                      if (previousWeek && previousWeek.ticket_sales && previousWeek.ticket_sales.length > 0) {
                        // Use the previous week's ending jackpot
                        const prevLatestEntry = previousWeek.ticket_sales.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        startingJackpot = prevLatestEntry?.ending_jackpot_total || 0;
                      } else {
                        // First week of the game, use carryover jackpot
                        startingJackpot = game.carryover_jackpot || 0;
                      }
                      
                      // Calculate ending jackpot: Starting + This Week's Contributions - Weekly Payout
                      endingJackpotTotal = startingJackpot + weekJackpotTotal - (week.weekly_payout || 0);
                    }

                    return <div>
                      {/* Week Details Header */}
                      <div className="font-semibold text-gray-700 mb-2">Week {week.week_number}</div>

                      {/* Winner Information Section */}
                      {week.ticket_sales?.map((ticketSale) => (
                        <div key={ticketSale.id} className="mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">
                            Date: {new Date(ticketSale.date).toLocaleDateString()}
                          </div>
                          <div className="text-blue-600 font-medium">Winner: {ticketSale.winner_name || "N/A"}</div>
                          <div className="text-gray-700">Tickets Sold: {ticketSale.number_of_tickets}</div>
                          <div className="text-green-600">Total Value: {formatCurrency(ticketSale.total_value)}</div>
                          {ticketSale.memo && <div className="text-gray-600">Memo: {ticketSale.memo}</div>}
                        </div>
                      ))}
                      
                      {/* Week Summary Stats - Updated to 5 columns with proper Ending Jackpot calculation */}
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{weekTotalTickets}</div>
                          <div className="text-sm text-blue-600 font-medium">Tickets Sold</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-700">{formatCurrency(weekTotalSales)}</div>
                          <div className="text-sm text-green-600 font-medium">Ticket Sales</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-2xl font-bold text-purple-700">{formatCurrency(weekOrganizationTotal)}</div>
                          <div className="text-sm text-purple-600 font-medium">Organization Net</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-2xl font-bold text-orange-700">{formatCurrency(weekJackpotTotal)}</div>
                          <div className="text-sm text-orange-600 font-medium">Jackpot Total</div>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="text-2xl font-bold text-indigo-700">{formatCurrency(endingJackpotTotal)}</div>
                          <div className="text-sm text-indigo-600 font-medium">Ending Jackpot</div>
                        </div>
                      </div>
                      
                      {/* Weekly Payout Display */}
                      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                        <div className="text-xl font-bold text-yellow-700">
                          Weekly Payout: {formatCurrency(week.weekly_payout || 0)}
                        </div>
                      </div>
                    </div>
                  })}

                  {/* No Weeks Message */}
                  {weeks.length === 0 && (
                    <div className="text-gray-500 text-center">No weeks created for this game yet.</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </div>

      {/* Create Week Modal */}
      {selectedGameId && (
        <CreateWeekModal
          open={isCreateWeekModalOpen}
          onOpenChange={setIsCreateWeekModalOpen}
          gameId={selectedGameId}
          gameName={selectedGameName}
          onSuccess={() => fetchWeeks(selectedGameId)}
        />
      )}

      {/* Donation Modal */}
      {selectedGameId && (
        <DonationModal
          open={isDonationModalOpen}
          onOpenChange={setIsDonationModalOpen}
          gameId={selectedGameId}
          gameName={selectedGameName}
          onSuccess={() => fetchGames()}
        />
      )}

      {/* Expense Modal */}
      {selectedGameId && (
        <ExpenseModal
          open={isExpenseModalOpen}
          onOpenChange={setIsExpenseModalOpen}
          gameId={selectedGameId}
          gameName={selectedGameName}
          onSuccess={() => fetchGames()}
        />
      )}

      {/* Edit Game Modal */}
      {selectedGameId && (
        <EditGameModal
          open={isEditGameModalOpen}
          onOpenChange={setIsEditGameModalOpen}
          gameId={selectedGameId}
          gameName={selectedGameName}
          onSuccess={() => fetchGames()}
        />
      )}
    </div>
  );
}
