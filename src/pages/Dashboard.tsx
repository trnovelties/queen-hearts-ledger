
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Calendar, DollarSign, Users, Trophy, Target } from "lucide-react";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { formatDateStringForDisplay, formatDateStringShort, formatDateStringForMediumDisplay } from "@/lib/dateUtils";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;

interface GameWithDetails extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [showGameForm, setShowGameForm] = useState(false);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch games with their weeks and ticket sales
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          weeks (*),
          ticket_sales (*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GameWithDetails[];
    },
    enabled: !!user?.id,
  });

  const createWeekMutation = useMutation({
    mutationFn: async ({ gameId, weekNumber }: { gameId: string; weekNumber: number }) => {
      const { data, error } = await supabase
        .from('weeks')
        .insert({
          game_id: gameId,
          week_number: weekNumber,
          start_date: formatDateStringShort(new Date().toISOString().split('T')[0]),
          end_date: formatDateStringShort(new Date().toISOString().split('T')[0]),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Week created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create week: ${error.message}`);
    },
  });

  const toggleGameExpansion = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  const toggleWeekExpansion = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  };

  const createWeek = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const weekNumber = game.weeks.length + 1;
    createWeekMutation.mutate({ gameId, weekNumber });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1F4E4A]">Game Dashboard</h1>
          <p className="text-[#132E2C]/70 mt-1">Manage your Queen of Hearts games</p>
        </div>
        <Button 
          onClick={() => setShowGameForm(true)}
          className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Game
        </Button>
      </div>

      {/* Game Form Modal */}
      {showGameForm && (
        <GameForm 
          onClose={() => setShowGameForm(false)}
          onSuccess={() => {
            setShowGameForm(false);
            queryClient.invalidateQueries({ queryKey: ['games'] });
          }}
        />
      )}

      {/* Games List */}
      <div className="space-y-4">
        {games.length === 0 ? (
          <Card className="border-[#1F4E4A]/20">
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-[#1F4E4A]/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#1F4E4A] mb-2">No Games Yet</h3>
              <p className="text-[#132E2C]/70 mb-4">Create your first Queen of Hearts game to get started</p>
              <Button 
                onClick={() => setShowGameForm(true)}
                className="bg-[#1F4E4A] hover:bg-[#132E2C] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          games.map((game) => (
            <Collapsible key={game.id}>
              <Card className="border-[#1F4E4A]/20 hover:border-[#1F4E4A]/40 transition-colors">
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleGameExpansion(game.id)}
                >
                  <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {expandedGames.has(game.id) ? (
                            <ChevronDown className="h-5 w-5 text-[#1F4E4A]" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-[#1F4E4A]" />
                          )}
                          <Target className="h-5 w-5 text-[#1F4E4A]" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-[#1F4E4A] font-inter">{game.name}</CardTitle>
                          <div className="text-sm text-[#132E2C]/70 mt-1">
                            Started: {formatDateStringForDisplay(game.start_date)}
                            {game.end_date && ` | Ended: ${formatDateStringForDisplay(game.end_date)}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-[#1F4E4A]">
                            {formatCurrency(game.total_sales)}
                          </div>
                          <div className="text-xs text-[#132E2C]/70">Total Sales</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(game.organization_net_profit)}
                          </div>
                          <div className="text-xs text-[#132E2C]/70">Net Profit</div>
                        </div>
                        <Badge 
                          variant={game.end_date ? "secondary" : "default"}
                          className={game.end_date ? 
                            "bg-gray-100 text-gray-800" : 
                            "bg-[#A1E96C]/20 text-[#132E2C] border-[#A1E96C]/30"
                          }
                        >
                          {game.end_date ? 'Completed' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Game Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F7F8FC] rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <DollarSign className="h-4 w-4 text-[#1F4E4A]" />
                        </div>
                        <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_sales)}</div>
                        <div className="text-xs text-[#132E2C]/70">Total Sales</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Target className="h-4 w-4 text-[#1F4E4A]" />
                        </div>
                        <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.total_payouts)}</div>
                        <div className="text-xs text-[#132E2C]/70">Distributions</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-lg font-bold text-green-600">{formatCurrency(game.organization_net_profit)}</div>
                        <div className="text-xs text-[#132E2C]/70">Net Profit</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Calendar className="h-4 w-4 text-[#1F4E4A]" />
                        </div>
                        <div className="text-lg font-bold text-[#1F4E4A]">{game.weeks.length}</div>
                        <div className="text-xs text-[#132E2C]/70">Weeks Played</div>
                      </div>
                    </div>

                    {/* Add Week Button */}
                    <div className="flex justify-start">
                      <Button 
                        onClick={() => createWeek(game.id)}
                        variant="outline"
                        className="border-[#1F4E4A]/30 text-[#1F4E4A] hover:bg-[#1F4E4A]/10"
                        disabled={createWeekMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Week
                      </Button>
                    </div>

                    {/* Weeks */}
                    <div className="space-y-3">
                      {game.weeks.map((week) => {
                        const weekTicketSales = game.ticket_sales.filter(ts => ts.week_id === week.id);
                        
                        return (
                          <Collapsible key={week.id}>
                            <Card className="border-[#1F4E4A]/10">
                              <CollapsibleTrigger
                                className="w-full"
                                onClick={() => toggleWeekExpansion(week.id)}
                              >
                                <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/30 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        {expandedWeeks.has(week.id) ? (
                                          <ChevronDown className="h-4 w-4 text-[#1F4E4A]" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-[#1F4E4A]" />
                                        )}
                                        <Calendar className="h-4 w-4 text-[#1F4E4A]" />
                                      </div>
                                      <div className="text-left">
                                        <CardTitle className="text-sm text-[#1F4E4A]">
                                          Week {week.week_number}
                                        </CardTitle>
                                        <div className="text-xs text-[#132E2C]/70 mt-1">
                                          {formatDateStringForMediumDisplay(week.start_date)} - {formatDateStringForMediumDisplay(week.end_date)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                      <div className="text-center">
                                        <div className="font-medium text-[#1F4E4A]">{week.weekly_tickets_sold}</div>
                                        <div className="text-[#132E2C]/70">Tickets</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-medium text-[#1F4E4A]">{formatCurrency(week.weekly_sales)}</div>
                                        <div className="text-[#132E2C]/70">Sales</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-medium text-green-600">{formatCurrency(week.weekly_payout)}</div>
                                        <div className="text-[#132E2C]/70">Payout</div>
                                      </div>
                                      {week.winner_name && (
                                        <div className="text-center">
                                          <div className="font-medium text-[#1F4E4A]">{week.winner_name}</div>
                                          <div className="text-[#132E2C]/70">Winner</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <CardContent className="pt-0">
                                  {/* Ticket Sales for this week */}
                                  <div className="space-y-2">
                                    {weekTicketSales.length > 0 && (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b border-[#1F4E4A]/20">
                                              <th className="text-left py-2 text-[#132E2C]">Date</th>
                                              <th className="text-center py-2 text-[#132E2C]">Tickets</th>
                                              <th className="text-right py-2 text-[#132E2C]">Amount</th>
                                              <th className="text-right py-2 text-[#132E2C]">Org Portion</th>
                                              <th className="text-right py-2 text-[#132E2C]">Jackpot</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {weekTicketSales.map((sale) => (
                                              <tr key={sale.id} className="border-b border-[#1F4E4A]/10">
                                                <td className="py-2 text-[#132E2C]/80">
                                                  {formatDateStringShort(sale.date)}
                                                </td>
                                                <td className="py-2 text-center text-[#1F4E4A] font-medium">
                                                  {sale.tickets_sold}
                                                </td>
                                                <td className="py-2 text-right text-[#1F4E4A] font-medium">
                                                  {formatCurrency(sale.amount_collected)}
                                                </td>
                                                <td className="py-2 text-right text-[#132E2C]/80">
                                                  {formatCurrency(sale.organization_total)}
                                                </td>
                                                <td className="py-2 text-right text-[#132E2C]/80">
                                                  {formatCurrency(sale.jackpot_total)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* Add Ticket Sales Row */}
                                    <TicketSalesRow 
                                      gameId={game.id}
                                      weekId={week.id}
                                      weekNumber={week.week_number}
                                      ticketSalesCount={weekTicketSales.length}
                                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['games'] })}
                                    />

                                    {/* Winner Form (shows after 7 days of ticket sales) */}
                                    {weekTicketSales.length >= 7 && !week.winner_name && (
                                      <WinnerForm 
                                        gameId={game.id}
                                        weekId={week.id}
                                        weekNumber={week.week_number}
                                        gameName={game.name}
                                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['games'] })}
                                      />
                                    )}

                                    {/* Winner Information (if winner exists) */}
                                    {week.winner_name && (
                                      <div className="mt-4 p-4 bg-[#A1E96C]/10 rounded-lg border border-[#A1E96C]/30">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Trophy className="h-4 w-4 text-[#1F4E4A]" />
                                          <span className="font-semibold text-[#1F4E4A]">Week {week.week_number} Winner</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                          <div>
                                            <span className="text-[#132E2C]/70">Winner:</span>
                                            <div className="font-medium text-[#1F4E4A]">{week.winner_name}</div>
                                          </div>
                                          <div>
                                            <span className="text-[#132E2C]/70">Slot:</span>
                                            <div className="font-medium text-[#1F4E4A]">#{week.slot_chosen}</div>
                                          </div>
                                          <div>
                                            <span className="text-[#132E2C]/70">Card:</span>
                                            <div className="font-medium text-[#1F4E4A]">{week.card_selected}</div>
                                          </div>
                                          <div>
                                            <span className="text-[#132E2C]/70">Payout:</span>
                                            <div className="font-medium text-green-600">{formatCurrency(week.weekly_payout)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
