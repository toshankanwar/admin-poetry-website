# 🛡️ PoemSite Admin Dashboard

[![Live Dashboard](https://img.shields.io/badge/Dashboard-LIVE-8B5CF6?logo=next.js&logoColor=white)](https://admin.poems.toshankanwar.website/)
[![Main Site](https://img.shields.io/badge/Main%20Site-Visit-2563EB?logo=vercel&logoColor=white)](https://poems.toshankanwar.website/)
[![License](https://img.shields.io/github/license/toshankanwar/admin-poetry-website)](LICENSE)

> **PoemSite Admin Dashboard** is a modern, secure, and feature-rich dashboard for the PoemSite platform. Built for moderators and admins, it enables full control over poems, comments, users, requests, and mailing list management — all with an elegant Next.js interface.

---

## 🚀 Live Dashboard

- [https://admin.poems.toshankanwar.in/](https://admin.poems.toshankanwar.in/)

---

## ✨ Features

- **Poem Management:** Create, edit, approve, delete poems, set featured status.
- **User Management:** List users, search, update roles, ban or delete users.
- **Comment Moderation:** View, reply (as admin), delete, and audit comment activity.
- **Poem Requests:** Review, approve, or act on user-submitted poem requests.
- **Mailing List:** Export subscribers, send mailings, manage opt-in/out.
- **Analytics:** Dashboard with stats, user activity, poem engagement.
- **Role-Based Access:** Only admins (role="admin") can access and perform actions.
- **Mobile-First:** Responsive, fast, and accessible interface.
- **Open Source:** Built with Next.js, Tailwind CSS, and integrates with Firebase.

---

## 🛠️ Tech Stack

| Layer     | Tech                                                     |
|-----------|----------------------------------------------------------|
| Frontend  | [Next.js 15](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| Backend   | [Firebase Firestore](https://firebase.google.com/docs/firestore), [Firebase Auth](https://firebase.google.com/docs/auth) |
| Deployment| [Vercel](https://vercel.com/) or [Firebase Hosting](https://firebase.google.com/docs/hosting) |
| DevOps    | GitHub Actions (CI/CD), dotenv, ESLint/Prettier          |

---

## 📄 Key Sections & Navigation

| Section                | Description                                        |
|------------------------|---------------------------------------------------|
| **Dashboard Home**     | Stats, charts, latest activity, quick actions     |
| **Poems**              | List, search, add, edit, delete, approve poems    |
| **Comments**           | Moderate, delete, admin reply, audit              |
| **Poem Requests**      | View/respond to requests, quick publish           |            |

---

## 🛡️ Security & Access

- **Authentication:** Only Firebase Auth users with `role: "admin"` in Firestore `users` collection can access the dashboard.
- **Role Management:** Admins can promote/demote users, but not themselves.
- **Strict Firestore Rules:** All sensitive actions are double-gated (UI + backend rules).
- **Environment Variables:** All secrets are stored securely; never commit `.env.local`.

---

## 🗃️ Data Models

Follows the [Main PoemSite Data Models](https://github.com/toshankanwar/poetry-website#data-models-firestore), accessing the same Firestore instance.

---

## 🖥️ Local Development

```bash
# 1. Clone the admin dashboard repo
git clone https://github.com/toshankanwar/admin-poetry-website.git
cd admin-poetry-website

# 2. Install dependencies
npm install

# 3. Configure .env.local (see .env.example)
cp .env.example .env.local
# Fill in Firebase config and secrets

# 4. Start the development server
npm run dev

# 5. Open http://localhost:3000
```

---

## 🧑‍💻 Contributing

1. Fork this repo and create your feature branch (`git checkout -b feature/your-feature`)
2. Make your changes (code, docs, tests)
3. Commit and push (`git commit -am 'Add feature' && git push origin feature/your-feature`)
4. Open a PR — contributions and suggestions are welcome!

---

## 📫 Contact

- **Creator:** [Toshan Kanwar](https://toshankanwar.in)
- **Main Platform:** [PoemSite](https://poems.toshankanwar.in/)

---

## 📜 License

This dashboard is [MIT licensed](LICENSE).

---

> **PoemSite Admin Dashboard** — Modern poetry management for the next generation community.