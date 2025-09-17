
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";
import { CardLoading } from "@/components/ui/loading";
import { Eye, Edit } from "lucide-react";

interface OrganizationRule {
  id: string;
  organization_name: string;
  rules_content: string;
}

export function OrganizationRules() {
  const { getCurrentUserId } = useAdmin();
  const [rules, setRules] = useState<OrganizationRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    organization_name: '',
    rules_content: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Try to get existing rules
      const { data, error } = await supabase
        .from('organization_rules')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rules:', error);
        return;
      }

      if (data) {
        setRules(data);
        setFormData({
          organization_name: data.organization_name,
          rules_content: data.rules_content
        });
      } else {
        // Create default rules if none exist
        const defaultRules = {
          organization_name: 'YOUR ORGANIZATION NAME HERE',
          rules_content: `1. Tickets are $2.00 each or 3 for $5.00.
2. Drawing held every [DAY] at [TIME].
3. Must be present to win weekly drawing.
4. Winner picks a card from the board.
5. If Queen of Hearts is picked, winner gets the jackpot.
6. If any other card is picked, winner gets the amount shown on the card.
7. Game continues until Queen of Hearts is drawn.
8. New game starts the following week after jackpot is won.`
        };

        const { data: newRules, error: insertError } = await supabase
          .from('organization_rules')
          .insert([{ 
            ...defaultRules, 
            user_id: userId,
            startup_costs: '' // Provide empty string for the optional field
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default rules:', insertError);
        } else {
          setRules(newRules);
          setFormData(defaultRules);
        }
      }
    } catch (error) {
      console.error('Error in fetchRules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('organization_rules')
        .upsert([
          {
            ...formData,
            user_id: userId,
            updated_at: new Date().toISOString(),
            startup_costs: '' // Provide empty string for the optional field
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization rules updated successfully.",
      });

      setIsEditing(false);
      fetchRules();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: "Error",
        description: "Failed to save organization rules.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <CardLoading message="Loading organization rules..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Rules</CardTitle>
          <CardDescription>
            Customize the rules and information for your Queen of Hearts game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditing ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{rules?.organization_name || 'YOUR ORGANIZATION NAME HERE'}</h3>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Game Rules:</h4>
                <div className="whitespace-pre-line text-sm text-muted-foreground bg-muted p-4 rounded">
                  {rules?.rules_content || 'No rules set yet.'}
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview Rules
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-center text-xl font-bold">
                        {rules?.organization_name || 'YOUR ORGANIZATION NAME HERE'}
                      </DialogTitle>
                      <DialogDescription className="text-center">
                        Queen of Hearts Game Rules
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="whitespace-pre-line text-sm leading-relaxed p-6 bg-muted rounded-lg">
                        {rules?.rules_content || 'No rules set yet.'}
                      </div>
                      <div className="text-center text-xs text-muted-foreground border-t pt-4">
                        These rules are provided for informational purposes. Please consult your organization's bylaws and local regulations.
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Rules
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="organization_name">Organization Name</Label>
                <Input
                  id="organization_name"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  placeholder="Enter your organization name"
                />
              </div>

              <div>
                <Label htmlFor="rules_content">Game Rules</Label>
                <Textarea
                  id="rules_content"
                  value={formData.rules_content}
                  onChange={(e) => setFormData({ ...formData, rules_content: e.target.value })}
                  placeholder="Enter the game rules"
                  rows={10}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  if (rules) {
                    setFormData({
                      organization_name: rules.organization_name,
                      rules_content: rules.rules_content
                    });
                  }
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
