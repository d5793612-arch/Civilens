
---

# CIVILENS

**Report · Route · Resolve**

An AI-powered civic grievance platform that enables citizens to report issues, automatically categorizes them using AI, and routes them to the appropriate government departments — all while providing a clean dashboard to track progress.

---

## 🌍 Overview

CIVILENS simplifies how civic issues are reported and resolved:

* 📸 Submit complaints with images
* 🧠 AI analyzes and generates structured reports
* 🏛️ Automatically routes grievances to the correct department
* 📊 Track your complaints in a personalized dashboard

---

## 🧠 AI Pipeline (Core Innovation)

We are building a powerful **AI-driven grievance pipeline** that:

1. **Analyzes input (text + images)** using **Google Gemini**
2. **Extracts key context** (problem type, severity, location hints)
3. **Categorizes grievances automatically**
   *(e.g., Road Damage → PWD, Water Leakage → Jal Board)*
4. **Generates bilingual complaint drafts** (English + Hindi)
5. **Routes issues to the correct department**

### 🎯 Goal

Eliminate manual sorting and delays by creating a **self-operating civic intelligence system**.

---

## 🏗️ Tech Stack

| Layer       | Tech                                   |
| ----------- | -------------------------------------- |
| UI          | React 19, Vite, TypeScript             |
| Backend     | Convex                                 |
| Auth        | Email/password, bcrypt, session tokens |
| AI          | Gemini API (`GEMINI_API_KEY`)          |
| Optional AI | Exa Search (`EXA_API_KEY`)             |

---

## ⚡ Features

* 🔐 Secure authentication
* 📝 Smart complaint submission (text + images)
* 🤖 AI-generated structured grievance reports
* 🏛️ Automatic department routing
* 📊 Personalized analytics dashboard
* 📱 WhatsApp-style webhook support (optional)
* 🌐 Bilingual complaint generation

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js 20+
* Convex account: [https://dashboard.convex.dev](https://dashboard.convex.dev)
* CLI login:

```bash
npx convex login
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Environment Setup

#### Frontend (`.env.local`)

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

👉 Generate this by running:

```bash
npx convex dev
```

---

#### Backend (Convex Dashboard → Environment Variables)

| Variable         | Required | Purpose                       |
| ---------------- | -------- | ----------------------------- |
| `GEMINI_API_KEY` | ✅        | AI image + text processing    |
| `EXA_API_KEY`    | ❌        | Additional context enrichment |

---

### 4. Run the App

**Terminal A — Backend**

```bash
npx convex dev
```

**Terminal B — Frontend**

```bash
npm run dev
```

Open:
👉 [http://localhost:5173](http://localhost:5173)

---

## ▲ Deploying to Vercel

Vite **inlines** `VITE_*` variables when `npm run build` runs. Vercel does **not** use your machine’s `.env.local`, so you must set the Convex URL in the Vercel UI (or the build stays without it and the site shows “Convex URL missing”).

### 1. Convex URL

Use the **same** URL you use locally: `https://<deployment-name>.convex.cloud` (from `npx convex dev`, `.env.local`, or [Convex Dashboard](https://dashboard.convex.dev) → your deployment).

For a **production** Convex backend, run `npx convex deploy` and use the **production** deployment URL if it differs from dev.

### 2. Vercel environment variable

1. Vercel → your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `VITE_CONVEX_URL`
   - **Value:** `https://<your-deployment>.convex.cloud`
3. Apply to **Production** and **Preview** (and **Development** if you use Vercel CLI for builds)
4. **Redeploy** the latest deployment (or trigger a new build) so the variable is present **during** `npm run build`

Without a redeploy after adding the variable, old bundles still lack the URL.

### 3. Build settings (defaults)

- **Framework preset:** Vite  
- **Build command:** `npm run build`  
- **Output directory:** `dist`

No extra `vercel.json` is required for a standard static Vite app.

---

## 🎬 Demo Walkthrough

### 1. Sign Up

* Create an account
* Secure password hashing handled server-side

---

### 2. Dashboard

* View only **your complaints**
* Real-time stats and insights

---

### 3. Submit a Grievance

* Add title + description or image
* AI automatically:

  * analyzes issue
  * categorizes it
  * generates structured complaint

---

### 4. Track Complaints

* View all your submissions
* Status and department visibility

---

### 5. Analytics

* Department workload insights
* Complaint trends (your data)

---

### 6. Optional: WhatsApp Webhook

POST to:

```
/webhook/whatsapp
```

Supports:

* `multipart/form-data` (image)
* `image_base64` (JSON)

---

## 📁 Project Structure

```
src/                # Frontend (React UI)
convex/             # Backend logic

convex/
├── schema.ts
├── auth.ts
├── complaintsPipeline.ts   # 🔥 AI pipeline core
├── routing.ts              # Department mapping
├── http.ts                 # Webhooks
```

---

## 🔁 AI Pipeline Flow

```
User Input (Text/Image)
        ↓
Gemini AI Processing
        ↓
Category Detection
        ↓
Department Mapping
        ↓
Structured Complaint Creation
        ↓
Stored in Convex DB
```

---

## 🛠️ Scripts

| Command                | Description         |
| ---------------------- | ------------------- |
| `npm run dev`          | Start frontend      |
| `npm run build`        | Production build    |
| `npm run preview`      | Preview build       |
| `npx convex dev`       | Run backend         |
| `npm run convex:setup` | Setup env (Windows) |

---

## 🔐 Security Notes

* Never commit `.env.local` or API keys
* Rotate keys if exposed
* Use separate keys for production

---

## 🌱 Future Scope

* 🔄 Real-time status updates from departments
* 📍 Geo-based complaint clustering
* 🧾 Government API integrations
* 📲 Mobile app version
* 🧠 Smarter AI classification (multi-model pipeline)
* 📡 Auto-escalation for unresolved grievances

---

## 📄 License

Private / Organization-specific (update as needed)

---

## 🤝 Contribution

Contributions, ideas, and improvements are welcome.
Let’s build smarter civic systems together.

---

