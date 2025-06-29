
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export const useGameData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching games for user:', user.id);
      
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('game_number', { ascending: true });
      
      if (gamesError) throw gamesError;

      const gamesWithDetails = await Promise.all(
        gamesData.map(async (game) => {
          // Get weeks for this game
          const { data: weeksData, error: weeksError } = await supabase
            .from('weeks')
            .select('*')
            .eq('game_id', game.id)
            .eq('user_id', user.id)
            .order('week_number', { ascending: true });
          
          if (weeksError) throw weeksError;

          // Get expenses for this game
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('game_id', game.id)
            .eq('user_id', user.id)
            .order('date', { ascending: false });
          
          if (expensesError) throw expensesError;

          // Get detailed week data with ticket sales
          const weeksWithDetails = await Promise.all(
            weeksData.map(async (week) => {
              const { data: salesData, error: salesError } = await supabase
                .from('ticket_sales')
                .select('*')
                .eq('week_id', week.id)
                .eq('user_id', user.id)
                .order('date', { ascending: true });
              
              if (salesError) throw salesError;
              
              return {
                ...week,
                ticket_sales: salesData || []
              };
            })
          );

          return {
            ...game,
            weeks: weeksWithDetails || [],
            expenses: expensesData || []
          };
        })
      );

      setGames(gamesWithDetails);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: `Failed to fetch data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchGames();

      // Set up real-time subscriptions
      const gamesSubscription = supabase
        .channel('public:games')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `user_id=eq.${user.id}`
        }, () => {
          console.log('Games changed, refreshing data');
          fetchGames();
        })
        .subscribe();

      const weeksSubscription = supabase
        .channel('public:weeks')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'weeks',
          filter: `user_id=eq.${user.id}`
        }, () => {
          console.log('Weeks changed, refreshing data');
          fetchGames();
        })
        .subscribe();

      const ticketSalesSubscription = supabase
        .channel('public:ticket_sales')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'ticket_sales',
          filter: `user_id=eq.${user.id}`
        }, () => {
          console.log('Ticket sales changed, refreshing data');
          fetchGames();
        })
        .subscribe();

      const expensesSubscription = supabase
        .channel('public:expenses')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        }, () => {
          console.log('Expenses changed, refreshing data');
          fetchGames();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(gamesSubscription);
        supabase.removeChannel(weeksSubscription);
        supabase.removeChannel(ticketSalesSubscription);
        supabase.removeChannel(expensesSubscription);
      };
    }
  }, [user?.id]);

  return {
    games,
    setGames,
    loading,
    fetchGames
  };
};
