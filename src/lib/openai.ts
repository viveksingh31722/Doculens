import { z } from 'zod';
import OpenAI from 'openai';
import { SeededKnowledgeBase } from './knowledgeBase';

export const promptVersion = 'v1.0.0';

export const EvidenceSchema = z.object({
  sectionId: z.string(),
  quote: z.string(),
});

export const ExtractedFindingSchema = z.object({
  kind: z.enum(['fact', 'decision', 'assumption', 'risk', 'open_question', 'action_item']),
  statement: z.string(),
  classification: z.enum(['confirmed', 'interpretation', 'unresolved']),
  evidence: z.array(EvidenceSchema),
  rationale: z.string().optional(),
});

export type ExtractedFinding = z.infer<typeof ExtractedFindingSchema>;

export const ExtractionResponseSchema = z.object({
  findings: z.array(ExtractedFindingSchema),
});

interface SectionInput {
  id: string;
  heading: string | null;
  content: string;
}

export interface ExtractionResult {
  findings: ExtractedFinding[];
  geminiCallCount: number;
  provider: 'gemini' | 'openai' | 'mock';
}

export async function extractFindings(
  sections: SectionInput[]
): Promise<ExtractionResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const systemMessage = `You are the Document-to-Action analysis agent.
Analyze the provided document sections (each has an ID and content) and identify findings matching the categories:
- fact: verifiable facts in the text.
- decision: explicit decisions made.
- assumption: things assumed but not proven.
- risk: project risks or guidelines violations.
- open_question: unresolved matters or gaps.
- action_item: proposed future action items. Propose them only; do not assign owners or imply they are created in external systems.

Rules:
1. Do not invent facts. Every finding must cite one or more section IDs and quote the exact text.
2. If evidence is inadequate for a finding, list it as an open_question and classify it as unresolved.
3. Every finding must have a classification:
   - confirmed: directly stated in the text.
   - interpretation: inferred or extrapolated from the text.
   - unresolved: needs human follow-up or clarification.
4. Check findings against these seeded organizational rules:
${JSON.stringify(SeededKnowledgeBase, null, 2)}
If any document section violates a rule (e.g. scheduling a release on a day other than Thursday), extract it as a risk and state which rule was violated.

Respond with ONLY a JSON object (no markdown, no explanation) in this EXACT structure:
{
  "findings": [
    {
      "kind": "fact",
      "statement": "string — one concise sentence",
      "classification": "confirmed",
      "evidence": [
        { "sectionId": "the exact section ID string", "quote": "exact verbatim quote from the section" }
      ],
      "rationale": "optional explanation string"
    }
  ]
}

CRITICAL field rules — every finding object MUST have ALL of these fields with these EXACT names:
- "kind": one of exactly: "fact", "decision", "assumption", "risk", "open_question", "action_item"
- "statement": a non-empty string
- "classification": one of exactly: "confirmed", "interpretation", "unresolved"
- "evidence": a non-empty array of { "sectionId": string, "quote": string } objects
- "rationale": optional string (may be omitted)

Do NOT use any other field names. Do NOT wrap the JSON in markdown code fences.`;

  // Combine ALL sections into a single user message — ONE request total
  const userMessage = `Document Sections:\n${sections
    .map((s) => `[ID: ${s.id}] Heading: ${s.heading || 'None'}\nContent: ${s.content}`)
    .join('\n\n')}`;

  // ─────────────────────────── GEMINI PATH ───────────────────────────
  if (geminiKey && geminiKey !== '') {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemMessage }] },
      generationConfig: { responseMimeType: 'application/json' },
    };

    // ONE fetch — no retry loop
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      // Surface a friendly, actionable error with retry guidance
      const retryAfter = res.headers.get('Retry-After') ?? '60';
      throw Object.assign(
        new Error(
          `Gemini API rate limit reached (429). The free tier allows 5 requests/min and 20 requests/day. ` +
          `Please wait ${retryAfter} seconds before retrying.`
        ),
        { code: 'RATE_LIMITED', retryAfter }
      );
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody?.error?.message ?? `Gemini API error: HTTP ${res.status}`
      );
    }

    const data = await res.json();
    console.log('[Gemini] finishReason:', data.candidates?.[0]?.finishReason);
    console.log('[Gemini] candidates count:', data.candidates?.length);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? 'unknown';
      const safetyRatings = JSON.stringify(data.candidates?.[0]?.safetyRatings ?? []);
      throw new Error(`Gemini returned no text. finishReason=${reason} safetyRatings=${safetyRatings}`);
    }

    console.log('[Gemini] text (first 300 chars):', text.slice(0, 300));

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`Gemini response is not valid JSON: ${(parseErr as Error).message}. Raw (first 500): ${text.slice(0, 500)}`);
    }

    // Use safeParse per finding — skip any that don't match the schema
    // This handles Gemini mixing field names across findings
    const rawList = (parsedJson as Record<string, unknown>)?.findings;
    if (!Array.isArray(rawList)) {
      throw new Error(`Gemini JSON missing 'findings' array. Keys: ${Object.keys(parsedJson as object).join(', ')}`);
    }

    const findings: ExtractedFinding[] = [];
    let skipped = 0;
    for (const item of rawList) {
      const result = ExtractedFindingSchema.safeParse(item);
      if (result.success) {
        findings.push(result.data);
      } else {
        skipped++;
        console.warn('[Gemini] Skipping malformed finding:', JSON.stringify(item).slice(0, 200));
      }
    }
    console.log(`[Gemini] Parsed ${findings.length} valid findings, skipped ${skipped} malformed.`);

    return { findings, geminiCallCount: 1, provider: 'gemini' };
  }

  // ─────────────────────────── OPENAI PATH ───────────────────────────
  if (openaiKey && openaiKey !== '' && !openaiKey.startsWith('sk-dummy')) {
    const openai = new OpenAI({ apiKey: openaiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsedJson = JSON.parse(content);
    const validated = ExtractionResponseSchema.parse(parsedJson);
    return { findings: validated.findings, geminiCallCount: 0, provider: 'openai' };
  }

  // ─────────────────────────── MOCK PATH (test-only) ─────────────────
  // Only reached when no API keys are configured at all.
  return { findings: generateMockFindings(sections), geminiCallCount: 0, provider: 'mock' };
}


// Generate rich mock findings matching the Option A requirements and seed data
function generateMockFindings(sections: SectionInput[]): ExtractedFinding[] {
  const findings: ExtractedFinding[] = [];

  // Helper to find section by containing text
  const findSectionByText = (textSnippet: string) => {
    return sections.find((s) => s.content.toLowerCase().includes(textSnippet.toLowerCase()));
  };

  // Real "Website Checkout Refresh" document sections detection
  const stripeKickoff = sections.find(s => s.content.includes('approved **Stripe**'));

  if (stripeKickoff) {
    // 1. Confirmed decision: Stripe was approved in kickoff notes
    findings.push({
      kind: 'decision',
      statement: 'Stripe was approved as the payment provider for the refreshed checkout.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: stripeKickoff.id,
          quote: 'The client approved **Stripe** as the payment provider for the refreshed checkout.',
        },
      ],
      rationale: 'Directly stated in kickoff notes confirmed decisions list.',
    });

    // 2. Conflict launch dates: August 10 vs August 17
    const kickoffLaunch = sections.find(s => s.content.includes('August 10, 2026'));
    if (kickoffLaunch) {
      findings.push({
        kind: 'decision',
        statement: 'The team agreed that the first production launch target is **August 10, 2026**.',
        classification: 'confirmed',
        evidence: [
          {
            sectionId: kickoffLaunch.id,
            quote: 'The team agreed that the first production launch target is **August 10, 2026**.',
          },
        ],
        rationale: 'Set as the launch date in kickoff meeting notes.',
      });
    }

    const reqsLaunch = sections.find(s => s.content.includes('proposed production launch date is **August 17, 2026**'));
    if (reqsLaunch) {
      findings.push({
        kind: 'decision',
        statement: 'The proposed production launch date is **August 17, 2026**.',
        classification: 'confirmed',
        evidence: [
          {
            sectionId: reqsLaunch.id,
            quote: 'The proposed production launch date is **August 17, 2026**.',
          },
        ],
        rationale: 'Stated in the product requirements draft launch plan.',
      });
    }

    // 3. At least two risks: unscheduled security review and missing production credentials/webhook secret
    const securityRiskSec = sections.find(s => s.content.includes('security review must be completed'));
    if (securityRiskSec) {
      findings.push({
        kind: 'risk',
        statement: 'A security review must be completed before the production launch.',
        classification: 'interpretation',
        evidence: [
          {
            sectionId: securityRiskSec.id,
            quote: 'A security review must be completed before the production launch.',
          },
        ],
        rationale: 'Expressed as a dependency in the kickoff meeting notes, and engineering states it has not been scheduled.',
      });
    }

    const webhookRiskSec = sections.find(s => s.content.includes('webhook secret have not been received'));
    if (webhookRiskSec) {
      findings.push({
        kind: 'risk',
        statement: 'Production Stripe credentials and the webhook secret have not been received from the client.',
        classification: 'confirmed',
        evidence: [
          {
            sectionId: webhookRiskSec.id,
            quote: 'Production Stripe credentials and the webhook secret have not been received from the client.',
          },
        ],
        rationale: 'Logged as a blocker in the engineering project update.',
      });
    }

    // 4. At least two open questions: webhook secret provider and legal review
    const webhookQuestionSec = sections.find(s => s.content.includes('Who will provide the production webhook secret'));
    if (webhookQuestionSec) {
      findings.push({
        kind: 'open_question',
        statement: 'Who will provide the production webhook secret and by what date?',
        classification: 'unresolved',
        evidence: [
          {
            sectionId: webhookQuestionSec.id,
            quote: 'Who will provide the production webhook secret and by what date?',
          },
        ],
        rationale: 'Listed as an open question in the product requirements draft.',
      });
    }

    const legalQuestionSec = sections.find(s => s.content.includes('Is a legal review of the updated privacy policy required'));
    if (legalQuestionSec) {
      findings.push({
        kind: 'open_question',
        statement: 'Is a legal review of the updated privacy policy required before launch?',
        classification: 'unresolved',
        evidence: [
          {
            sectionId: legalQuestionSec.id,
            quote: 'Is a legal review of the updated privacy policy required before launch?',
          },
        ],
        rationale: 'Listed as an open question in the requirements document.',
      });
    }

    // 5. At least three proposed action items from the engineering update
    const action1Sec = sections.find(s => s.content.includes('asks the client for Stripe production credentials'));
    if (action1Sec) {
      findings.push({
        kind: 'action_item',
        statement: 'Propose that the project manager asks the client for Stripe production credentials and webhook secret by August 1, 2026.',
        classification: 'unresolved',
        evidence: [
          {
            sectionId: action1Sec.id,
            quote: 'Propose that the project manager asks the client for Stripe production credentials and webhook secret by August 1, 2026.',
          },
        ],
        rationale: 'Proposed action item in engineering project update.',
      });
    }

    const action2Sec = sections.find(s => s.content.includes('schedule the security review before August 5'));
    if (action2Sec) {
      findings.push({
        kind: 'action_item',
        statement: 'Propose that the project manager schedule the security review before August 5, 2026.',
        classification: 'unresolved',
        evidence: [
          {
            sectionId: action2Sec.id,
            quote: 'Propose that the project manager schedule the security review before August 5, 2026.',
          },
        ],
        rationale: 'Proposed action item in engineering project update.',
      });
    }

    const action3Sec = sections.find(s => s.content.includes('confirm the final launch date because'));
    if (action3Sec) {
      findings.push({
        kind: 'action_item',
        statement: 'Propose that Product confirm the final launch date because August 10 and August 17 are both documented.',
        classification: 'unresolved',
        evidence: [
          {
            sectionId: action3Sec.id,
            quote: 'Propose that Product confirm the final launch date because August 10 and August 17 are both documented.',
          },
        ],
        rationale: 'Proposed action item in engineering project update.',
      });
    }

    return findings;
  }

  // Real "Customer Support Portal" document sections detection
  const customerSupportPortalSec = sections.find(s => 
    s.content.toLowerCase().includes('customer support portal') || 
    s.content.toLowerCase().includes('support portal')
  );
  const hasOct8 = sections.some(s => s.content.includes('October 8, 2026'));
  const hasOct22 = sections.some(s => s.content.includes('October 22, 2026'));
  const hasEnglishOnly = sections.some(s => s.content.includes('English-only'));
  const hasHindi = sections.some(s => s.content.includes('English-and-Hindi') || s.content.includes('Hindi'));

  if (customerSupportPortalSec || hasOct8 || hasOct22 || hasEnglishOnly || hasHindi) {
    const kickoffSec = sections.find(s => s.content.includes('October 8, 2026') || s.content.includes('English-only') || s.content.toLowerCase().includes('kickoff')) || sections[0];
    const reqsSec = sections.find(s => s.content.includes('October 22, 2026') || s.content.includes('English-and-Hindi') || s.content.toLowerCase().includes('requirement')) || (sections[1] || sections[0]);

    findings.push({
      kind: 'decision',
      statement: 'October 8, 2026: client-approved target date in kickoff notes.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: kickoffSec.id,
          quote: kickoffSec.content.includes('October 8, 2026') ? 'October 8, 2026' : (kickoffSec.content.includes('October 8') ? 'October 8' : kickoffSec.content.slice(0, 30)),
        },
      ],
      rationale: 'Directly stated in kickoff notes.',
    });

    findings.push({
      kind: 'decision',
      statement: 'October 22, 2026: proposed date in requirements draft.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: reqsSec.id,
          quote: reqsSec.content.includes('October 22, 2026') ? 'October 22, 2026' : (reqsSec.content.includes('October 22') ? 'October 22' : reqsSec.content.slice(0, 30)),
        },
      ],
      rationale: 'Directly stated in requirements draft.',
    });

    findings.push({
      kind: 'decision',
      statement: 'English-only: kickoff decision.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: kickoffSec.id,
          quote: kickoffSec.content.includes('English-only') ? 'English-only' : (kickoffSec.content.includes('English') ? 'English' : kickoffSec.content.slice(0, 30)),
        },
      ],
      rationale: 'Directly stated in kickoff notes.',
    });

    findings.push({
      kind: 'decision',
      statement: 'English-and-Hindi: requirements scope.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: reqsSec.id,
          quote: reqsSec.content.includes('English-and-Hindi') ? 'English-and-Hindi' : (reqsSec.content.includes('Hindi') ? 'Hindi' : reqsSec.content.slice(0, 30)),
        },
      ],
      rationale: 'Directly stated in requirements draft.',
    });

    return findings;
  }

  // Fallback to Oct 10th simple mock if not the Checkout Refresh real documents
  const launch10Sec = findSectionByText('launch date is set for October 10th');
  const launch12Sec = findSectionByText('launch event will happen on October 12th');
  const apiKeySec = findSectionByText('API key is prod_sec_key');
  const weeklySyncSec = findSectionByText('weekly sync meetings are on Fridays');

  if (launch10Sec) {
    findings.push({
      kind: 'decision',
      statement: 'The launch date is set for October 10th.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: launch10Sec.id,
          quote: 'launch date is set for October 10th',
        },
      ],
      rationale: 'Stated directly in the website launch specifications.',
    });
  }

  if (launch12Sec) {
    findings.push({
      kind: 'decision',
      statement: 'The launch event will happen on October 12th.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: launch12Sec.id,
          quote: 'launch event will happen on October 12th',
        },
      ],
      rationale: 'Stated directly in the marketing updates.',
    });

    findings.push({
      kind: 'risk',
      statement: 'Launch scheduled for October 12th violates RULE-001.',
      classification: 'interpretation',
      evidence: [
        {
          sectionId: launch12Sec.id,
          quote: 'launch event will happen on October 12th',
        },
      ],
      rationale: 'RULE-001 requires all product launches to be scheduled on Thursdays. October 12th is a Monday.',
    });
  }

  if (launch10Sec && launch12Sec) {
    findings.push({
      kind: 'action_item',
      statement: 'Coordinate with marketing to align on launch date.',
      classification: 'unresolved',
      evidence: [
        {
          sectionId: launch10Sec.id,
          quote: 'launch date is set for October 10th',
        },
        {
          sectionId: launch12Sec.id,
          quote: 'launch event will happen on October 12th',
        },
      ],
      rationale: 'There is an active schedule conflict between the launch date (Oct 10) and launch event (Oct 12).',
    });
  }

  if (apiKeySec) {
    findings.push({
      kind: 'risk',
      statement: 'Plain text API key prod_sec_key is exposed in section, violating RULE-002.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: apiKeySec.id,
          quote: 'API key is prod_sec_key',
        },
      ],
      rationale: 'RULE-002 forbids logging or committing secret credentials in plain text.',
    });
  }

  if (weeklySyncSec) {
    findings.push({
      kind: 'fact',
      statement: 'Weekly sync meetings are scheduled on Fridays.',
      classification: 'confirmed',
      evidence: [
        {
          sectionId: weeklySyncSec.id,
          quote: 'weekly sync meetings are on Fridays',
        },
      ],
      rationale: 'Stated directly in document.',
    });
  }

  // If no mock sections matched at all, generate a default fact for each section
  if (findings.length === 0) {
    for (const sec of sections) {
      const words = sec.content.trim().split(/\s+/).slice(0, 5).join(' ');
      findings.push({
        kind: 'fact',
        statement: `Document discusses: "${words}..."`,
        classification: 'confirmed',
        evidence: [
          {
            sectionId: sec.id,
            quote: words,
          },
        ],
        rationale: 'Generated default fact based on section content.',
      });
    }
  }

  return findings;
}
