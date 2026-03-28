
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

