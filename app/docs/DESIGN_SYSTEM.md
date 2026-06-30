# Design System — Copiloto Financeiro IA

Sprint 10.2 · Premium dark-only theme

---

## Princípios

1. **Dark-only**: classes zinc explícitas — sem prefixo `dark:`, sem variáveis CSS (`bg-card`, `text-foreground`). O visual é idêntico independente do tema do sistema.
2. **Escala de cinzas zinc**: `zinc-900/60` para cards, `zinc-800` para inputs/hover, `zinc-950` para modais.
3. **Azul como cor primária**: `blue-600` → hover `blue-500` (nunca `blue-700`).
4. **Bordas sutis**: `border-zinc-800` padrão, `border-zinc-700` em inputs.
5. **Texto**: primário `zinc-100`, secundário `zinc-400`, muted `zinc-500`/`zinc-600`.

---

## Import

```ts
import { DS } from "@/components/ds";
// ou named imports:
import { CARD, BTN_PRIMARY, INPUT, LABEL } from "@/components/ds";
```

---

## Tokens

### Cards

| Token | Classe |
|---|---|
| `DS.CARD` | `rounded-xl border border-zinc-800 bg-zinc-900/60 p-4` |
| `DS.CARD_HOVER` | `...` + `transition-colors hover:bg-zinc-900/80 hover:border-zinc-700` |

```tsx
<div className={DS.CARD}>
  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Label</p>
  <p className="text-xl font-bold text-zinc-100 mt-1">R$ 12.345,00</p>
</div>
```

---

### Botões

| Token | Uso |
|---|---|
| `DS.BTN_PRIMARY` | Ação principal (criar, salvar) |
| `DS.BTN_PRIMARY_LG` | Versão maior (px-5 py-2.5) |
| `DS.BTN_SECONDARY` | Ação secundária (cancelar) |
| `DS.BTN_GHOST` | Ação terciária, sem borda |
| `DS.BTN_DANGER` | Ação destrutiva (excluir confirmado) |
| `DS.BTN_ICON` | Botão ícone neutro |
| `DS.BTN_ICON_DANGER_CONFIRM` | Ícone delete em modo confirm |
| `DS.BTN_ICON_DANGER_IDLE` | Ícone delete idle |

```tsx
<button className={DS.BTN_PRIMARY}>
  <Plus className="w-4 h-4" />
  Nova Posição
</button>

<button className={DS.BTN_SECONDARY}>Cancelar</button>
```

---

### Inputs

| Token | Uso |
|---|---|
| `DS.INPUT` | `<input>` text/number/date |
| `DS.SELECT` | `<select>` |
| `DS.TEXTAREA` | `<textarea>` |
| `DS.LABEL` | `<label>` acima do input |
| `DS.SEARCH_INPUT` | Input de busca (usa pl-9 para ícone) |

```tsx
<div>
  <label className={DS.LABEL}>Nome *</label>
  <input type="text" className={DS.INPUT} placeholder="Ex: PETR4" />
</div>
```

---

### Tabela

| Token | Uso |
|---|---|
| `DS.TABLE_WRAPPER` | `<div>` container da tabela |
| `DS.TABLE_HEADER_ROW` | `<tr>` do `<thead>` |
| `DS.TABLE_TH` | `<th>` genérico |
| `DS.TABLE_TH_LEFT` | `<th>` alinhado à esquerda (col 1) |
| `DS.TABLE_TH_RIGHT` | `<th>` alinhado à direita |
| `DS.TABLE_ROW` | `<tr>` do `<tbody>` com hover |
| `DS.TABLE_TD` | `<td>` secundário |
| `DS.TABLE_TD_MAIN` | `<td>` principal (negrito, zinc-100) |

```tsx
<div className={DS.TABLE_WRAPPER}>
  <table className="w-full">
    <thead>
      <tr className={DS.TABLE_HEADER_ROW}>
        <th className={DS.TABLE_TH_LEFT}>Ativo</th>
        <th className={DS.TABLE_TH_RIGHT}>Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr className={DS.TABLE_ROW}>
        <td className={DS.TABLE_TD_MAIN}>PETR4</td>
        <td className={`${DS.TABLE_TD} text-right`}>R$ 3.800,00</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### Modal

```tsx
<div className={DS.MODAL_OVERLAY}>
  <div className={DS.MODAL_PANEL}>
    <div className={DS.MODAL_HEADER}>
      <h2 className={DS.MODAL_TITLE}>Título</h2>
      <button onClick={onClose} className={DS.BTN_ICON}>
        <X className="w-5 h-5" />
      </button>
    </div>
    <form className={DS.MODAL_BODY}>
      {/* campos */}
      <div className={DS.MODAL_FOOTER}>
        <button type="button" className={`flex-1 ${DS.BTN_SECONDARY}`}>Cancelar</button>
        <button type="submit" className={`flex-1 ${DS.BTN_PRIMARY}`}>Salvar</button>
      </div>
    </form>
  </div>
