# ArtiSol – Frontend‑Only Copilot Prompt
Modern Web3 dashboard UI for ArtistRegistry (no backend code)

## Goal
Build the frontend UI only for ArtiSol, a Web3 dashboard for artisans using the ArtistRegistry ERC721 contract.
Focus: pages, components, layout, styling, and UI interactions.
Assume all contract hooks and APIs already exist (you will just call them).

## Tech + Constraints
- Framework: Next.js App Router with TypeScript
- UI: React + Tailwind CSS (modern, elegant, responsive)
- Extra UX: Framer Motion for subtle animations (optional but preferred)
- Icon set: lucide-react or similar
- Do NOT write Solidity or backend APIs here

Assume hooks like:

```ts
useArtisanStats(address)

usePlatformStats()

useBestNFT(address)
```

are already implemented and return data.

## Design Language (Frontend)
Brand name: ArtiSol

Look & feel:
- Clean, modern, slightly premium
- Inspired by artisan/craft aesthetics (subtle textures, not too noisy)

Colors:
- Primary: #0D7B7A (deep teal)
- Secondary: #D4A574 (warm gold)
- Background: #F5F3EF (light cream) for light mode
- Text dark: #1A1A1A

Use:
- Rounded corners (12–16px)
- Glass‑morphism cards (transparent + blur)
- Smooth hover effects
- Dark mode ready (but frontend structure first)

## High‑Level Screens (Frontend)
Create React components + pages for the following:

### 1) Landing Page (app/page.tsx)
Purpose: Public marketing page before wallet connect.

Sections:

**Hero**
- Big headline: “Empowering artisans with Web3 authenticity.”
- Subtext: One line explaining NFTs + royalties in simple language.
- Primary button: “Connect wallet & enter dashboard”
- Secondary button: “Explore how ArtiSol works” (scrolls to how‑it‑works section)
- Right side: artisan / saree / craft themed illustration or hero image container.

**Problem → Solution section**
- Left block: “The problem” (Kokri story, middlemen, counterfeits) – short summary.
- Right block: “The ArtiSol solution” with bullet points:
  - NFT proof of creation
  - 10% automatic royalties
  - Direct artist → buyer
- Use a before/after style card layout.

**Key Metrics (Static marketing)**
3–4 marketing stats (not live blockchain data here):
- “30M+ artisans globally”
- “3–4x potential income increase”
- “10% lifetime royalties”
Use simple stat cards with icons.

**How It Works (Steps)**
4–5 step cards:
- Connect wallet
- Create artisan profile
- Mint NFT of artwork
- Sell to collectors
- Earn 10% on every resale
Horizontal scroll on mobile.

**CTA Section**
Centered card:
- Text: “Ready to see your artisan dashboard?”
- Button: “Open my dashboard” → /home

### 2) Authenticated Home Dashboard (app/home/page.tsx)
This is the main artisan dashboard UI after wallet connect.

Assume you already have:

```ts
const { address } = useAccount();
const { data: artisanStats, isLoading: artisanLoading } = useArtisanStats(address);
const { data: platformStats, isLoading: platformLoading } = usePlatformStats();
const { data: bestNFT, isLoading: bestNFTLoading } = useBestNFT(address);
```

#### Layout
Use a dashboard shell:
- Top navbar
- Left sidebar on desktop (collapsible on mobile)
- Main content area with scrollable body

#### Navbar
- Left: ArtiSol logo + text
- Middle: page title (“My Dashboard”)
- Right:
  - Current address (shortened)
  - Simple pill showing “Network: Ethereum / Polygon”
  - Avatar circle with dropdown (Profile, Settings, Logout) – dummy onClick handlers

#### Sidebar (just UI)
Items:
- Dashboard (active)
- My NFTs
- Mint NFT
- Earnings
- Learn
Use icons + text. Collapse to icon‑only on smaller widths.

#### Main Content Sections
**Welcome / Hero Card**
Card at top:
- “Welcome back, Artisan!”
- Show shortened address
- Simple chip: “Creator Mode”
- Button: “Mint new NFT” → /dashboard/artisan/create-nft
Style: Glass card with subtle gradient.

**MVP Stats Grid – 4 Must‑Have Metrics**
Create a StatsGrid component that renders 4 StatCards in a responsive grid.

