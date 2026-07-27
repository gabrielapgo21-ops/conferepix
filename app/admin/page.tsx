"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Users,
  Activity,
  CreditCard,
  TrendingUp,
  Loader2,
  Lock,
} from "lucide-react";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Metrics {
  totalUsuarios: number;
  totalTransacoesFeed: number;
  distribuicaoPlanos: Record<string, number>;
  comMP: number;
  contas: Array<{
    user_id: string;
    role: string;
    plano: string;
    ultimaAtualizacao: string;
    mpConectado: boolean;
  }>;
}

const PLANO_LABEL: Record<string, string> = {
  free: "Grátis",
  micro: "Micro",
  comercio: "Comércio",
  pro: "Pro",
  owner: "Dona",
};
const PLANO_COR: Record<string, "default" | "success" | "warning" | "destructive" | "outline" | "secondary"> = {
  free: "outline",
  micro: "secondary",
  comercio: "default",
  pro: "warning",
  owner: "destructive",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora há pouco";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function AdminPage() {
  const mounted = useHasMounted();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/admin/metrics")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? r.statusText);
        }
        return r.json();
      })
      .then((data: Metrics) => setMetrics(data))
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false));
  }, [mounted]);

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (erro || !metrics) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Sem permissão</h2>
          <p className="text-sm text-muted-foreground">
            Esta área é só pra dona do ConferePix.
            <br />
            <span className="text-xs">{erro}</span>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-warning" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Painel da Dona
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Métricas e contas — só você vê isso. 👑
          </p>
        </div>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold tabular">{metrics.totalUsuarios}</div>
              <div className="text-xs text-muted-foreground">Clientes cadastrados</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold tabular">{metrics.comMP}</div>
              <div className="text-xs text-muted-foreground">Conectados ao MP</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold tabular">
                {metrics.totalTransacoesFeed}
              </div>
              <div className="text-xs text-muted-foreground">Transações no feed</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold tabular">
                {(metrics.distribuicaoPlanos.micro ?? 0) +
                  (metrics.distribuicaoPlanos.comercio ?? 0) +
                  (metrics.distribuicaoPlanos.pro ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground">Pagantes</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Distribuição de planos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por plano</CardTitle>
          <CardDescription>
            Quantos clientes em cada plano de assinatura
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2 space-y-2">
          {Object.entries(PLANO_LABEL).map(([plano, label]) => {
            const qtd = metrics.distribuicaoPlanos[plano] ?? 0;
            const total = metrics.totalUsuarios || 1;
            const pct = (qtd / total) * 100;
            return (
              <div key={plano}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{label}</span>
                  <span className="tabular text-muted-foreground">
                    {qtd} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Lista de contas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas contas</CardTitle>
          <CardDescription>
            Ordenadas por última atualização. Sem dados sensíveis — só o essencial.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Conta</th>
                <th className="text-left px-4 py-2 font-medium">Plano</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">MP</th>
                <th className="text-left px-4 py-2 font-medium">Última ativ.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.contas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum cliente cadastrado ainda. Você é a primeira! 💚
                  </td>
                </tr>
              ) : (
                metrics.contas.map((c) => (
                  <tr key={c.user_id}>
                    <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                      {c.user_id.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={PLANO_COR[c.plano] ?? "outline"}>
                        {PLANO_LABEL[c.plano] ?? c.plano}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {c.role === "owner" ? (
                        <Badge variant="warning" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Dona
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {c.mpConectado ? (
                        <Badge variant="success">Sim</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">não</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {relativeTime(c.ultimaAtualizacao)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 bg-warning/5 border-warning/20">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-xs text-foreground leading-relaxed">
            <strong>Privacidade:</strong> você consegue ver quantos clientes,
            quantas transações no total e os planos — mas <strong>NÃO</strong> vê os
            dados dos clientes (vendas, produtos, tokens MP). Isso é proposital pra
            manter a confiança. Se algum cliente quiser suporte e te autorizar, a
            gente pode adicionar acesso temporário depois.
          </div>
        </div>
      </Card>
    </div>
  );
}