</div>
```

---

### Alertas / Feedback

| Token | Uso |
|---|---|
| `DS.ALERT_ERROR` | Erros (vermelho) |
| `DS.ALERT_WARNING` | Avisos (âmbar) |
| `DS.ALERT_SUCCESS` | Sucesso (verde) |
| `DS.ALERT_INFO` | Informativo (azul) |

```tsx
{error && (
  <div className={DS.ALERT_ERROR}>
    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
    <span>{error}</span>
  </div>
)}
```

---

### Estado vazio

```tsx
<div className={DS.EMPTY_WRAPPER}>
  <div className={DS.EMPTY_ICON_BOX}>
    <Building2 className="w-6 h-6 text-zinc-500" />
  </div>
  <p className={DS.EMPTY_TITLE}>Nenhuma conta cadastrada</p>
  <p className={DS.EMPTY_DESC}>Adicione sua primeira conta para começar.</p>
  <button className={`mt-5 ${DS.BTN_PRIMARY}`}>Adicionar conta</button>
</div>
```

---

### Badges

| Token | Cor |
|---|---|
| `DS.BADGE_DEFAULT` | zinc |
| `DS.BADGE_BLUE` | blue |
| `DS.BADGE_GREEN` | emerald |
| `DS.BADGE_AMBER` | amber |
| `DS.BADGE_RED` | red |
| `DS.BADGE_VIOLET` | violet |

---

### Tipografia

| Token | Uso |
|---|---|
| `DS.PAGE_TITLE` | Título da página (`h1`) |
| `DS.PAGE_SUBTITLE` | Subtítulo embaixo do título |
| `DS.SECTION_TITLE` | Título de seção dentro de card |
| `DS.TEXT_BODY` | Texto de corpo zinc-300 |
| `DS.TEXT_MUTED` | Texto muted zinc-500 |

---

### Utilitários

| Token | Uso |
|---|---|
| `DS.DIVIDER` | `border-t border-zinc-800` |
| `DS.SPINNER` | Spinner de loading (h-4 w-4) |

---

## Paleta de cores

| Uso | Classe |
|---|---|
| Background página | `bg-zinc-950` |
| Card/panel | `bg-zinc-900/60` |
| Input/hover | `bg-zinc-800` |
| Modal | `bg-zinc-950` |
| Borda padrão | `border-zinc-800` |
| Borda input | `border-zinc-700` |
| Texto primário | `text-zinc-100` |
| Texto secundário | `text-zinc-400` |
| Texto muted | `text-zinc-500` / `text-zinc-600` |
| Azul ação | `bg-blue-600 hover:bg-blue-500` |
| Verde sucesso | `text-emerald-400` |
| Vermelho erro | `text-red-400` |
| Âmbar aviso | `text-amber-400` |
| Violeta proventos | `text-violet-400` |

---

## Anti-patterns

❌ **Nunca use:**
```tsx
bg-white dark:bg-zinc-900   // light-mode bleed
text-foreground              // CSS variable — resolve claro em light mode
border-border                // CSS variable
hover:bg-blue-700            // hover errado (use blue-500)
rounded-xl                   // para botões (use rounded-lg)
```

✅ **Use:**
```tsx
bg-zinc-900/60              // card
text-zinc-100               // texto primário
border-zinc-800             // borda
hover:bg-blue-500           // hover de botão primário
rounded-lg                  // botões e inputs
rounded-xl                  // cards e modais
```

---

## Arquivos de referência (implementação correta)

- `src/app/investments/InvestmentsClient.tsx` — cards, tabela, empty state
- `src/app/investments/InvestmentItem.tsx` — table row, badges, ações
- `src/app/investments/InvestmentFormModal.tsx` — modal, inputs, footer
- `src/app/investments/[id]/trades/TradesClient.tsx` — tabela com legenda
- `src/app/investments/[id]/trades/TradeFormModal.tsx` — modal com tipo seletor
- `src/app/settings/open-finance/OpenFinanceClient.tsx` — health panel, reconect

---

## Histórico de sprints

| Sprint | Escopo |
|---|---|
| 10.1 | Redesign `/investments` — dark premium |
| 10.2 | Design System unificado — trades, admin, DS primitives, documentação |
