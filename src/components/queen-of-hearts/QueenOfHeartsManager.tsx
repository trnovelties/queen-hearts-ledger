
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GameCard } from "./GameCard";
import { GameForm } from "../GameForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function QueenOfHeartsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Game state
  const [games, setGames] = useState<any[]>([]);
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

      setGames(gamesData || []);
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button 
          onClick={() => setShowGameForm(true)}
          className="bg-[#1F4E4A] hover:bg-[#132E2C]"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No games created yet. Create your first game to get started!</p>
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

      <GameForm
        open={showGameForm}
        onOpenChange={setShowGameForm}
        games={games}
        onComplete={handleGameComplete}
      />
    </div>
  );
}
