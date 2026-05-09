<img width="1591" height="383" alt="image" src="https://github.com/user-attachments/assets/342fd859-2622-4889-9944-80f55de9872f" />

# Synposis of Dan's Computer Repair 

Dan's Computer Repair is a local web application designed to promote a small computer repair business and streamline customer interactions. The platform allows residents to submit reviews, request computer building services through an intake form, view pricing information from that very same form, and receive email updates on their repair status. This helps customers stay informed while giving the business owner an efficient way to manage requests and client communication. The site is built using Next.js/React as a framework with Node.js and Supabase handling the backend logic.

---

# 🛠️ Technologies

## Frontend
- **[Next.js](https://nextjs.org/ )** → main React-based frontend framework
- **[React](https://react.dev/ )** → component library that powers the UI
- **[Tailwind CSS](https://tailwindcss.com/ )** → styling and layout framework
- **[Lucide React](https://lucide.dev/ )** → icon library
- **[JavaScript / JSX](https://developer.mozilla.org/en-US/docs/Web/JavaScript )** → language used for the frontend
- **[npm](https://www.npmjs.com/ )** → package manager for frontend dependencies

## Backend & Database
- **[Supabase Auth API & Tables](https://supabase.com/ )** → user logins, MFA, session management
- **[Supabase](https://supabase.com/ )** → main database
- **[Node.js](https://nodejs.org/ )** → runtime environment for Next.js
- **[ESLint](https://eslint.org/ )** → linter used to find and fix problems within JavaScript code

## Development Tools
- **[Visual Studio Code](https://code.visualstudio.com/ )** → IDE used for consistent workflow

## Version Control
- **[GitHub](https://github.com/ )** → public repository that stores all files; used for team collaboration and code review

---

## 🎨 Styling with Tailwind CSS

This project uses **[Tailwind CSS](https://tailwindcss.com/ )** for styling. Tailwind is a utility-first CSS framework that allows you to build modern designs directly in your HTML/JSX.

![tailwindcss-icon](https://github.com/user-attachments/assets/f9453fb3-8c18-429a-9711-521ed0badc2e)<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient x1="0" y1="-21.333" y2="85.333" id="A" x2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#2383ae" offset="0%"/><stop stop-color="#6dd7b9" offset="100%"/></linearGradient></defs><path d="M16 25.6c2.133-8.533 7.467-12.8 16-12.8 12.8 0 14.4 9.6 20.8 11.2 4.267 1.067 8-.533 11.2-4.8C61.867 27.733 56.533 32 48 32c-12.8 0-14.4-9.6-20.8-11.2-4.267-1.067-8 .533-11.2 4.8zM0 44.8C2.133 36.267 7.467 32 16 32c12.8 0 14.4 9.6 20.8 11.2 4.267 1.067 8-.533 11.2-4.8-2.133 8.533-7.467 12.8-16 12.8-12.8 0-14.4-9.6-20.8-11.2-4.267-1.067-8 .533-11.2 4.8z" fill="url(#A)" fill-rule="evenodd"/></svg>


### Example Code Snippet

```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click Me
</button>
```

### Useful Resources
- 📖 [Tailwind CSS Documentation](https://tailwindcss.com/docs )
- 🎨 [Tailwind UI Components](https://tailwindui.com/ )


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
| 🏠 Home Page                                                                                                              | 📊 Admin Dashboard                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| <img width="350" alt="DC_Homepage_2" src="https://github.com/user-attachments/assets/cb4e042a-586e-4cd8-876d-e2c7bcbcc218" />| <img width="350" alt="Admin_Dashboard" src="https://github.com/user-attachments/assets/fab53717-7402-4259-9ff5-6be0605ae4f8" />

 

| 🛠️ Admin – Parts                                                                                                           | 💻 Custom PC Form                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
 <img width="350" alt="Admin_Parts" src="https://github.com/user-attachments/assets/642d466a-523e-47d2-8eae-c4ca9ded4864" /> | <img width="350" alt="Custom-PC-Form" src="https://github.com/user-attachments/assets/209db1ac-2261-4c7f-9b70-a1f3bed635ea" />


| 📝 Admin - Review                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------- |
<img width="350" alt="Admin_Review" src="https://github.com/user-attachments/assets/65623fa9-fead-4155-ac3a-62babff2c75c" />  |


 
  
---
# 🔁 Flow Diagram 
<img width="700" height="500" alt="image" src="https://github.com/user-attachments/assets/efecc552-5a7c-4105-a270-001a40153d30" />

---

# ⌚ Timeline

## ✅ Past Work (Completed Fall 2025)
Our focus during this semester was to create the Minimum Viable Product (MVP) and adjust based on client feedback.

- Sprint 2: UI Development (47 stories)
  - Built all visual components and page layouts

- Sprint 3: Backend Integration (13 stories)
  - Connected frontend to the Supabase database and implemented core functionality

- Sprint 4: Refinement (17 stories)
  - Integrated client feedback, improved UX, and polished features

---

## 🚀 Future Work (To Be Done in Spring 2026)
These items were found in the backlog but extend beyond the MVP.

- Email Notification System (maintain consistency across all user interactions)
- Testing & Bug Fixes
- Fine tune the authentication system
- Make adjustments to the website appearance based on client feedback
- **Estimated Completion Time:** May 2026

---

# 🧪 Testing

This project uses **[Jest](https://jestjs.io/)** and **[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)** for unit and integration testing. The test suite covers critical user flows, administrative functions, and backend logic.

## 📁 Test Structure

All test files are located in the [test-scripts/](./test-scripts/) directory. The tests are organized by feature:

### 🔐 Authentication & Security
- [admin-log-in.test.js](./test-scripts/admin-log-in.test.js) — Covers login flows, Captcha, and MFA.
- [change-password.test.js](./test-scripts/change-password.test.js) — Validates password updates and MFA requirements.
- [password-change.test.js](./test-scripts/password-change.test.js) — Additional test coverage for the Change Credentials modal on the Settings page.
- [create-admin.test.js](./test-scripts/create-admin.test.js) — Tests the admin account creation process.
- [middleware.test.js](./test-scripts/middleware.test.js) — Validates route protection and session handling.
- [session-middleware.test.js](./test-scripts/session-middleware.test.js) — Tests session refresh and cookie sync logic.
- [session-sync-route.test.js](./test-scripts/session-sync-route.test.js) — Covers the session sync API route.

### 🖥️ Admin Dashboard
- [admin-dashboard.test.js](./test-scripts/admin-dashboard.test.js) — Validates the main admin interface.
- [admin-parts.test.js](./test-scripts/admin-parts.test.js) — Tests the PC parts management system.
- [audit-for-admin-parts.test.js](./test-scripts/audit-for-admin-parts.test.js) — Additional test coverage for the admin parts management page.
- [audit-for-settings.test.js](./test-scripts/audit-for-settings.test.js) — Additional test coverage for the Settings page.
- [settings-page.test.js](./test-scripts/settings-page.test.js) — Covers site-wide configuration settings.
- [captcha-setting.test.js](./test-scripts/captcha-setting.test.js) — Tests the toggle logic for Captcha security.
- [header-notifications.test.js](./test-scripts/header-notifications.test.js) — Validates the admin notification bell and dropdown.
- [dashboard-reviews-panel.test.js](./test-scripts/dashboard-reviews-panel.test.js) — Tests the reviews management panel.
- [CustomerMessagesPanel.test.js](./test-scripts/CustomerMessagesPanel.test.js) — Validates the customer messages panel.

### 👥 Customer Features
- [service-request.test.js](./test-scripts/service-request.test.js) — Validates the repair intake form.
- [create-computer-configuration-form.test.js](./test-scripts/create-computer-configuration-form.test.js) — Tests the custom PC configuration form.
- [review-form.test.js](./test-scripts/review-form.test.js) — Tests the customer review submission flow.
- [contact-form.test.js](./test-scripts/contact-form.test.js) — Covers the general contact inquiry form.

### ⚙️ System Logic
- [sms-notification.test.js](./test-scripts/sms-notification.test.js) — Validates Twilio SMS integration and status-triggered messages.
- [api-options.test.js](./test-scripts/api-options.test.js) — Tests the /api/options route for PC parts data.
- [home-content.test.js](./test-scripts/home-content.test.js) — Covers the home page content editor.
- [faq-page.test.js](./test-scripts/faq-page.test.js) — Tests the FAQ page rendering and content.
- [chatbot.test.js](./test-scripts/chatbot.test.js) — Validates the AI chatbot response logic.
- [navigation.test.js](./test-scripts/navigation.test.js) — Tests header and sidebar navigation links.

## 🚀 How to Run Tests

### 1. Run All Tests

```bash
npm test
```

### 2. Run a Specific Test File

```bash
npx jest test-scripts/admin-log-in.test.js
```

### 3. Watch Mode

```bash
npx jest --watch
```

### 4. View Test Results

The project outputs test results to [jest-results.json](./jest-results.json). You can inspect this file to see detailed pass/fail data for each assertion.

## 🛠️ Test Configuration

- **Framework:** Jest with `jest-environment-jsdom`
- **Config file:** [jest.config.js](./jest.config.js) — sets the test environment, file patterns, and `@/` path alias mapped to `src/`.
- **Setup file:** [jest.setup.js](./jest.setup.js) — imports `@testing-library/jest-dom` matchers and provides polyfills for `Request`, `Response`, and `Headers` to support Next.js server actions and route handlers in the test environment.
- **Mocking:** The test suite uses `jest.mock()` for external services including **Supabase Auth**, **Next.js Navigation (`next/navigation`)**, and **Global Fetch** so that tests run without real API keys or a live database connection.
- **Coverage:** Tests validate UI states, user flows (Captcha/MFA), error handling (network failures, auth errors), form validation, and navigation redirects.

---

# 🚀 Deployment

Deployment instructions will be finalized in CSC 191.

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
-Brandon Leyva \
-Yeremi Navarrete \
-James Crandall \
-Diana Ravlo \
-Dennis Ravlo \
-Jaehee Jung \
-Kevin Lai \
-Lance Wakamatsu
