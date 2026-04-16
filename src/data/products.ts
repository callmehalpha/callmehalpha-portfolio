
import { Product } from '../types';

export const PRODUCTS: Product[] = [
  {
    slug: 'ai-job-kit',
    name: 'AI Job Hunter Kit',
    tagline: 'The plug-and-play AI system that helps job seekers land interviews in 11 days — not 11 months.',
    price: '$14',
    originalPrice: '$47',
    ctaUrl: 'https://callmehalpha.gumroad.com/l/xaekc',
    ctaText: 'Get Instant Access',
    compatibility: 'Works with ChatGPT, Claude & Gemini · No paid subscription needed',

    socialProof: {
      author: 'Abdulazeez',
      title: 'Systems Engineer & Technical Founder',
      quote: "I built this kit after watching too many talented friends get ghosted by job boards. It's the system I wish existed when I was job searching — engineered, tested, and packaged into something you can use in the next 10 minutes.",
    },

    problem: {
      headline: 'Job searching in 2025 is broken.',
      intro: 'You know the drill:',
      painPoints: [
        'You spend hours tailoring each resume and never hear back',
        'Your applications vanish into ATS black holes',
        'You freeze up on "Tell me about yourself" — every single time',
        'Cold outreach feels awkward and you don\'t know what to say',
        'You accepted the first offer and left $10K+ on the table',
        'You\'re applying to 100 jobs a week and still not getting interviews',
      ],
      closing: "The problem isn't you. It's your process. AI can fix that — if you know the right prompts.",
    },

    features: [
      {
        icon: '📄',
        title: 'Strategic Quick-Start Guide',
        description: '17-page PDF walking you through the 5-step AI job search system. Includes a 30-day action plan.',
      },
      {
        icon: '⚡',
        title: '53 AI Prompt Templates',
        description: 'Copy-paste prompts for resumes, cover letters, LinkedIn, interviews, networking, and salary negotiation. Organized into 7 categories.',
      },
      {
        icon: '📊',
        title: 'Job Search Tracker (Excel)',
        description: '4-tab spreadsheet: application tracker, networking log, interview prep log, and weekly dashboard. Dropdowns + sample data included.',
      },
      {
        icon: '🎯',
        title: 'Interview Prep System',
        description: 'AI mock interviewer prompts with scoring, STAR-method answer builder, company research templates, and a 20-question behavioral bank.',
      },
      {
        icon: '💬',
        title: 'Cold Outreach Templates',
        description: '10 proven scripts for cold emails, LinkedIn DMs, referral requests, and follow-ups that actually get replies.',
      },
      {
        icon: '💰',
        title: 'Salary Negotiation Playbook',
        description: 'Market research prompts, counter-offer email templates, verbal negotiation scripts, and a do\'s/don\'ts cheat sheet.',
      },
    ],

    promptPreview: {
      intro: "Here's what an actual prompt looks like inside the kit:",
      promptCode: `PROMPT #1 — TAILORED RESUME BUILDER

Act as an expert resume writer with 15 years of experience in [INDUSTRY].

My background:
- Current role: [YOUR ROLE]
- Years of experience: [NUMBER]
- Key skills: [LIST 5-8 SKILLS]
- Notable achievements: [2-3 WITH NUMBERS]

Target job description:
[PASTE JD HERE]

Write a tailored, ATS-optimized resume that:
1. Mirrors keywords from the JD naturally
2. Quantifies achievements with metrics (%, $, #)
3. Uses strong action verbs
4. Fits on one page`,
      outro: 'Copy it. Paste it into ChatGPT. Fill in the brackets. Get a tailored, interview-worthy resume in under 10 minutes.',
      totalCount: 53,
    },

    personas: [
      {
        title: 'The Overwhelmed Applier',
        description: "You've sent 100+ applications and heard back from a handful. You need a better system, not more volume.",
      },
      {
        title: 'The Career Changer',
        description: "You have transferable skills from your last career but don't know how to reframe them for a new industry.",
      },
      {
        title: 'The Recent Graduate',
        description: "You're competing against experienced candidates and need every advantage you can get.",
      },
      {
        title: 'The Underpaid Professional',
        description: "You know you're worth more but don't have the scripts to negotiate it.",
      },
      {
        title: 'The AI Curious',
        description: "You've heard AI can help with job searching but have no idea where to start or what prompts actually work.",
      },
    ],
    exclusionNote: "Not for you if: You're looking for a magic button. This kit is a system — you still have to do the work. It just makes every hour of effort count 10x more.",

    faq: [
      {
        question: 'Do I need a paid AI subscription?',
        answer: 'No. Every prompt works with the free tiers of ChatGPT, Claude, and Google Gemini. Zero ongoing cost.',
      },
      {
        question: 'What industries is this for?',
        answer: 'Every industry. Prompts use fill-in-the-blank placeholders — customize them for tech, marketing, finance, healthcare, education, or any field.',
      },
      {
        question: 'Is this just ChatGPT prompts?',
        answer: 'No. You get a strategic guide, 53 battle-tested prompts, a tracking spreadsheet, networking scripts, interview frameworks, and salary negotiation tools — organized into a step-by-step system.',
      },
      {
        question: 'How is it delivered?',
        answer: 'Instant digital download via Gumroad. You get a ZIP file with 2 PDFs and 1 Excel file. Open on any device.',
      },
      {
        question: "I'm not tech-savvy. Will this work for me?",
        answer: 'If you can copy and paste, you can use this kit. Every prompt has clear [BRACKETED] placeholders and instructions.',
      },
      {
        question: "What if it doesn't work for me?",
        answer: "Gumroad offers a straightforward refund process. If the kit isn't what you expected, you can request a refund — no hard feelings.",
      },
    ],

    finalCta: {
      headline: 'Your next job is one prompt away.',
      subtext: 'Stop sending resumes into the void. Start using AI as your unfair advantage.',
      perks: ['All future updates included', 'Works with any AI tool', '2-minute setup'],
      authorCredit: 'Built by Abdulazeez — Systems Engineer & Technical Founder',
    },

    images: {
      cover: '/product-assets/ai-job-kit/Gumroad_Cover_1280x720.png',
      thumbnail: '/product-assets/ai-job-kit/Gumroad_Thumbnail_600x600.png',
    },
    seo: {
      title: 'AI Job Hunter Kit | Land Interviews in 11 Days',
      description: 'The plug-and-play AI prompt system engineered to help you bypass ATS filters and land your dream role. 53+ battle-tested prompts for every stage of the job search.',
      keywords: ['AI Job Search', 'ATS Optimization', 'Resume Prompts', 'Interview Prep', 'Job Hunting Kit'],
      image: 'https://abdulazeez.usaiy.xyz/product-assets/ai-job-kit/Gumroad_Cover_1280x720.png'
    }
  },
];
