
import { CaseStudy, BuildLog, Capability, Philosophy } from '../types';

export const PHILOSOPHIES: Philosophy[] = [
  { title: "Systems over features", description: "Functionality is transient; the integrity of the underlying system is what enables longevity." },
  { title: "Correctness before scale", description: "Premature optimization is the root of failure. Ensure the logic holds before widening the pipe." },
  { title: "Explicit ownership", description: "Code without a clear owner or boundary is technical debt by definition." },
  { title: "Build for failure", description: "Assume components will fail. Design systems that degrade gracefully rather than collapsing." },
  { title: "Boring tech, deliberate architecture", description: "Use proven tools to solve complex problems. Reserve innovation for the architecture, not the stack." }
];

export const CAPABILITIES: Capability[] = [
  {
    title: "Architecture & Systems Design",
    description: "Designing high-availability distributed systems with clear boundaries and domain-driven design principles.",
    items: ["Microservices", "Event-Driven Arch", "Multi-tenant isolation"]
  },
  {
    title: "Backend Engineering",
    description: "Building robust API layers and business logic with a focus on performance and type safety.",
    items: ["Node.js/TypeScript", "Go", "PostgreSQL/Redis", "gRPC/REST", "LARAVEL/PHP"]
  },
  {
    title: "Infrastructure & DevOps",
    description: "Treating infrastructure as code to ensure reproducible environments and automated scaling.",
    items: ["Kubernetes", "AWS/GCP", "Terraform", "CI/CD Pipelines", "Docker", "CodeRabbbit"]
  },
  {
    title: "Payments & Fintech Systems",
    description: "Developing mission-critical financial systems where accuracy and transaction integrity are non-negotiable.",
    items: ["Double Entry Ledgering", "KYC/KYB Integration", "Fraud Detection", "Stripe", "Paystack", "Flutterwave", "Multi-currency support"]
  }
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "virtuosphere",
    name: "Virtuosphere",
    url: "https://v1.virtuobusiness.com",
    focus: [
      "Education management systems",
      "NFC-based identity & payments",
      "Multi-tenant institutional platforms"
    ],
    context:
      "Virtuosphere is a multi-tenant education management platform built for primary, secondary, and tertiary institutions. It combines academic administration with NFC-based identity and cashless payment infrastructure, designed for environments where authority, scale, and operational reliability are critical.",
    role:
      "CTO / System Lead. Led the platform from idea to production, including system design, infrastructure, hardware integration, and institutional rollout.",
    architecture:
      "Dockerized modular monolith built with NestJS for backend services, Next.js for administrative and web interfaces, and React Native for mobile applications. PostgreSQL is used as the primary datastore with strict tenant isolation (RLS) to separate schools and departments, while Redis handles session management, queues, and event-driven workflows. Custom services interface with NFC-enabled devices for identity, attendance, and on-premise payments.",
    decisions: [
      "Designed the system around institutional authority: school admins, departments, and staff roles were modeled before individual users.",
      "Built a custom service to communicate with NFC-enabled devices manufactured in China, enabling real-time identity verification, attendance tracking, and on-campus transactions.",
      "Implemented NFC cards as a unified identity layer for students and staff, supporting access control, attendance, and closed-loop payments within school premises.",
      "Separated payment and identity domains from academic workflows to allow financial operations to scale independently without disrupting core school processes."
    ],
    challenges:
      "Coordinating software, hardware, and financial systems at institutional scale while maintaining tenant isolation, transaction integrity, and operational uptime.",
    outcome:
      "Processed payments for over 4,000 students during departmental and SUG fee collections at Federal University of Agriculture Abeokuta. Deployed daily NFC-based attendance and identity verification for over 1,000 students at Foursquare School, with consistent real-time usage.",
    lessons:
      "In institutional environments, authority-first design and operational reliability matter more than feature velocity. Systems earn trust when identity, payments, and administration are tightly integrated."
  },
  {
    id: "frootify",
    name: "Frootify",
    url: "https://frootify.tech",
    focus: [
      "B2B2C platform design",
      "Workforce control and accountability",
      "Operational systems for asset-heavy businesses",
      "Investor-readiness through technology"
    ],
    context:
      "Frootify is an asset-backed consumer business transitioning from a walk-in retail model to a B2B2C, internet-enabled distribution system. The platform is being built to support scale, multi-location operations, workforce accountability, and operational visibility ahead of a major investment round.",
    role:
      "CTO / System Lead. Responsible for end-to-end technical strategy, platform architecture, and aligning system capabilities with business expansion and fundraising goals.",
    architecture:
      "Centralized operational platform designed around vendors rather than individual consumers. Supports multi-service-point vendors (chain businesses), role-based staff access, and centralized oversight. Includes admin and vendor dashboards, a staff mobile app, and a planned delivery/rider infrastructure to extend reach beyond physical locations.",
    decisions: [
      "Led the shift from a B2C-first approach to a B2B2C model to enable chain vendors, multiple service points, and scalable operations.",
      "Redesigned the data model so a single vendor can operate multiple locations under unified control.",
      "Introduced staff-level access controls to ensure all operational actors (vendors, staff, riders) operate within a single system of record.",
      "Built a dedicated staff attendance system where attendance can only be marked on-premises, preventing remote or proxy check-ins.",
      "Enforced location and device-bound attendance validation to ensure staff presence is verifiable and auditable.",
      "Used AI-assisted workflows to rapidly prototype operational dashboards and internal tools, accelerating iteration under tight timelines."
    ],
    challenges:
      "Designing systems that reflect real operational behavior — including staff movement, connectivity issues, and human error — while keeping the platform simple enough for non-technical users.",
    outcome:
      "Delivered a scalable operational foundation with centralized control over vendors, locations, and staff. Reduced ambiguity around workforce presence and laid the groundwork for disciplined expansion and investor confidence.",
    lessons:
      "In physical, asset-heavy businesses, trust is enforced through systems. Location-bound identity, workforce accountability, and clear operational controls matter more than feature richness. Scale comes from structure, not features — once operational authority and visibility are designed into the system, growth becomes a controllable process rather than a risk."
  },

  {
    id: "circlify",
    name: "Circlify",
    url: "https://circlify.io",
    focus: [
      "Group-based financial systems",
      "Authority-first onboarding",
      "Cross-border compliance (UK & Nigeria)"
    ],
    context:
      "Circlify is a community finance platform built for UK diaspora groups and Nigerian cooperatives to manage rotating savings, contributions, and payouts. The system is designed around trust, authority, and transparency rather than individual user growth.",
    role:
      "Founder & System Architect. Owned the product from idea to production, including domain modeling, backend architecture, compliance decisions, and rollout strategy.",
    architecture:
      "Group-centric platform architecture where every action is scoped to a circle and governed by an admin authority. Backend services manage circle creation, member invitations, approvals, and contribution flows. The system enforces explicit state transitions to prevent unauthorized participation. Compliance-sensitive services are isolated to allow phased rollout across jurisdictions.",
    decisions: [
      "Designed the platform around circle admins as the primary authority, requiring explicit invite, approval, or rejection before any member can participate.",
      "Implemented controlled onboarding flows to prevent anonymous or uncontrolled group access, prioritizing trust over rapid user acquisition.",
      "Paused Nigerian rollout due to NDPR and data-provider constraints, choosing regulatory clarity over premature scale.",
      "Evaluated alternative payment and data providers to replace Mono where compliance requirements could not be met.",
      "Structured the platform to support community-level deployments rather than individual app signups."
    ],
    challenges:
      "Balancing regulatory compliance across jurisdictions while maintaining a simple, trust-first experience for non-technical community leaders.",
    outcome:
      "Delivered a production-ready MVP capable of supporting managed community savings groups, with clear authority controls and auditable contribution flows. Established a compliant foundation for UK diaspora onboarding while preparing for Nigeria expansion.",
    lessons:
      "In group finance, trust is enforced through structure. Authority must come before users, and compliance must come before growth. Systems that ignore this fail quietly at scale."
  }

];

export const BUILD_LOGS: BuildLog[] = [
  {
    title: "The Case for Modular Monoliths",
    date: "2025-10-10",
    excerpt:
      "Written from experience building  — a multi-tenant institutional system operating under regulatory, operational, and hardware constraints.",
    content:
      "Early in Virtuosphere, the temptation to adopt microservices was strong. Instead, we chose a modular monolith. This allowed us to enforce clear domain boundaries, preserve transactional integrity, and operate with predictable latency in live institutional environments. By keeping services co-located but strictly modular, we reduced operational overhead, simplified deployments, and retained the ability to refactor safely as requirements evolved. As domains matured and usage scaled, the explicit boundaries defined early made later service extraction a refactoring exercise rather than a rewrite.",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7382334959094771713"
  }
];
