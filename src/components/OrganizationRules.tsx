import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";
import { CardLoading } from "@/components/ui/loading";
import { Download, Edit } from "lucide-react";
import jsPDF from 'jspdf';
interface OrganizationRule {
  id: string;
  organization_name: string;
  rules_content: string;
  startup_costs?: string;
}
export function OrganizationRules() {
  const {
    getCurrentUserId
  } = useAdmin();
  const [rules, setRules] = useState<OrganizationRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    organization_name: '',
    rules_content: ''
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchRules();
  }, []);
  const fetchRules = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Get the most recent rules for this user
      const {
        data,
        error
      } = await supabase.from('organization_rules').select('*').eq('user_id', userId).order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rules:', error);
        return;
      }

      // Get user's organization name
      const {
        data: userData
      } = await supabase.from('users').select('organization_name').eq('id', userId).single();
      const organizationName = userData?.organization_name || 'YOUR ORGANIZATION NAME HERE';
      if (data) {
        setRules(data);
        setFormData({
          organization_name: data.organization_name || organizationName,
          rules_content: data.rules_content
        });
      } else {
        // Create default rules if none exist
        const defaultRules = {
          organization_name: organizationName,
          rules_content: `1. Tickets are $2.00 each or 3 for $5.00.
2. Drawing held every [DAY] at [TIME].
3. Must be present to win weekly drawing.
4. Winner picks a card from the board.
5. If Queen of Hearts is picked, winner gets the jackpot.
6. If any other card is picked, winner gets the amount shown on the card.
7. Game continues until Queen of Hearts is drawn.
8. New game starts the following week after jackpot is won.`
        };
        const {
          data: newRules,
          error: insertError
        } = await supabase.from('organization_rules').insert([{
          ...defaultRules,
          user_id: userId,
          startup_costs: ''
        }]).select().single();
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
  const handleDownloadPDF = () => {
    if (!rules) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 30;

      // Header - Organization Name
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const orgName = rules.organization_name || 'YOUR ORGANIZATION NAME HERE';
      const orgNameLines = doc.splitTextToSize(orgName, pageWidth - 40);
      doc.text(orgNameLines, pageWidth / 2, yPosition, {
        align: 'center'
      });
      yPosition += orgNameLines.length * 7 + 10;

      // Subtitle
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 127); // Red color
      doc.text('Queen of Hearts Game Rules', pageWidth / 2, yPosition, {
        align: 'center'
      });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // Rules Content
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Split rules into lines and format them properly
      const rulesLines = rules.rules_content.split('\n').filter(line => line.trim());
      const margin = 20;
      const lineHeight = 6;
      rulesLines.forEach((line, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 30;
        }

        // Format numbered rules
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^\d+\./)) {
          // This is a numbered rule - make it bold and add some spacing
          doc.setFont('helvetica', 'bold');
          const wrappedLines = doc.splitTextToSize(trimmedLine, pageWidth - 2 * margin);
          doc.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * lineHeight + 3;
          doc.setFont('helvetica', 'normal');
        } else if (trimmedLine.length > 0) {
          // Regular text
          const wrappedLines = doc.splitTextToSize(trimmedLine, pageWidth - 2 * margin);
          doc.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * lineHeight + 2;
        } else {
          // Empty line - add some space
          yPosition += lineHeight;
        }
      });

      // Footer disclaimer
      yPosition = Math.max(yPosition + 20, pageHeight - 40);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const disclaimerText = 'These rules are provided for informational purposes. Please consult your organization\'s bylaws and local regulations.';
      const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
      doc.text(disclaimerLines, pageWidth / 2, yPosition, {
        align: 'center'
      });

      // Save the PDF with organization name in filename
      const fileName = `${orgName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_queen_of_hearts_rules.pdf`;
      doc.save(fileName);
      toast({
        title: "Success",
        description: "Rules PDF downloaded successfully."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive"
      });
    }
  };
  const handleSave = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // If we have an existing rules record, update it; otherwise insert new one
      if (rules?.id) {
        const {
          error
        } = await supabase.from('organization_rules').update({
          organization_name: formData.organization_name,
          rules_content: formData.rules_content,
          updated_at: new Date().toISOString(),
          startup_costs: rules.startup_costs || ''
        }).eq('id', rules.id).eq('user_id', userId);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('organization_rules').insert([{
          ...formData,
          user_id: userId,
          startup_costs: ''
        }]);
        if (error) throw error;
      }
      toast({
        title: "Success",
        description: "Organization rules updated successfully."
      });
      setIsEditing(false);
      fetchRules();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: "Error",
        description: "Failed to save organization rules.",
        variant: "destructive"
      });
    }
  };
  if (isLoading) {
    return <CardLoading message="Loading organization rules..." />;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Organization Rules</CardTitle>
          <CardDescription>
            Customize the rules and information for your Queen of Hearts game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditing ? <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{rules?.organization_name || 'YOUR ORGANIZATION NAME HERE'}</h3>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Game Rules:</h4>
                <div className="whitespace-pre-line text-sm text-muted-foreground bg-muted p-4 rounded">
                  {rules?.rules_content || `1. Tickets are $2.00 each or 3 for $5.00.
2. Drawing held every [DAY] at [TIME].
3. Must be present to win weekly drawing.
4. Winner picks a card from the board.
5. If Queen of Hearts is picked, winner gets the jackpot.
6. If any other card is picked, winner gets the amount shown on the card.
7. Game continues until Queen of Hearts is drawn.
8. New game starts the following week after jackpot is won.`}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadPDF} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>

                <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Rules
                </Button>
              </div>
            </div> : <div className="space-y-4">
              <div>
                <Label htmlFor="organization_name">Organization Name</Label>
                <Input id="organization_name" value={formData.organization_name} onChange={e => setFormData({
              ...formData,
              organization_name: e.target.value
            })} placeholder="Enter your organization name" />
              </div>

              <div>
                <Label htmlFor="rules_content">Game Rules</Label>
                <Textarea id="rules_content" value={formData.rules_content} onChange={e => setFormData({
              ...formData,
              rules_content: e.target.value
            })} placeholder="Enter the game rules" rows={10} />
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
            </div>}
        </CardContent>
      </Card>
    </div>;
}