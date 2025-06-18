
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialOverview } from "@/components/FinancialOverview";
import { FinancialCharts } from "@/components/FinancialCharts";
import { DetailedFinancialTable } from "@/components/DetailedFinancialTable";
import { GameComparisonTable } from "@/components/GameComparisonTable";
import { CardPayoutConfig } from "@/components/CardPayoutConfig";
import { OrganizationRules } from "@/components/OrganizationRules";
import { GameManagement } from "@/components/GameManagement";

const Dashboard = () => {
  // Mock data for components that require props
  const mockSummary = {
    totalSales: 0,
    totalExpenses: 0,
    totalDonations: 0,
    netProfit: 0,
    activeGames: 0,
    completedGames: 0
  };

  const mockGames: any[] = [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your Queen of Hearts games and track financial performance</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="games">Queen of Hearts Games</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Financials</TabsTrigger>
            <TabsTrigger value="comparison">Game Comparison</TabsTrigger>
            <TabsTrigger value="config">Card Configuration</TabsTrigger>
            <TabsTrigger value="rules">Organization Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <FinancialOverview summary={mockSummary} formatCurrency={formatCurrency} />
            <FinancialCharts games={mockGames} reportType="overview" />
          </TabsContent>

          <TabsContent value="games">
            <GameManagement />
          </TabsContent>

          <TabsContent value="detailed">
            <DetailedFinancialTable games={mockGames} formatCurrency={formatCurrency} />
          </TabsContent>

          <TabsContent value="comparison">
            <GameComparisonTable games={mockGames} formatCurrency={formatCurrency} />
          </TabsContent>

          <TabsContent value="config">
            <CardPayoutConfig />
          </TabsContent>

          <TabsContent value="rules">
            <OrganizationRules />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Dashboard;
