import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, color = 'primary' }: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground">{title}</p>
          <p className="text-foreground mt-2">{value}</p>
          {trend && (
            <p className={`mt-2 ${trend.isPositive ? 'text-green-600' : 'text-destructive'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
