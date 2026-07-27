import { Badge } from "./badge";
import { STATUS_LABELS, type TransactionStatus } from "@/lib/types";
import {
  Check,
  AlertCircle,
  Clock,
  FileQuestion,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<
  TransactionStatus,
  { variant: "success" | "destructive" | "warning" | "secondary"; icon: typeof Check }
> = {
  ok: { variant: "success", icon: Check },
  aguardando_repasse: { variant: "warning", icon: Clock },
  repasse_confirmado: { variant: "success", icon: CheckCircle2 },
  falta_receber: { variant: "warning", icon: Clock },
  taxa_divergente: { variant: "destructive", icon: AlertCircle },
  valor_divergente: { variant: "destructive", icon: AlertTriangle },
  nao_identificado: { variant: "secondary", icon: FileQuestion },
  cancelada: { variant: "destructive", icon: XCircle },
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
