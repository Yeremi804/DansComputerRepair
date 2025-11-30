<img width="1591" height="383" alt="image" src="https://github.com/user-attachments/assets/342fd859-2622-4889-9944-80f55de9872f" />

# Synposis of Dan's Computer Repair 

Dan's Computer Repair is a local web application designed to promote a small computer repair business and streamline customer interactions. The platform allows residents to submit review, request computer part through an online form, view pricing information from that very same form, and receive email updates on their repair status. This helps customers say informed while giving the business owner an efficient way to manage requests and communication progress. The site is built using React and Node.js, making easier to maintain, extend, and troubleshoots.


# Local Setup Instructions and project structure information
# Please read and setup accordingly

## Prerequisites
- **Node.js LTS (v20.x recommended)** → <https://nodejs.org/>
  - Verify: `node -v` and `npm -v`
- (Optional) **nvm** to match Node versions: <https://github.com/nvm-sh/nvm>

> We commit `package-lock.json` to keep dependency versions consistent across machines.

## 1) Clone and install
## Make sure to run npm install in project directory via terminal
```bash
git clone <REPO_URL>
cd DansComputerRepair
npm install
```

---

## 2) Create your local environment file
We **do not** commit real secrets. Each developer creates their own local file:
Make a copy of .env.example and name the copy .env.local
```bash
cp .env.example .env.local
```

Open `.env.local` and fill in real values, for example:
```bash
# App
NEXT_PUBLIC_SITE_NAME=Dans Computer Repair
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE

# Database (example for Postgres)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

# Optional integrations
# RESEND_API_KEY=sk_xxx
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
# TURNSTILE_SECRET_KEY=...
```

- Variables **starting with `NEXT_PUBLIC_`** are safe for the browser and can be used in React components.
- All others are **server-only** and should only be read in server code (server actions, API routes, etc.).
- `.env.local` is **gitignored**; `.env.example` is the template we keep in Git.

 How to get the Supabase URL and Anon Key for `.env.local`
- When you are added to the Supabase project, navigate to project settings on the sidebar
<img width="294" height="353" alt="Image" src="https://github.com/user-attachments/assets/ce0eafd4-3288-4e43-ac29-8326f85f0c1f" />

- Go to Data API project setting to copy the Supabase URL.
<img width="1063" height="81" alt="Image" src="https://github.com/user-attachments/assets/e03904f2-c4ef-4a7d-9d7c-ff33fa034c7f" />

- Go to API Keys project setting just below Data API and click the 2nd tab labeled "Legacy anon, service_role API keys" to copy the Supabase Anon Key.
<img width="1076" height="125" alt="Image" src="https://github.com/user-attachments/assets/373c69d9-8079-47de-9cd4-36135a02fce6" />
---

## 3) Run the app
```bash
npm run dev
```
Open: <http://localhost:3000>

Other common scripts:
```bash
npm run build   # production build
npm start       # run the built app locally
npm run lint    # lint code
```

---

# 📁 Project Structure

```
DansComputerRepair/
├─ public/                 # static assets (images, favicon, robots.txt)
├─ src/
│  └─ app/                 # Next.js App Router (pages, layouts, routes)
│     ├─ layout.js         # root layout (html/body, headers, providers)
│     ├─ page.js           # homepage route (/)
│     ├─ intake/
│     │  └─ page.js        # /intake route (example intake form)
│     ├─ api/              # route handlers (server endpoints)
│     │  └─ leads/route.js # example: POST /api/leads
│     └─ (more routes...)
├─ .env.example            # template of required env vars (committed)
├─ .env.local              # your real local values (NOT committed)
├─ .gitignore
├─ jsconfig.json           # path aliases (e.g., "@/components/Button")
├─ next.config.mjs         # Next.js config
├─ package.json            # deps + scripts
├─ package-lock.json       # lockfile (commit this)
└─ postcss.config.mjs      # Tailwind/PostCSS (if used)
```

