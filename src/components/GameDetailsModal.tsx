
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Target,
  Receipt,
  TrendingUp,
  Clock,
  Award
} from "lucide-react";

interface GameDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: any;
}

export function GameDetailsModal({ open, onOpenChange, game }: GameDetailsModalProps) {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [ticketSales, setTicketSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && game?.id) {
      fetchGameDetails();
    }
  }, [open, game?.id]);

  const fetchGameDetails = async () => {
    try {
      setIsLoading(true);

      // Fetch weeks
      const { data: weeksData, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', game.id)
        .order('week_number', { ascending: true });

      if (weeksError) throw weeksError;

      // Fetch ticket sales
      const { data: ticketSalesData, error: ticketSalesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', game.id)
        .order('date', { ascending: true });

      if (ticketSalesError) throw ticketSalesError;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', game.id)
        .order('date', { ascending: true });

      if (expensesError) throw expensesError;

      setWeeks(weeksData || []);
      setTicketSales(ticketSalesData || []);
      setExpenses(expensesData || []);
    } catch (error) {
      console.error('Error fetching game details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch game details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getGameStatus = (game: any) => {
    if (game.end_date) {
      return { status: 'Completed', variant: 'default' as const };
    }
    return { status: 'Active', variant: 'destructive' as const };
  };

  if (!game) return null;

  const gameStatus = getGameStatus(game);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-[#1F4E4A] flex items-center gap-2">
                <Target className="h-6 w-6" />
                {game.name}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Game #{game.game_number} | Started: {format(new Date(game.start_date), 'MMM d, yyyy')}
                {game.end_date && ` | Ended: ${format(new Date(game.end_date), 'MMM d, yyyy')}`}
              </DialogDescription>
            </div>
            <Badge variant={gameStatus.variant}>{gameStatus.status}</Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="text-gray-600">Loading game details...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Game Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-[#F7F8FC] border-[#1F4E4A]/10">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="h-5 w-5 text-[#1F4E4A]" />
                  </div>
                  <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                  <div className="text-xs text-[#132E2C]/70">Total Sales</div>
                </CardContent>
              </Card>

              <Card className="bg-[#F7F8FC] border-[#1F4E4A]/10">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="h-5 w-5 text-[#1F4E4A]" />
                  </div>
                  <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_payouts)}</div>
                  <div className="text-xs text-[#132E2C]/70">Total Payouts</div>
                </CardContent>
              </Card>

              <Card className="bg-[#F7F8FC] border-[#1F4E4A]/10">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-lg font-bold text-red-600">{formatCurrency(game.total_expenses)}</div>
                  <div className="text-xs text-[#132E2C]/70">Expenses</div>
                </CardContent>
              </Card>

              <Card className="bg-[#F7F8FC] border-[#1F4E4A]/10">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</div>
                  <div className="text-xs text-[#132E2C]/70">Net Profit</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Data Tabs */}
            <Tabs defaultValue="weeks" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="weeks" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Weeks ({weeks.length})
                </TabsTrigger>
                <TabsTrigger value="sales" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ticket Sales ({ticketSales.length})
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Expenses ({expenses.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="weeks" className="space-y-4">
                {weeks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#1F4E4A]/20">
                          <TableHead className="font-semibold text-[#132E2C]">Week</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Period</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Tickets Sold</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Sales</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Winner</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Card</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Payout</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Present</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weeks.map(week => (
                          <TableRow key={week.id} className="border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                            <TableCell className="font-medium text-[#1F4E4A]">
                              Week {week.week_number}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(week.start_date), 'MM/dd')} - {format(new Date(week.end_date), 'MM/dd')}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {week.weekly_tickets_sold.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium text-[#1F4E4A]">
                              {formatCurrency(week.weekly_sales)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {week.winner_name || <span className="text-[#132E2C]/50">No winner</span>}
                            </TableCell>
                            <TableCell>
                              {week.card_selected ? (
                                <Badge 
                                  variant={week.card_selected === "Queen of Hearts" ? "default" : "secondary"}
                                  className={week.card_selected === "Queen of Hearts" ? 
                                    "bg-[#A1E96C]/20 text-[#132E2C] border-[#A1E96C]/30" : 
                                    "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {week.card_selected}
                                </Badge>
                              ) : (
                                <span className="text-[#132E2C]/50">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-[#1F4E4A]">
                              {formatCurrency(week.weekly_payout)}
                            </TableCell>
                            <TableCell>
                              {week.winner_present !== null ? (
                                <Badge 
                                  variant={week.winner_present ? "default" : "secondary"}
                                  className={week.winner_present ? 
                                    "bg-green-100 text-green-800" : 
                                    "bg-red-100 text-red-800"
                                  }
                                >
                                  {week.winner_present ? 'Yes' : 'No'}
                                </Badge>
                              ) : (
                                <span className="text-[#132E2C]/50">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#132E2C]/60">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-[#132E2C]/30" />
                    <p>No weeks found for this game</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sales" className="space-y-4">
                {ticketSales.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#1F4E4A]/20">
                          <TableHead className="font-semibold text-[#132E2C]">Date</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Tickets Sold</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Ticket Price</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Amount Collected</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Organization Total</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Jackpot Total</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Ending Jackpot</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketSales.map(sale => (
                          <TableRow key={sale.id} className="border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                            <TableCell className="font-medium text-[#132E2C]">
                              {format(new Date(sale.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {sale.tickets_sold.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium text-[#1F4E4A]">
                              {formatCurrency(sale.ticket_price)}
                            </TableCell>
                            <TableCell className="font-medium text-[#1F4E4A]">
                              {formatCurrency(sale.amount_collected)}
                            </TableCell>
                            <TableCell className="font-medium text-purple-600">
                              {formatCurrency(sale.organization_total)}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(sale.jackpot_total)}
                            </TableCell>
                            <TableCell className="font-medium text-[#1F4E4A]">
                              {formatCurrency(sale.ending_jackpot_total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#132E2C]/60">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-[#132E2C]/30" />
                    <p>No ticket sales found for this game</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                {expenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#1F4E4A]/20">
                          <TableHead className="font-semibold text-[#132E2C]">Date</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Type</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Amount</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map(expense => (
                          <TableRow key={expense.id} className="border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                            <TableCell className="font-medium text-[#132E2C]">
                              {format(new Date(expense.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={expense.is_donation ? "default" : "secondary"}
                                className={expense.is_donation ? 
                                  "bg-purple-100 text-purple-800" : 
                                  "bg-red-100 text-red-800"
                                }
                              >
                                {expense.is_donation ? 'Donation' : 'Expense'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`font-medium ${
                              expense.is_donation ? 'text-purple-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell className="text-[#132E2C]/80">
                              {expense.memo || <span className="text-[#132E2C]/50">No description</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#132E2C]/60">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-[#132E2C]/30" />
                    <p>No expenses found for this game</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
