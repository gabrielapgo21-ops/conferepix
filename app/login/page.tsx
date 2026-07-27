"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wallet, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function LoginForm() {
  const params = useSearchParams();
  const redirect = params?.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        const msg = error.message || String(error) || "";
        console.error("[login] erro Supabase:", error);
        if (msg.includes("Invalid login credentials")) {
          setErro("E-mail ou senha incorretos. Tenta de novo.");
        } else if (
          msg === "{}" ||
          msg === "" ||
          msg === "Failed to fetch" ||
          msg.includes("network") ||
          msg.includes("AuthRetryable") ||
          msg.includes("NetworkError")
        ) {
          setErro(
            `Erro de conexão com o Supabase. Detalhes: ${JSON.stringify(error).slice(0, 200)} | Testa /api/health pra ver o que tá configurado. Se o SW tá cacheando, usa /reset.html.`
          );
        } else {
          setErro(msg);
        }
        return;
      }
      // Hard navigation pra garantir que a sidebar pegue a nova sessão
      window.location.href = redirect;
    } catch (err) {
      console.error("[login] catch:", err);
      const msg = (err as Error).message || String(err);
      if (msg === "{}" || msg.includes("fetch") || !msg) {
        setErro(
          `Erro de rede pra logar: ${JSON.stringify(err).slice(0, 200)}. Testa /api/health pra ver o servidor. Se o SW tá cacheando, usa /reset.html.`
        );
      } else {
        setErro(msg || "Erro ao entrar. Tenta de novo.");
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form
      onSubmit={handleEntrar}
      className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4"
    >
      <div>
        <Label className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          E-mail
        </Label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="mt-1.5"
          autoComplete="email"
          autoFocus
        />
      </div>
      <div>
        <Label className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Senha
        </Label>
        <div className="relative mt-1.5">
          <Input
            type={showSenha ? "text" : "password"}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowSenha((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {erro && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{erro}</span>
          </div>
          {erro.includes("reset.html") && (
            <a
              href="/reset.html"
              className="text-xs bg-destructive text-destructive-foreground rounded-md px-3 py-2 text-center font-semibold hover:bg-destructive/90"
            >
              🔧 Abrir tela de reset
            </a>
          )}
        </motion.div>
      )}

      <Button type="submit" size="lg" disabled={carregando} className="w-full">
        {carregando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-primary font-semibold hover:underline">
          Criar conta grátis
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-success/10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mb-4">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ConferePix</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Entre na sua conta pra continuar
          </p>
        </div>

        <Suspense
          fallback={
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl h-64 animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Seu negócio. Seus dados. Só você vê. 🔒
        </p>
      </motion.div>
    </div>
  );
}