### Where to put code
- **Pages / routes** → `src/app/**/page.js`  
  - Example: `src/app/about/page.js` becomes `/about`
- **Nested layouts** → `src/app/**/layout.js`  
  - Provide per-section shells (navbars, sidebars)
- **API routes** → `src/app/api/**/route.js`  
  - Example: `src/app/api/leads/route.js` → `/api/leads`
- **UI components** → create `src/components/` and import via alias:
  ```js
  import Button from "@/components/Button";
  ```
  (The `@` alias is configured in `jsconfig.json`)

- **Styles**  
  - Global CSS → `src/app/globals.css`
  - Component-scoped styles: Tailwind utility classes **or** CSS Modules if you add them.

---

# ➕ Adding a new page (example)

Create a new folder with a `page.js` inside `src/app`:

```
src/app/services/page.js  ->  /services
```

```jsx
export default function ServicesPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Services</h1>
      <p className="mt-2">We repair laptops, desktops, and more.</p>
    </main>
  );
}
```

If you need a section-specific layout:
```
src/app/services/layout.js
```
---
# 🎨 Live Demo 
| 🏠 Home Page                                                                                                              | 📦 Products page                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| <img width="350" alt="Home Page" alt="image" src="https://github.com/user-attachments/assets/8614f00e-fe78-476a-bcfb-14d415717b9a" />| <img width="350" alt="Products Page" src="https://github.com/user-attachments/assets/c51e6012-a257-47c9-9919-3f9f30b9d2be" /> |

| 🛠️ Admin – Parts                                                                                                           | 💻 Custom PC Form                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| <img width="350" alt="Admin Parts" src="https://github.com/user-attachments/assets/bd5ff907-ad3a-4ccc-bcd4-21c7e7786dd3" /> | <img width="350" alt="Custom PC Form" src="https://github.com/user-attachments/assets/95018f2a-dd55-44e5-a4c1-9f86823f519e" /> |
  
---
# 🔁 Flow Diagram 
<img width="700" height="500" alt="image" src="https://github.com/user-attachments/assets/efecc552-5a7c-4105-a270-001a40153d30" />

---

# 🔐 Using environment variables

**Server code** (server actions, API routes, or any file not marked `"use client"`):
```js
const url = process.env.DATABASE_URL;
```

**Client code** (React components) → only variables that start with `NEXT_PUBLIC_`:
```jsx
export default function Header() {
  return <h1>{process.env.NEXT_PUBLIC_SITE_NAME}</h1>;
}
```

> After editing `.env.local`, restart `npm run dev` so changes take effect.

---

# 🧹 Git hygiene

We ignore:
- `node_modules/`, `.next/`, `.env*` (except `.env.example`), logs, editor files

We commit:
- Source code, `public/`, configs, **`package-lock.json`**, and `.env.example`

---

# 🧪 Troubleshooting

- **`npm run dev` can’t find scripts** → Ensure you’re in the project root (where `package.json` is).
- **Port in use** → `PORT=3001 npm run dev` (or stop the other process).
- **Env not loading** → Confirm file name is `.env.local` in the project root; restart dev server.
- **Import paths messy** → Use alias `@/` (configured in `jsconfig.json`).

---

# Creating an Admin Account (Testing Purposes)
- Navigate to the page ./create-admin-account.
- Follow the listed steps to create an account.
- After redirect to login page, attempt to login.
- You will be prompted to setup MFA. Please use Google Authenticator or similar.
- After MFA is setup, you will be able to login successfully.

# Removing MFA Factors
- Through Supabase, access your account through the Authentication tab.
- After finding your account, scroll down and click the button labelled "Remove MFA Factors"
- Your MFA factors will be reset, allowing you to re-init another MFA method.
- ! Please make to sure to remove existing MFA factors through your Authenticator app (Google Authenticator)

---

# Authors
Brandon Leyva
Yeremi Navarrete
James Crandall
Diana Ravlo
Dennis Ravlo
Jaehee Jung
Kevin Lai 
Lance Wakamatsu
