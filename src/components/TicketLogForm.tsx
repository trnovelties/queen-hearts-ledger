import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';

export const TicketLogForm = () => {
  const [organizationName, setOrganizationName] = useState('');
  const [ticketPrice, setTicketPrice] = useState('2.00');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch organization name
      const { data: userData } = await supabase
        .from('users')
        .select('organization_name')
        .eq('id', user.id)
        .single();

      if (userData?.organization_name) {
        setOrganizationName(userData.organization_name);
      }

      // Fetch default ticket price
      const { data: configData } = await supabase
        .from('configurations')
        .select('ticket_price')
        .eq('user_id', user.id)
        .single();

      if (configData?.ticket_price) {
        setTicketPrice(configData.ticket_price.toString());
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  };

  const generatePDF = () => {
    setIsLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const title = 'Queen of Hearts';
      doc.text(title, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(organizationName || 'Organization Name', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('Ticket Log Form', pageWidth / 2, 38, { align: 'center' });

      // Table setup
      const startY = 50;
      const rowHeight = 10;
      const numRows = 22;
      
      // Column widths
      const col1Width = 22; // Date
      const col2Width = 22; // Start TKT#
      const col3Width = 22; // Ending TKT#
      const col4Width = 22; // # TKT Sold
      const col5Width = 20; // Price
      const col6Width = 28; // Total Collected
      const col7Width = 28; // Total Deposited
      const col8Width = 22; // Initials
      
      const tableWidth = col1Width + col2Width + col3Width + col4Width + col5Width + col6Width + col7Width + col8Width;
      const startX = (pageWidth - tableWidth) / 2;

      // Header row
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      let currentX = startX;
      
      // Draw header cells
      doc.rect(currentX, startY, col1Width, rowHeight);
      doc.text('Date', currentX + col1Width / 2, startY + 6, { align: 'center' });
      currentX += col1Width;
      
      doc.rect(currentX, startY, col2Width, rowHeight);
      doc.text('Start', currentX + col2Width / 2, startY + 4, { align: 'center' });
      doc.text('TKT#', currentX + col2Width / 2, startY + 8, { align: 'center' });
      currentX += col2Width;
      
      doc.rect(currentX, startY, col3Width, rowHeight);
      doc.text('Ending', currentX + col3Width / 2, startY + 4, { align: 'center' });
      doc.text('TKT#', currentX + col3Width / 2, startY + 8, { align: 'center' });
      currentX += col3Width;
      
      doc.rect(currentX, startY, col4Width, rowHeight);
      doc.text('# TKT', currentX + col4Width / 2, startY + 4, { align: 'center' });
      doc.text('Sold', currentX + col4Width / 2, startY + 8, { align: 'center' });
      currentX += col4Width;
      
      doc.rect(currentX, startY, col5Width, rowHeight);
      doc.text('Price', currentX + col5Width / 2, startY + 6, { align: 'center' });
      currentX += col5Width;
      
      doc.rect(currentX, startY, col6Width, rowHeight);
      doc.text('Total', currentX + col6Width / 2, startY + 4, { align: 'center' });
      doc.text('Collected', currentX + col6Width / 2, startY + 8, { align: 'center' });
      currentX += col6Width;
      
      doc.rect(currentX, startY, col7Width, rowHeight);
      doc.text('Total', currentX + col7Width / 2, startY + 4, { align: 'center' });
      doc.text('Deposited', currentX + col7Width / 2, startY + 8, { align: 'center' });
      currentX += col7Width;
      
      doc.rect(currentX, startY, col8Width, rowHeight);
      doc.text('Initials', currentX + col8Width / 2, startY + 6, { align: 'center' });

      // Data rows
      doc.setFont('helvetica', 'normal');
      for (let i = 0; i < numRows; i++) {
        const rowY = startY + rowHeight * (i + 1);
        currentX = startX;
        
        // Date column
        doc.rect(currentX, rowY, col1Width, rowHeight);
        currentX += col1Width;
        
        // Start TKT# column
        doc.rect(currentX, rowY, col2Width, rowHeight);
        currentX += col2Width;
        
        // Ending TKT# column
        doc.rect(currentX, rowY, col3Width, rowHeight);
        currentX += col3Width;
        
        // # TKT Sold column
        doc.rect(currentX, rowY, col4Width, rowHeight);
        currentX += col4Width;
        
        // Price column (pre-filled)
        doc.rect(currentX, rowY, col5Width, rowHeight);
        doc.text(`$${ticketPrice}`, currentX + col5Width / 2, rowY + 6, { align: 'center' });
        currentX += col5Width;
        
        // Total Collected column
        doc.rect(currentX, rowY, col6Width, rowHeight);
        currentX += col6Width;
        
        // Total Deposited column
        doc.rect(currentX, rowY, col7Width, rowHeight);
        currentX += col7Width;
        
        // Initials column
        doc.rect(currentX, rowY, col8Width, rowHeight);
      }

      // Footer notes
      const footerY = startY + rowHeight * (numRows + 1) + 10;
      doc.setFontSize(8);
      doc.text('Instructions: Fill out this form daily to track ticket sales. Enter date, ticket numbers, and totals.', startX, footerY);

      // Save the PDF
      const fileName = `Queen_of_Hearts_Ticket_Log_${organizationName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      toast({
        title: "Form Generated",
        description: "Your ticket log form has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate the ticket log form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Ticket Log Form Generator
          </CardTitle>
        <CardDescription>
          Generate a printable ticket log form for daily sales tracking. Volunteers can use this form to manually record ticket sales throughout the day.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization Name</Label>
              <Input
                id="organization"
                value={organizationName}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                This will appear on your ticket log form
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
              <Input
                id="ticketPrice"
                type="number"
                step="0.01"
                min="0"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                placeholder="2.00"
              />
              <p className="text-sm text-muted-foreground">
                This price will be pre-filled in the "Price" column of your form
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={generatePDF} 
              disabled={isLoading || !ticketPrice}
              className="w-full sm:w-auto"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate & Download Form'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Use This Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p className="font-medium">For Organizations:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Enter your ticket price above (or use the default price)</li>
              <li>Click "Generate & Download Form" to create the PDF</li>
              <li>Print the form and provide it to your bartenders or sales staff</li>
            </ol>
          </div>
          
          <div className="space-y-2 text-sm pt-4">
            <p className="font-medium">For Volunteer:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Fill in the Date for each day's sales</li>
              <li>Record the Starting and Ending ticket numbers</li>
              <li>Calculate and enter the number of tickets sold</li>
              <li>Calculate Total Collected (# Tickets × Price)</li>
              <li>Record the Total Deposited amount</li>
              <li>Add your Initials to verify the entry</li>
            </ol>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This form is designed to help track daily ticket sales for POS system entry and reconciliation purposes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
