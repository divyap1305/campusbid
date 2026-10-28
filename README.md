# CampusBid 🎓🔨
> **Give every campus item its next owner.**

CampusBid is a real-time, transparent campus auction marketplace designed for college campuses. When graduating students depart, their belongings—bicycles, scientific calculators, textbooks, monitors, and dorm essentials—find a second life with juniors through fair, transparent, and concurrency-safe campus auctions.

---

## 🚀 Key Highlights & Architecture

- **Real-Time Auction Engine**: Socket.IO broadcasts for live bids, countdown synchronization, outbid alerts, and seller approvals.
- **Fair Bidding Protocol**:
  - **Integer Paise Financial Precision**: All monetary values are handled in integer paise to avoid IEEE floating-point inaccuracy.
  - **Atomic Concurrency Protection**: Optimistic locking and MongoDB atomic conditions prevent out-of-turn or duplicate bids under heavy competition.
  - **Anti-Sniping (Soft Close / Last-Minute Extensions)**: Bids placed with $\le$ 30 seconds remaining automatically extend the clock to 60 seconds from accepted timestamp.
  - **Automated Proxy Bidding**: Configurable maximum bids submit only the minimum necessary increment to retain the lead, with public maximums and deterministic tie-breaking.
- **Complete Post-Auction Lifecycle**:
  - Unsold handling (0 bids $\to$ `UNSOLD`).
  - Reserve / Seller decision (`PENDING_SELLER_DECISION` $\to$ Approve / Reject / Cancel).
  - Escrow reservation and verified campus handover (`COMPLETED` or `FAILED_PICKUP`).
- **Campus Community Features**:
  - Public Q&A thread for every item.
  - Saved searches with automated alert notifications.
  - In-app notification center + Browser Notification API support.
- **AI Campus Assistant**:
  - Natural language search and item attribute comparisons across genuine active listings.
  - Guided automated bidding setup with mandatory explicit consent before authorization.
  - Built-in deterministic search fallback when no external LLM key is configured.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Router v6 |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, Mongoose |
| **Database** | MongoDB (Local / Atlas) |
| **Realtime** | WebSockets via Socket.IO |
| **Scheduled Jobs** | Recoverable, persistent timer and polling worker for auction closing |

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `127.0.0.1:27017` or MongoDB Atlas URI)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd CampusBid
   ```

2. **Install Root and Workspace Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example server/.env
   ```

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - Frontend will be available at: `http://localhost:5173`
   - Backend API will be available at: `http://localhost:5000`

---

## 🧪 Testing

Run backend unit and integration tests:
```bash
npm run test
```

Verifies:
- Atomic bid placement & minimum increments
- Anti-sniping last-minute extension triggers (extension $\le 30$s, no extension at $31$s)
- Proxy bidding competition & tie-break determinism
- Auction auto-closure and transition logic
- Seller decision and handover flows

---

## 📄 License
MIT License. Built for the Hackathon.
