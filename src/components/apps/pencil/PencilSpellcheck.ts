import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  isMisspelled,
  isSpellcheckReady,
  loadSpellcheck,
  onSpellcheckReady,
} from '@/lib/spellcheck';

export const pencilSpellcheckKey = new PluginKey('pencilSpellcheck');

const WORD_RE = /[A-Za-z][A-Za-z'’-]*/g;
const RECHECK_DELAY = 350;

function buildDecorations(doc: PMNode): DecorationSet {
  if (!isSpellcheckReady()) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    if (node.marks.some((mark) => mark.type.name === 'code')) return;

    WORD_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WORD_RE.exec(node.text)) !== null) {
      if (!isMisspelled(match[0])) continue;
      const from = pos + match.index;
      decorations.push(
        Decoration.inline(from, from + match[0].length, { class: 'pencil-spell-error' })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const PencilSpellcheck = Extension.create({
  name: 'pencilSpellcheck',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pencilSpellcheckKey,
        state: {
          init: (_, state) => buildDecorations(state.doc),
          apply: (tr, value) => {
            if (tr.getMeta(pencilSpellcheckKey)) return buildDecorations(tr.doc);
            if (tr.docChanged) return value.map(tr.mapping, tr.doc);
            return value;
          },
        },
        props: {
          decorations(state) {
            return pencilSpellcheckKey.getState(state) ?? DecorationSet.empty;
          },
        },
        view(editorView) {
          let timer: ReturnType<typeof setTimeout> | null = null;

          loadSpellcheck();
          const unsubscribe = onSpellcheckReady(() => {
            if (!editorView.isDestroyed) {
              editorView.dispatch(editorView.state.tr.setMeta(pencilSpellcheckKey, true));
            }
          });

          return {
            update(view, prevState) {
              if (view.state.doc.eq(prevState.doc)) return;
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => {
                timer = null;
                if (!view.isDestroyed) {
                  view.dispatch(view.state.tr.setMeta(pencilSpellcheckKey, true));
                }
              }, RECHECK_DELAY);
            },
            destroy() {
              unsubscribe();
              if (timer) clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});
