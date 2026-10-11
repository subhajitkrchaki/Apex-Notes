/**
 * ApexNotes - Main Application Controller
 * Connects Storage, Editor, Search, and UI views across Windows and Android devices.
 */

class AppController {
  constructor() {
    this.activeNoteId = null;
    this.currentTheme = localStorage.getItem('apexnotes_theme') || 'dark';
    this.isMobile = window.innerWidth <= 768;
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);

    // Initialize Editor DOM references
    window.Editor.init({
      titleInput: document.getElementById('editor-title'),
      textarea: document.getElementById('editor-content'),
      previewPane: document.getElementById('markdown-preview'),
      bodyWrapper: document.getElementById('editor-body-wrapper'),
      saveStatusEl: document.getElementById('save-status'),
      folderSelect: document.getElementById('note-folder-select'),
      tagContainer: document.getElementById('note-tags-container')
    });

    // PWA Install Button hook
    window.PWA.setInstallButton(document.getElementById('btn-pwa-install'));

    this.bindEvents();
    this.renderSidebar();
    this.renderNoteList();

    // Select the first note or create initial
    const initialNotes = window.SearchFilter.getFilteredAndSortedNotes();
    if (initialNotes.length > 0) {
      this.selectNote(initialNotes[0].id, false);
    } else {
      this.createNewNote(false);
    }

