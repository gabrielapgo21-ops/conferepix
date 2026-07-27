"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  Mail,
  Lock,
  Store,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function CadastroPage() {
  const [nomeLoja, setNomeLoja] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const senhaOk = senha.length >= 6;

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!senhaOk) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome_loja: nomeLoja },
        },
      });
      if (error) {
        setErro(error.message);
        return;
      }
      if (data.user && !data.session) {
        // Email confirmation enabled — pede pra confirmar
        setSucesso(true);
        return;
      }
      // Auto-login — hard navigation pra garantir nova sessão
      window.location.href = "/";
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-success/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center bg-card border border-border rounded-2xl p-8 shadow-xl"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success text-success-foreground mb-4">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Quase lá!</h2>
          <p className="text-muted-foreground text-sm">
            A gente mandou um e-mail pra <strong>{email}</strong>.<br />
            Confirma clicando no link e depois volta aqui pra entrar.
          </p>
          <Link
            href="/login"
            className="block mt-6 text-primary font-semibold hover:underline"
          >
            Ir pro login
          </Link>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Criar conta grátis</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vamos vender mais e perder menos? 💚
          </p>
        </div>

        <form
          onSubmit={handleCadastrar}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4"
        >
          <div>
            <Label className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Nome da loja
            </Label>
            <Input
              required
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              placeholder="Ex: Loja da Maria"
              className="mt-1.5"
              autoFocus
            />
          </div>
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
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {senha.length > 0 && (
              <p
                className={
                  "text-xs mt-1 " +
                  (senhaOk ? "text-success" : "text-muted-foreground")
                }
              >
                {senhaOk ? "✓ Senha ok" : `Faltam ${6 - senha.length} caracteres`}
              </p>
            )}
          </div>

          {erro && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{erro}</span>
            </motion.div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={carregando || !senhaOk || !email || !nomeLoja}
            className="w-full"
            variant="success"
          >
            {carregando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando conta…
              </>
            ) : (
              "Criar conta grátis"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Entrar
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Seu negócio. Seus dados. Só você vê. 🔒
        </p>
      </motion.div>
    </div>
  );
}
