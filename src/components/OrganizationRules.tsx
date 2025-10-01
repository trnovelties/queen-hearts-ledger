import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";
import { CardLoading } from "@/components/ui/loading";
import { Download, FileText } from "lucide-react";
import jsPDF from 'jspdf';
import queenCardImage from '@/assets/queen-of-hearts-card.png';

interface OrganizationConfig {
  ticket_price: number;
  jackpot_percentage: number;
  organization_percentage: number;
  minimum_starting_jackpot: number;
  penalty_percentage: number;
  card_payouts: any;
}

export function OrganizationRules() {
  const { getCurrentUserId } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [organizationConfig, setOrganizationConfig] = useState<OrganizationConfig | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      // Fetch user organization name
      const { data: userData } = await supabase
        .from('users')
        .select('organization_name')
        .eq('id', userId)
        .single();
      
      const orgName = userData?.organization_name || 'YOUR ORGANIZATION NAME HERE';
      setOrganizationName(orgName);

      // Fetch organization configurations
      const { data: configData } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (configData) {
        setOrganizationConfig(configData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!organizationConfig) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const lineHeight = 5;

      // Load the Queen card image
      const img = new Image();
      img.src = queenCardImage;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Page 1
      // Add Queen card images at top (left and right)
      doc.addImage(img, 'PNG', 20, 10, 30, 40);
      doc.addImage(img, 'PNG', pageWidth - 50, 10, 30, 40);

      // Organization name (red text, centered)
      doc.setTextColor(220, 38, 127);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(organizationName, pageWidth / 2, 20, { align: 'center' });

      // "Rules for the Queen of Hearts" subtitle
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('Rules for the Queen of Hearts', pageWidth / 2, 30, { align: 'center' });

      // Draw horizontal line
      doc.setLineWidth(0.5);
      doc.line(margin, 45, pageWidth - margin, 45);

      let yPos = 55;

      // Content bullets
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const rules = [
        `• To be eligible to play you must be a current dues paying member in good standing and/or a spouse of a current dues paying member in good standing, and/or a current holder of a widower membership card.`,
        
        `• Suggested donation for each ticket is $${organizationConfig.ticket_price.toFixed(2)} (CASH ONLY). Altered and/or torn tickets will be discarded and disqualified.`,
        
        `• A new, standard 52 card deck, plus two jokers, for a total of 54 cards will be used.`,
        
        `• Tickets may be available anytime the ${organizationName} is open; however, tickets will stop being available 30 minutes before the drawing. Each ticket must have the name of the eligible player and Slot Number to be selected. An eligible player's signature to win. An eligible player's phone number on the ticket is optional.`,
        
        `• Each Monday at 7:30 p.m., a ticket will be drawn, and the prize will be from the funds collected from the prior week. The ${organizationName}. DRAWINGS MAY NOT BE HELD ON HOLIDAYS OR SPECIAL FUNCTIONS AND WILL BE POSTED IN THE ${organizationName} PRIOR TO THE EVENT. THERE WILL BE NO EXCEPTIONS TO THE CANCELATION POLICY OTHER THAN A WRITTEN DIRECTIVE.`,
        
        `• The total prize jackpot will accumulate weekly until the Queen of Hearts is drawn. The jackpot will start with $${organizationConfig.minimum_starting_jackpot.toFixed(2)} and will increase once the ticket acquired surpass the starting amount. The jackpot amount will be at ${organizationConfig.jackpot_percentage}% of tickets acquired above and beyond the original $${organizationConfig.minimum_starting_jackpot.toFixed(2)} jackpot.`,
        
        `• If your ticket is drawn from the tumbler, the slot number indicated on the back of the chosen ticket will be revealed. If the Queen of Hearts, the winner will receive the jackpot money, which will be ${organizationConfig.jackpot_percentage}% of money generated (if not present, the winner will receive ${100 - (organizationConfig.penalty_percentage || 10)}% of the jackpot money.`,
        
        `• If the Queen of Hearts is not drawn, the winning payouts are as follows:`
      ];

      rules.forEach((rule) => {
        const lines = doc.splitTextToSize(rule, pageWidth - 2 * margin);
        if (yPos + (lines.length * lineHeight) > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(lines, margin, yPos);
        yPos += lines.length * lineHeight + 2;
      });

      // Card payouts (in red)
      yPos += 3;
      doc.setTextColor(220, 38, 127);
      doc.setFont('helvetica', 'normal');
      
      const payouts = [
        `    • 2"-10's= $${(organizationConfig.card_payouts['2 of Hearts'] || 25).toFixed(2)}`,
        `    • Jack's and Kings= $${(organizationConfig.card_payouts['Jack of Hearts'] || 30).toFixed(2)}`,
        `    • Ace's= $${(organizationConfig.card_payouts['Ace of Hearts'] || 35).toFixed(2)}`,
        `    • Queens (except Queen of Hearts)= $${(organizationConfig.card_payouts['Queen of Spades'] || 40).toFixed(2)}`,
        `    • Joker's= $${(organizationConfig.card_payouts['Joker'] || 50).toFixed(2)}`
      ];

      payouts.forEach((payout) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(payout, margin, yPos);
        yPos += lineHeight + 1;
      });

      // Page 2
      doc.addPage();
      yPos = 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      const page2Rules = [
        `**Prize payments will be taken from the prize money and not the lodge's portion in accordance with IRS rules.**`,
        
        `• If an ineligible person's card is drawn, that card will be discarded and there will be no payout for that person. A valid ticket will be drawn again for an eligible person to choose a new card that night. If by chance an ineligible person chooses the Queen of Hearts, a new game will begin the following week.`,
        
        `• If a ticket is chosen and the slot number is not identified, then that ticket will be discarded and a new ticket will be drawn from the tumbler.`,
        
        `• If a ticket is chosen and the slot written on the ticket has already been selected, then that ticket will be discarded and a new ticket will be drawn from the tumbler.`,
        
        `• Once a card is selected, that card will be removed from play and displayed face up on the board in the slot from which it came. Each week after the drawing, all tickets will be discarded, and new tickets will be available starting the following day.`,
        
        `• All payouts will be paid by ${organizationName} check the following week. The Queen of Hearts jackpot will be paid out by ${organizationName} check within 30 days from the drawing as long as all IRS documentation has been completed.`,
        
        `• The Game board will be locked once the game is completed each week.`,
        
        `• The ${organizationName} portion of the money generated will go to our general and fundraising operations.`,
        
        `• In accordance with the IRS, winnings over $600 will receive a W-2G to report winnings. Taxes on any prize over $5,000 will be assessed and Federal Withholding reported to the IRS by the ${organizationName} to conform to all federal, state and ${organizationName} laws and policies. The winner must provide photo identification, a valid membership card and tax information so that all appropriate IRS documents (including IRS Form W-2G and Form 5754, if issued by the ${organizationName}. Form W-2G will vary year by year and will be the responsibility of the winner to pay (winner needs to verify the amount required to be witheld for the year in which winnings are awarded). A winner from an out of state may also have state taxes withheld in accordance with the laws of that state.`,
        
        `• To start a new game of Queen of Hearts, a Queen of Hearts committee member will place a new set of cards in the Game board. The Queen of Hearts committee members are allowed to play the Queen of Hearts Game.`,
        
        `• Each week the winner will be posted listing the number of the winning ticket (slot number) and the amount won.`
      ];

      page2Rules.forEach((rule) => {
        const lines = doc.splitTextToSize(rule, pageWidth - 2 * margin);
        if (yPos + (lines.length * lineHeight) > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(lines, margin, yPos);
        yPos += lines.length * lineHeight + 2;
      });

      const fileName = `${organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_rules.pdf`;
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

  if (isLoading) {
    return <CardLoading message="Loading organization rules..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Queen of Hearts Rules</CardTitle>
          </div>
          <CardDescription>
            Official game rules for your organization's Queen of Hearts fundraiser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-6 rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              Download a professionally formatted PDF with your organization's rules, automatically populated with your configured settings:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Organization name: <span className="font-semibold text-foreground">{organizationName}</span></li>
              <li>• Ticket price: <span className="font-semibold text-foreground">${organizationConfig?.ticket_price.toFixed(2)}</span></li>
              <li>• Jackpot percentage: <span className="font-semibold text-foreground">{organizationConfig?.jackpot_percentage}%</span></li>
              <li>• Starting jackpot: <span className="font-semibold text-foreground">${organizationConfig?.minimum_starting_jackpot.toFixed(2)}</span></li>
              <li>• Custom card payouts from your configuration</li>
            </ul>
          </div>

          <Button 
            variant="default" 
            onClick={generatePDF}
            className="flex items-center gap-2"
            disabled={!organizationConfig}
          >
            <Download className="h-4 w-4" />
            Download Rules PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
