
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ChartProps {
  title: string;
  description?: string;
  data: any[];
  type: 'bar' | 'line' | 'pie';
  config: any;
  className?: string;
  height?: number;
}

const COLORS = ['#A1E96C', '#1F4E4A', '#132E2C', '#7B8C8A', '#F7F8FC'];

export function AdvancedChart({ title, description, data, type, config, className, height = 300 }: ChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {Object.keys(config).map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={config[key].color || COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {Object.keys(config).map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={config[key].color || COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip />
            <Legend />
          </PieChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className={`h-[${height}px]`}>
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
