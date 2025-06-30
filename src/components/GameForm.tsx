import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Game name must be at least 2 characters.",
  }),
  game_number: z.number().min(1, {
    message: "Game number must be at least 1.",
  }),
  start_date: z.date(),
  ticket_price: z.number().min(0.01, {
    message: "Ticket price must be greater than 0.",
  }),
  organization_percentage: z.number().min(0, {
    message: "Organization percentage must be between 0 and 100.",
  }).max(100, {
    message: "Organization percentage must be between 0 and 100.",
  }),
  jackpot_percentage: z.number().min(0, {
    message: "Jackpot percentage must be between 0 and 100.",
  }).max(100, {
    message: "Jackpot percentage must be between 0 and 100.",
  }),
  minimum_starting_jackpot: z.number().min(1, {
    message: "Minimum starting jackpot must be at least 1.",
  }),
});

interface GameFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: any[];
  onComplete: () => void;
}

export const GameForm = ({ open, onOpenChange, games, onComplete }: GameFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getCurrentUserId } = useAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      game_number: 1,
      start_date: new Date(),
      ticket_price: 1,
      organization_percentage: 50,
      jackpot_percentage: 50,
      minimum_starting_jackpot: 500,
    },
  });

  useEffect(() => {
    if (games.length > 0) {
      const lastGame = games[0];
      form.setValue("game_number", lastGame.game_number + 1);
    }
  }, [games, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const values = form.getValues();
      const currentUserId = getCurrentUserId();

      if (!currentUserId) {
        toast({
          title: "Error",
          description: "No user ID found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Validation
      if (values.organization_percentage + values.jackpot_percentage !== 100) {
        toast({
          title: "Error",
          description: "Organization and Jackpot percentages must add up to 100%.",
          variant: "destructive",
        });
        return;
      }

      // Ensure game_number is unique
      const existingGame = games.find(game => game.game_number === values.game_number);
      if (existingGame) {
        toast({
          title: "Error",
          description: "Game number already exists. Please choose a different number.",
          variant: "destructive",
        });
        return;
      }

      // Calculate carryover jackpot from previous completed games
      let carryoverJackpot = 0;
      if (games.length > 0) {
        const lastCompletedGame = games
          .filter(g => g.end_date)
          .sort((a, b) => b.game_number - a.game_number)[0];
        
        if (lastCompletedGame) {
          // Add any contribution from the previous game to the carryover
          carryoverJackpot = (lastCompletedGame.carryover_jackpot || 0) + 
                           (lastCompletedGame.jackpot_contribution_to_next_game || 0);
        }
      }

      const { data, error } = await supabase
        .from('games')
        .insert([
          {
            name: values.name,
            game_number: values.game_number,
            start_date: values.start_date.toISOString().split('T')[0],
            ticket_price: values.ticket_price,
            organization_percentage: values.organization_percentage,
            jackpot_percentage: values.jackpot_percentage,
            minimum_starting_jackpot: values.minimum_starting_jackpot,
            user_id: currentUserId,
            carryover_jackpot: carryoverJackpot
          },
        ]);

      if (error) {
        console.error("Error creating game:", error);
        toast({
          title: "Error",
          description: `Failed to create game: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Game created successfully!",
        });
        onComplete();
        onOpenChange(false);
        form.reset();
      }
    } catch (error: any) {
      console.error("Error creating game:", error);
      toast({
        title: "Error",
        description: `Failed to create game: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Backdrop */}
      {open && <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" />}

      <div
        className={cn(
          "fixed inset-0 z-50 overflow-y-auto",
          open ? "block" : "hidden"
        )}
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Game</h2>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Queen of Hearts" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name of your game.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="game_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the number of your game.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  form.format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePicker
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          The date that the game will start on.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ticket_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1.00"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the price of a single ticket.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the percentage of the ticket price that the organization will receive.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jackpot_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jackpot Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the percentage of the ticket price that will go towards the jackpot.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="minimum_starting_jackpot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Starting Jackpot</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="500"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the minimum amount that the jackpot will start at.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onOpenChange(false)}
                      className="mr-2"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-[#1F4E4A] hover:bg-[#1F4E4A]/90">
                      {isSubmitting ? "Creating..." : "Create Game"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
