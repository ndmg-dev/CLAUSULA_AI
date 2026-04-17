# Clausula AI

Intelligent contract analysis and management platform for Brazilian legal and accounting firms. Clausula AI is a three-tier system composed of a React web dashboard, a FastAPI backend powered by a LangGraph multi-agent workflow, and a Microsoft Word Add-in that brings AI-driven contract intelligence directly into the attorney's working environment.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running Services Individually](#running-services-individually)
- [Services](#services)
  - [Backend API](#backend-api)
  - [Frontend Dashboard](#frontend-dashboard)
  - [Word Add-in](#word-add-in)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Clausula AI addresses a critical operational gap in Brazilian legal practice: the manual, error-prone review of corporate contracts against DREI (Departamento de Registro Empresarial e Integração) compliance requirements.

The platform provides:

- **Automated contract auditing** using a four-node LangGraph agentic pipeline (text cleaning, issue detection, classification, and summary generation) backed by GPT-4o.
- **Spatial issue highlighting** by correlating AI-detected problems with paragraph bounding boxes extracted from PDFs via PyMuPDF OCR.
- **AI-assisted clause rewriting** that generates compliant replacement text for flagged issues.
- **Document export pipelines** supporting PDF (ReportLab), Word (python-docx), and Excel (openpyxl).
- **Cloud vault** for secure document storage via Firebase Storage with a local fallback for development.
- **E-signature workflow** integrated with the ZapSign API.
- **Word Add-in** that exposes the full analysis and template instantiation surface inside Microsoft Word, adhering to the Office.js API model.

---

## Architecture

```
                         +-----------------------+
                         |   Microsoft Word      |
                         |   Add-in (Office.js)  |
                         |   React / Vite / TS   |
                         +----------+------------+
                                    |
                         +----------v------------+
                         |   Web Dashboard       |
                         |   React / Vite / TS   |
                         |   Zustand / TipTap    |
                         +----------+------------+
                                    |
                            HTTP REST / JSON
                                    |
                         +----------v------------+
                         |   FastAPI Backend     |
                         |   Python 3.11         |
                         |   Uvicorn / ASGI      |
                         +----------+------------+
                                    |
              +---------------------+---------------------+
              |                     |                     |
   +----------v-------+  +----------v-------+  +---------v--------+
   | LangGraph Agents |  | Firebase Admin   |  | ZapSign REST API |
   | GPT-4o / OpenAI  |  | Auth + Storage   |  | E-Signature      |
   +------------------+  +------------------+  +------------------+
```

The backend enforces a strict layered architecture: router endpoints handle HTTP concerns only, business logic lives in service modules, and AI orchestration is isolated in the `app/ai` package. No layer has upward dependencies.

---

## Tech Stack

### Backend

| Component         | Technology                                |
|-------------------|-------------------------------------------|
| Framework         | FastAPI 0.109                             |
| Server            | Uvicorn (ASGI)                            |
| AI Orchestration  | LangGraph + LangChain + GPT-4o (OpenAI)   |
| Document Parsing  | PyMuPDF, Unstructured, python-docx, pypdf |
| OCR               | Tesseract via pytesseract, pdf2image      |
| Export            | ReportLab, openpyxl, pandas               |
| Authentication    | Firebase Admin SDK                        |
| E-Signature       | ZapSign API via httpx                     |
| Schema Validation | Pydantic v2                               |

### Frontend

| Component         | Technology                                |
|-------------------|-------------------------------------------|
| Framework         | React 18 + TypeScript                     |
| Bundler           | Vite 5                                    |
| State Management  | Zustand                                   |
| Rich Text Editor  | TipTap 2 (ProseMirror)                    |
| HTTP Client       | Axios                                     |
| PDF Rendering     | pdfjs-dist + react-pdf                    |
| Styling           | Tailwind CSS 3                            |
| Auth              | Firebase JS SDK                           |

### Word Add-in

| Component         | Technology                                |
|-------------------|-------------------------------------------|
| Platform          | Office.js (Office Add-in API)             |
| Framework         | React 18 + TypeScript                     |
| Bundler           | Vite 5 + custom manifest.xml              |
| Styling           | Tailwind CSS 3                            |

### Infrastructure

| Component         | Technology                                |
|-------------------|-------------------------------------------|
| Containerization  | Docker + Docker Compose                   |
| Hot Reload (Dev)  | Uvicorn `--reload` + Vite HMR             |

---

## Repository Structure

```
clausula-ai/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── ai/                 # LangGraph workflow and agent nodes
│   │   ├── api/
│   │   │   └── endpoints/      # Route handlers (analyze, rewrite, export, vault, esign)
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── services/           # Business logic layer (parser, document, vault)
│   │   └── main.py             # FastAPI entrypoint and router registration
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # React web dashboard
│   ├── src/
│   │   ├── components/         # UI components and page modules
│   │   ├── services/           # Axios API clients
│   │   ├── store/              # Zustand state stores
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
│
├── addin/                      # Microsoft Word Add-in
│   ├── src/
│   │   ├── components/         # Taskpane, TemplatesTab, AuditTab
│   │   └── services/           # Office.js Word interface layer
│   ├── manifest.xml            # Office Add-in manifest
│   └── package.json
│
└── docker-compose.yml          # Orchestration for local development
```

---

## Getting Started

### Prerequisites

- Docker Desktop 4.x or later
- Node.js 20.x (for local development of the Add-in without Docker)
- Python 3.11 (for local backend development without Docker)
- A valid OpenAI API key with access to `gpt-4o`
- A Firebase project with Authentication and Storage enabled
- (Optional) A ZapSign account for the e-signature integration

### Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env`:

```env
OPENAI_API_KEY=sk-...
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ZAPSIGN_API_TOKEN=...
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Place your Firebase service account JSON at `backend/firebase-credentials.json`. This file must never be committed to version control.

### Running with Docker Compose

```bash
docker compose up --build
```

Once the stack is healthy:

- **Frontend dashboard**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Running Services Individually

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Word Add-in:**

```bash
cd addin
npm install
npm run dev
```

To sideload the Add-in during development, follow the [Microsoft Office Add-in sideloading guide](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/test-debug-office-add-ins) and point Word to the `addin/manifest.xml` file.

---

## Services

### Backend API

The backend exposes a RESTful API under the `/api` prefix. All endpoints are documented interactively at `/api/docs`.

**Analysis pipeline** (`/api/analyze`):

The AI workflow is a four-node acyclic LangGraph:

1. `CleanTextNode` — Strips OCR artifacts, page markers, and noise from the raw extracted text.
2. `DetectIssuesNode` — Audits the contract against DREI registration requirements, CNAE alignment, capital clause clarity, and accounting governance clauses. Returns structured issues with paragraph references and spatial coordinates.
3. `ClassifyIssuesNode` — Deterministic node (no LLM call). Maps paragraph IDs to bounding boxes from the PDF parser and resolves severity normalization.
4. `GenerateSummaryNode` — Produces a three-paragraph executive summary (introduction, problems, conclusion) and a normalized health score.

**Other routes:**

| Prefix           | Description                                  |
|------------------|----------------------------------------------|
| `/api/rewrite`   | Clause-level AI rewrite with context         |
| `/api/export`    | PDF, Word, and Excel export pipelines        |
| `/api/vault`     | Firebase Storage upload/download/list        |
| `/api/esign`     | ZapSign envelope creation and status polling |

### Frontend Dashboard

A single-page application providing:

- Contract upload and text-input ingestion modes
- Interactive PDF viewer with AI issue overlay (bounding box highlights)
- Clause rewrite modal powered by the `/api/rewrite` endpoint
- Export panel (PDF, Word, Excel)
- Cloud vault browser
- E-signature dispatch workflow

### Word Add-in

An Office.js task pane surfacing the following capabilities inside Microsoft Word:

- **Audit Tab**: Sends the active document text to the backend and renders the analysis report (score, risk level, executive summary, issue list with suggested fixes) inside the task pane.
- **Templates Tab**: Instant instantiation of professionally formatted legal templates (DREI-compliant Articles of Incorporation, Shareholders Agreement with anti-dilution clauses, B2B Service Agreement) directly into the active Word document via `body.insertHtml`.

---

## API Reference

Full interactive documentation is available at runtime via Swagger UI (`/api/docs`) and ReDoc (`/api/redoc`). Both surfaces are auto-generated from Pydantic schemas and FastAPI route metadata.

---

## Contributing

This is a private commercial project. External contributions are not accepted at this time. For internal contributors:

1. Branch from `main` following the convention `feat/<scope>`, `fix/<scope>`, or `chore/<scope>`.
2. All backend changes must maintain the layered architecture contract: no business logic in route handlers.
3. All LLM prompt modifications must be validated against the existing structured output schemas before merging.
4. Run `uvicorn app.main:app` and confirm `/api/health` returns `200` before opening a pull request.

---

## License

Copyright (c) 2024 Clausula AI. All rights reserved.

See [LICENSE](./LICENSE) for the full terms governing this software.
