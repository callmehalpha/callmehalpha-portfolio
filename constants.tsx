
import { CaseStudy, BuildLog, Capability, Philosophy } from './types';

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
    items: ["Node.js/TypeScript", "Go", "PostgreSQL/Redis", "gRPC/REST"]
  },
  {
    title: "Infrastructure & DevOps",
    description: "Treating infrastructure as code to ensure reproducible environments and automated scaling.",
    items: ["Kubernetes", "AWS/GCP", "Terraform", "CI/CD Pipelines"]
  },
  {
    title: "Payments & Fintech Systems",
    description: "Developing mission-critical financial systems where accuracy and transaction integrity are non-negotiable.",
    items: ["Ledgering", "KYC/KYB Integration", "Fraud Detection", "Stripe/Adyen"]
  }
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "virtuosphere",
    name: "Virtuosphere",
    url: "https://v1.virtuobusiness.com",
    focus: ["Multi-tenant architecture", "Institutional onboarding", "Payments & identity"],
    context: "A multi-tenant platform built to handle complex institutional onboarding and resource management for enterprise clients.",
    role: "Lead Architect & Systems Engineer. Owned the core platform design from inception to production.",
    architecture: "Modular monolith transitioning to micro-services. Utilized PostgreSQL with row-level security (RLS) for tenant isolation and Redis for session management.",
    decisions: [
      "Implemented a custom RBAC system to handle hierarchical institutional roles.",
      "Used an event-driven approach for background KYC/KYB processing to keep the UI responsive.",
      "Architected a pluggable payment provider system to allow switching between gateways without rewriting business logic."
    ],
    challenges: "Balancing the flexibility required by different enterprise tenants with the need for a shared, maintainable core codebase.",
    outcome: "Successfully onboarded multiple high-tier institutional clients with zero data leakage between tenants.",
    lessons: "Strict schema boundaries are more valuable than abstract 'flexibility'. Explicit constraints prevent cascading failures."
  },
  {
    id: "frootify",
    name: "Frootify",
    url: "https://frootify.tech",
    focus: ["Backend + frontend ownership", "Operational systems", "Product evolution"],
    context: "Operational system designed to manage supply chain and distribution logic under real-world logistics constraints.",
    role: "Full-stack System Lead. Responsible for aligning technical execution with volatile business requirements.",
    architecture: "Cloud-native architecture leveraging serverless functions for elastic scaling and a real-time tracking engine.",
    decisions: [
      "Prioritized a highly observable logging system to debug physical supply chain anomalies.",
      "Optimized the mobile frontend for low-connectivity environments commonly found in warehouses."
    ],
    challenges: "Adapting the data model to handle frequent shifts in business operations without breaking legacy data.",
    outcome: "Reduced operational overhead by 40% through automation of manual distribution logic.",
    lessons: "Technology must serve the operation. A perfect system that doesn't account for human error in the field is a broken system."
  },
  {
    id: "brandseller",
    name: "Brandseller",
    url: "https://brandseller.co.uk/",
    focus: ["Platform reliability", "Commercial system design", "Maintainability"],
    context: "A commercial platform facilitating brand-to-consumer relationships with high uptime requirements.",
    role: "Principal Engineer. Focused on stabilizing legacy bottlenecks and architecting for long-term growth.",
    architecture: "Balanced stack focused on reliability. Load-balanced instances with a robust caching layer for high-read product catalogs.",
    decisions: [
      "Decoupled the ordering system from the inventory management to prevent inventory locks during high-traffic sales.",
      "Integrated automated regression testing at the API level to ensure commercial logic integrity."
    ],
    challenges: "Modernizing a live system with significant traffic while maintaining 99.9% availability.",
    outcome: "Achieved a 60% reduction in system downtime and improved checkout conversion through faster response times.",
    lessons: "Maintainability is a feature. Refactoring for clarity is as important as shipping new capabilities."
  },
  {
    id: "atlax-exchange",
    name: "Atlax Exchange",
    url: "https://atlaxchange.com/",
    focus: ["Fintech architecture", "Payment flows", "High-reliability backend"],
    context: "High-performance exchange platform requiring sub-second transaction processing and absolute ledger correctness.",
    role: "Backend Infrastructure Lead. Focused on the core transaction engine and security architecture.",
    architecture: "Distributed system with a focus on transactional atomicity. Use of message queues (RabbitMQ) for order matching and asynchronous reconciliation.",
    decisions: [
      "Implemented double-entry bookkeeping at the database level to ensure fiscal integrity.",
      "Designed a hardware-security-module (HSM) based approach for managing sensitive cryptographic keys."
    ],
    challenges: "Managing high-throughput transaction spikes without introducing latency or race conditions in the ledger.",
    outcome: "Processed millions in transaction volume with zero accounting discrepancies.",
    lessons: "In fintech, 'eventual consistency' is often a liability. Aim for strong consistency in the core ledger and move everything else to the edge."
  }
];

export const BUILD_LOGS: BuildLog[] = [
  {
    title: "The Case for Modular Monoliths",
    date: "2024-11-12",
    excerpt: "Why microservices should be a result of scale, not a starting point.",
    content: "In the early stages of Virtuosphere, the temptation to jump straight into microservices was high. However, we chose a modular monolith. Why? Reduced network latency, simplified deployment, and easier refactoring across domain boundaries. As the domains matured and team sizes grew, the boundaries we defined early allowed us to extract services with minimal friction."
  },
  {
    title: "Surviving Payment Edge Cases",
    date: "2024-09-05",
    excerpt: "Lessons from building the Atlax Exchange ledgering system.",
    content: "Network timeouts during payment capture are the bane of fintech. We implemented a robust idempotency-key strategy across all API calls. Every transaction attempt is logged before the external call, ensuring that even if the connection drops, we can safely retry or reconcile the state without double-charging."
  },
  {
    title: "Designing for Observability",
    date: "2024-07-20",
    excerpt: "Moving beyond simple logs to structured telemetry.",
    content: "Logs are useless if you can't query them. On Frootify, we moved to structured JSON logging and distributed tracing. Being able to follow a single request ID across four different services during a peak-load failure saved us hours of post-mortem analysis."
  }
];
