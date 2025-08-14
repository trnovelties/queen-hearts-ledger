import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { formatDateStringForDisplay } from "@/lib/dateUtils";

interface GameSummary {
  id: string;
  name: string;
  start_date: string;
  end_date?: string;
  weeks: any[];
  expenses: any[];
  total_expenses: number;
  total_donations: number;
}

interface ExpenseDonationSummaryProps {
  games: GameSummary[];
  formatCurrency: (amount: number) => string;
}

export function ExpenseDonationSummary({ games, formatCurrency }: ExpenseDonationSummaryProps) {
  const [selectedGame, setSelectedGame] = useState<string>("all");

  const getFilteredData = () => {
    if (selectedGame === "all") {
      return games;
    }
    return games.filter(game => game.id === selectedGame);
  };

  const filteredGames = getFilteredData();

  const getTotalExpenses = () => {
    return filteredGames.reduce((sum, game) => sum + game.total_expenses, 0);
  };

  const getTotalDonations = () => {
    return filteredGames.reduce((sum, game) => sum + game.total_donations, 0);
  };

  const getExpensesByWeek = (game: GameSummary) => {
    const expensesByWeek: { [key: string]: any[] } = {};
    
    // Group expenses by week based on date
    game.expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      
      // Find which week this expense belongs to
      const week = game.weeks.find(w => {
        const weekStart = new Date(w.start_date);
        const weekEnd = new Date(w.end_date);
        return expenseDate >= weekStart && expenseDate <= weekEnd;
      });
      
      const weekKey = week ? `Week ${week.week_number}` : 'Other';
      
      if (!expensesByWeek[weekKey]) {
        expensesByWeek[weekKey] = [];
      }
      expensesByWeek[weekKey].push(expense);
    });
    
    return expensesByWeek;
  };

  const getAllExpensesAcrossGames = () => {
    const allExpenses: any[] = [];
    games.forEach(game => {
      game.expenses.forEach(expense => {
        allExpenses.push({
          ...expense,
          gameName: game.name,
          gameId: game.id
        });
      });
    });
    return allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <Card className="bg-white border-[#1F4E4A]/10 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[#1F4E4A] font-inter">Expense-Donation Summary</CardTitle>
        <CardDescription>Detailed breakdown of expenses and donations by game and week</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Game Filter */}
        <div className="space-y-2">
          <Label htmlFor="expenseGameFilter" className="text-sm font-semibold text-[#132E2C]">Filter by Game</Label>
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger className="bg-white border-[#1F4E4A]/20">
              <SelectValue placeholder="All Games" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#1F4E4A]/20 z-50">
              <SelectItem value="all">All Games</SelectItem>
              {games.map((game) => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-[#1F4E4A]/10">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(getTotalExpenses())}</div>
                <div className="text-sm text-[#132E2C]/60">Total Expenses</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#1F4E4A]/10">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(getTotalDonations())}</div>
                <div className="text-sm text-[#132E2C]/60">Total Donations</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content based on selection */}
        {selectedGame === "all" ? (
          // All Games - Overall Details
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-[#1F4E4A]/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-[#1F4E4A]">All Games Expense & Donation Details</h4>
                      <p className="text-sm text-[#132E2C]/60">
                        {getAllExpensesAcrossGames().length} total transactions across all games
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[#132E2C]/60" />
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 p-4 bg-[#F7F8FC] rounded-lg">
              <div className="bg-white rounded-lg shadow-sm p-4">
                {getAllExpensesAcrossGames().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1F4E4A]/20">
                          <th className="text-left p-2 font-semibold text-[#132E2C]">Game</th>
                          <th className="text-left p-2 font-semibold text-[#132E2C]">Date</th>
                          <th className="text-left p-2 font-semibold text-[#132E2C]">Type</th>
                          <th className="text-left p-2 font-semibold text-[#132E2C]">Amount</th>
                          <th className="text-left p-2 font-semibold text-[#132E2C]">Memo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getAllExpensesAcrossGames().map((expense: any) => (
                          <tr key={`${expense.gameId}-${expense.id}`} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                            <td className="p-2 font-medium text-[#1F4E4A]">{expense.gameName}</td>
                            <td className="p-2 text-[#132E2C]">{formatDateStringForDisplay(expense.date)}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                expense.is_donation ? 
                                "bg-purple-100 text-purple-800" : 
                                "bg-red-100 text-red-800"
                              }`}>
                                {expense.is_donation ? 'Donation' : 'Expense'}
                              </span>
                            </td>
                            <td className="p-2 font-medium text-[#1F4E4A]">{formatCurrency(expense.amount)}</td>
                            <td className="p-2 text-[#132E2C]/80">{expense.memo || 'No memo'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[#132E2C]/60 text-center">No expenses or donations recorded across all games</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          // Individual Game Breakdown
          <div className="space-y-4">
            {filteredGames.map((game) => (
              <Collapsible key={game.id} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow border-[#1F4E4A]/20">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#1F4E4A]">{game.name}</h3>
                            <ChevronDown className="h-4 w-4 text-[#132E2C]/60" />
                          </div>
                          <div className="text-sm text-[#132E2C]/60">
                            <span>Start: {formatDateStringForDisplay(game.start_date)}</span>
                            {game.end_date && (
                              <span> | End: {formatDateStringForDisplay(game.end_date)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center w-full sm:w-auto">
                          <div>
                            <div className="text-xs text-[#132E2C]/60">Game Expenses</div>
                            <div className="font-bold text-red-600">{formatCurrency(game.total_expenses)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#132E2C]/60">Game Donations</div>
                            <div className="font-bold text-purple-600">{formatCurrency(game.total_donations)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 p-4 bg-[#F7F8FC] rounded-lg">
                  {/* Expense Details Table */}
                  {game.expenses.length > 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h4 className="text-sm font-semibold mb-3 text-[#132E2C]">Expense & Donation Details</h4>
                      
                      {/* Group expenses by week */}
                      {Object.entries(getExpensesByWeek(game)).map(([weekKey, expenses]) => (
                        <div key={weekKey} className="mb-4">
                          <h5 className="text-sm font-medium text-[#1F4E4A] mb-2">{weekKey}</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[#1F4E4A]/20">
                                  <th className="text-left p-2 font-semibold text-[#132E2C]">Date</th>
                                  <th className="text-left p-2 font-semibold text-[#132E2C]">Type</th>
                                  <th className="text-left p-2 font-semibold text-[#132E2C]">Amount</th>
                                  <th className="text-left p-2 font-semibold text-[#132E2C]">Memo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expenses.map((expense: any) => (
                                  <tr key={expense.id} className="border-b border-[#1F4E4A]/10 hover:bg-[#F7F8FC]/30">
                                    <td className="p-2 text-[#132E2C]">{formatDateStringForDisplay(expense.date)}</td>
                                    <td className="p-2">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        expense.is_donation ? 
                                        "bg-purple-100 text-purple-800" : 
                                        "bg-red-100 text-red-800"
                                      }`}>
                                        {expense.is_donation ? 'Donation' : 'Expense'}
                                      </span>
                                    </td>
                                    <td className="p-2 font-medium text-[#1F4E4A]">{formatCurrency(expense.amount)}</td>
                                    <td className="p-2 text-[#132E2C]/80">{expense.memo || 'No memo'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Week Summary */}
                          <div className="mt-2 p-2 bg-[#F7F8FC] rounded">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#132E2C]/60">{weekKey} Expenses:</span>
                              <span className="font-medium text-red-600">
                                {formatCurrency(expenses.filter(e => !e.is_donation).reduce((sum, e) => sum + e.amount, 0))}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#132E2C]/60">{weekKey} Donations:</span>
                              <span className="font-medium text-purple-600">
                                {formatCurrency(expenses.filter(e => e.is_donation).reduce((sum, e) => sum + e.amount, 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <p className="text-[#132E2C]/60 text-center">No expenses or donations recorded for this game</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {selectedGame !== "all" && filteredGames.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#132E2C]/60">No games found for the selected filter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}