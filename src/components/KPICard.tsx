
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  percentage?: number;
  isLoading?: boolean;
}

export function KPICard({ title, value, previousValue, icon, trend, percentage, isLoading }: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {percentage !== undefined && (
              <div className="flex items-center mt-2">
                {getTrendIcon()}
                <span className={`text-sm ml-1 ${getTrendColor()}`}>
                  {percentage > 0 ? '+' : ''}{percentage}%
                </span>
                {previousValue && (
                  <span className="text-xs text-gray-500 ml-2">
                    vs {previousValue}
                  </span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
