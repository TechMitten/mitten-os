import {
  Wand2,
  SpellCheck2,
  Scissors,
  Expand,
  Feather,
  Briefcase,
  Coffee,
  ListChecks,
  FileText,
  ListTree,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { AIActionId } from '@/lib/ai/pencil-prompts';

export const AI_ACTION_ICONS: Record<AIActionId, LucideIcon> = {
  improve: Wand2,
  'fix-grammar': SpellCheck2,
  shorten: Scissors,
  lengthen: Expand,
  simplify: Feather,
  professional: Briefcase,
  casual: Coffee,
  summarize: ListChecks,
  'summarize-document': FileText,
  outline: ListTree,
  continue: PenLine,
  custom: Sparkles,
};
