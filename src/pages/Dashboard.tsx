import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { ExpenseModal } from "@/components/ExpenseModal";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { WinnerForm } from "@/components/WinnerForm";
import { GameForm } from "@/components/GameForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

export default function Dashboard() {
  const { user } = useAuth();
  const { getCurrentUserId, viewingOrganization } = useAdmin();
  
  // Get the current user ID (either the logged-in user or the organization being viewed by admin)
  const currentUserId = getCurrentUserId();

  const { toast } = useToast();
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayoutSlipModalOpen, setIsPayoutSlipModalOpen] = useState(false);
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [newWeekStartDate, setNewWeekStartDate] = useState<Date | null>(null);
  const [isAddingWeek, setIsAddingWeek] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [newRules, setNewRules] = useState('');
  const [organizationRules, setOrganizationRules] = useState('');

  useEffect(() => {
    fetchOrganizationRules();
  }, [currentUserId]);

  const fetchOrganizationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_rules')
        .select('rules_content')
        .eq('user_id', currentUserId)
        .single();

      if (error) {
        // If no rules exist, that's fine, just log the error
        console.error('Error fetching organization rules:', error);
        return;
      }

      setOrganizationRules(data?.rules_content || '');
      setNewRules(data?.rules_content || '');
    } catch (error: any) {
      console.error('Error fetching organization rules:', error);
      toast({
        title: "Error",
        description: `Failed to fetch organization rules: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleEditRules = () => {
    setIsEditingRules(true);
  };

  const handleSaveRules = async () => {
    try {
      // Check if rules already exist for the organization
      const { data, error: selectError } = await supabase
        .from('organization_rules')
        .select('*')
        .eq('user_id', currentUserId);

      if (selectError) throw selectError;

      if (data && data.length > 0) {
        // Update existing rules
        const { error: updateError } = await supabase
          .from('organization_rules')
          .update({ rules_content: newRules })
          .eq('user_id', currentUserId);

        if (updateError) throw updateError;

        toast({
          title: "Rules Updated",
          description: "Organization rules have been updated successfully."
        });
      } else {
        // Insert new rules
        const { error: insertError } = await supabase
          .from('organization_rules')
          .insert([{ 
            user_id: currentUserId, 
            rules_content: newRules,
            startup_costs: '',
            organization_name: viewingOrganization?.organization_name || 'Organization'
          }]);

        if (insertError) throw insertError;

        toast({
          title: "Rules Created",
          description: "Organization rules have been created successfully."
        });
      }

      setOrganizationRules(newRules);
      setIsEditingRules(false);
    } catch (error: any) {
      console.error('Error saving organization rules:', error);
      toast({
        title: "Error",
        description: `Failed to save organization rules: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleCancelEditRules = () => {
    setNewRules(organizationRules);
    setIsEditingRules(false);
  };

  const handleOpenWinnerModal = (game: any) => {
    setSelectedGame(game);
    setIsWinnerModalOpen(true);
  };

  const handleCloseWinnerModal = () => {
    setIsWinnerModalOpen(false);
    setSelectedGame(null);
  };

  const handleOpenExpenseModal = (game: any) => {
    setSelectedGame(game);
    setIsExpenseModalOpen(true);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setSelectedGame(null);
  };

  const handleOpenPayoutSlipModal = (game: any) => {
    setSelectedGame(game);
    setIsPayoutSlipModalOpen(true);
  };

  const handleClosePayoutSlipModal = () => {
    setIsPayoutSlipModalOpen(false);
    setSelectedGame(null);
  };

  const handleDeleteConfirmation = (game: any) => {
    setGameToDelete(game);
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setGameToDelete(null);
  };

  const handleDeleteGame = async () => {
    if (!gameToDelete) return;

    try {
      // Delete associated ticket sales
      const { error: ticketSalesError } = await supabase
        .from('ticket_sales')
        .delete()
        .eq('game_id', gameToDelete.id);

      if (ticketSalesError) throw ticketSalesError;

      // Delete associated expenses
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('game_id', gameToDelete.id);

      if (expensesError) throw expensesError;

      // Finally, delete the game
      const { error: gameError } = await supabase
        .from('games')
        .delete()
        .eq('id', gameToDelete.id);

      if (gameError) throw gameError;

      toast({
        title: "Game Deleted",
        description: "The game has been successfully deleted."
      });
      setDeleteDialogOpen(false);
      setGameToDelete(null);
      fetchGames();
    } catch (error: any) {
      console.error('Error deleting game:', error);
      toast({
        title: "Error",
        description: `Failed to delete game: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleDownloadGameData = async (game: any) => {
    try {
      setLoading(true);

      // Fetch ticket sales data for the game
      const { data: ticketSalesData, error: ticketSalesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', game.id);

      if (ticketSalesError) throw ticketSalesError;

      // Fetch expenses data for the game
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', game.id);

      if (expensesError) throw expensesError;

      // Create a new jsPDF instance
      const pdf = new jsPDF();

      // Set document properties
      pdf.setProperties({
        title: `Game Data - Game #${game.game_number}`,
        subject: 'Game Data Export',
        author: 'Queen of Hearts App'
      });

      // Add title to the PDF
      pdf.setFontSize(20);
      pdf.text(`Game Data - Game #${game.game_number}`, 10, 10);

      // Add game details
      pdf.setFontSize(12);
      pdf.text(`Game Number: ${game.game_number}`, 10, 20);
      pdf.text(`Name: ${game.name}`, 10, 26);
      pdf.text(`Total Sales: $${game.total_sales}`, 10, 32);
      pdf.text(`Total Expenses: $${game.total_expenses}`, 10, 38);
      pdf.text(`Organization Net Profit: $${game.organization_net_profit}`, 10, 44);

      // Add ticket sales data
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Ticket Sales Data', 10, 10);

      if (ticketSalesData && ticketSalesData.length > 0) {
        // Define table headers
        const headers = ['Date', 'Tickets Sold', 'Amount Collected'];

        // Map ticket sales data to table rows
        const rows = ticketSalesData.map(sale => [
          format(new Date(sale.date), 'MMM d, yyyy'),
          sale.tickets_sold.toString(),
          `$${sale.amount_collected.toFixed(2)}`,
        ]);

        // Add table to the PDF
        (pdf as any).autoTable({
          head: [headers],
          body: rows,
          startY: 20,
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('No ticket sales data available for this game.', 10, 20);
      }

      // Add expenses data
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Expenses Data', 10, 10);

      if (expensesData && expensesData.length > 0) {
        // Define table headers
        const headers = ['Date', 'Amount', 'Memo'];

        // Map expenses data to table rows
        const rows = expensesData.map(expense => [
          format(new Date(expense.date), 'MMM d, yyyy'),
          `$${expense.amount.toFixed(2)}`,
          expense.memo || 'No memo',
        ]);

        // Add table to the PDF
        (pdf as any).autoTable({
          head: [headers],
          body: rows,
          startY: 20,
        });
      } else {
        pdf.setFontSize(12);
        pdf.text('No expenses data available for this game.', 10, 20);
      }

      // Save the PDF
      pdf.save(`GameData_Game${game.game_number}.pdf`);
    } catch (error: any) {
      console.error('Error downloading game data:', error);
      toast({
        title: "Error",
        description: `Failed to download game data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWeekSelect = (week: any) => {
    setSelectedWeek(week);
  };

  const handleAddWeek = async () => {
    if (!newWeekStartDate) {
      toast({
        title: "Error",
        description: "Please select a start date for the new week.",
        variant: "destructive"
      });
      return;
    }

    setIsAddingWeek(true);

    try {
      // Calculate end date (7 days after start date)
      const endDate = new Date(newWeekStartDate);
      endDate.setDate(endDate.getDate() + 6);

      const { data, error } = await supabase
        .from('weeks')
        .insert([{ 
          user_id: currentUserId, 
          start_date: format(newWeekStartDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          game_id: '', // This would need to be set to a valid game_id
          week_number: 1 // This would need to be calculated
        }]);

      if (error) throw error;

      toast({
        title: "Week Added",
        description: "New week has been added successfully."
      });

      setNewWeekStartDate(null);
      fetchGames();
    } catch (error: any) {
      console.error('Error adding week:', error);
      toast({
        title: "Error",
        description: `Failed to add week: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsAddingWeek(false);
    }
  };

  useEffect(() => {
    fetchGames();

    // Set up real-time subscription for games table
    const gamesSubscription = supabase.channel('public:games').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'games',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      console.log('Games changed, refreshing data');
      fetchGames();
    }).subscribe();

    // Set up real-time subscription for weeks table
    const weeksSubscription = supabase.channel('public:weeks').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'weeks',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      console.log('Weeks changed, refreshing data');
      fetchGames();
    }).subscribe();

    // Set up real-time subscription for ticket_sales table
    const ticketSalesSubscription = supabase.channel('public:ticket_sales').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ticket_sales',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      console.log('Ticket sales changed, refreshing data');
      fetchGames();
    }).subscribe();

    // Set up real-time subscription for expenses table
    const expensesSubscription = supabase.channel('public:expenses').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'expenses',
      filter: `user_id=eq.${currentUserId}`
    }, () => {
      console.log('Expenses changed, refreshing data');
      fetchGames();
    }).subscribe();
    return () => {
      supabase.removeChannel(gamesSubscription);
      supabase.removeChannel(weeksSubscription);
      supabase.removeChannel(ticketSalesSubscription);
      supabase.removeChannel(expensesSubscription);
    };
  }, [currentUserId]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', currentUserId)
        .order('game_number', { ascending: true });

      if (gamesError) throw gamesError;

      const { data: weeksData, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('user_id', currentUserId)
        .order('start_date', { ascending: false });

      if (weeksError) throw weeksError;

      setGames(gamesData || []);
      setWeeks(weeksData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: `Failed to fetch data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Queen of Hearts Games</h1>
          {viewingOrganization && (
            <p className="text-sm text-muted-foreground mt-1">
              Viewing: {viewingOrganization.organization_name || viewingOrganization.email}
            </p>
          )}
        </div>
        <Button onClick={() => setGameFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Game
        </Button>
      </div>

      {/* Weeks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-start">
            <Select onValueChange={(value) => {
                const week = weeks.find((w: any) => w.id === value);
                handleWeekSelect(week);
              }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week: any) => (
                  <SelectItem key={week.id} value={week.id}>
                    {format(new Date(week.start_date), 'MMM d, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <DatePickerWithInput
                date={newWeekStartDate}
                setDate={setNewWeekStartDate}
                label="Start Date"
                placeholder="Select start date"
              />
              <Button onClick={handleAddWeek} disabled={isAddingWeek}>
                {isAddingWeek ? 'Adding...' : 'Add Week'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditingRules ? (
            <div className="space-y-4">
              <Textarea
                value={newRules}
                onChange={(e) => setNewRules(e.target.value)}
                className="w-full"
                placeholder="Enter organization rules..."
              />
              <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={handleCancelEditRules}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRules}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{organizationRules || 'No rules defined.'}</p>
              <Button variant="outline" onClick={handleEditRules}>
                Edit Rules
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Net Profit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : games.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">No games found.</TableCell>
                </TableRow>
              ) : (
                games.map((game: any) => (
                  <TableRow key={game.id}>
                    <TableCell>{game.game_number}</TableCell>
                    <TableCell>{game.name}</TableCell>
                    <TableCell>${game.total_sales}</TableCell>
                    <TableCell>${game.organization_net_profit}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleOpenWinnerModal(game)}
                          size="sm"
                          variant="outline"
                        >
                          Winners
                        </Button>
                        <Button
                          onClick={() => handleOpenExpenseModal(game)}
                          size="sm"
                          variant="outline"
                        >
                          Expenses
                        </Button>
                        <Button
                          onClick={() => handleOpenPayoutSlipModal(game)}
                          size="sm"
                          variant="outline"
                        >
                          Payout Slip
                        </Button>
                        <Button
                          onClick={() => handleDownloadGameData(game)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={() => handleDeleteConfirmation(game)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Winner Modal */}
      <WinnerForm
        open={isWinnerModalOpen}
        onOpenChange={setIsWinnerModalOpen}
        gameId={selectedGame?.id}
        weekId={null}
        onComplete={fetchGames}
        onOpenPayoutSlip={() => {}}
      />

      {/* Expense Modal */}
      <ExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
        gameId={selectedGame?.id || ''}
        gameName={selectedGame?.name || ''}
      />

      {/* Payout Slip Modal */}
      <PayoutSlipModal
        open={isPayoutSlipModalOpen}
        onOpenChange={setIsPayoutSlipModalOpen}
        winnerData={null}
      />

      {/* Game Form Modal */}
      <GameForm
        open={gameFormOpen}
        onOpenChange={setGameFormOpen}
        games={games}
        onComplete={fetchGames}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this game? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCancelDelete} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleDeleteGame} variant="destructive">
              Delete Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}
