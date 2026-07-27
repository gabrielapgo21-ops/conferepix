import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean; neutral?: boolean };
  icon?: LucideIcon;
  tone?: "default" | "success" | "destructive" | "warning";
  description?: string;
}

const TONES = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "default",
  description,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular text-foreground">{value}</div>
          {delta && (
            <div
              className={cn(
                "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                delta.positive && "text-success",
                !delta.positive && !delta.neutral && "text-destructive",
                delta.neutral && "text-muted-foreground"
              )}
            >
              {delta.value}
            </div>
          )}
          {description && (
            <div className="mt-1 text-xs text-muted-foreground">{description}</div>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", TONES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
