# BlockSense AI — Project Rules

## Design System (BlockSense_UIUX_Spec.docx v1.0)

### Colors
- Use ONLY colors from the teal/slate token system defined in `tailwind.config.ts`
- Primary action color: `teal-600` (#0D9488) — buttons, links, active states
- Hover: `teal-700` (#0F766E) · Active/pressed: `teal-800` (#115E59)
- Neutrals: `slate-*` scale for text, borders, backgrounds
- Status: `success-*`, `warning-*`, `error-*`, `info-*` — use sparingly
- No custom hex codes outside the token system. No purple. No green (#0F6E56 is retired).

### Typography
- Font: Inter via `next/font/google` (`var(--font-inter)`). Weights 400/500/600 ONLY.
- Numeric data must use `font-feature-settings: 'tnum'` (add class `tnum` or `tabular-nums`)
- Type scale: xs(12) sm(14) base(16) lg(18) xl(20) 2xl(24) 3xl(30) — no custom sizes

### Spacing
- All padding, margin, and gap must be multiples of 4px (Tailwind: p-1=4px, p-2=8px, etc.)
- No `p-3.5`, `mt-7`, or any non-4px-grid value

### Border Radius
- sm: 6px · md: 8px · lg: 12px · xl: 16px · full: 9999px
- Outer container always uses a larger radius than inner children

### Shadows (two-stop, subtle)
- Cards at rest: `shadow-xs` or border only
- Cards hover: `shadow-sm`
- Dropdowns/popovers: `shadow-md`
- Modals: `shadow-xl`

### Motion
- Animate `transform` and `opacity` ONLY — never `width`, `height`, `top`, `left`
- Default duration: 150ms, easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Streaming text: 30ms stagger

## Components

- Base components from `shadcn/ui` only — do not build from scratch or substitute
- Icons from `lucide-react` only — never mix icon libraries
- Animations via `framer-motion` only
- Forms via `react-hook-form` + `zod` only (same schema server + client)
- Toasts via `sonner` — bottom-right desktop, top-center mobile

## Data Layer

- Real-time data via Convex (`useQuery`, `useMutation`, `useAction`)
- No `useEffect`-based data fetching — use Convex hooks or TanStack Query
- Mutations: optimistic UI by default, rollback on error
- Lists > 50 items: virtualize with `@tanstack/react-virtual`

## Component States (every interactive component must have all of these)

- **Default** — resting state with real data (no Lorem ipsum)
- **Hover** — subtle bg/border change, 100–150ms transition, `cursor-pointer`
- **Focus** — 2px `teal-500` outline, 2px offset (keyboard accessible)
- **Active/Pressed** — scale(0.98) or darker shade
- **Disabled** — opacity 0.5, `cursor-not-allowed`, tooltip explaining why
- **Loading** — skeleton matching final layout shape, NEVER a bare spinner
- **Empty** — Lucide icon + headline + description + primary CTA button
- **Error** — friendly message + retry button (no stack traces to user)

## Layout

- AppShell: `Sidebar` (240px desktop, Sheet on mobile) + `Main` (TopBar 56px sticky + PageContent)
- Every page needs a `PageHeader` with `<h1>`, description, and primary action
- Bottom-right floating actions must not overlap fixed bottom nav on mobile
- Touch targets minimum 44×44 CSS pixels

## Mobile

- Build at 375px width first, then expand
- Sidebar collapses to Sheet on mobile
- Tables become scrollable with sticky first column, or card-list at mobile widths
- Test on real mid-range Android (Redmi/Samsung A-series), not just simulator

## Accessibility (WCAG 2.2 AA)

- Semantic HTML: `<button>` for actions, `<a>` for navigation — never `<div onClick>`
- Every icon-only button needs `aria-label`
- All form inputs need associated `<label>`
- Color contrast minimum 4.5:1 normal text, 3:1 large text
- Modal traps focus, restores on close; Esc closes modals and dropdowns

## Forbidden

- Custom hex codes outside the token system
- Spacing values not on the 4px grid
- Animating layout properties (width, height, top, left)
- Mixing icon libraries (Lucide only)
- Bare spinners as loading state (use skeletons)
- Empty list rendered as plain "No data" text
- Lorem ipsum or generic placeholder data
- `useEffect` for server data fetching
- Three or more accent colors
- Font weights other than 400, 500, 600

## Stack Reference

- Framework: Next.js 14 (App Router)
- Backend: Convex (real-time, serverless)
- Styling: Tailwind CSS + shadcn/ui
- Animations: Framer Motion
- Forms: react-hook-form + zod
- Icons: lucide-react
- Toasts: sonner
- Command palette: cmdk
- Charts: recharts (memo chart data with `useMemo`)
- Virtualization: @tanstack/react-virtual (lists > 50 items)
- Tables: @tanstack/react-table (headless)
- AI: Google Gemini via `@google/generative-ai` (key: `GOOGLE_AI_API_KEY` in Convex env)

## Repos

- Web: https://github.com/theyassirkhan/BlockSenseAI (Next.js 14, Convex, Vercel)
- Mobile: https://github.com/theyassirkhan/BlockSenseAI-Mobile (same stack, PWA)
- Both repos share the same Convex deployment. Every fix likely needs to be applied to both.
