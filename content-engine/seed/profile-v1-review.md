# Profile v1 — reconciliation review

> This is a manual run of the reconcile step (WF-06) on the three CVs uploaded on
> 2026-10-12, checked against the current portfolio. It lists what is consistent, what
> conflicts, and what needs your answer before Profile v1 is seeded. When the pipeline
> exists, this is the kind of diff the approval email will show.
>
> Phone number deliberately left out (private by default, D12).

**Sources**

| Key | File |
|---|---|
| **A** | `Abdulazeez_Yisau_Full_Stack_Engineer_CV.pdf` |
| **B** | `Abdulazeez_Yisau_Backend_Engineer_CV.pdf` (same as A except title line and opening word) |
| **C** | `Abdulazeez_Yisau_Temitope_FullStack_CV.pdf` (older layout, different detail) |
| **P** | Current portfolio (`src/data/constants.tsx`, hero copy in `Portfolio.tsx`) |

A and B are already **two variants of one resume** (Full Stack vs Backend). That maps
directly onto resume variants in §6.7 of the plan.

---

## 1. Consistent across sources

- **Name:** Abdulazeez Yisau Temitope · Ibadan, Nigeria · abdulazeezyisau@gmail.com
- **Links:** github.com/callmehalpha · abdulazeez.usaiy.xyz · linkedin.com/in/abdulazeez-yisau-tech-ceo
- **Education:** BSc Computer Science, Olabisi Onabanjo University (2019–2022); National Diploma (OND) Computer Science, Federal Polytechnic Ilaro (2015–2017)
- **Vascon Solutions:** Full Stack Engineer, Apr 2020 – Feb 2024, remote; NCDMB government application in Laravel; legacy migration to a Node.js stack
- **Virtuo:** co-founder, Jan 2024 – Mar 2026; NestJS platform; **15,000 active users**; exited Mar 2026
- **USAIY Limited:** founder, product studio, from 2025
- **Atlax Exchange:** started Jul 2025; Go + PostgreSQL; payments/exchange backend
- **Core stack:** Node.js, NestJS, TypeScript, Go, PostgreSQL, React, Next.js, React Native, PHP/Laravel, Docker

## 2. Conflicts — resolved 2026-10-12

| # | Decision |
|---|---|
| C1 | Atlax: **Full Stack Engineer**, Jul 2025 – present (still there) |
| C2 | **6+ years** |
| C4 | Vascon: **initiated and led the first phase** (planning the architecture migration); the team lead took it from there, and I kept contributing |
| C5 | Frootify: **Lead Product Engineer** only, until the CTO role has documentation |
| C6 | DOKTA: **two-month contract** (Jul–Aug 2026). Retainer / head-of-product offer is still in deliberation, so it is not mentioned |
| C7 | **Virtuo** everywhere (no "Virtuosphere") |
| C9 | Circlify: **I'm the founder**; it's a product rolled out under USAIY |

| C3 | Platform count = **number of case studies live on the portfolio**, computed when served (`derive: case_study_count`) |
| C8 | MÍRÀ Africa and its stores are **currently offline** |
| C10 | GiftPing is live but in **maintenance mode**, like Circlify, while I make changes; both are planned to reopen **mid-2027** |
| — | NOGIC: "onboarded and mentored 3 engineering teams" → **collaborated with 3 engineering teams** during the move |

Still open: C12 (headline: the CV profile uses Technical Product Builder and waits for approval).

The reconciled profile is `seed/data/profile-cv.json`. The seed adds it as a **draft** Profile revision; the site keeps the
current copy until it's approved (`POST /admin/content/profile_revision/<id> {"action":"approve"}`).

### Original conflict table

