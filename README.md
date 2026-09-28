# 🩻 Medical Imaging Frontend

> Web client of the **AI-Powered Medical Imaging Analysis & Automated Radiology Reporting Platform** — built during my AI Engineering internship at **XeleronAI Ltd** (London, remote).

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-B7178C?logo=reactivex&logoColor=white)

Backend API: [medical-imaging-backend](https://github.com/ahmedaminefaiz/medical-imaging-backend)

---

## ✨ Features

- 🔐 **Login with JWT** — `AuthService`, HTTP interceptor, auth & role guards
- 📋 **Exam list** — paginated, with patient **MRN search**
- 📤 **Upload** — standard images or **DICOM**, including a **whole DICOM folder** at once
- 🔎 **Exam detail** — patient / study info and image grid, images loaded as authenticated blobs (with proper object-URL cleanup)
- 🖼️ **Full-screen viewer** with zoom & pan — tested on a real 150-slice CT series
- 🤖 AI detection overlay (bounding boxes) & clinician validation — *in progress*

## 🗂️ Project structure

```
src/app/
├── features/
│   ├── auth/       # login page, guards, interceptor, AuthService
│   └── examens/    # list, upload, detail pages + services & models
├── layout/         # shared app shell
└── shared/         # shared models
```

Feature-based architecture with standalone components.

## ▶️ Run locally

**Prerequisites:** Node.js 20+, Angular CLI, the [backend](https://github.com/ahmedaminefaiz/medical-imaging-backend) running

```bash
npm install
ng serve          # http://localhost:4200
ng test           # unit tests
ng build          # production build → dist/
```

Set the API URL in `src/environments/`.

---

👤 **Ahmed Amine Faiz** — AI Engineering student @ ENIAD Berkane · [GitHub](https://github.com/ahmedaminefaiz)
