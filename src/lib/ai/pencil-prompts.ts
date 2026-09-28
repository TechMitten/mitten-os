import type { ChatMessage } from './types';

export type AIActionId =
  | 'improve'
  | 'fix-grammar'
  | 'shorten'
  | 'lengthen'
  | 'simplify'
  | 'professional'
  | 'casual'
  | 'summarize'
  | 'summarize-document'
  | 'outline'
  | 'continue'
  | 'custom';

export type AIScope = 'selection' | 'document' | 'cursor';

export interface AIRunContext {
  scope: AIScope;
  /** Text the action operates on (selected text, whole document, or text before the cursor). */
  text: string;
  /** DOM selection captured when a selection transform was invoked. */
  selection?: { from: number; to: number } | null;
  /** Editor document size at invocation, used to detect stale ranges. */
  docVersion?: number | null;
}

export interface AIAction {
  id: AIActionId;
  label: string;
  scope: AIScope;
  temperature: number;
  instruction: string;
}

const SYSTEM_PREAMBLE =
  'You are an expert writing assistant embedded in a document editor. ' +
  'Follow the instruction precisely and return only the resulting text. ' +
  'Do not add explanations, preamble, labels, or surrounding quotation marks. ' +
  'Use Markdown formatting when it improves readability.';

const action = (
  id: AIActionId,
  label: string,
  scope: AIScope,
  temperature: number,
  instruction: string
): AIAction => ({ id, label, scope, temperature, instruction });

export const CUSTOM_ACTION: AIAction = action('custom', 'Custom instruction', 'selection', 0.4, '');

export const AI_ACTIONS: AIAction[] = [
  action('improve', 'Improve writing', 'selection', 0.4, 'Improve the clarity, flow, and style of the following text while preserving its meaning and formatting.'),
  action('fix-grammar', 'Fix spelling & grammar', 'selection', 0.2, 'Correct the spelling, grammar, and punctuation of the following text. Change as little as possible.'),
  action('shorten', 'Make shorter', 'selection', 0.3, 'Rewrite the following text to be more concise while preserving all key information.'),
  action('lengthen', 'Make longer', 'selection', 0.6, 'Expand the following text with more detail, examples, or explanation while keeping the same meaning and tone.'),
  action('simplify', 'Simplify', 'selection', 0.3, 'Rewrite the following text in plain, simple language that is easy to understand.'),
  action('professional', 'Professional tone', 'selection', 0.4, 'Rewrite the following text in a polished, professional, and formal tone.'),
  action('casual', 'Casual tone', 'selection', 0.5, 'Rewrite the following text in a friendly, conversational, and casual tone.'),
  action('summarize', 'Summarize', 'selection', 0.3, 'Summarize the following text in a few clear sentences.'),
  action('summarize-document', 'Summarize document', 'document', 0.3, 'Write a concise summary of the following document, capturing its main points.'),
  action('outline', 'Generate outline', 'document', 0.4, 'Create a structured outline of the following document using headings and bullet points.'),
  action('continue', 'Continue writing', 'cursor', 0.7, 'Continue writing the user\'s text naturally, matching its style, tone, and language. Write only the continuation, not the original text.'),
  CUSTOM_ACTION,
];

const ACTION_MAP: Record<AIActionId, AIAction> = AI_ACTIONS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AIActionId, AIAction>
);

export function getAction(id: AIActionId): AIAction {
  return ACTION_MAP[id];
}

export const SELECTION_ACTIONS: AIAction[] = AI_ACTIONS.filter((a) => a.scope === 'selection' && a.id !== 'custom');
export const DOCUMENT_ACTIONS: AIAction[] = AI_ACTIONS.filter(
  (a) => a.id === 'summarize-document' || a.id === 'outline' || a.id === 'continue'
);

const quote = (text: string) => `"""\n${text}\n"""`;

export function buildMessages(
  actionId: AIActionId,
  context: AIRunContext,
  customPrompt?: string
): ChatMessage[] {
  const source = context.text.trim();

  if (actionId === 'custom') {
    const prompt = (customPrompt ?? '').trim();
    const instruction =
      context.scope === 'selection'
        ? `Apply the following instruction to the text provided by the user.\n\nInstruction: ${prompt}`
        : prompt;
    const user = source ? `${instruction}\n\n${quote(source)}` : instruction;
    return [
      { role: 'system', content: SYSTEM_PREAMBLE },
      { role: 'user', content: user },
    ];
  }

  const selected = getAction(actionId);

  if (actionId === 'continue') {
    const user = source ? `Text so far:\n${quote(source)}` : 'Write an opening paragraph.';
    return [
      { role: 'system', content: `${SYSTEM_PREAMBLE} ${selected.instruction}` },
      { role: 'user', content: user },
    ];
  }

  return [
    { role: 'system', content: `${SYSTEM_PREAMBLE} ${selected.instruction}` },
    { role: 'user', content: `Text:\n${quote(source)}` },
  ];
}
