# AutomaticCallingBot - Decision-Maker Outreach & Go Extra Mile Referral Integration

AutomaticCallingBot is an intelligent B2B calling, research, and outreach management application specifically designed to identify high-authority decision-makers in targeted merchant businesses and onboard them onto **Go Extra Mile**.

---

## 🎯 Sales Objective

The primary objective of identifying and contacting these decision-makers is to introduce **Go Extra Mile** and convince relevant companies to **list their products, exclusive offers, discounts, and promotional deals** on the Go Extra Mile platform.

---

## 🌟 Decision-Maker Identification Module

The module enforces strict prioritization rules to ensure sales and calling efforts focus on real decision-makers who have the authority to approve merchant partnerships and promotional deal listings.

### Priority Hierarchy

| Priority Tier | Preference Level | Target Designations | Role in Go Extra Mile Onboarding |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **First Preference** | **Owner**, **Managing Director (MD)**, **Chief Executive Officer (CEO)**, **Founder / Co-Founder** | Highest decision authority; signs partner agreements and approves exclusive brand discounts. |
| **Tier 2** | **Second Preference** | **Head of Marketing**, **Marketing Manager**, **CMO** | Manages brand deals, campaign budgets, festive offers, and merchant listings. |
| **Tier 3** | **Third Preference** | **Head of Sales**, **Sales Manager**, **VP of Sales** | Drives volume distribution, catalog onboarding, and product bundling. |

### Collected Contact Coordinates
For every decision-maker identified across official company websites, LinkedIn, business registries (MCA/ZaubaCorp), and trade directories:
- **Full Name**
- **Current Designation**
- **Company Name**
- **Publicly Available Professional Business Phone Number**
- **Official Business Email** *(if available)*
- **LinkedIn Profile URL** *(if available)*
- **Source URL** *(URL where the contact was discovered)*
- **Verification Status** (`Verified` vs `Unverified`) with audit timestamp & method

### 🛡️ Critical Guardrails
1. **Never Invent Data**: Strictly prevents generating fictitious names, titles, or numbers.
2. **Explicit Verification Status**: Verified entries are visibly distinguished with green badges, and unverified contacts are highlighted in amber with one-click verification review.
3. **No Customer-Care Substitution**:
   - Automated guardrail detects and blocks toll-free/helpline prefixes (`1800`, `1860`, `0800`) and generic support emails (`support@`, `care@`, `customercare@`, `help@`, `info@`).
   - Customer-care numbers are **never substituted** for direct decision-maker contacts.
4. **Multi-Contact Retention**: If multiple decision-makers are found within a single company, all relevant contacts are saved and presented in priority order.

---

## 🎁 Go Extra Mile App / Referral Link Integration

- **Official Referral Link:** `https://www.goextramile.in/r?code=GOMILES`
- **Referral Code:** `GOMILES` (Protected and immutable)

### Key Features
1. **Saved in Application Settings:** Stored centrally in configuration and validated upon every read/write.
2. **Protected Referral Code:** The referral code `GOMILES` is immutable and cannot be altered or stripped.
3. **Dashboard Header & Cards:** Prominently displayed on the top sticky navigation bar and dashboard hero card with one-click **Copy Link** and **Share Link** buttons.
4. **Prospect Profile Accessibility:** The referral link card is embedded inside every company and decision-maker profile for immediate access during calls.
5. **Multi-Channel Sharing:**
   - **WhatsApp:** Direct pre-filled WhatsApp link generator tailored to merchant onboarding.
   - **Email:** Pre-composed mailto links with formal partnership pitch and value propositions.
6. **Post-Call Manual Sharing Flow:**
   - Immediately after completing a sales call with an interested lead, the agent is prompted to share the official onboarding link.
7. **Compliance & Consent Enforcement:**
   - In accordance with Requirement 10: *Never send promotional messages automatically without appropriate consent and authorization.*
   - Sharing requires explicit verbal/written consent confirmation before generating share payloads or logging outreach.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v22+)
- npm

### Installation & Launch
```bash
# Clone and navigate to project folder
cd Automaticcallingbot

# Install dependencies (if not already installed)
npm install

# Start the application server
npm start
```

Access the dashboard at:
👉 **`http://localhost:3000`**

### Running Automated Tests
```bash
npm test
```

---

## 🔌 API Reference

### Settings & Referral
- `GET /api/settings` - Retrieve referral link (`https://www.goextramile.in/r?code=GOMILES`), protected code `GOMILES`, priority tiers, and compliance rules.
- `PUT /api/settings` - Update settings (strictly prevents tampering with `GOMILES`).

### Decision-Makers
- `GET /api/decision-makers` - List decision-makers sorted strictly by Priority Tier (1 → 2 → 3) and verification status. Supports search and filters.
- `POST /api/decision-makers` - Add decision-maker with validation and customer-care blocking.
- `POST /api/decision-makers/:id/verify` - Toggle or set verification status with audit note.
- `DELETE /api/decision-makers/:id` - Delete record.

### Research & Discovery
- `POST /api/research/queries` - Generate targeted Google Dork and LinkedIn search strings for Tier 1, 2, and 3 contacts.
- `POST /api/research/discover` - Run discovery against websites/directories and extract structured candidates with source URLs.
- `POST /api/research/save-candidates` - Batch save discovered candidates to the database.

### Sales Calls & Referral Sharing
- `POST /api/calls` - Log sales call discussion, outcome, and post-call follow-up trigger.
- `GET /api/referral/templates` - Fetch pre-built merchant listing message templates.
- `POST /api/referral/share` - Execute manual share with mandatory consent validation (`consentConfirmed: true`).

