import { db } from "./db";
import { agents } from "@shared/schema";
import { eq } from "drizzle-orm";

const templateData = [
  {
    name: "Email Triage Assistant",
    description: "Automatically categorize incoming emails by priority and topic, flag urgent items, and draft quick replies for common inquiries.",
    prompt: "When an email arrives in my inbox, analyze the content and sender. Categorize it as urgent, important, or low priority. For support emails, draft a polite acknowledgment. For meeting requests, check my calendar availability. Flag anything from VIP contacts.",
    icon: "mail",
    color: "#4285f4",
    triggerType: "email",
    category: "email",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Meeting Notes Summarizer",
    description: "After every meeting, generate concise summaries with action items, key decisions, and follow-up tasks assigned to participants.",
    prompt: "After each meeting ends, create a structured summary including: attendees, key discussion points, decisions made, and action items with owners and deadlines. Send the summary to all participants via email and save it to the shared Drive folder.",
    icon: "calendar",
    color: "#34a853",
    triggerType: "event",
    category: "productivity",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Weekly Status Reporter",
    description: "Compile project updates from team members across Sheets and Docs into a formatted weekly status report every Friday.",
    prompt: "Every Friday at 3 PM, collect updates from the project tracking sheet, recent document changes, and email threads. Compile into a clean status report with sections for each team. Highlight blockers and at-risk deliverables. Send to leadership group.",
    icon: "chart",
    color: "#fbbc04",
    triggerType: "schedule",
    category: "productivity",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Customer Support Router",
    description: "Analyze support tickets, detect sentiment and urgency, then route to the right team member with context and suggested responses.",
    prompt: "When a new support ticket arrives, analyze the content for sentiment, urgency, and topic category. Route technical issues to engineering, billing questions to finance, and feature requests to product. Include a suggested response draft and relevant knowledge base articles.",
    icon: "message",
    color: "#ea4335",
    triggerType: "email",
    category: "support",
    isTemplate: true,
    status: "active",
  },
  {
    name: "HR Onboarding Coordinator",
    description: "Automate new hire onboarding by sending welcome emails, creating accounts, assigning training, and scheduling orientation meetings.",
    prompt: "When a new employee is added to the HR sheet, send a personalized welcome email with first-day instructions. Create a checklist doc from the onboarding template. Schedule orientation meetings with their manager and buddy. Set up access requests for required tools.",
    icon: "users",
    color: "#8b5cf6",
    triggerType: "event",
    category: "hr",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Sales Lead Qualifier",
    description: "Score and qualify inbound leads based on company size, industry, engagement signals, and buying intent indicators.",
    prompt: "When a new lead form submission arrives, research the company online. Score the lead based on company size, industry fit, and engagement history. If score is above threshold, create a briefing doc and notify the assigned sales rep. Add to the pipeline tracker sheet.",
    icon: "zap",
    color: "#f97316",
    triggerType: "webhook",
    category: "sales",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Document Review Agent",
    description: "Review documents for compliance, formatting standards, and completeness. Flag issues and suggest corrections automatically.",
    prompt: "When a document is shared for review, check for compliance with company standards: proper formatting, required sections present, no placeholder text, correct branding. Generate a review checklist with findings and suggestions. Add comments directly in the document.",
    icon: "file",
    color: "#06b6d4",
    triggerType: "event",
    category: "productivity",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Security Alert Monitor",
    description: "Monitor security alerts and access logs, identify anomalies, and notify the security team with incident analysis and recommended actions.",
    prompt: "Continuously monitor access logs and security alerts. When unusual activity is detected (failed login attempts, access from new locations, privilege escalation), analyze the context and severity. Create an incident report and alert the security team via Chat with recommended immediate actions.",
    icon: "shield",
    color: "#ec4899",
    triggerType: "schedule",
    category: "data",
    isTemplate: true,
    status: "active",
  },
];

export async function seedDatabase() {
  try {
    const existing = await db.select().from(agents).where(eq(agents.isTemplate, true));
    if (existing.length > 0) {
      console.log("Templates already seeded, skipping...");
      return;
    }

    for (const template of templateData) {
      await db.insert(agents).values({
        ...template,
        triggerConfig: {},
        actions: [],
      });
    }

    console.log(`Seeded ${templateData.length} templates`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
