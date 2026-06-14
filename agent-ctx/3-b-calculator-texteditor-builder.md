# Task 3-b: Calculator & TextEditor App Builder

## Task
Build Calculator and TextEditor real app components for the browser-based OS.

## Files Created
1. `/home/z/my-project/src/components/apps/Calculator.tsx`
2. `/home/z/my-project/src/components/apps/TextEditor.tsx`

## Files Modified
- `/home/z/my-project/src/components/apps/index.tsx` - Added re-exports for CalculatorApp and TextEditorApp

## Calculator Implementation Details
- Full calculator state machine: `display`, `expression`, `prevValue`, `operator`, `waitingForOperand`
- Display area with expression history and formatted result (locale-aware number formatting)
- Button grid: numbers (0-9), operators (+, −, ×, ÷), special buttons (C, CE, %, ±, ., =, backspace)
- Keyboard support via useEffect event listener
- Division by zero error handling
- Dark theme: bg-zinc-900, amber operator buttons, active:scale-95 press feedback

## TextEditor Implementation Details
- Menu bar with File (New, Open, Save, Close Tab) and Edit (Undo, Redo, Cut, Copy, Paste, Select All)
- Tab bar with multiple tabs, active indicator (amber-500 border), modified dot, close buttons, + button
- Catppuccin Mocha color scheme (bg-[#1e1e2e], text-[#cdd6f4])
- Status bar: file name, modified indicator, line count, char count, UTF-8
- Per-tab undo/redo stacks (up to 50 states)
- Clipboard API integration for cut/copy/paste
- Click-outside-to-close menu behavior
- Placeholder Open/Save for future file system integration

## Integration
- Both components exported from index.tsx replacing placeholder versions
- No new lint errors introduced
- Desktop.tsx APP_COMPONENT_MAP already maps 'calculator' and 'text-editor' to these components
