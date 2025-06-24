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
import { useAdmin } from "@/context/AdminContext";

export function GameManagement() {
  const { user, isAdmin } = useAuth();
  const { getCurrentUserId, viewingOrganization, isViewingOtherOrganization } = useAdmin();
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGameForm, setShowGameForm] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('GameManagement: useEffect triggered');
    console.log('GameManagement: user:', user);
    console.log('GameManagement: isAdmin:', isAdmin);
    console.log('GameManagement: viewingOrganization:', viewingOrganization);
    console.log('GameManagement: isViewingOtherOrganization:', isViewingOtherOrganization);
    
    if (user) {
      fetchGames();
    }
  }, [user, viewingOrganization, isViewingOtherOrganization]);

  const fetchGames = async () => {
    try {
      const currentUserId = getCurrentUserId();
      console.log('GameManagement: fetchGames called');
      console.log('GameManagement: getCurrentUserId() returns:', currentUserId);
      
      if (!currentUserId) {
        console.log('GameManagement: No user ID found, skipping games fetch');
        setIsLoading(false);
        return;
      }

      console.log('GameManagement: Fetching games for user:', currentUserId);

      // Query games for the specific user ID
      const { data: gamesData, error: gamesError, count } = await supabase
        .from('games')
        .select('*', { count: 'exact' })
        .eq('user_id', currentUserId)
        .order('game_number', { ascending: false });

      console.log('GameManagement: Supabase query completed');
      console.log('GameManagement: Query result - data:', gamesData);
      console.log('GameManagement: Query result - error:', gamesError);
      console.log('GameManagement: Query result - count:', count);

      if (gamesError) {
        console.error('GameManagement: Error fetching games:', gamesError);
        toast({
          title: "Error",
          description: `Failed to fetch games: ${gamesError.message}`,
          variant: "destructive",
        });
        throw gamesError;
      }

      console.log('GameManagement: Successfully fetched games:', gamesData);
      console.log('GameManagement: Number of games found:', gamesData?.length || 0);
      
      // Test RLS permissions if admin viewing other org and no games found
      if (isAdmin && isViewingOtherOrganization && (!gamesData || gamesData.length === 0)) {
        console.log('GameManagement: Admin viewing other org but no games found, testing RLS...');
        
        // Test admin access to all games
        const { data: adminTestData, error: adminTestError } = await supabase
          .from('games')
          .select('id, user_id, name')
          .limit(5);
          
        console.log('GameManagement: Admin RLS test - data:', adminTestData);
        console.log('GameManagement: Admin RLS test - error:', adminTestError);

        // Test specific user query
        const { data: userTestData, error: userTestError } = await supabase
          .from('games')
          .select('id, user_id, name')
          .eq('user_id', currentUserId)
          .limit(5);
          
        console.log('GameManagement: User-specific test - data:', userTestData);
        console.log('GameManagement: User-specific test - error:', userTestError);
      }
      
      setGames(gamesData || []);
    } catch (error) {
      console.error('GameManagement: Error in fetchGames:', error);
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
          <p className="text-gray-600 mt-1">
            {isViewingOtherOrganization 
              ? `Viewing games for: ${viewingOrganization?.organization_name || viewingOrganization?.email} (ID: ${getCurrentUserId()})`
              : "Manage your Queen of Hearts game sessions"
            }
          </p>
        </div>
        {!isViewingOtherOrganization && (
          <Button 
            onClick={() => setShowGameForm(true)}
            className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Game
          </Button>
        )}
      </div>

      {games.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No games yet</h3>
            <p className="text-gray-600 text-center mb-4">
              {isViewingOtherOrganization 
                ? "This organization hasn't created any games yet"
                : "Create your first Queen of Hearts game to get started"
              }
            </p>
            {!isViewingOtherOrganization && (
              <Button 
                onClick={() => setShowGameForm(true)}
                className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Game
              </Button>
            )}
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
                    {!isViewingOtherOrganization && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleAddExpense(game)}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Add Expense
                      </Button>
                    )}
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

      {!isViewingOtherOrganization && (
        <>
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
        </>
      )}
    </div>
  );
}
