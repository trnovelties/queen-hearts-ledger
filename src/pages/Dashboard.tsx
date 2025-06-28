import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, Receipt, Calendar, Trophy, DollarSign, Users, TrendingUp, CheckCircle, AlertCircle, Eye, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { format } from 'date-fns';
import { GameDetailsModal } from '@/components/GameDetailsModal';
import { PayoutSlipModal } from '@/components/PayoutSlipModal';
import { Tables } from '@/integrations/supabase/types';
import { useJackpotCalculation } from '@/hooks/useJackpotCalculation';
import { getTodayDateString, formatDateStringForDisplay, formatDateStringShort, formatDateStringForMediumDisplay } from '@/lib/dateUtils';

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const [games, setGames] = useState<Game[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [expandedGames, setExpandedGames] = useState<string[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  const [selectedGameForModal, setSelectedGameForModal] = useState<Game | null>(null);
  const [gameDetailsModalOpen, setGameDetailsModalOpen] = useState(false);

  const [payoutSlipModalOpen, setPayoutSlipModalOpen] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);

  const [ticketSalesModalOpen, setTicketSalesModalOpen] = useState(false);
  const [newSaleData, setNewSaleData] = useState<{ date: string; tickets_sold: number; ticket_price: number }>({
    date: getTodayDateString(),
    tickets_sold: 0,
    ticket_price: 2,
  });

  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editSaleData, setEditSaleData] = useState<{ date: string; tickets_sold: number; ticket_price: number }>({
    date: getTodayDateString(),
    tickets_sold: 0,
    ticket_price: 2,
  });

  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [selectedWeekForWinner, setSelectedWeekForWinner] = useState<Week | null>(null);
  const [winnerData, setWinnerData] = useState<{
    winner_name: string;
    slot_chosen: number;
    card_selected: string;
    payout_amount: number;
    winner_present: boolean;
    authorized_signature_name: string;
  }>({
    winner_name: '',
    slot_chosen: 0,
    card_selected: '',
    payout_amount: 0,
    winner_present: true,
    authorized_signature_name: '',
  });

  const [createGameModalOpen, setCreateGameModalOpen] = useState(false);
  const [newGameData, setNewGameData] = useState<Partial<Game>>({
    name: '',
    start_date: getTodayDateString(),
    ticket_price: 2,
    organization_percentage: 40,
    jackpot_percentage: 60,
    minimum_starting_jackpot: 500,
  });

  const cardOptions = [
    'Ace of Hearts', '2 of Hearts', '3 of Hearts', '4 of Hearts', '5 of Hearts', '6 of Hearts', '7 of Hearts',
    '8 of Hearts', '9 of Hearts', '10 of Hearts', 'Jack of Hearts', 'Queen of Hearts', 'King of Hearts',
    'Ace of Diamonds', '2 of Diamonds', '3 of Diamonds', '4 of Diamonds', '5 of Diamonds', '6 of Diamonds',
    '7 of Diamonds', '8 of Diamonds', '9 of Diamonds', '10 of Diamonds', 'Jack of Diamonds', 'Queen of Diamonds',
    'King of Diamonds', 'Ace of Clubs', '2 of Clubs', '3 of Clubs', '4 of Clubs', '5 of Clubs', '6 of Clubs',
    '7 of Clubs', '8 of Clubs', '9 of Clubs', '10 of Clubs', 'Jack of Clubs', 'Queen of Clubs', 'King of Clubs',
    'Ace of Spades', '2 of Spades', '3 of Spades', '4 of Spades', '5 of Spades', '6 of Spades', '7 of Spades',
    '8 of Spades', '9 of Spades', '10 of Spades', 'Jack of Spades', 'Queen of Spades', 'King of Spades'
  ];

  useEffect(() => {
    fetchGames();
    fetchWeeks();
    fetchTicketSales();
    fetchExpenses();
  }, []);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive",
      });
    }
  };

  const fetchWeeks = async () => {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*');

      if (error) throw error;
      setWeeks(data || []);
    } catch (error) {
      console.error('Error fetching weeks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch weeks",
        variant: "destructive",
      });
    }
  };

  const fetchTicketSales = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*');

      if (error) throw error;
      setTicketSales(data || []);
    } catch (error) {
      console.error('Error fetching ticket sales:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ticket sales",
        variant: "destructive",
      });
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*');

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    }
  };

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);
  };

  const toggleWeekExpansion = (weekId: string) => {
    setExpandedWeeks(prev => prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]);
  };

  const createWeek = async (gameId: string) => {
    try {
      // Determine next week number for the game
      const gameWeeks = weeks.filter(w => w.game_id === gameId);
      const nextWeekNumber = gameWeeks.length > 0 ? Math.max(...gameWeeks.map(w => w.week_number)) + 1 : 1;

      // Default start and end dates for the week (e.g., next week after last week)
      let startDate = getTodayDateString();
      let endDate = getTodayDateString();

      if (gameWeeks.length > 0) {
        const lastWeek = gameWeeks.reduce((prev, current) => (prev.week_number > current.week_number ? prev : current));
        startDate = lastWeek.end_date;
        // For simplicity, set endDate 7 days after startDate (not timezone adjusted)
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(startDateObj.getDate() + 6);
        endDate = endDateObj.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('weeks')
        .insert([{
          game_id: gameId,
          week_number: nextWeekNumber,
          start_date: startDate,
          end_date: endDate,
          weekly_payout: 0,
          winner_name: null,
          slot_chosen: null,
          card_selected: null,
          winner_present: null,
          authorized_signature_name: null,
        }]);

      if (error) throw error;
      if (data) {
        setWeeks(prev => [...prev, ...data]);
        toast({
          title: "Success",
          description: `Week ${nextWeekNumber} created for game.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error creating week:', error);
      toast({
        title: "Error",
        description: "Failed to create week",
        variant: "destructive",
      });
    }
  };

  const addTicketSale = async () => {
    if (!selectedGameForModal) return;
    if (!selectedWeekForWinner) return;

    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .insert([{
          game_id: selectedGameForModal.id,
          week_id: selectedWeekForWinner.id,
          date: newSaleData.date,
          tickets_sold: newSaleData.tickets_sold,
          ticket_price: newSaleData.ticket_price,
          amount_collected: newSaleData.tickets_sold * newSaleData.ticket_price,
          organization_total: 0,
          jackpot_total: 0,
          weekly_payout_amount: 0,
          ending_jackpot_total: 0,
        }]);

      if (error) throw error;
      if (data) {
        setTicketSales(prev => [...prev, ...data]);
        setTicketSalesModalOpen(false);
        setNewSaleData({ date: getTodayDateString(), tickets_sold: 0, ticket_price: 2 });
        toast({
          title: "Success",
          description: "Ticket sale added",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error adding ticket sale:', error);
      toast({
        title: "Error",
        description: "Failed to add ticket sale",
        variant: "destructive",
      });
    }
  };

  const updateSale = async () => {
    if (!editingSaleId) return;

    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .update({
          date: editSaleData.date,
          tickets_sold: editSaleData.tickets_sold,
          ticket_price: editSaleData.ticket_price,
          amount_collected: editSaleData.tickets_sold * editSaleData.ticket_price,
        })
        .eq('id', editingSaleId);

      if (error) throw error;
      if (data) {
        setTicketSales(prev => prev.map(sale => sale.id === editingSaleId ? { ...sale, ...editSaleData, amount_collected: editSaleData.tickets_sold * editSaleData.ticket_price } : sale));
        setEditSaleModalOpen(false);
        setEditingSaleId(null);
        toast({
          title: "Success",
          description: "Ticket sale updated",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error updating ticket sale:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket sale",
        variant: "destructive",
      });
    }
  };

  const deleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
      setTicketSales(prev => prev.filter(sale => sale.id !== saleId));
      toast({
        title: "Success",
        description: "Ticket sale deleted",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deleting ticket sale:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticket sale",
        variant: "destructive",
      });
    }
  };

  const handleCardSelection = (card: string) => {
    // Example payout calculation based on card selected
    // This can be replaced with actual logic
    let payout = 0;
    if (card.includes('Ace')) payout = 1000;
    else if (card.includes('King')) payout = 500;
    else if (card.includes('Queen')) payout = 300;
    else payout = 100;

    setWinnerData(prev => ({ ...prev, payout_amount: payout }));
  };

  const submitWinner = async () => {
    if (!selectedWeekForWinner) return;
    if (!winnerData.winner_name || !winnerData.slot_chosen || !winnerData.card_selected) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required winner details",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('weeks')
        .update({
          winner_name: winnerData.winner_name,
          slot_chosen: winnerData.slot_chosen,
          card_selected: winnerData.card_selected,
          weekly_payout: winnerData.payout_amount,
          winner_present: winnerData.winner_present,
          authorized_signature_name: winnerData.authorized_signature_name,
        })
        .eq('id', selectedWeekForWinner.id);

      if (error) throw error;
      if (data) {
        setWeeks(prev => prev.map(week => week.id === selectedWeekForWinner.id ? { ...week, ...winnerData } : week));
        setWinnerModalOpen(false);
        toast({
          title: "Success",
          description: "Winner details submitted",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error submitting winner:', error);
      toast({
        title: "Error",
        description: "Failed to submit winner details",
        variant: "destructive",
      });
    }
  };

  const createGame = async () => {
    if (!newGameData.name || !newGameData.start_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required game details",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{
          name: newGameData.name,
          start_date: newGameData.start_date,
          ticket_price: newGameData.ticket_price || 2,
          organization_percentage: newGameData.organization_percentage || 40,
          jackpot_percentage: newGameData.jackpot_percentage || 60,
          minimum_starting_jackpot: newGameData.minimum_starting_jackpot || 500,
        }]);

      if (error) throw error;
      if (data) {
        setGames(prev => [...prev, ...data]);
        setCreateGameModalOpen(false);
        setNewGameData({
          name: '',
          start_date: getTodayDateString(),
          ticket_price: 2,
          organization_percentage: 40,
          jackpot_percentage: 60,
          minimum_starting_jackpot: 500,
        });
        toast({
          title: "Success",
          description: "Game created",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive",
      });
    }
  };

  const calculateCarryoverJackpot = () => {
    if (games.length === 0) return 0;
    const lastGame = games.reduce((prev, current) => (prev.start_date > current.start_date ? prev : current));
    return lastGame.minimum_starting_jackpot || 0;
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6 p-6 bg-[#F7F8FC] min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#1F4E4A]">Dashboard</h1>
        <Button onClick={() => setCreateGameModalOpen(true)} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90 text-white">
          <Plus className="h-4 w-4 mr-1" />
          New Game
        </Button>
      </div>

      <div className="space-y-4">
        {games.map((game) => (
          <Card key={game.id} className="bg-white border-[#1F4E4A]/10 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#1F4E4A] to-[#132E2C] text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Collapsible 
                    open={expandedGames.includes(game.id)} 
                    onOpenChange={() => toggleGameExpansion(game.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-1">
                        {expandedGames.includes(game.id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                  <div>
                    <CardTitle className="text-xl font-bold">{game.name}</CardTitle>
                    <CardDescription className="text-white/80 text-sm">
                      Game #{game.game_number} • Started: {formatDateStringForDisplay(game.start_date)}
                      {game.end_date && ` • Ended: ${formatDateStringForDisplay(game.end_date)}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={game.end_date ? "secondary" : "default"} className="bg-[#A1E96C] text-[#132E2C] hover:bg-[#A1E96C]/80">
                    {game.end_date ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                    {game.end_date ? 'Completed' : 'Active'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGameForModal(game);
                      setGameDetailsModalOpen(true);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(game.total_sales)}</div>
                  <div className="text-xs text-white/80">Total Sales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(game.total_payouts)}</div>
                  <div className="text-xs text-white/80">Total Payouts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(game.total_expenses + game.total_donations)}</div>
                  <div className="text-xs text-white/80">Total Expenses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(game.organization_net_profit)}</div>
                  <div className="text-xs text-white/80">Net Profit</div>
                </div>
              </div>
            </CardHeader>

            <Collapsible 
              open={expandedGames.includes(game.id)} 
              onOpenChange={() => toggleGameExpansion(game.id)}
            >
              <CollapsibleContent>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-[#1F4E4A]">Weeks</h3>
                    {!game.end_date && (
                      <Button 
                        onClick={() => createWeek(game.id)} 
                        className="bg-[#A1E96C] hover:bg-[#A1E96C]/80 text-[#132E2C]"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Week
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {weeks
                      .filter(week => week.game_id === game.id)
                      .sort((a, b) => a.week_number - b.week_number)
                      .map((week) => {
                        const weekSales = ticketSales.filter(sale => sale.week_id === week.id);
                        const totalSales = weekSales.reduce((sum, sale) => sum + sale.amount_collected, 0);
                        const totalTickets = weekSales.reduce((sum, sale) => sum + sale.tickets_sold, 0);
                        const orgProfit = weekSales.reduce((sum, sale) => sum + sale.organization_total, 0) - 
                                        expenses.filter(exp => exp.game_id === game.id).reduce((sum, exp) => sum + exp.amount, 0) / weeks.filter(w => w.game_id === game.id).length;
                        const jackpotTotal = weekSales.reduce((sum, sale) => sum + sale.ending_jackpot_total, 0);

                        return (
                          <Card key={week.id} className="border border-[#1F4E4A]/20">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Collapsible 
                                  open={expandedWeeks.includes(week.id)} 
                                  onOpenChange={() => toggleWeekExpansion(week.id)}
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-[#1F4E4A] hover:bg-[#1F4E4A]/10 p-1">
                                      {expandedWeeks.includes(week.id) ? 
                                        <ChevronDown className="h-4 w-4" /> : 
                                        <ChevronRight className="h-4 w-4" />
                                      }
                                    </Button>
                                  </CollapsibleTrigger>
                                </Collapsible>
                                <div className="flex-1 ml-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-[#1F4E4A]">
                                      Week {week.week_number} • {formatDateStringShort(week.start_date)} - {formatDateStringShort(week.end_date)}
                                    </h4>
                                    {week.winner_name && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setPayoutSlipData({
                                            winnerName: week.winner_name,
                                            slotChosen: week.slot_chosen,
                                            cardSelected: week.card_selected,
                                            payoutAmount: week.weekly_payout,
                                            date: week.end_date,
                                            gameId: game.id,
                                            gameName: game.name,
                                            weekNumber: week.week_number,
                                            weekId: week.id,
                                            weekStartDate: week.start_date,
                                            weekEndDate: week.end_date,
                                            winnerPresent: week.winner_present ?? true,
                                            authorizedSignatureName: week.authorized_signature_name
                                          });
                                          setPayoutSlipModalOpen(true);
                                        }}
                                        className="border-[#1F4E4A]/30 text-[#1F4E4A] hover:bg-[#1F4E4A]/5"
                                      >
                                        <Receipt className="h-4 w-4 mr-1" />
                                        Payout Slip
                                      </Button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 mt-2 text-sm">
                                    <div className="text-center">
                                      <div className="font-semibold text-[#1F4E4A]">{totalTickets}</div>
                                      <div className="text-xs text-[#132E2C]/60">Tickets Sold</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-[#1F4E4A]">{formatCurrency(totalSales)}</div>
                                      <div className="text-xs text-[#132E2C]/60">Ticket Sales</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-green-600">{formatCurrency(orgProfit)}</div>
                                      <div className="text-xs text-[#132E2C]/60">Org Net Profit</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-blue-600">{formatCurrency(jackpotTotal)}</div>
                                      <div className="text-xs text-[#132E2C]/60">Jackpot Total</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-[#1F4E4A]">{week.winner_name || 'TBD'}</div>
                                      <div className="text-xs text-[#132E2C]/60">Winner Name</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-[#1F4E4A]">{week.slot_chosen || 'TBD'}</div>
                                      <div className="text-xs text-[#132E2C]/60">Slot Selected</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-[#1F4E4A]">{week.card_selected || 'TBD'}</div>
                                      <div className="text-xs text-[#132E2C]/60">Card Selected</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-purple-600">{formatCurrency(week.weekly_payout)}</div>
                                      <div className="text-xs text-[#132E2C]/60">Payout Amount</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-[#1F4E4A]">
                                        {week.winner_present === null ? 'TBD' : (week.winner_present ? 'Yes' : 'No')}
                                      </div>
                                      <div className="text-xs text-[#132E2C]/60">Present</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            <Collapsible 
                              open={expandedWeeks.includes(week.id)} 
                              onOpenChange={() => toggleWeekExpansion(week.id)}
                            >
                              <CollapsibleContent>
                                <CardContent className="pt-0">
                                  <div className="flex justify-between items-center mb-4">
                                    <h5 className="font-medium text-[#1F4E4A]">Daily Sales</h5>
                                    {weekSales.length < 7 && !game.end_date && (
                                      <Button 
                                        onClick={() => {
                                          setSelectedGameForModal(game);
                                          setSelectedWeekForWinner(week);
                                          setTicketSalesModalOpen(true);
                                        }}
                                        size="sm"
                                        className="bg-[#A1E96C] hover:bg-[#A1E96C]/80 text-[#132E2C]"
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Day
                                      </Button>
                                    )}
                                  </div>

                                  {weekSales.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full table-auto">
                                        <thead>
                                          <tr className="border-b border-[#1F4E4A]/20">
                                            <th className="text-left p-2 font-semibold text-[#132E2C]">Date</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Tickets Sold</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Price</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Amount</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Org Total</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Jackpot Total</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Payout</th>
                                            <th className="text-right p-2 font-semibold text-[#132E2C]">Ending Jackpot</th>
                                            <th className="text-center p-2 font-semibold text-[#132E2C]">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {weekSales
                                            .sort((a, b) => a.date.localeCompare(b.date))
                                            .map((sale) => (
                                              <tr key={sale.id} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/50">
                                                <td className="p-2 text-[#1F4E4A]">{formatDateStringShort(sale.date)}</td>
                                                <td className="p-2 text-right text-[#1F4E4A]">{sale.tickets_sold}</td>
                                                <td className="p-2 text-right text-[#1F4E4A]">{formatCurrency(sale.ticket_price)}</td>
                                                <td className="p-2 text-right font-semibold text-[#1F4E4A]">{formatCurrency(sale.amount_collected)}</td>
                                                <td className="p-2 text-right text-green-600">{formatCurrency(sale.organization_total)}</td>
                                                <td className="p-2 text-right text-blue-600">{formatCurrency(sale.jackpot_total)}</td>
                                                <td className="p-2 text-right text-purple-600">{formatCurrency(sale.weekly_payout_amount)}</td>
                                                <td className="p-2 text-right font-semibold text-blue-600">{formatCurrency(sale.ending_jackpot_total)}</td>
                                                <td className="p-2 text-center">
                                                  <div className="flex justify-center space-x-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        setEditingSaleId(sale.id);
                                                        setEditSaleData({
                                                          date: sale.date,
                                                          tickets_sold: sale.tickets_sold,
                                                          ticket_price: sale.ticket_price
                                                        });
                                                        setEditSaleModalOpen(true);
                                                      }}
                                                      className="h-8 w-8 p-0 text-[#1F4E4A] hover:bg-[#1F4E4A]/10"
                                                    >
                                                      <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => deleteSale(sale.id)}
                                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-[#132E2C]/60 text-center py-4">No sales recorded for this week</p>
                                  )}

                                  {weekSales.length === 7 && !week.winner_name && !game.end_date && (
                                    <div className="mt-4 p-4 bg-[#A1E96C]/10 border border-[#A1E96C]/30 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h6 className="font-semibold text-[#132E2C]">Week Complete - Enter Winner Details</h6>
                                          <p className="text-sm text-[#132E2C]/70">This week has 7 days of sales. Please enter the winner information.</p>
                                        </div>
                                        <Button
                                          onClick={() => {
                                            setSelectedWeekForWinner(week);
                                            setWinnerModalOpen(true);
                                          }}
                                          className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90 text-white"
                                        >
                                          <Trophy className="h-4 w-4 mr-1" />
                                          Enter Winner
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        );
                      })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Dialog open={ticketSalesModalOpen} onOpenChange={setTicketSalesModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1F4E4A]">Add Daily Sales</DialogTitle>
            <DialogDescription>
              Enter the ticket sales for a specific date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sale-date">Date</Label>
              <Input
                id="sale-date"
                type="date"
                value={newSaleData.date}
                onChange={(e) => setNewSaleData(prev => ({ ...prev, date: e.target.value }))}
                max={getTodayDateString()}
              />
            </div>
            <div>
              <Label htmlFor="tickets-sold">Tickets Sold</Label>
              <Input
                id="tickets-sold"
                type="number"
                min="0"
                value={newSaleData.tickets_sold}
                onChange={(e) => setNewSaleData(prev => ({ ...prev, tickets_sold: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="ticket-price">Ticket Price ($)</Label>
              <Input
                id="ticket-price"
                type="number"
                min="0"
                step="0.01"
                value={newSaleData.ticket_price}
                onChange={(e) => setNewSaleData(prev => ({ ...prev, ticket_price: parseFloat(e.target.value) || 0 }))}
                placeholder="2.00"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setTicketSalesModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addTicketSale} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90">
              Add Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editSaleModalOpen} onOpenChange={setEditSaleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1F4E4A]">Edit Daily Sales</DialogTitle>
            <DialogDescription>
              Update the ticket sales information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-sale-date">Date</Label>
              <Input
                id="edit-sale-date"
                type="date"
                value={editSaleData.date}
                onChange={(e) => setEditSaleData(prev => ({ ...prev, date: e.target.value }))}
                max={getTodayDateString()}
              />
            </div>
            <div>
              <Label htmlFor="edit-tickets-sold">Tickets Sold</Label>
              <Input
                id="edit-tickets-sold"
                type="number"
                min="0"
                value={editSaleData.tickets_sold}
                onChange={(e) => setEditSaleData(prev => ({ ...prev, tickets_sold: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="edit-ticket-price">Ticket Price ($)</Label>
              <Input
                id="edit-ticket-price"
                type="number"
                min="0"
                step="0.01"
                value={editSaleData.ticket_price}
                onChange={(e) => setEditSaleData(prev => ({ ...prev, ticket_price: parseFloat(e.target.value) || 0 }))}
                placeholder="2.00"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditSaleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateSale} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90">
              Update Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={winnerModalOpen} onOpenChange={setWinnerModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1F4E4A]">Enter Winner Details</DialogTitle>
            <DialogDescription>
              Week {selectedWeekForWinner?.week_number} • Drawing Date: {selectedWeekForWinner ? formatDateStringForDisplay(selectedWeekForWinner.end_date) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="winner-name">Winner Name *</Label>
              <Input
                id="winner-name"
                value={winnerData.winner_name}
                onChange={(e) => setWinnerData(prev => ({ ...prev, winner_name: e.target.value }))}
                placeholder="Enter winner's full name"
              />
            </div>
            <div>
              <Label htmlFor="slot-chosen">Slot Chosen (1-54) *</Label>
              <Input
                id="slot-chosen"
                type="number"
                min="1"
                max="54"
                value={winnerData.slot_chosen}
                onChange={(e) => setWinnerData(prev => ({ ...prev, slot_chosen: parseInt(e.target.value) || 0 }))}
                placeholder="Slot number (1-54)"
              />
            </div>
            <div>
              <Label htmlFor="card-selected">Card Selected *</Label>
              <Select 
                value={winnerData.card_selected} 
                onValueChange={(value) => {
                  setWinnerData(prev => ({ ...prev, card_selected: value }));
                  handleCardSelection(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the card that was drawn" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {cardOptions.map((card) => (
                    <SelectItem key={card} value={card}>
                      {card}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payout-amount">Payout Amount ($)</Label>
              <Input
                id="payout-amount"
                type="number"
                min="0"
                step="0.01"
                value={winnerData.payout_amount}
                onChange={(e) => setWinnerData(prev => ({ ...prev, payout_amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Automatically calculated based on card"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="winner-present"
                checked={winnerData.winner_present}
                onCheckedChange={(checked) => setWinnerData(prev => ({ ...prev, winner_present: !!checked }))}
              />
              <Label htmlFor="winner-present">Winner was present at drawing</Label>
            </div>
            <div>
              <Label htmlFor="authorized-signature">Authorized Signature Name</Label>
              <Input
                id="authorized-signature"
                value={winnerData.authorized_signature_name}
                onChange={(e) => setWinnerData(prev => ({ ...prev, authorized_signature_name: e.target.value }))}
                placeholder="Name of person authorizing payout"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setWinnerModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitWinner} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90">
              Submit Winner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createGameModalOpen} onOpenChange={setCreateGameModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1F4E4A]">Create New Game</DialogTitle>
            <DialogDescription>
              Set up a new Queen of Hearts game
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="game-name">Game Name *</Label>
              <Input
                id="game-name"
                value={newGameData.name}
                onChange={(e) => setNewGameData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Game 1, Spring 2024"
              />
            </div>
            <div>
              <Label htmlFor="game-start-date">Start Date *</Label>
              <Input
                id="game-start-date"
                type="date"
                value={newGameData.start_date}
                onChange={(e) => setNewGameData(prev => ({ ...prev, start_date: e.target.value }))}
                max={getTodayDateString()}
              />
            </div>
            <div>
              <Label htmlFor="game-ticket-price">Ticket Price ($) *</Label>
              <Input
                id="game-ticket-price"
                type="number"
                min="0"
                step="0.01"
                value={newGameData.ticket_price}
                onChange={(e) => setNewGameData(prev => ({ ...prev, ticket_price: parseFloat(e.target.value) || 0 }))}
                placeholder="2.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-percentage">Organization % *</Label>
                <Input
                  id="org-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={newGameData.organization_percentage}
                  onChange={(e) => setNewGameData(prev => ({ ...prev, organization_percentage: parseFloat(e.target.value) || 0 }))}
                  placeholder="40"
                />
              </div>
              <div>
                <Label htmlFor="jackpot-percentage">Jackpot % *</Label>
                <Input
                  id="jackpot-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={newGameData.jackpot_percentage}
                  onChange={(e) => setNewGameData(prev => ({ ...prev, jackpot_percentage: parseFloat(e.target.value) || 0 }))}
                  placeholder="60"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="minimum-jackpot">Minimum Starting Jackpot ($)</Label>
              <Input
                id="minimum-jackpot"
                type="number"
                min="0"
                step="0.01"
                value={newGameData.minimum_starting_jackpot}
                onChange={(e) => setNewGameData(prev => ({ ...prev, minimum_starting_jackpot: parseFloat(e.target.value) || 0 }))}
                placeholder="500.00"
              />
            </div>
            {games.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Carryover Jackpot:</strong> {formatCurrency(calculateCarryoverJackpot())}
                  <br />
                  <span className="text-xs text-blue-600 mt-1 block">
                    This amount will be automatically added from the previous game.
                  </span>
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setCreateGameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createGame} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90">
              Create Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GameDetailsModal 
        game={selectedGameForModal}
        open={gameDetailsModalOpen}
        onOpenChange={setGameDetailsModalOpen}
        formatCurrency={formatCurrency}
      />

      <PayoutSlipModal 
        open={payoutSlipModalOpen}
        onOpenChange={setPayoutSlipModalOpen}
        winnerData={payoutSlipData}
      />
    </div>
  );
}
