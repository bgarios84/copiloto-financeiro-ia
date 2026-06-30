"use client";

/**
 * MarketDataClient — UI de administração de cotações B3
 * Sprint 7.2
 * Sprint 10.2 — dark premium redesign (sem dark: prefixes)
 */

import { useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { updateB3Quotes } from "@/services/market-data/update-b3-quotes";
import type { UpdateQuotesResult } from "@/lib/market-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketDataClient() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<UpdateQuotesResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    const res = await updateB3Quotes([]);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">

      {/* ── Painel principal ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-200">Cotações B3</h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Atualiza todos os ativos em{" "}
              <code className="font-mono text-[12px] text-zinc-400">b3_asset</code>{" "}
              via brapi.dev
            </p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando..." : "Atualizar cotações"}
          </button>
        </div>

        {/* Resultado de sucesso */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-[13px] font-medium">
                {result.updated} {result.updated === 1 ? "ativo atualizado" : "ativos atualizados"} via {result.provider}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/60 p-3">
                <p className="text-[11px] text-zinc-500">Atualizados</p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">{result.updated}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/60 p-3">
                <p className="text-[11px] text-zinc-500">Falhas</p>
                <p className={`text-xl font-bold mt-0.5 ${result.failed.length > 0 ? "text-red-400" : "text-zinc-500"}`}>
                  {result.failed.length}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/60 p-3">
                <p className="text-[11px] text-zinc-500">Horário</p>
                <p className="text-[11px] font-mono text-zinc-300 mt-0.5">
                  {fmtDatetime(result.updatedAt)}
                </p>
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/25 bg-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[13px] text-amber-400">
                  <p className="font-medium mb-1">Tickers sem cotação:</p>
                  <p className="font-mono text-[12px]">{result.failed.join(", ")}</p>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-[12px] font-semibold text-red-400 mb-1">Erros detalhados:</p>
                <ul className="space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-[11px] text-red-400 font-mono">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Erro fatal */}
        {error && (
          <div className="flex items-start gap-2 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-400">Erro ao atualizar</p>
              <p className="text-[13px] text-red-400 mt-0.5 font-mono">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Painel de configuração ───────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-400" />
          <h2 className="text-[15px] font-semibold text-zinc-200">Configuração e Limitações</h2>
        </div>

        <div className="space-y-4 text-[13px] text-zinc-400">
          <div>
            <p className="font-semibold text-zinc-300 mb-1">Variáveis de ambiente (.env.local)</p>
            <div className="font-mono text-[12px] rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 space-y-1">
              <p><span className="text-emerald-500"># Obrigatória para escrever cotações no banco:</span></p>
              <p className="text-zinc-300">SUPABASE_SERVICE_ROLE_KEY=<span className="text-zinc-500">{"<Dashboard → Settings → API → service_role>"}</span></p>
              <p className="mt-2"><span className="text-emerald-500"># Opcional — sem ela usa brapi modo público:</span></p>
              <p className="text-zinc-300">BRAPI_API_KEY=<span className="text-zinc-500">{"<brapi.dev → Dashboard → Token>"}</span></p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-zinc-300 mb-1">Plano gratuito brapi.dev</p>
            <ul className="space-y-1 list-disc list-inside text-zinc-500">
              <li>Sem API key: ~2 req/min por IP, sem histórico</li>
              <li>Com API key (Basic): 120 req/min, histórico disponível</li>
              <li>Endpoint: <code className="font-mono text-[11px] text-zinc-400">GET /api/quote/&#123;symbols&#125;</code></li>
              <li>Registre-se em <code className="font-mono text-[11px] text-zinc-400">brapi.dev</code> para obter uma chave gratuita</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-zinc-300 mb-1">Próximos passos</p>
            <ul className="space-y-1 list-disc list-inside text-zinc-500">
              <li>Sprint 7.3: Cron diário via Supabase Edge Function ou Vercel Cron</li>
              <li>Sprint 7.4: Adicionar novos ativos automaticamente via brapi</li>
              <li>Trocar provider: editar <code className="font-mono text-[11px] text-zinc-400">src/lib/market-data/index.ts</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
