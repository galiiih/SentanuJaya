# SENTANU JAYA ERP — MASTER USER DOCUMENTATION & KNOWLEDGE BASE
Version: 1.0.0
Last Verified: 2026-11-01
Scope: ADMIN, OWNER, and STAFF role guides, core modules, business rules, and Nanu AI RAG integration.

---

## 1. Company & ERP Overview
Sentanu Jaya Web App is a custom Enterprise Resource Planning (ERP) system designed specifically to manage manufacturing operations, trading, distribution, inventory records, customer purchase orders (Customer PO), goods receipts (Goods Receipt / STB), work orders, production, Quality Control (QC), delivery notes (Delivery Order), invoices, and receivables settlement (Payment).

### User Roles (Role-Based Access Control)
- **ADMIN**: Manages master data and system configuration, monitors all transaction modules, manages users and templates, and supervises daily operations.
- **OWNER**: Has executive monitoring access, financial reports, cash and receivables oversight, approval of key transactions, and comprehensive business performance analysis.
- **STAFF**: Enters daily operational data and records transactions according to assigned duties (warehouse, production, sales, or finance).

---

## 2. Core Business Processes
The primary Sentanu Jaya ERP business process is sequential and integrated:
1. **Master Data & Customer Setup**: Register customers, materials, and prices.
2. **Customer PO**: Record customer orders (`CustomerPo`).
3. **Goods Receipt / STB**: Record receipt of materials or goods (`GoodsReceipt`).
4. **Work Order & Production**: Create production work orders based on customer orders or stock requirements (`WorkOrder`).
5. **Quality Control (QC)**: Inspect production output (`InternalQcInspection`).
6. **Delivery Order**: Deliver finished goods to customers (`DeliveryOrder`).
7. **Invoice**: Bill based on valid deliveries (`Invoice`).
8. **Payment**: Record customer invoice settlement (`Payment`).

---

## 3. Role-Based User Manuals

### A. ADMIN Manual
- **Dashboard**: Monitor the daily operational overview.
- **Master Data**: Manage Customer, Material, Supplier, UOM, and Branch records.
- **Transactions**: Create and verify Customer PO, Goods Receipt, Work Order, Delivery Order, Invoice, and Payment transactions.
- **Nanu AI**: Use the Nanu AI assistant for quick ERP data queries and operational guidance.

### B. OWNER Manual
- **Executive Dashboard**: Monitor KPIs, production summaries, revenue, and total receivables.
- **Financial & Receivables Reports**: Analyze payments for the current month and customers with the largest outstanding balances.
- **Audit & Monitoring**: Monitor transaction statuses without directly modifying staff's daily operational records.

### C. STAFF Manual
- **Daily Operations**: Enter transactions according to assigned duties (for example, warehouse staff record goods receipts/STB and material stock).
- **Nanu AI Guide**: Ask how-to questions to ensure compliance with company SOPs.

---

## 4. Nanu AI RAG & Knowledge Integration Architecture
Nanu AI uses a **Retrieval-Augmented Generation (RAG)** architecture supported by:
- **Backend Source of Truth**: Laravel 13 + PostgreSQL 16.
- **Dual LLM Provider Support**: Ollama (`http://127.0.0.1:11434`, model `qwen3.5:9b`) and 9Router (`http://localhost:20128/v1`).
- **Knowledge Retrieval & Guards**: Strict separation between guidance queries (GUIDE) and operational data queries (DATA_QUERY), with guardrails for topics outside the Sentanu Jaya ERP domain.
- **Feedback & Learning Workflow**: User interactions and feedback are recorded to continuously improve the knowledge base.
