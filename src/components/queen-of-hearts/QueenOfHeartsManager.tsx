
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GameCard } from "./GameCard";
import { GameForm } from "../GameForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

export function QueenOfHeartsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Game state
  const [games, setGames] = useState<any[]>([]);
  const [archivedGames, setArchivedGames] = useState<any[]>([]);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<string | null>(null);
  
  // Modal states
  const [showGameForm, setShowGameForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch games
  const fetchGames = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('game_number', { ascending: false });

      if (error) throw error;

      const currentGames = gamesData?.filter(game => !game.end_date) || [];
      const archivedGames = gamesData?.filter(game => game.end_date) || [];

      setGames(currentGames);
      setArchivedGames(archivedGames);
    } catch (error: any) {
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

  useEffect(() => {
    fetchGames();
  }, [user?.id]);

  const handleGameComplete = () => {
    fetchGames();
    setShowGameForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#1F4E4A]">Queen of Hearts Management</h1>
        <Button 
          onClick={() => setShowGameForm(true)}
          className="bg-[#1F4E4A] hover:bg-[#132E2C]"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Games ({games.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived Games ({archivedGames.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No current games. Create your first game to get started!</p>
              <Button 
                onClick={() => setShowGameForm(true)}
                className="bg-[#1F4E4A] hover:bg-[#132E2C]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Game
              </Button>
            </div>
          ) : (
            games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isExpanded={expandedGame === game.id}
                onToggleExpand={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                expandedWeek={expandedWeek}
                onToggleWeek={setExpandedWeek}
                expandedExpenses={expandedExpenses}
                onToggleExpenses={setExpandedExpenses}
                onGameUpdated={fetchGames}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No archived games yet.</p>
            </div>
          ) : (
            archivedGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isExpanded={expandedGame === game.id}
                onToggleExpand={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                expandedWeek={expandedWeek}
                onToggleWeek={setExpandedWeek}
                expandedExpenses={expandedExpenses}
                onToggleExpenses={setExpandedExpenses}
                onGameUpdated={fetchGames}
                isArchived={true}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <GameForm
        open={showGameForm}
        onOpenChange={setShowGameForm}
        games={[...games, ...archivedGames]}
        onComplete={handleGameComplete}
      />
    </div>
  );
}
