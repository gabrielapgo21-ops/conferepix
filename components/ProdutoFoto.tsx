"use client";

/**
 * Renderiza foto do produto: imagem real se for URL/data, ou emoji se for emoji.
 *
 * Resolve o bug onde `fotoUrl` "data:image/jpeg;base64,..." aparecia como TEXTO
 * em vez de imagem.
 */

interface Props {
  fotoUrl?: string;
  nome?: string;
  /** Tailwind classes (ex: "h-14 w-14") */
  className?: string;
  /** Tamanho do emoji fallback (ex: "text-4xl") */
  emojiSize?: string;
}

export function ProdutoFoto({
  fotoUrl,
  nome = "",
  className = "h-12 w-12",
  emojiSize = "text-3xl",
}: Props) {
  const isImage =
    fotoUrl &&
    (fotoUrl.startsWith("data:") || fotoUrl.startsWith("http") || fotoUrl.startsWith("/"));

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome}
        className={`${className} rounded-md object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-md bg-secondary flex items-center justify-center`}
    >
      <span className={emojiSize}>{fotoUrl || "📦"}</span>
    </div>
  );
}
