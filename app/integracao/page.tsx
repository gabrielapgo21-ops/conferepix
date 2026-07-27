"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Zap,
  Eye,
  EyeOff,
  AlertCircle,
  Radio,
} from "lucide-react";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ConfigStatus {
  mpConfigurado: boolean;
  mpAmbiente?: "test" | "producao";
  mpAccessTokenMasked?: string | null;
  ultimaAtualizacao?: string;
}

export default function IntegracaoPage() {
  const mounted = useHasMounted();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );
  const [testing, setTesting] = useState(false);

  async function fetchStatus() {
    const res = await fetch("/api/mp/config");
    setStatus(await res.json());
  }

  useEffect(() => {
    if (mounted) fetchStatus();
  }, [mounted]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/mp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpAccessToken: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Erro desconhecido" });
      } else {
        setFeedback({
          type: "ok",
          msg: `Conectado! Conta ${data.userInfo?.nickname ?? data.userInfo?.email ?? "MP"} (${data.ambiente === "test" ? "ambiente de teste" : "PRODUÇÃO"})`,
        });
        setToken("");
        await fetchStatus();
      }
    } catch (e) {
      setFeedback({ type: "err", msg: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que quer desconectar? O app vai parar de receber novas vendas."))
      return;
    await fetch("/api/mp/config", { method: "DELETE" });
    await fetchStatus();
    setFeedback({ type: "ok", msg: "Desconectado." });
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/mp/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setFeedback({
        type: "ok",
        msg: `Transação teste criada: ${data.tx.metodo} de R$ ${data.tx.valor.toFixed(2)}. Confira em Ao Vivo!`,
      });
    } catch (e) {
      setFeedback({ type: "err", msg: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/mercadopago`
      : "/api/webhooks/mercadopago";

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Integração Mercado Pago
        </h1>
        <p className="text-muted-foreground mt-1">
          Conecte sua conta MP pra receber as vendas da maquininha direto no app.
        </p>
      </div>

      {/* Status atual */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={
                "h-12 w-12 rounded-xl flex items-center justify-center " +
                (status?.mpConfigurado ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")
              }
            >
              <Plug className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">
                {status?.mpConfigurado ? "Conectado ao Mercado Pago" : "Ainda não conectado"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {status?.mpConfigurado ? (
                  <>
                    Token: <span className="font-mono">{status.mpAccessTokenMasked}</span>
                  </>
                ) : (
                  "Cole seu Access Token abaixo pra ativar."
                )}
              </div>
            </div>
          </div>
          {status?.mpConfigurado && (
            <Badge
              variant={status.mpAmbiente === "producao" ? "success" : "warning"}
              className="self-start"
            >
              {status.mpAmbiente === "producao" ? "PRODUÇÃO" : "TESTE"}
            </Badge>
          )}
        </div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              "mt-4 p-3 rounded-lg text-sm flex items-start gap-2 " +
              (feedback.type === "ok"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive")
            }
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </motion.div>
        )}
      </Card>

      {/* Configurar token */}
      <Card className="p-5">
        <CardTitle className="text-base">
          {status?.mpConfigurado ? "Trocar token" : "Conectar conta"}
        </CardTitle>
        <CardDescription className="mt-1">
          Seu Access Token vai criar a ponte entre o ConferePix e o Mercado Pago.
        </CardDescription>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-sm font-medium">Access Token</Label>
            <div className="relative mt-1.5">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="TEST-1234567890-abcdef-... (ou APP_USR-...)"
                className="pr-10 font-mono text-xs"
              />
              <button
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Pegue em{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                mercadopago.com.br/developers/panel/app
                <ExternalLink className="h-3 w-3" />
              </a>
              {" "}→ Suas credenciais → Access Token.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!token.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando…
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" />
                  Salvar e conectar
                </>
              )}
            </Button>
            {status?.mpConfigurado && (
              <Button variant="outline" onClick={handleDisconnect}>
                <XCircle className="h-4 w-4" />
                Desconectar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* URL do webhook */}
      <Card className="p-5">
        <CardTitle className="text-base">URL do Webhook</CardTitle>
        <CardDescription className="mt-1">
          Configure essa URL no painel do MP em "Notificações &gt; Webhooks". É pra cá que o MP
          vai mandar as vendas.
        </CardDescription>
        <div className="mt-3 flex items-stretch gap-2">
          <div className="flex-1 bg-secondary rounded-lg px-3 py-2 font-mono text-xs flex items-center break-all">
            {webhookUrl}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              setFeedback({ type: "ok", msg: "URL copiada!" });
            }}
          >
            <Copy className="h-4 w-4" />
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          ⚠️ Em desenvolvimento local (<code>localhost</code>) o MP não consegue chamar essa
          URL. Quando o app subir no Vercel, essa URL vira pública (
          <code>conferepix.vercel.app/api/webhooks/mercadopago</code>) e funciona de verdade.
        </p>
      </Card>

      {/* Teste manual */}
      <Card className="p-5 bg-primary/5 border-primary/30">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Testar agora (sem maquininha)</CardTitle>
        </div>
        <CardDescription>
          Dispara uma transação fake como se viesse do MP. Útil enquanto você não tem a
          maquininha física ou não fez o deploy.
        </CardDescription>
        <Button
          onClick={handleTestWebhook}
          disabled={testing}
          className="mt-3"
          variant="success"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Disparando…
            </>
          ) : (
            <>
              <Radio className="h-4 w-4" />
              Disparar transação teste
            </>
          )}
        </Button>
      </Card>

      {/* Guia rápido */}
      <Card className="p-5">
        <CardTitle className="text-base">Passos pra ativar de verdade</CardTitle>
        <ol className="mt-3 space-y-2 text-sm text-foreground list-decimal list-inside">
          <li>
            Crie sua conta de desenvolvedor em{" "}
            <a
              href="https://www.mercadopago.com.br/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mercadopago.com.br/developers
            </a>
            .
          </li>
          <li>
            No painel, clique <strong>"Suas integrações" → "Criar aplicação"</strong>. Dá um
            nome (ex: ConferePix).
          </li>
          <li>
            Dentro da aplicação, abre <strong>"Credenciais"</strong> e copia o{" "}
            <strong>Access Token</strong> (começa com <code>TEST-</code> ou{" "}
            <code>APP_USR-</code>).
          </li>
          <li>Cole o token no campo acima e salve.</li>
          <li>
            Pra receber webhooks de verdade, faça o deploy no Vercel (próximo passo) e
            configure a URL de webhook no painel MP.
          </li>
        </ol>
      </Card>
    </div>
  );
}
