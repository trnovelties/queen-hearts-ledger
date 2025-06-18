
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrganizationRule {
  id: string;
  organization_name: string;
  rules_content: string;
}

export function OrganizationRules() {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get existing rules
      const { data, error } = await supabase
        .from('organization_rules')
        .select('*')
        .eq('user_id', user.id)
        .single();

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
          .insert([{ ...defaultRules, user_id: user.id }])
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('organization_rules')
        .upsert([
          {
            ...formData,
            user_id: user.id,
            updated_at: new Date().toISOString()
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
    return <div>Loading...</div>;
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
                <div className="whitespace-pre-line text-sm text-gray-700 bg-gray-50 p-4 rounded">
                  {rules?.rules_content || 'No rules set yet.'}
                </div>
              </div>

              <Button onClick={() => setIsEditing(true)}>
                Edit Rules
              </Button>
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