Required cards (just UI, assume data props):
- My NFTs Minted
  - Value: artisanStats.nftsMinted
  - Subtitle: “Total NFTs you’ve created”
  - Icon: brush/crown icon
- My Earnings
  - Value: formatted currency (already computed and passed as string)
  - Subtitle: “Primary sales earnings”
  - Icon: wallet / rupee icon
- Total Platform NFTs
  - Value: platformStats.totalNFTs
  - Subtitle: “NFTs minted on ArtiSol”
  - Icon: layers / grid icon
- Total Artists
  - Value: platformStats.totalArtists
  - Subtitle: “Artisans on‑chain”
  - Icon: users icon

Design StatCard to support:

```ts
type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
};
```

Show skeleton loaders when loading is true.
On hover: slight scale + shadow.

**Extended Stats Row – 6 “Impressive” Metrics**
Below the MVP grid, add another responsive grid (up to 3 columns on desktop, 1 on mobile).

Cards (UI only, expect props):
- My Royalties
  - Value: from artisanStats.totalRoyalties
  - Subtitle: “Resale royalties earned”
- Average Price
  - Value: from artisanStats.averagePrice
  - Subtitle: “Avg primary sale price”
- Monthly Growth
  - Value: a percentage string (e.g., “+32%” provided as prop)
  - Subtitle: “This month vs last month”
- Best NFT
  - Title line with NFT name (from bestNFT.title)
  - Second line: price
  - Small “View NFT” button (no actual navigation needed here)
- Total Collectors
  - Value: platformStats.totalCollectors
  - Subtitle: “Unique collectors on ArtiSol”
- Platform Value
  - Value: from platformStats.totalPlatformValue
  - Subtitle: “Sum of all primary sale prices”

These can reuse the same StatCard component, but for Best NFT, you can create a BestNftCard with image placeholder and title.

**Charts Section (Frontend Only)**
Add a section titled “Earnings Overview” with two placeholder charts using any chart library or simple divs for now:
- Left: “Sales vs Royalties” – donut/pie chart placeholder component
- Right: “Last 12 Months Earnings” – line chart placeholder
Make them responsive and wrap on small screens.

**Quick Actions Bar**
At the bottom or side:
3 buttons:
- “Mint New NFT”
- “View My NFTs”
- “Withdraw Earnings”
Just route navigation + nice button styling.

### 3) “My NFTs” Page (app/dashboard/artisan/my-nfts/page.tsx)
Pure frontend:
- Page title: “My NFTs”
- Filters toolbar:
  - Search input
  - Filter pills: All, Listed, Sold, Auction
- Grid of NFT cards:
  - Image
  - Title
  - Price
  - Status badge
  - “View details” button
Use a reusable NftCard component.

### 4) “Mint NFT” Page (app/dashboard/artisan/create-nft/page.tsx)
Frontend form UI only, no actual write calls:
- Multi‑step layout or single page with sections:
  - Upload artwork (drag & drop area)
  - Basic details (title, description, category select)
  - Pricing (flat price input)
  - Info text: “Royalties are fixed at 10% on every resale”
- Use react-hook-form style form (even if logic not implemented fully)
- “Preview” card on the right showing how the NFT card will look
- Submit button: “Mint NFT” (just onSubmit placeholder)

### 5) Common Components to Implement (UI Only)
Build these reusable components:
- Navbar
- Sidebar
- StatCard
- StatsGrid
- ExtendedStatsGrid
- BestNftCard
- NftCard
- PageHeader (title + subtitle + optional actions)
- SectionCard (card wrapper with header)

Keep all components:
- Typed with TypeScript
- Using Tailwind for layout & spacing
- Mobile responsive

## Tailwind / Styling Guidelines (for Copilot)
Layout:
- Use max-w-6xl / max-w-7xl centered containers
- Use grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 for stat grids

Cards:
- rounded-2xl p-4 md:p-6 bg-white/70 shadow-sm backdrop-blur

Typography:
- Title: text-xl font-semibold text-slate-900
- Value: text-3xl font-bold text-slate-900
- Subtitle: text-sm text-slate-500

## How Copilot Should Behave
When writing code in this project:
- Always create pure frontend components that receive data via props or existing hooks.
- Do not create new backend endpoints or modify the contract.
- For any “data”, assume a hook already returns it.

Focus on:
- Beautiful dashboard layout
- Clean component architecture
- Responsive, accessible UI
- Clear separation: layout vs display components