| # | Topic | What the sources say | Proposed canonical | Your call |
|---|---|---|---|---|
| C1 | **Atlax title & dates** | A/B: *Backend Engineer*, Jul 2025 – **Present**. C and P: *Senior Product Engineer*, Jul 2025 – **Jun 2026** | Which is current? If you're still there, which title is correct? | ☐ |
| C2 | **Years of experience** | A/B: "over five years". C: "4+ years". Vascon Apr 2020 → now ≈ 6.5 years | "6+ years" (from dates) | ☐ |
| C3 | **Live platforms count** | C: "8 live platforms" (lists 8). P: "8+ production platforms". A/B: studio "four platforms" | "8 production platforms", with the studio's 4 as a separate point. The two counts measure different things | ☐ |
| C4 | **Vascon migration role** | A/B: "**contributed to** the migration". C and P: "**initiated and led** the migration… onboarded 3 teams" | Very different claims; recruiters will check this. Which is accurate? | ☐ |
| C5 | **Frootify** | C and P: Lead Product Engineer → CTO, Mar 2025 – Apr 2026, 5× order throughput (myBlongo). **Missing from A/B** | Include. Was it left out of A/B on purpose (e.g. overlap with Atlax)? | ☐ |
| C6 | **DOKTA (Access Providence)** | A/B: contract, Jul–Aug 2026, sole engineer, 42-item roadmap in 10 weeks. **Missing from C and P** | Include (newer than C). Jul–Aug is ~2 months vs "ten weeks"; confirm the dates | ☐ |
| C7 | **Virtuo title** | A/B: "Cofounder". C: "Co-Founder and **Lead Engineer**", 9-day NFC MVP sprint. P: "Virtuosphere" | "Co-Founder & Lead Engineer, Virtuo". Is the project name Virtuo or Virtuosphere? | ☐ |
| C8 | **MÍRÀ Africa** | A/B: "listing and discovery platform". C: "multi-tenant… **three live vendor tenants** with their own domains, Paystack billing" | Use C's detail if still true | ☐ |
| C9 | **Circlify** | A/B: platform for a **UK-registered CIC**. C: "Digital Ajo / rotational savings". P: "Founder & System Architect" | Combine: rotational savings (Ajo) for a UK CIC. Is your role founder or engineer for a client? | ☐ |
| C10 | **GiftPing** | Only in C | Still live? Include? | ☐ |
| C11 | **USAIY start date** | A/B: Jan 2025. C: 2025 | Jan 2025 | ☐ |
| C12 | **Headline title** | A: Full Stack Engineer. B: Backend Engineer. C: Senior Full-Stack Engineer. P: "Systems Engineer & Technical Founder". **Branding plan: Technical Product Builder** | Site/brand headline = **Technical Product Builder**. Resume variants keep role-specific titles (Backend, Full Stack) for job applications | ☐ |

## 3. Gaps between CVs and the portfolio

**Projects in the CVs with no case study yet.** The pipeline would propose a draft case study for each:

| Project | Evidence available | Pillar fit |
|---|---|---|
| DOKTA telemedicine | Sole engineer, NestJS + React + React Native, two-sided payments, real-time video/voice/chat, 42 items in 10 weeks | Product, Healthcare |
| MÍRÀ Africa | Multi-tenant Laravel + Next.js storefronts, 3 live tenants, Paystack | Africa, Product |
| BureauOS | UK/Nigeria compliance platform, multi-entity, permission model, compliance calendar, "Orin AI" | Business, AI |
| GiftPing | Claim lifecycle, Paystack, OG metadata for WhatsApp sharing | Product, Africa |
| USAIY Limited (studio) | 4 platforms, multi-tenant RBAC standard, self-hosted mail infra | Leadership, Business |

**In the portfolio but thin in the CVs:** the Atlax case study has more detail (provider failover after three consecutive failures, canonical bank codes, tier limits) than A/B. C has it. The resume curation step should pull it from the case study.

## 4. Hero stats — with evidence

| Stat | Evidence | Source |
|---|---|---|
| 15,000+ active users | Virtuo, live production | A, B, C |
| 8,800+ transactions in one week at 98% success | Atlax payout/settlement, two providers | A, B |
| 42-item roadmap in 10 weeks, sole engineer | DOKTA | A, B |
| 5× order throughput | Frootify / myBlongo backend work | C |
| 9 days from start to production | Virtuo NFC payment MVP | C, P |
| 8 production platforms | Live portfolio list | C, P (pending C3) |

## 5. Positioning shift (for your approval)

The branding plan moves the headline from **"Systems Engineer & Technical Founder"** to
**"Technical Product Builder — I turn business problems into shipped technology products."**
The evidence supports it: sole-engineer launches (DOKTA), a co-founder exit with 15k users
(Virtuo), a CTO role (Frootify), and a product studio (USAIY). Fintech, healthcare and
African markets are all covered by real work. AI/Crypto is covered by Atlax (digital assets)
and BureauOS (Orin AI), but more lightly. Expect notes in the AI pillar to strengthen it.

Proposed Profile v1 headline block (draft):

> **Technical Product Builder**
> I turn business problems into shipped technology products — across fintech,
> healthcare and African markets.
> 6+ years building payments, healthcare and operational platforms end to end: from a
> 15,000-user cashless payments platform I co-founded, to payout services processing
> 8,800+ transactions a week, to a telemedicine platform I took from concept to launch
> as the sole engineer.

Once the conflicts in §2 are answered, this file becomes the seed for Profile v1
(`seed/profile.json`) and the first resume build.
