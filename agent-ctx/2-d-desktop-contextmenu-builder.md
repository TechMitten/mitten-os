# Task 2-d: Desktop & ContextMenu Builder

## Task
Build Desktop, ContextMenu, and DesktopIcon components for the browser-based OS.

## Files Created/Modified

### Created:
1. `/home/z/my-project/src/components/os/Desktop.tsx` - Main workspace area
2. `/home/z/my-project/src/components/os/ContextMenu.tsx` - Right-click context menu
3. `/home/z/my-project/src/components/os/DesktopIcon.tsx` - Desktop icon component
4. `/home/z/my-project/src/components/apps/index.tsx` - Placeholder app components

### Modified:
5. `/home/z/my-project/src/app/page.tsx` - Updated to render Desktop component
6. `/home/z/my-project/src/app/layout.tsx` - Removed default bg styles, updated metadata
7. `/home/z/my-project/src/components/os/Taskbar.tsx` - Added data-start-button attribute

## Implementation Details

### Desktop.tsx
- Full-screen workspace with wallpaper background (gradient or image URL support)
- Desktop icons grid on the left side (80x80 areas)
- Right-click context menu with 7 items (New Folder, New File, Change Wallpaper, Display Settings, Refresh, separator, About Z.ai OS)
- Click handling: desktop click deselects/ closes menus, icon click selects, icon double-click opens app
- Windows rendering with app component registry (APP_COMPONENT_MAP)
- Integrates StartMenu, Taskbar, ContextMenu, Window components
- Dark theme class applied based on store

### ContextMenu.tsx
- Glassmorphism style (rgba backdrop + blur)
- Framer Motion animations (scale + fade)
- Menu items with icon, label, optional shortcut
- Separator support
- z-[10000] positioning
- Auto-close on click outside or Escape key
- Viewport-aware position adjustment

### DesktopIcon.tsx
- Lucide icon mapping (string name → component)
- 80x80 area with centered icon + label
- Selected state with bg-white/15 + ring
- Hover state with bg-white/10
- Double-click opens app, single-click selects
- Stop propagation to prevent desktop click handlers

### App Placeholders
- Simple "Coming soon" placeholders for all 10 apps defined in APP_REGISTRY
- FileExplorer, Terminal, Browser, TextEditor, Calculator, Settings, ImageViewer, AppStore, Weather, AboutSystem

## Dependencies on Other Agents
- Window component (2-a) - used with `isActive` prop
- StartMenu component (2-b or 2-c) - uses named export
- Taskbar component (2-b) - uses default export, added data-start-button attribute
