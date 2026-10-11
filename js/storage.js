/**
 * ApexNotes - Data Persistence Layer
 * Handles localStorage, data modeling, sample notes generation, and export/import.
 */

const STORAGE_KEYS = {
  NOTES: 'apexnotes_notes_v1',
  FOLDERS: 'apexnotes_folders_v1',
  TAGS: 'apexnotes_tags_v1',
  THEME: 'apexnotes_theme_v1'
};

const DEFAULT_FOLDERS = ['Personal', 'Work', 'Ideas', 'Projects'];
const DEFAULT_TAGS = ['Urgent', 'Meeting', 'Feature', 'Reading', 'Recipe'];

// Initial starter notes to welcome new users
const SAMPLE_NOTES = [
  {
    id: 'note-welcome-1',
    title: '👋 Welcome to ApexNotes!',
    content: `# Welcome to ApexNotes 🚀\n\nA modern, private, and offline-first note-taking app designed for **Windows** and **Android**.\n\n### Key Features:\n- ⚡ **Works Everywhere**: Seamless desktop experience on Windows and touch-friendly interface on Android.\n- 📱 **PWA Installable**: Click **Install App** in Edge/Chrome or choose **Add to Home Screen** on your Android device.\n- 🔒 **100% Offline & Private**: All notes stay on your device in local storage.\n- 💾 **Easy Transfer / Backup**: Export your notes as a JSON backup or download individual notes as Markdown (\`.md\`) files!\n\n### Formatting Shortcuts:\n- Try **bold text** using \`**bold**\` or toolbar.\n- Add *italics* using \`*italics*\`.\n- Make quotes with \`> quote text\`.\n\n> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra`,
    folder: 'Personal',
    tags: ['Feature'],
    pinned: true,
    favorite: true,
    trash: false,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000
  },
  {
    id: 'note-todo-2',
    title: '✅ Interactive Checklists & Tasks',
    content: `# Daily Goals & Checklist 📋\n\nYou can create interactive checklist items! When in Preview mode, clicking a checkbox will toggle its status.\n\n- [x] Set up ApexNotes on Windows\n- [x] Install as PWA on Android phone\n- [ ] Export a backup using the Backup / Restore tool\n- [ ] Try creating your own folders and custom tags\n- [ ] Share or export individual notes to Markdown\n\n### Quick Notes\nFeel free to customize this note or delete it anytime!`,
    folder: 'Personal',
    tags: ['Urgent'],
    pinned: false,
    favorite: true,
    trash: false,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 1800000
  },
  {
    id: 'note-code-3',
    title: '💻 Code Snippets & Markdown',
    content: `# Code Snippets & Notes 🛠️\n\nApexNotes natively formats code blocks with syntax styling.\n\n\`\`\`javascript\n// Sync notes across devices easily\nfunction exportBackup() {\n  const notes = StorageManager.getAllNotes();\n  console.log('Exporting ' + notes.length + ' notes.');\n}\n\`\`\`\n\nYou can also include inline code like \`const isReady = true;\` and clean divider rules:\n\n---\n*Organize your thoughts effortlessly!*`,
    folder: 'Ideas',
    tags: ['Feature'],
    pinned: false,
    favorite: false,
    trash: false,
    createdAt: Date.now() - 14400000,
    updatedAt: Date.now() - 14400000
  }
];

class StorageManager {
  constructor() {
    this.notes = [];
    this.folders = [];
    this.tags = [];
    this.init();
  }

  init() {
    try {
      const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (storedNotes) {
        this.notes = JSON.parse(storedNotes);
      } else {
        // Initialize with default demo notes
        this.notes = [...SAMPLE_NOTES];
        this.saveNotes();
      }

      const storedFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      this.folders = storedFolders ? JSON.parse(storedFolders) : [...DEFAULT_FOLDERS];

      const storedTags = localStorage.getItem(STORAGE_KEYS.TAGS);
      this.tags = storedTags ? JSON.parse(storedTags) : [...DEFAULT_TAGS];
    } catch (e) {
      console.error('Failed to load notes from localStorage:', e);
      this.notes = [...SAMPLE_NOTES];
      this.folders = [...DEFAULT_FOLDERS];
      this.tags = [...DEFAULT_TAGS];
    }
  }

  saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(this.notes));
    } catch (e) {
      console.error('Failed to save notes to localStorage:', e);
    }
  }

  saveFolders() {
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(this.folders));
    } catch (e) {
      console.error('Failed to save folders:', e);
    }
  }

  saveTags() {
    try {
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(this.tags));
    } catch (e) {
      console.error('Failed to save tags:', e);
    }
  }

  getAllNotes(includeTrash = false) {
    if (includeTrash) return this.notes;
    return this.notes.filter(note => !note.trash);
  }

  getNoteById(id) {
    return this.notes.find(note => note.id === id) || null;
  }

  createNote(data = {}) {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: data.title || 'Untitled Note',
      content: data.content || '',
      folder: data.folder || 'Personal',
      tags: data.tags || [],
      pinned: !!data.pinned,
      favorite: !!data.favorite,
      trash: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.notes.unshift(newNote);
    this.saveNotes();
    return newNote;
  }

  updateNote(id, updates) {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) return null;

    this.notes[index] = {
      ...this.notes[index],
      ...updates,
      updatedAt: Date.now()
    };
    this.saveNotes();
    return this.notes[index];
  }

  moveToTrash(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.trash = true;
    note.pinned = false; // Unpin when moving to trash
    note.updatedAt = Date.now();
    this.saveNotes();
    return true;
  }

  restoreFromTrash(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.trash = false;
    note.updatedAt = Date.now();
    this.saveNotes();
    return true;
  }

  deletePermanently(id) {
    const initialLen = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    this.saveNotes();
    return this.notes.length !== initialLen;
  }

  emptyTrash() {
    this.notes = this.notes.filter(note => !note.trash);
    this.saveNotes();
  }

  togglePin(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    this.saveNotes();
    return note.pinned;
  }

  toggleFavorite(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.favorite = !note.favorite;
    note.updatedAt = Date.now();
    this.saveNotes();
    return note.favorite;
  }

  addFolder(name) {
    const trimmed = name.trim();
    if (!trimmed || this.folders.includes(trimmed)) return false;
    this.folders.push(trimmed);
    this.saveFolders();
    return true;
  }

  addTag(name) {
    const trimmed = name.trim();
    if (!trimmed || this.tags.includes(trimmed)) return false;
    this.tags.push(trimmed);
    this.saveTags();
    return true;
  }

  // Backup & Export Functions
  exportDataJSON() {
    const backupData = {
      app: 'ApexNotes',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      notes: this.notes,
      folders: this.folders,
      tags: this.tags
    };
    return JSON.stringify(backupData, null, 2);
  }

  importDataJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.notes || !Array.isArray(data.notes)) {
        throw new Error('Invalid backup file format: Missing notes array.');
      }
      
      // Merge or replace safely
      this.notes = data.notes;
      if (Array.isArray(data.folders)) {
        this.folders = Array.from(new Set([...DEFAULT_FOLDERS, ...data.folders]));
      }
      if (Array.isArray(data.tags)) {
        this.tags = Array.from(new Set([...DEFAULT_TAGS, ...data.tags]));
      }

      this.saveNotes();
      this.saveFolders();
      this.saveTags();
      return { success: true, count: this.notes.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  exportNoteMarkdown(id) {
    const note = this.getNoteById(id);
    if (!note) return null;

    let md = '';
    md += `# ${note.title}\n\n`;
    md += `*Folder: ${note.folder} | Tags: ${note.tags.join(', ')}*\n`;
    md += `*Last Updated: ${new Date(note.updatedAt).toLocaleString()}*\n\n`;
    md += `---\n\n`;
    md += note.content;
    return {
      filename: `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md`,
      content: md
    };
  }
}

// Export singleton
window.Storage = new StorageManager();
