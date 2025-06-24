import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { 
  ChevronDown, 
  ChevronRight, 
  Receipt, 
  DollarSign, 
  Users, 
  Calendar,
  Target,
  Banknote
} from "lucide-react";
import { formatDateStringForDisplay, formatDateStringForShortDisplay } from "@/lib/dateUtils";

type Game = Tables<"games">;
type Week = Tables<"weeks">;
type TicketSale = Tables<"ticket_sales">;
type Expense = Tables<"expenses">;

interface GameSummary extends Game {
  weeks: Week[];
  ticket_sales: TicketSale[];
  expenses: Expense[];
}

interface DetailedFinancialTableProps {
  games: GameSummary[];
  formatCurrency: (amount: number) => string;
}

export function DetailedFinancialTable({ games, formatCurrency }: DetailedFinancialTableProps) {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());

  const toggleGameExpansion = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  return (
    <div className="space-y-6">
      {games.map(game => (
        <Card key={game.id} className="bg-white border-[#1F4E4A]/10 overflow-hidden">
          <CardHeader className="cursor-pointer hover:bg-[#F7F8FC]/50 transition-colors" 
                     onClick={() => toggleGameExpansion(game.id)}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="p-1">
                  {expandedGames.has(game.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <div>
                  <CardTitle className="text-[#1F4E4A] font-inter flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {game.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Started: {formatDateStringForDisplay(game.start_date)}
                    {game.end_date && ` | Ended: ${formatDateStringForDisplay(game.end_date)}`}
                  </CardDescription>
                </div>
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
          </CardHeader>

          {expandedGames.has(game.id) && (
            <CardContent className="space-y-6 pt-0">
              {/* Game Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-[#F7F8FC] rounded-lg">
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
                    <Receipt className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-lg font-bold text-red-600">{formatCurrency(game.total_expenses)}</div>
                  <div className="text-xs text-[#132E2C]/70">Expenses</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Banknote className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-lg font-bold text-purple-600">{formatCurrency(game.total_donations)}</div>
                  <div className="text-xs text-[#132E2C]/70">Donations</div>
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
                  <div className="text-lg font-bold text-[#1F4E4A]">{formatCurrency(game.carryover_jackpot)}</div>
                  <div className="text-xs text-[#132E2C]/70">Carryover</div>
                </div>
              </div>

              {/* Weekly Performance Table */}
              {game.weeks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-[#132E2C] flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Weekly Performance
                  </h4>
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
                          <TableHead className="font-semibold text-[#132E2C]">Distribution</TableHead>
                          <TableHead className="font-semibold text-[#132E2C]">Present</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {game.weeks.map(week => (
                          <TableRow key={week.id} className="border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                            <TableCell className="font-medium text-[#1F4E4A]">
                              Week {week.week_number}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDateStringForShortDisplay(week.start_date)} - {formatDateStringForShortDisplay(week.end_date)}
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
                </div>
              )}

              {/* Expenses & Donations Table */}
              {game.expenses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-[#132E2C] flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Expenses & Donations
                  </h4>
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
                        {game.expenses.map(expense => (
                          <TableRow key={expense.id} className="border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                            <TableCell className="font-medium text-[#132E2C]">
                              {formatDateStringForDisplay(expense.date)}
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
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
