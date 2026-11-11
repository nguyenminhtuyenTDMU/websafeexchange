---
name: CleanHandover
description: Escrow dapp for trading control of a Safe wallet, presented as a handover audit file.
colors:
  ground: "hsl(150 16% 97%)"
  ink: "hsl(160 25% 9%)"
  paper: "hsl(0 0% 100%)"
  hairline: "hsl(150 10% 87%)"
  field-stroke: "hsl(150 8% 76%)"
  muted-wash: "hsl(150 12% 93%)"
  muted-ink: "hsl(160 9% 34%)"
  accent-wash: "hsl(150 22% 90%)"
  vault-green: "hsl(158 64% 21%)"
  vault-green-foreground: "hsl(150 40% 97%)"
  focus-ring: "hsl(158 60% 30%)"
  shell: "hsl(160 52% 13%)"
  shell-foreground: "hsl(150 30% 94%)"
  shell-muted: "hsl(150 18% 72%)"
  signal: "hsl(146 72% 52%)"
  destructive: "hsl(2 70% 40%)"
  st-listed: "hsl(214 18% 38%)"
  st-prepare: "hsl(32 92% 31%)"
  st-funded: "hsl(206 78% 38%)"
  st-done: "hsl(146 66% 25%)"
  st-cancel: "hsl(220 6% 46%)"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.025em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "3px"
  md: "6px"
  lg: "9px"
  xl: "12px"
  full: "9999px"
spacing:
  gutter: "16px"
  doc-inset-mobile: "20px"
  doc-inset: "28px"
  ledger-row: "10px"
  finding-row: "12px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.vault-green}"
    textColor: "{colors.vault-green-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-lg:
    backgroundColor: "{colors.vault-green}"
    textColor: "{colors.vault-green-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 32px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 32px"
    height: "40px"
  button-shell:
    backgroundColor: "{colors.shell-foreground}"
    textColor: "{colors.shell}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "36px"
  status-pill-funded:
    backgroundColor: "{colors.st-funded}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  verdict-pass:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  verdict-fail:
    textColor: "{colors.destructive}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  seal-clean:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  copy-chip:
    backgroundColor: "{colors.muted-wash}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
---

# Design System: CleanHandover

## Overview

**Creative North Star: "The Handover Audit File"**

