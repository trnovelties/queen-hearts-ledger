
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Calendar, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GameForm } from "./GameForm";
import { ExpenseModal } from "./ExpenseModal";
import { useAuth } from "@/context/AuthContext";

export function GameManagement() {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGameForm, setShowGameForm] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGames();
    }
  }, [user]);

  const fetchGames = async () => {
    try {
      if (!user) {
        console.log('No user found, skipping games fetch');
        setIsLoading(false);
        return;
      }

      console.log('Fetching games for user:', user.id);

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('game_number', { ascending: false });

      if (error) {
        console.error('Error fetching games:', error);
        throw error;
      }

      console.log('Fetched games:', data);
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = (game: any) => {
    setSelectedGame(game);
    setShowExpenseModal(true);
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

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading games...</div>;
  }

  if (!user) {
    return <div className="flex justify-center p-4">Please log in to view games.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Queen of Hearts Games</h2>
          <p className="text-gray-600 mt-1">Manage your Queen of Hearts game sessions</p>
        </div>
        <Button 
          onClick={() => setShowGameForm(true)}
          className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>

      {games.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No games yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first Queen of Hearts game to get started
            </p>
            <Button 
              onClick={() => setShowGameForm(true)}
              className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Game
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const gameStatus = getGameStatus(game);
            return (
              <Card key={game.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{game.name}</CardTitle>
                      <CardDescription>Game #{game.game_number}</CardDescription>
                    </div>
                    <Badge variant={gameStatus.variant}>{gameStatus.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>Started: {new Date(game.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>Ticket: {formatCurrency(game.ticket_price)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium">{formatCurrency(game.total_sales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Payouts:</span>
                      <span className="font-medium">{formatCurrency(game.total_payouts)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expenses:</span>
                      <span className="font-medium">{formatCurrency(game.total_expenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Donations:</span>
                      <span className="font-medium text-green-600">{formatCurrency(game.total_donations)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t pt-2">
                      <span>Net Profit:</span>
                      <span className={game.organization_net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(game.organization_net_profit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAddExpense(game)}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Add Expense
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GameForm 
        open={showGameForm}
        onOpenChange={setShowGameForm}
        games={games}
        onComplete={fetchGames}
      />

      {selectedGame && (
        <ExpenseModal
          open={showExpenseModal}
          onOpenChange={setShowExpenseModal}
          gameId={selectedGame.id}
          gameName={selectedGame.name}
        />
      )}
    </div>
  );
}
