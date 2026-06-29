"use client";

/**
 * MarketDataClient — UI de administração de cotações B3
 * Sprint 7.2
 */

import { useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { updateB3Quotes } from "@/services/market-data/update-b3-quotes";
import type { UpdateQuotesResult } from "@/lib/market-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketDataClient() {
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<UpdateQuotesResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    // Atualiza todos os ativos ativos (tickers=[])
    const res = await updateB3Quotes([]);

    if (res.error) {
      setError(res.error);
    } else {
      setResult(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Painel principal */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              Cotações B3
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Atualiza todos os ativos cadastrados em <code className="font-mono text-xs">b3_asset</code> via brapi.dev
            </p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando..." : "Atualizar cotações"}
          </button>
        </div>

        {/* Resultado de sucesso */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                {result.updated} {result.updated === 1 ? "ativo atualizado" : "ativos atualizados"} via {result.provider}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Atualizados</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {result.updated}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Falhas</p>
                <p className={`text-xl font-bold mt-0.5 ${result.failed.length > 0 ? "text-red-500" : "text-zinc-400"}`}>
                  {result.failed.length}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Horário</p>
                <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
                  {fmtDatetime(result.updatedAt)}
                </p>
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-1">Tickers sem cotação:</p>
                  <p className="font-mono">{result.failed.join(", ")}</p>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Erros detalhados:</p>
                <ul className="space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-500 dark:text-red-400 font-mono">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Erro fatal */}
        {error && (
          <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Erro ao atualizar</p>
              <p className="text-sm text-red-500 dark:text-red-400 mt-0.5 font-mono">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel de configuração */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Configuração e Limitações
          </h2>
        </div>

        <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Variáveis de ambiente (.env.local)</p>
            <div className="font-mono text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 space-y-1">
              <p><span className="text-emerald-600"># Obrigatória para escrever cotações no banco:</span></p>
              <p>SUPABASE_SERVICE_ROLE_KEY=<span className="text-zinc-400">{"<Dashboard → Settings → API → service_role>"}</span></p>
              <p className="mt-2"><span className="text-emerald-600"># Opcional — sem ela usa brapi modo público:</span></p>
              <p>BRAPI_API_KEY=<span className="text-zinc-400">{"<brapi.dev → Dashboard → Token>"}</span></p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Plano gratuito brapi.dev</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Sem API key: ~2 req/min por IP, sem histórico</li>
              <li>Com API key (Basic): 120 req/min, histórico disponível</li>
              <li>Endpoint: <code className="font-mono text-xs">GET /api/quote/&#123;symbols&#125;</code></li>
              <li>Registre-se em <code className="font-mono text-xs">brapi.dev</code> para obter uma chave gratuita</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Próximos passos</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Sprint 7.3: Cron diário via Supabase Edge Function ou Vercel Cron</li>
              <li>Sprint 7.4: Adicionar novos ativos automaticamente via brapi</li>
              <li>Trocar provider: editar <code className="font-mono text-xs">src/lib/market-data/index.ts</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