    // Responsive resize listener
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768;
    });

    // Check URL parameters for shortcut actions (e.g. ?action=new)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
      this.createNewNote(true);
    }
  }

  bindEvents() {
    // 1. Navigation items (All Notes, Pinned, Favorites, Trash)
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        const nav = el.dataset.nav;
        document.querySelectorAll('[data-nav]').forEach(item => item.classList.remove('active'));
        el.classList.add('active');

        window.SearchFilter.setFilter(nav);
        this.renderNoteList();
        this.closeSidebarDrawer();

        // Update mobile bottom nav active state if applicable
        this.updateMobileNavActive(nav);
      });
    });

    // 2. Search Input
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    searchInput.addEventListener('input', (e) => {
      window.SearchFilter.setSearchQuery(e.target.value);
      searchClear.style.display = e.target.value ? 'block' : 'none';
      this.renderNoteList();
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      window.SearchFilter.setSearchQuery('');
      this.renderNoteList();
    });

    // 3. Sort Select
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
      window.SearchFilter.setSortBy(e.target.value);
      this.renderNoteList();
    });

    // 4. Create New Note Buttons (Desktop sidebar, Notes pane header, and Mobile FAB)
    const handleNewNote = () => this.createNewNote(true);
    document.getElementById('btn-new-note-sidebar').addEventListener('click', handleNewNote);
    document.getElementById('btn-new-note-header').addEventListener('click', handleNewNote);
    document.getElementById('mobile-fab').addEventListener('click', handleNewNote);

    // 5. Note Header Actions
    document.getElementById('btn-pin-note').addEventListener('click', () => this.togglePin());
    document.getElementById('btn-fav-note').addEventListener('click', () => this.toggleFavorite());
    document.getElementById('btn-delete-note').addEventListener('click', () => this.deleteNote());
    document.getElementById('btn-restore-note').addEventListener('click', () => this.restoreNote());
    document.getElementById('btn-export-md').addEventListener('click', () => this.downloadMarkdown());

    // 6. Formatting Toolbar buttons
    document.querySelectorAll('[data-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        this.applyFormat(format);
      });
    });

    // 7. View Mode Switcher (Edit, Split, Preview)
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        window.Editor.setViewMode(mode);
      });
    });

    // 8. Mobile Navigation & Drawers
    document.getElementById('btn-mobile-menu').addEventListener('click', () => this.openSidebarDrawer());
    document.getElementById('btn-close-sidebar').addEventListener('click', () => this.closeSidebarDrawer());
    document.getElementById('sidebar-backdrop').addEventListener('click', () => this.closeSidebarDrawer());
    document.getElementById('btn-editor-back').addEventListener('click', () => this.closeEditorMobile());

    // Mobile Bottom Navigation Tabs
    document.querySelectorAll('.nav-bar-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab === 'notes') {
          window.SearchFilter.setFilter('all');
          this.renderNoteList();
          this.closeSidebarDrawer();
          this.closeEditorMobile();
        } else if (tab === 'favorites') {
          window.SearchFilter.setFilter('favorites');
          this.renderNoteList();
          this.closeSidebarDrawer();
          this.closeEditorMobile();
        } else if (tab === 'folders') {
          this.openSidebarDrawer();
        } else if (tab === 'backup') {
          this.openModal('modal-backup');
        }
        this.updateMobileNavActive(tab);
      });
    });

    // 9. Theme Toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme);
    });

    // 10. Modals (New Folder, New Tag, Backup/Restore)
    document.getElementById('btn-add-folder').addEventListener('click', () => this.openModal('modal-folder'));
    document.getElementById('btn-add-tag').addEventListener('click', () => this.openModal('modal-tag'));
    document.getElementById('btn-open-backup').addEventListener('click', () => this.openModal('modal-backup'));

    // Modal Close buttons
    document.querySelectorAll('.modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      });
    });

    // Modal Form Submissions
    document.getElementById('form-add-folder').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-folder-name');
      if (input.value.trim()) {
        const added = window.Storage.addFolder(input.value.trim());
        if (added) {
          this.showToast(`Folder "${input.value.trim()}" created!`);
          this.renderSidebar();
          this.renderFolderSelect();
          input.value = '';
          this.closeModal('modal-folder');
        } else {
          this.showToast('Folder already exists or invalid.', 'error');
        }
      }
    });

    document.getElementById('form-add-tag').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-tag-name');
      if (input.value.trim()) {
        const added = window.Storage.addTag(input.value.trim());
        if (added) {
          this.showToast(`Tag #${input.value.trim()} added!`);
          this.renderSidebar();
          input.value = '';
          this.closeModal('modal-tag');
        } else {
          this.showToast('Tag already exists or invalid.', 'error');
        }
      }
    });

    // Export & Import Handlers
    document.getElementById('btn-export-json').addEventListener('click', () => {
      this.downloadJSONBackup();
    });

    document.getElementById('input-import-json').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = window.Storage.importDataJSON(event.target.result);
          if (result.success) {
            this.showToast(`Imported ${result.count} notes successfully! 🎉`);
            this.renderSidebar();
            this.renderNoteList();
            this.renderFolderSelect();
            const first = window.Storage.getAllNotes()[0];
            if (first) this.selectNote(first.id, false);
            this.closeModal('modal-backup');
          } else {
            this.showToast(`Import error: ${result.error}`, 'error');
          }
        };
        reader.readAsText(file);
      }
    });

    // Empty Trash confirmation button
    document.getElementById('btn-empty-trash').addEventListener('click', () => {
      if (confirm('Are you sure you want to permanently delete all notes in the Trash?')) {
        window.Storage.emptyTrash();
        this.renderSidebar();
        this.renderNoteList();
        this.showToast('Trash emptied permanently.');
      }
    });

    // Note Folder selector dropdown
    const folderSelect = document.getElementById('note-folder-select');
    folderSelect.addEventListener('change', (e) => {
      if (this.activeNoteId) {
        window.Storage.updateNote(this.activeNoteId, { folder: e.target.value });
        this.renderSidebar();
        this.renderNoteList();
      }
    });

    // Keyboard Shortcuts (Ctrl+N, Ctrl+S)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.createNewNote(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.Editor.saveCurrentNote();
        this.showToast('Note saved!');
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        this.closeSidebarDrawer();
      }
    });
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apexnotes_theme', theme);
    const themeIcon = document.getElementById('theme-toggle-icon');
    if (themeIcon) {
      themeIcon.innerHTML = theme === 'dark' 
        ? '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        : '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" fill="currentColor"/>';
    }
  }

  // Sidebar rendering
  renderSidebar() {
    const allNotes = window.Storage.getAllNotes(false);
    const pinnedNotes = allNotes.filter(n => n.pinned);
    const favNotes = allNotes.filter(n => n.favorite);
    const trashNotes = window.Storage.getAllNotes(true).filter(n => n.trash);

    // Update Counts
    document.getElementById('count-all').textContent = allNotes.length;
    document.getElementById('count-pinned').textContent = pinnedNotes.length;
    document.getElementById('count-fav').textContent = favNotes.length;
    document.getElementById('count-trash').textContent = trashNotes.length;

    // Render Folders
    const folderList = document.getElementById('sidebar-folder-list');
    folderList.innerHTML = '';
    window.Storage.folders.forEach(folder => {
      const count = allNotes.filter(n => n.folder === folder).length;
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `
        <div class="nav-item-content">
          <svg class="nav-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <span>${this.escapeHtml(folder)}</span>
        </div>
        <span class="badge-count">${count}</span>
      `;
      li.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        li.classList.add('active');
        window.SearchFilter.setFilter('folder', folder);
        this.renderNoteList();
        this.closeSidebarDrawer();
      });
      folderList.appendChild(li);
    });

    // Render Tags
    const tagList = document.getElementById('sidebar-tag-list');
    tagList.innerHTML = '';
    const tagColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#a855f7'];

    window.Storage.tags.forEach((tag, idx) => {
      const color = tagColors[idx % tagColors.length];
      const count = allNotes.filter(n => n.tags && n.tags.includes(tag)).length;
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `
        <div class="nav-item-content">
          <span class="tag-dot" style="background-color: ${color};"></span>
          <span>#${this.escapeHtml(tag)}</span>
        </div>
        <span class="badge-count">${count}</span>
      `;
      li.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        li.classList.add('active');
        window.SearchFilter.setFilter('tag', tag);
        this.renderNoteList();
        this.closeSidebarDrawer();
      });
      tagList.appendChild(li);
    });
  }

  // Notes List rendering
  renderNoteList() {
    const listContainer = document.getElementById('notes-scroll-list');
    const notes = window.SearchFilter.getFilteredAndSortedNotes();
    const isTrash = window.SearchFilter.currentFilter.type === 'trash';

    // Show / Hide empty trash button in header
    document.getElementById('btn-empty-trash').style.display = (isTrash && notes.length > 0) ? 'inline-flex' : 'none';

    if (notes.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <div style="font-weight:600;font-size:1.05rem;">No notes found</div>
          <div style="font-size:0.85rem;">${isTrash ? 'Trash bin is empty.' : 'Create a new note or adjust your search filters.'}</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card ${note.id === this.activeNoteId ? 'active' : ''}`;
      card.dataset.id = note.id;

      // Extract a clean snippet from content (stripping markdown)
      const snippet = this.getSnippetText(note.content);
      const dateText = this.formatDate(note.updatedAt);

      card.innerHTML = `
        <div class="note-card-top">
          <div class="note-card-title">${this.escapeHtml(note.title || 'Untitled Note')}</div>
          <div class="note-card-badges">
            ${note.pinned ? '<span class="badge-pinned" title="Pinned">📌</span>' : ''}
            ${note.favorite ? '<span class="badge-fav" title="Favorite">❤️</span>' : ''}
          </div>
        </div>
        <div class="note-card-snippet">${this.escapeHtml(snippet)}</div>
        <div class="note-card-meta">
          <span>${dateText}</span>
          <div class="note-card-tags">
            ${(note.tags || []).slice(0, 2).map(t => `<span class="tag-pill">#${this.escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectNote(note.id, true);
      });

      listContainer.appendChild(card);
    });
  }

  selectNote(id, openMobileEditor = true) {
    this.activeNoteId = id;
    const note = window.Storage.getNoteById(id);
    if (!note) return;

    // Update active class on note list cards
    document.querySelectorAll('.note-card').forEach(card => {
      card.classList.toggle('active', card.dataset.id === id);
    });

    // Populate Editor
    window.Editor.loadNote(note);
    this.renderFolderSelect();
    this.renderNoteTags(note);

    // Update Action Buttons
    const btnPin = document.getElementById('btn-pin-note');
    btnPin.classList.toggle('active', note.pinned);

    const btnFav = document.getElementById('btn-fav-note');
    btnFav.classList.toggle('active', note.favorite);

    const isTrash = !!note.trash;
    document.getElementById('btn-delete-note').style.display = isTrash ? 'none' : 'inline-flex';
    document.getElementById('btn-restore-note').style.display = isTrash ? 'inline-flex' : 'none';

    // On mobile screens, transition view into editor
    if (this.isMobile && openMobileEditor) {
      this.openEditorMobile();
    }
  }

  createNewNote(focusTitle = true) {
    const currentFolder = window.SearchFilter.currentFilter.type === 'folder' 
      ? window.SearchFilter.currentFilter.value 
      : 'Personal';

    const currentTag = window.SearchFilter.currentFilter.type === 'tag'
      ? [window.SearchFilter.currentFilter.value]
      : [];

    const newNote = window.Storage.createNote({
      title: 'New Note',
      content: '',
      folder: currentFolder,
      tags: currentTag
    });

    this.renderSidebar();
    this.renderNoteList();
    this.selectNote(newNote.id, true);

    if (focusTitle) {
      setTimeout(() => {
        const titleInput = document.getElementById('editor-title');
        titleInput.focus();
        titleInput.select();
      }, 100);
    }

    this.showToast('New note created! ✨');
  }

  togglePin() {
    if (!this.activeNoteId) return;
    const isPinned = window.Storage.togglePin(this.activeNoteId);
    document.getElementById('btn-pin-note').classList.toggle('active', isPinned);
    this.renderSidebar();
    this.renderNoteList();
    this.showToast(isPinned ? 'Note pinned to top 📌' : 'Note unpinned');
  }

  toggleFavorite() {
    if (!this.activeNoteId) return;
    const isFav = window.Storage.toggleFavorite(this.activeNoteId);
    document.getElementById('btn-fav-note').classList.toggle('active', isFav);
    this.renderSidebar();
    this.renderNoteList();
    this.showToast(isFav ? 'Added to favorites ❤️' : 'Removed from favorites');
  }

  deleteNote() {
    if (!this.activeNoteId) return;
    window.Storage.moveToTrash(this.activeNoteId);
    this.showToast('Note moved to Trash 🗑️');
    this.renderSidebar();
    this.renderNoteList();

    const remaining = window.SearchFilter.getFilteredAndSortedNotes();
    if (remaining.length > 0) {
      this.selectNote(remaining[0].id, false);
    } else {
      window.Editor.loadNote(null);
    }

    if (this.isMobile) {
      this.closeEditorMobile();
    }
  }

  restoreNote() {
    if (!this.activeNoteId) return;
    window.Storage.restoreFromTrash(this.activeNoteId);
    this.showToast('Note restored from Trash! ✅');
    this.renderSidebar();
    this.renderNoteList();
    this.selectNote(this.activeNoteId, false);
  }

  downloadMarkdown() {
    if (!this.activeNoteId) return;
    const file = window.Storage.exportNoteMarkdown(this.activeNoteId);
    if (!file) return;

    const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(`Exported "${file.filename}"`);
  }

  downloadJSONBackup() {
    const jsonStr = window.Storage.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apexnotes_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Backup JSON exported successfully!');
  }

  renderFolderSelect() {
    const select = document.getElementById('note-folder-select');
    const note = window.Storage.getNoteById(this.activeNoteId);
    select.innerHTML = '';

    window.Storage.folders.forEach(folder => {
      const opt = document.createElement('option');
      opt.value = folder;
      opt.textContent = folder;
      if (note && note.folder === folder) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  renderNoteTags(note) {
    const container = document.getElementById('note-tags-container');
    container.innerHTML = '';

    window.Storage.tags.forEach(tag => {
      const hasTag = note.tags && note.tags.includes(tag);
      const chip = document.createElement('span');
      chip.className = `tag-pill ${hasTag ? 'active' : ''}`;
      chip.style.cursor = 'pointer';
      chip.textContent = `#${tag}`;
      chip.title = 'Click to toggle tag';

      chip.addEventListener('click', () => {
        let currentTags = note.tags || [];
        if (currentTags.includes(tag)) {
          currentTags = currentTags.filter(t => t !== tag);
        } else {
          currentTags.push(tag);
        }
        window.Storage.updateNote(note.id, { tags: currentTags });
        this.renderNoteTags(note);
        this.renderSidebar();
        this.renderNoteList();
      });

      container.appendChild(chip);
    });
  }

  applyFormat(format) {
    switch (format) {
      case 'bold':
        window.Editor.insertFormat('**', '**', 'bold text');
        break;
      case 'italic':
        window.Editor.insertFormat('*', '*', 'italic text');
        break;
      case 'h1':
        window.Editor.insertFormat('# ', '', 'Heading 1');
        break;
      case 'h2':
        window.Editor.insertFormat('## ', '', 'Heading 2');
        break;
      case 'checklist':
        window.Editor.insertFormat('- [ ] ', '', 'Task item');
        break;
      case 'list':
        window.Editor.insertFormat('- ', '', 'List item');
        break;
      case 'quote':
        window.Editor.insertFormat('> ', '', 'Quote text');
        break;
      case 'code':
        window.Editor.insertFormat('```\n', '\n```', 'code here');
        break;
      case 'hr':
        window.Editor.insertFormat('\n---\n', '');
        break;
    }
  }

  onNoteUpdated(updatedNote) {
    // Refresh card preview in list
    const card = document.querySelector(`.note-card[data-id="${updatedNote.id}"]`);
    if (card) {
      const titleEl = card.querySelector('.note-card-title');
      const snippetEl = card.querySelector('.note-card-snippet');
      if (titleEl) titleEl.textContent = updatedNote.title || 'Untitled Note';
      if (snippetEl) snippetEl.textContent = this.getSnippetText(updatedNote.content);
    }
  }

  // Mobile Drawer & View transitions
  openSidebarDrawer() {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('sidebar-backdrop').classList.add('active');
  }

  closeSidebarDrawer() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebar-backdrop').classList.remove('active');
  }

  openEditorMobile() {
    document.getElementById('app').classList.add('mobile-view-editor');
  }

  closeEditorMobile() {
    document.getElementById('app').classList.remove('mobile-view-editor');
  }

  updateMobileNavActive(tab) {
    document.querySelectorAll('.nav-bar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });
  }

  // Modal helpers
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('open');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('open');
  }

  // Toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span style="color: ${type === 'error' ? 'var(--status-danger)' : 'var(--accent-primary)'}; font-size:1.1rem;">
        ${type === 'error' ? '⚠️' : '✨'}
      </span>
      <span>${this.escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Utilities
  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getSnippetText(markdown) {
    if (!markdown) return 'Empty note...';
    // Strip markdown symbols for snippet
    const clean = markdown
      .replace(/#+\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[x\]|\[ \]/g, '')
      .replace(/>\s+/g, '')
      .replace(/[-*]\s+/g, '')
      .trim();
    return clean || 'Empty note...';
  }

  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.App = new AppController();
});
