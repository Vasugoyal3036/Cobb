# Architecture Breakdown: Cobb CRM Refactoring

This document details the structural and architectural improvements introduced to make the bespoke Cobb CRM solution product-ready and multi-tenant capable.

## 1. Environment Isolation & Configuration Management
Previously, the CRM was tightly coupled to local hardware via hardcoded paths, store IDs, and SQL Server instances (e.g., `RPD_AVATAR01_NEW_ST_POS`). 

**Changes Made:**
- Introduced `.env` based configuration across the full stack.
- The backend `db.js` now dynamically resolves `DB_SERVER`, `DB_NAME`, and credentials.
- The React frontend utilizes Vite's `import.meta.env` to dynamically assign `API_BASE` and `STORE_ID`.

## 2. Authentication & Access Control
A standalone, single-user system was transformed into a multi-tier, authenticated workspace.

**Changes Made:**
- Created a robust `/api/auth` endpoint implementing JSON Web Token (JWT) strategies.
- Added a `checkRole` Express middleware to secure endpoints based on user permissions.
- Implemented a React `AuthContext` to manage global user states.
- Replaced direct application entry with a secure `LoginScreen`.

## 3. Onboarding Experience
To transition from an internal tool to a marketable product, an intuitive setup wizard is required.

**Changes Made:**
- Engineered a polished, multi-step `SetupScreen` wizard with glassmorphism UI.
- The wizard guides the user through verifying database connections, creating the master owner account, and setting the physical store details.

## 4. UI Polish & Component Enhancement
Specific components were upgraded to reflect a premium SaaS aesthetic.

**Changes Made:**
- Upgraded `CustomerInsightsTab` tier cards with interactive hover scaling, modern gradients, and backdrop blurs.
- Introduced `lucide-react` icons heavily throughout the onboarding and login flows for a cohesive aesthetic.
