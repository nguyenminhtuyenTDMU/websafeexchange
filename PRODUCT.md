# Product


## Platform

web

## Users

- **Seller:** the current owner of a Safe multisig wallet who wants to sell control of the wallet (and optionally assets inside it) to a specific buyer. Uses a desktop browser with a wallet extension (MetaMask), switching between this dapp, Safe{Wallet} (app.safe.global) and Etherscan.
- **Buyer:** a known counterparty who pays to become the sole controller of that wallet. Wants proof, before paying and at the moment of payment release, that the wallet is handed over clean.
- **Viewer:** anyone, including the thesis committee, checking trades, history and the contract's behavior without a wallet.

## Product Purpose

CleanHandover lets two parties who do not trust each other trade control of a Safe wallet without an intermediary. The buyer's payment is released only when the escrow contract itself has handed the wallet over and verified it is clean. Success: a full trade completes on Sepolia through the dapp, and every failed condition on the way is explained with a concrete fix.

## Positioning

The escrow contract performs the handover itself as the Safe's only module and checks a precise definition of "clean handover" (official singleton, only the new owners, agreed threshold, no modules, no guard or module guard, valid fallback handler, the buyer's expected assets present) in the same transaction that credits the seller. The wallet's nonce is frozen from the buyer's deposit, so the seller cannot act on the wallet after payment.

## Operating Context

- Graduation thesis (Thu Dau Mot University, Institute of Digital Technology), graded against an approved outline; defended live in late December 2026.
- Testnet only: Sepolia. Contracts are immutable, have no admin key, and are source-verified on Etherscan.
- Seller and buyer each use their own browser profile and wallet; Safe configuration changes are done by the seller in Safe{Wallet} or Remix.
- UI language is Vietnamese; contract terms (owner, module, guard, fallback handler, nonce) stay in English where Vietnamese has no settled term.

## Capabilities and Constraints

- Static single-page app (React + TypeScript + Tailwind + wagmi/viem), hash routing, deployable to static hosting; no server and no database. Lists and history come from scanning contract events in the browser.
- Functions: list a wallet (seller), handover assistant, deposit with the buyer's expected asset set, finalize, cancel (seller, buyer when suspicious, anyone after deadline), withdraw, and three lookup screens: open trades, trade detail, history by address.
- The assistant only diagnoses and guides; it never builds or sends Safe transactions for the seller (outline requirement).
- Each assistant condition maps to a threat-model scenario T1–T10.
- Out of scope (future work in the outline): on-chain reputation profiles, listing/community area, forum.

## Brand Commitments

- Name: CleanHandover.
- Visual direction chosen by the author: bright fintech in the manner of Safe{Wallet}, with the handover assistant presented like an audit report (pass/fail findings, threat codes).

## Evidence on Hand

- Escrow v2.1 `0xD0a1fed458bDA47758137EC06aa72c297009c351`, verifier and four asset checkers on Sepolia, all Etherscan-verified (docs/DEPLOYMENTS.md).
- One completed real trade on the previous escrow (docs/SEPOLIA_DEMO.md); no trades yet on v2.1.
- Test suite results and security analysis (docs/SECURITY_ANALYSIS.md). No users, testimonials or usage numbers exist; never invent them.

## Product Principles

1. Money moves only on proof: every irreversible action shows exactly what is being locked or released before the wallet prompt.
2. The contract decides, the interface explains: never imply the UI can override or fake a check.
3. Every failed condition comes with the next concrete step.
4. Verifiable by anyone: addresses, hashes and transactions link to Etherscan.

## Accessibility & Inclusion

Pass/fail and status must never rely on color alone; Vietnamese diacritics must render correctly in every face used.
