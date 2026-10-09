# GarageCare V1 — Documentation Pack

This package contains the four core product and engineering documents.

1. `PRD.md` — Product Requirements Document
2. `SYSTEM_DESIGN.md` — System Design and Architecture
3. `DB_DESIGN.md` — Database Design
4. `API_SPECIFICATION.md` — API Specification

The documents are aligned to the current V1 decisions:
- Nx monorepo
- Angular PWA, Express/TypeScript API, MongoDB Atlas
- Secure HttpOnly cookies with CSRF protection
- Official WhatsApp Business Platform with actual PDF document attachment
- GST-aware modes for regular registered, composition-scheme, and unregistered garages
- Private PDF storage, Redis/BullMQ worker, transactional outbox, and durable reminder processing

Tax behavior and invoice templates require validation by a qualified Indian GST professional before production.
