/**
 * Endpoint de debug — mostra se as credenciais Cloudflare estão configuradas
 * e tenta uma chamada real pra ver o erro exato.
 *
 * IMPORTANTE: este endpoint NÃO revela os valores das credenciais.
 * Mostra só comprimentos e prefixos pra ajudar a diagnosticar.
 *
 * Como usar: abre https://confere-pix.vercel.app/api/ai/debug no navegador
 */

import { NextResponse } from "next/server";

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const diag: Record<string, unknown> = {
    hasCloudflareAccountId: !!accountId,
    accountIdLength: accountId?.length ?? 0,
    accountIdPrefix: accountId ? accountId.slice(0, 4) + "…" : null,
    hasCloudflareApiToken: !!apiToken,
    apiTokenLength: apiToken?.length ?? 0,
    apiTokenPrefix: apiToken ? apiToken.slice(0, 4) + "…" : null,
  };

  if (!accountId || !apiToken) {
    diag.problema =
      "Faltam credenciais no Vercel. Roda: npx vercel env add CLOUDFLARE_ACCOUNT_ID production / npx vercel env add CLOUDFLARE_API_TOKEN production / npx vercel --prod";
    return NextResponse.json(diag);
  }

  // Teste 1: chamar o endpoint /accounts/{id}/tokens/verify pra validar o token
  try {
    const verifyRes = await fetch(
      `https://api.cloudflare.com/client/v4/user/tokens/verify`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiToken}` },
      }
    );
    const verifyJson = await verifyRes.json();
    diag.tokenVerify = {
      status: verifyRes.status,
      ok: verifyJson?.success === true,
      result: verifyJson?.result ?? null,
      errors: verifyJson?.errors ?? null,
    };
  } catch (e) {
    diag.tokenVerifyError = (e as Error).message;
  }

  // Teste 2: chamar LLaVA 1.5 com 3 formatos diferentes pra descobrir qual funciona
  // JPEG 64x64 cinza (imagem maior, válida, real)
  const sampleJpegBase64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD/AD/6KKKAP//Z";

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`;

  // Formato A: base64 string direto (mais novo, recomendado)
  try {
    const aiRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: sampleJpegBase64,
        prompt: "Describe this image in one short sentence.",
        max_tokens: 100,
      }),
    });
    const aiText = await aiRes.text();
    diag.testA_base64String = {
      status: aiRes.status,
      ok: aiRes.ok,
      response: aiText.slice(0, 400),
    };
  } catch (e) {
    diag.testA_error = (e as Error).message;
  }

  // Formato B: array de bytes
  try {
    const buffer = Buffer.from(sampleJpegBase64, "base64");
    const imageArray = Array.from(buffer);
    const aiRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageArray,
        prompt: "Describe this image in one short sentence.",
        max_tokens: 100,
      }),
    });
    const aiText = await aiRes.text();
    diag.testB_bytesArray = {
      status: aiRes.status,
      ok: aiRes.ok,
      response: aiText.slice(0, 400),
    };
  } catch (e) {
    diag.testB_error = (e as Error).message;
  }

  // Formato C: data URL
  try {
    const aiRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${sampleJpegBase64}`,
        prompt: "Describe this image in one short sentence.",
        max_tokens: 100,
      }),
    });
    const aiText = await aiRes.text();
    diag.testC_dataUrl = {
      status: aiRes.status,
      ok: aiRes.ok,
      response: aiText.slice(0, 400),
    };
  } catch (e) {
    diag.testC_error = (e as Error).message;
  }

  return NextResponse.json(diag, { status: 200 });
}
