export interface KnowledgeBaseRule {
  id: string;
  category: string;
  rule: string;
  description: string;
}

export const SeededKnowledgeBase: KnowledgeBaseRule[] = [
  {
    id: 'RULE-001',
    category: 'Release Scheduling',
    rule: 'Product launches must be scheduled on Thursdays.',
    description: 'Launches on Friday or right before a holiday are prohibited to ensure post-release support availability.',
  },
  {
    id: 'RULE-002',
    category: 'Security Compliance',
    rule: 'Secret credentials, tokens, or passwords must never be logged or committed.',
    description: 'Any document mentioning security keys or API tokens must flag it as a critical risk.',
  },
  {
    id: 'RULE-003',
    category: 'Task Assignment',
    rule: 'Action items cannot be assigned automatically.',
    description: 'All proposed actions remain in a proposed state until reviewed and approved by a workspace administrator.',
  },
];