CleanHandover is bright desk-side fintech in the manner of Safe{Wallet}: a cool, faintly green-tinted off-white ground, white paper documents, ink text, and a deep vault-green shell that carries identity (the sticky header band, the trade document's head with its lifecycle rail, primary actions). Every trade reads as one audit file: a shell head stating where the trade stands, a state band when the wallet is frozen, tampered, completed or cancelled, the audit report with failing findings first, the one next action, and a ruled aside ledger of terms and on-chain events. Pages are dense and quiet; hierarchy comes from weight and hairline rules, not from boxes inside boxes.

Colour is semantic before it is decorative. One fresh signal green means "pass" and nothing else. Each lifecycle state owns one colour (listed slate, preparing amber, funded/frozen ice-blue, completed green, cancelled grey), and that colour follows the state everywhere it appears: status pill, status dot, state band, home lifecycle legend. Status and verdicts never rely on colour alone: every pill, verdict and step also carries a word and an icon.

Light is the designed default (daytime desk use beside Safe{Wallet} and Etherscan); dark is a secondary toggle that redefines every token.

**Key Characteristics:**
- Vault-green shell band for identity; white paper documents on a tinted ground.
- One signal green reserved for "pass"; one colour per lifecycle state.
- The trade page is one document divided by hairline rules, not a stack of cards.
- Be Vietnam Pro for all words; JetBrains Mono only for data values.
- Money never moves without a recap dialog.

## Colors

A restrained, cool-green neutral system with one deep brand green, one bright pass signal, and a fixed five-colour lifecycle vocabulary.

### Primary
- **Vault Green** (vault-green): primary buttons, focus ring family, links to trade ids in tables, text caret. In dark mode it lifts to a mid green and its foreground turns dark.
- **Shell** (shell): the sticky header band, the trade document head, the home page's lifecycle explainer panel. Text on it is shell-foreground; secondary text is shell-muted.

### Secondary
- **Signal Green** (signal): pass only. The clean audit seal fill, the ĐẠT verdict pill (30% wash), the passed-findings disc, the Mark's tick, the connected-wallet and network dots, text selection. Ink text sits on it, never white.

### Tertiary
- **Lifecycle colours** (st-listed slate, st-prepare amber, st-funded ice-blue, st-done green, st-cancel grey): one per contract state. They fill the shell status pill, colour the status dot and label in tables, and tint state bands at 10%. st-prepare doubles as the "contract handles it" (TỰ XỬ LÝ) verdict colour.
- **Destructive Red** (destructive): failing verdicts, the failing seal (10% wash), the tampered state band, the blocked lifecycle step, and destructive confirm actions.

### Neutral
- **Ground** (ground): page background, input fill.
- **Paper** (paper): documents, tables, form panels.
- **Ink** (ink): body text and headings.
- **Muted Ink** (muted-ink): secondary text, ledger keys, disclosure triggers.
- **Hairline** (hairline): every rule and border. **Field Stroke** (field-stroke): input borders.
- **Muted Wash** / **Accent Wash**: aside background (muted at 30%), copy chips, table header, row hover.

### Named Rules
**The Signal Means Pass Rule.** Signal green appears only where something has passed or is live-and-healthy (clean seal, ĐẠT, passed disc, connected dot). It is never a button, a link, or decoration.

**The State Owns Its Colour Rule.** A lifecycle state is shown in its own st-* colour wherever it appears, and no other element borrows those colours for unrelated meaning.

**The Never Colour Alone Rule.** Every status, verdict and step pairs its colour with a word and an icon or dot.

## Typography

**Body Font:** Be Vietnam Pro (self-hosted, 400/500/600/700, Vietnamese and Latin subsets), fallback system-ui.
**Data Font:** JetBrains Mono (self-hosted, 400/500, Latin), fallback ui-monospace.

**Character:** One humanist sans with full Vietnamese diacritic support carries every word, from the home headline to verdict labels; the mono is a tool for values a user must compare or copy.

### Hierarchy
- **Display** (600, 32px mobile / 40px desktop, 1.15, tight tracking): the home page headline only.
- **Headline** (600, 24px to 28px, tight tracking): page titles; the trade document title is 24px on the shell.
- **Title** (600, 18px): section heads such as the audit report title; sub-section heads are 16px/600.
- **Body** (400, 15px; 14px in ledgers, dialogs and explanations; 17px for the home lede, relaxed leading, max ~36rem): findings and running text. Headings balance-wrap; paragraphs pretty-wrap.
- **Label** (700, 11px, 0.025em tracking): verdict pills only (ĐẠT, CHƯA ĐẠT, TỰ XỬ LÝ), set as written words, not as section kickers.
- **Data** (JetBrains Mono 400, 13px; 12 to 12.5px inside sentences and copy chips): addresses, hashes, amounts, trade ids, nonces.

### Named Rules
**The Mono Is For Data Rule.** JetBrains Mono is used only for data values. An address inside a sentence is an inline, nowrap mono run at about 0.92em inside the sans text; asset kinds and words around it stay sans.

**The Tabular Numbers Rule.** Every number that can change or be compared (counts, prices, blocks, dates, thresholds) uses tabular numerals.

## Layout

Single centred column, max 72rem (1152px) with a 16px side gutter. The trade page is one article: the shell head (20px inset on mobile, 28px from sm), an optional full-width state band, then a two-column body on large screens: the main column (audit report, then the next action, 32px apart) and a fixed 360px aside (terms ledger, technical-details disclosure, on-chain event log) on a 30% muted wash, separated by a vertical hairline. Below lg the aside stacks under the main column behind a horizontal hairline.

The home page is a two-column split (copy and entry points left, the shell lifecycle explainer right) that stacks on mobile. List pages (trades, history) use a PageHeader (title, lede, bottom hairline, 24px below) over a bordered table that scrolls horizontally on narrow screens rather than reflowing. The sell form is a main column of grouped fields with a side panel holding the submit action.

Rhythm: ledger rows 10px vertical, finding rows 12px, sections 32px, page top padding 32px to 56px.

## Elevation & Depth

Mostly flat with soft, green-tinted ambient shadows on top-level surfaces only. Depth inside a document is conveyed by hairline rules and tonal washes, never by nested shadows.

### Shadow Vocabulary
- **Header** (`0 4px 10px -2px hsl(160 30% 10% / .08), 0 2px 4px -2px hsl(160 30% 10% / .06)`): sticky shell header and the trade article.
- **Panel lift** (`0 12px 24px -8px hsl(160 30% 10% / .14), 0 4px 8px -4px hsl(160 30% 10% / .08)`): the home page shell explainer panel.
- **Resting** (`0 1px 2px hsl(160 30% 10% / .06), 0 1px 3px hsl(160 30% 10% / .05)`): tables and form panels.
- **Press feedback**: buttons darken by an overlay (3% on hover, 7% on press) instead of moving or casting a shadow.

### Named Rules
**The One Shadow Per Surface Rule.** Only the outermost surface casts a shadow; sections and containers inside it are separated by hairlines (an outline button's 1px resting shadow is the only exception).

## Shapes

Gently rounded and consistent: 3px for verdict pills and threat-code tags, 6px for buttons, inputs, copy chips and nav items, 9px for the audit seal, tables and form panels, 12px for the trade article and the home shell panel. Status pills and dots are fully round. The lifecycle rail is 6px-tall rounded bars. The authored Mark is a 5px-radius rounded square outline with a signal-green tick. Borders are 1px hairlines everywhere; a dashed hairline marks empty states.

## Components

### Buttons
Calm and solid; the colour says what kind of act it is.
- **Shape:** gently rounded (6px), min-height 36px (40px for the large money actions).
- **Primary:** vault-green fill, light text, 500 weight, 14px. Large primary carries the amount in its label ("Xem lại và nạp 0.001 ETH").
- **Hover / Focus:** a 3% ink overlay on hover, 7% on press; 2px focus outline in the ring green with 2px offset.
- **Outline:** transparent with a 10% ink border; used for secondary navigation and for every cancel option.
- **Destructive:** red fill, white text; only as the primary action when the buyer must reclaim funds after tampering, and as the confirm button inside cancel dialogs.
- **Shell button:** on the vault-green header, "Connect wallet" inverts (shell-foreground fill, shell text); once connected it becomes an outlined mono address with a signal dot.

### Chips
- **Status pill (in shell):** fully round, filled with the state's st-* colour, white 14px/600 text.
- **Status label (in tables):** st-* coloured 14px/600 text with an 8px dot, no fill.
- **Verdict pill:** 3px radius, 11px/700 word plus a 14px icon. Pass: 30% signal wash with ink text. Fail: 10% destructive wash, destructive text. Pending: 10% amber wash, amber text.
- **Threat tag:** hairline-bordered 11px muted code (T1 to T10) with a tooltip.
- **Network chip:** hairline pill on the shell with a signal dot.

### Cards / Containers
- **Trade article:** paper, 12px radius, hairline border, header shadow, overflow clipped so the shell head fills the top.
- **Tables and form panels:** paper, 9px radius, hairline border, resting shadow.
- **Internal Padding:** 20px mobile, 28px desktop for the trade document; 16px to 20px for panels.

### Inputs / Fields
- **Style:** 36px tall, 6px radius, field-stroke border, ground fill, 14px text on desktop (16px on mobile to avoid zoom). Address and amount fields render their value in mono.
- **Focus:** 2px ring-green ring with 2px offset.
- **Disabled:** 50% opacity, not-allowed cursor.

### Navigation
Sticky 56px vault-green band. Mark plus "CleanHandover" (17px/600) left, three text links (14px/500, shell-muted; active and hover turn shell-foreground, active gains a 10% light fill, 6px radius). Right: network chip, theme toggle, connect wallet. Below md the links move into a right-side sheet on paper.

### Lifecycle Rail
Four equal columns on the shell (Niêm yết, Chuẩn bị ví, Nạp tiền, Hoàn tất). Done steps: 55% shell-foreground bar and a tick (a lock for the funding step while frozen). Current step: solid shell-foreground bar with a 2px translucent ring, a dot and 600 weight. A blocked step (wallet tampered after funding) turns the bar and dot destructive and appends "(bị khóa)". Future steps: 15% bar, shell-muted label. Colour transitions over 500ms.

### Audit Report
Title and "x/y điều kiện đạt" count on the left, the seal on the right. The seal is a solid, non-button block: signal fill with a shield-check and the clean label when everything passes; 10% destructive wash with a shield-alert and "n điểm chưa đạt" otherwise. Findings sit between top and bottom hairlines in a 92px verdict column plus content column; failing findings come first with their numbered fix steps open (indented behind a hairline, each copyable value in a full-width copy chip), then pending, then passed findings collapsed behind a signal-disc disclosure.

### Copy Chip
Full value in 12.5px mono on a 60% muted wash, truncated with a title, joined to a paper "Sao chép" button by a hairline; confirms with a green tick for 1.5s.

### State Band
Full-width band under the shell head, 10% wash of the state colour, 20px icon plus a bold state sentence and one line of consequence: frozen (ice-blue, lock), tampered (destructive, lock, role="alert"), completed (green, check), cancelled (muted, ban).

### Confirm Dialog
Every money-moving or irreversible action opens a recap dialog first: a title, a ledger of exactly what is paid, locked, transferred or refunded, an optional acknowledgement checkbox that gates the action, "Quay lại" and an action button that repeats the amount. Cancels use the destructive action style.

## Do's and Don'ts

### Do:
- **Do** keep signal green for pass only: clean seal, ĐẠT pill, passed disc, live dots.
- **Do** fill the shell status pill with the state's own st-* colour, and use the same colour for that state's dot and band.
- **Do** light the current lifecycle step in shell-foreground with a ring, and turn a blocked step destructive with a word, not just a colour.
- **Do** build the trade page as one article divided by hairline rules: shell head, state band, main column, ruled aside.
- **Do** route every deposit, finalize, cancel and refund through a recap dialog that names the amount and addresses.
- **Do** put every cancel option under the single "Lựa chọn hủy giao dịch" disclosure, below the primary action.
- **Do** set addresses as nowrap mono runs inside sans sentences, with copy and Etherscan links.
- **Do** list failing findings first with concrete fix steps open, and collapse passed ones.

### Don't:
- **Don't** use signal green for buttons, links, headings or decoration.
- **Don't** stack cards inside the trade document or give inner sections their own shadow.
- **Don't** set prose, labels or headings in mono; mono is for data values only.
- **Don't** put eyebrow or kicker labels above headings.
- **Don't** let money move from a single click without the recap dialog.
- **Don't** show status, verdict or step state by colour alone.
- **Don't** scatter cancel buttons beside the primary action.
