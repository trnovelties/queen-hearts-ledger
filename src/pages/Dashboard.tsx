import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { ExpenseModal } from "@/components/ExpenseModal";
import { DonationModal } from "@/components/DonationModal";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { WinnerForm } from "@/components/WinnerForm";
import { GameForm } from "@/components/GameForm";
import { useAuth } from "@/context/AuthContext";
import { useGameData } from "@/hooks/useGameData";
import { usePdfReports } from "@/hooks/usePdfReports";
import { useGameTotalsUpdater } from "@/hooks/useGameTotalsUpdater";
import { GameCard } from "@/components/GameCard";
import { formatDateStringForDisplay, getTodayDateString } from '@/lib/dateUtils';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user } = useAuth();
  const { games, setGames, loading, fetchGames } = useGameData();
  const { generateGamePdfReport } = usePdfReports();
  const { updateGameTotals } = useGameTotalsUpdater();
  const { toast } = useToast();

  // UI State
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'archived'>('current');

  // Modal States
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [winnerFormOpen, setWinnerFormOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [payoutSlipOpen, setPayoutSlipOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dailyExpenseModalOpen, setDailyExpenseModalOpen] = useState(false);

  // Form States
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [currentGameName, setCurrentGameName] = useState<string>("");
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"game" | "week" | "entry" | "expense">('game');
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const [dailyDonationDate, setDailyDonationDate] = useState<string>('');

  const [weekForm, setWeekForm] = useState({
    weekNumber: 1,
    startDate: new Date()
  });

  const [dailyExpenseForm, setDailyExpenseForm] = useState({
    date: '',
    amount: 0,
    memo: '',
    gameId: ''
  });

  // Filter games based on active tab
  const currentGames = games.filter(game => !game.end_date);
  const archivedGames = games.filter(game => game.end_date);
  const displayGames = activeTab === 'current' ? currentGames : archivedGames;

  // Event Handlers
  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
    setExpandedWeek(null);
    setExpandedExpenses(null);
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeek(expandedWeek === weekId ? null : weekId);
  };

  const toggleExpenses = (gameId: string) => {
    setExpandedExpenses(expandedExpenses === gameId ? null : gameId);
  };

  const openWeekForm = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const lastWeekNumber = game.weeks.length > 0 
      ? Math.max(...game.weeks.map((w: any) => w.week_number)) 
      : 0;
    
    setWeekForm({
      weekNumber: lastWeekNumber + 1,
      startDate: new Date()
    });
    setCurrentGameId(gameId);
    setWeekFormOpen(true);
  };

  const createWeek = async () => {
    if (!currentGameId || !user?.id) return;
    
    try {
      const endDate = new Date(weekForm.startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const { data, error } = await supabase
        .from('weeks')
        .insert([{
          game_id: currentGameId,
          week_number: weekForm.weekNumber,
          start_date: weekForm.startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          user_id: user.id
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Week Created",
        description: `Week ${weekForm.weekNumber} has been created successfully.`,
      });

      setWeekFormOpen(false);
      setWeekForm({ weekNumber: 1, startDate: new Date() });
    } catch (error: any) {
      console.error('Error creating week:', error);
      toast({
        title: "Error",
        description: `Failed to create week: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const openDeleteConfirm = (id: string, type: "game" | "week" | "entry" | "expense") => {
    setDeleteItemId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId || !user?.id) return;

    try {
      if (deleteType === 'game') {
        // Delete all related data first, then the game
        await supabase.from('ticket_sales').delete().eq('game_id', deleteItemId).eq('user_id', user.id);
        await supabase.from('weeks').delete().eq('game_id', deleteItemId).eq('user_id', user.id);
        await supabase.from('expenses').delete().eq('game_id', deleteItemId).eq('user_id', user.id);
        await supabase.from('games').delete().eq('id', deleteItemId).eq('user_id', user.id);
        
        setGames(prevGames => prevGames.filter(game => game.id !== deleteItemId));
        toast({ title: "Game Deleted", description: "Game and all associated data have been deleted successfully." });
      } else if (deleteType === 'week') {
        // Get the game_id before deleting the week
        const { data: weekData } = await supabase
          .from('weeks')
          .select('game_id')
          .eq('id', deleteItemId)
          .eq('user_id', user.id)
          .single();

        // Delete all ticket sales for this week first
        await supabase.from('ticket_sales').delete().eq('week_id', deleteItemId).eq('user_id', user.id);
        await supabase.from('weeks').delete().eq('id', deleteItemId).eq('user_id', user.id);
        
        // Recalculate game totals after deletion
        if (weekData?.game_id) {
          await updateGameTotals(weekData.game_id);
        }
        
        toast({ title: "Week Deleted", description: "Week and all associated data have been deleted successfully." });
      } else if (deleteType === 'entry') {
        await supabase.from('ticket_sales').delete().eq('id', deleteItemId).eq('user_id', user.id);
        toast({ title: "Entry Deleted", description: "Daily entry has been deleted successfully." });
      } else if (deleteType === 'expense') {
        await supabase.from('expenses').delete().eq('id', deleteItemId).eq('user_id', user.id);
        toast({ title: "Expense Deleted", description: "Expense/donation has been deleted successfully." });
      }
      
      setTimeout(() => fetchGames(), 500);
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || `Failed to delete ${deleteType}`,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
    }
  };

  const openExpenseModal = (gameId: string, gameName: string) => {
    setCurrentGameId(gameId);
    setCurrentGameName(gameName);
    setExpenseModalOpen(true);
  };

  const openDonationModal = (gameId: string, gameName: string, date?: string) => {
    setCurrentGameId(gameId);
    setCurrentGameName(gameName);
    if (date) setDailyDonationDate(date);
    setDonationModalOpen(true);
  };

  const handleOpenPayoutSlip = (winnerData: any) => {
    setPayoutSlipData(winnerData);
    setPayoutSlipOpen(true);
  };

  const handleWinnerComplete = () => fetchGames();
  const handleGameComplete = () => fetchGames();

  const handleDailyExpense = async () => {
    if (!dailyExpenseForm.gameId || dailyExpenseForm.amount <= 0 || !user?.id) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          game_id: dailyExpenseForm.gameId,
          date: dailyExpenseForm.date,
          amount: dailyExpenseForm.amount,
          memo: dailyExpenseForm.memo,
          is_donation: false,
          user_id: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Expense Added",
        description: `Daily expense has been recorded.`,
      });

      setDailyExpenseModalOpen(false);
      setDailyExpenseForm({ date: '', amount: 0, memo: '', gameId: '' });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to add expense: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const openDailyExpenseModal = (date: string, gameId: string) => {
    setDailyExpenseForm({ date, amount: 0, memo: '', gameId });
    setDailyExpenseModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Please log in to view your games.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Queen of Hearts Games</h1>
        <Button onClick={() => setGameFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Game
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'current'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Current Game
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'archived'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Archived Games
        </button>
      </div>
      
      <div className="space-y-4">
        {displayGames.length === 0 ? (
          <Card>
            <CardContent className="p-6 flex justify-center items-center">
              <p className="text-muted-foreground">
                {activeTab === 'current' 
                  ? 'No current games. Click "Create Game" to get started.' 
                  : 'No archived games yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          displayGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              expandedGame={expandedGame}
              expandedWeek={expandedWeek}
              expandedExpenses={expandedExpenses}
              onToggleGame={toggleGame}
              onToggleWeek={toggleWeek}
              onToggleExpenses={toggleExpenses}
              onOpenWeekForm={openWeekForm}
              onOpenDeleteConfirm={openDeleteConfirm}
              onGeneratePdfReport={generateGamePdfReport}
              onOpenExpenseModal={openExpenseModal}
              onOpenDonationModal={openDonationModal}
              onOpenDailyExpenseModal={openDailyExpenseModal}
              currentGameId={currentGameId}
              setCurrentGameId={setCurrentGameId}
              games={games}
              setGames={setGames}
            />
          ))
        )}
      </div>
      
      {/* All Modals */}
      {/* Week Form Dialog */}
      <Dialog open={weekFormOpen} onOpenChange={setWeekFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Week</DialogTitle>
            <DialogDescription>
              Enter the details for the new week. The end date will be automatically calculated as 7 days from the start date.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="weekNumber" className="text-sm font-medium">Week Number</label>
              <Input
                id="weekNumber"
                type="number"
                value={weekForm.weekNumber}
                onChange={(e) => setWeekForm({ ...weekForm, weekNumber: parseInt(e.target.value) })}
                min="1"
              />
            </div>
            
            <div className="grid gap-2">
              <DatePickerWithInput
                label="Start Date"
                date={weekForm.startDate}
                setDate={(date) => date ? setWeekForm({ ...weekForm, startDate: date }) : null}
                placeholder="Select start date"
              />
              <p className="text-xs text-muted-foreground">
                End date will be automatically set to {weekForm.startDate 
                  ? formatDateStringForDisplay(new Date(weekForm.startDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) 
                  : 'N/A'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setWeekFormOpen(false)} variant="secondary">Cancel</Button>
            <Button onClick={createWeek} type="submit" variant="default">Create Week</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType}? 
              {deleteType === 'game' && ' This will permanently delete the game and ALL associated weeks, ticket sales, and expenses.'}
              {deleteType === 'week' && ' This will permanently delete the week and ALL associated daily entries.'}
              {deleteType === 'entry' && ' This will permanently delete this daily entry.'}
              {deleteType === 'expense' && ' This will permanently delete this expense/donation.'}
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="secondary">Cancel</Button>
            <Button onClick={confirmDelete} type="submit" variant="destructive">Delete {deleteType}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Daily Expense Modal */}
      <Dialog open={dailyExpenseModalOpen} onOpenChange={setDailyExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Daily Expense</DialogTitle>
            <DialogDescription>
              Enter the expense details for {dailyExpenseForm.date && formatDateStringForDisplay(dailyExpenseForm.date)}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={dailyExpenseForm.amount || ''}
                onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="memo">Memo</Label>
              <Textarea
                id="memo"
                value={dailyExpenseForm.memo}
                onChange={(e) => setDailyExpenseForm({ ...dailyExpenseForm, memo: e.target.value })}
                placeholder="Enter expense description..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setDailyExpenseModalOpen(false)} variant="secondary">Cancel</Button>
            <Button onClick={handleDailyExpense} type="submit" variant="default" disabled={dailyExpenseForm.amount <= 0}>
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Other Modals */}
      <ExpenseModal 
        open={expenseModalOpen} 
        onOpenChange={setExpenseModalOpen} 
        gameId={currentGameId || ''} 
        gameName={currentGameName} 
      />
      
      <DonationModal 
        open={donationModalOpen} 
        onOpenChange={setDonationModalOpen} 
        gameId={currentGameId || ''} 
        gameName={currentGameName} 
        defaultDate={dailyDonationDate}
      />
      
      <PayoutSlipModal 
        open={payoutSlipOpen} 
        onOpenChange={setPayoutSlipOpen} 
        winnerData={payoutSlipData} 
      />
      
      <WinnerForm 
        open={winnerFormOpen} 
        onOpenChange={setWinnerFormOpen} 
        gameId={currentGameId} 
        weekId={currentWeekId} 
        onComplete={handleWinnerComplete} 
        onOpenPayoutSlip={handleOpenPayoutSlip} 
      />
      
      <GameForm 
        open={gameFormOpen} 
        onOpenChange={setGameFormOpen} 
        games={games} 
        onComplete={handleGameComplete} 
      />
    </div>
  );
}
