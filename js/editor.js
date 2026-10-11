/**
 * ApexNotes - Editor & Markdown Engine
 * Handles live Markdown rendering, WYSIWYG formatting shortcuts, checklist interactions, and auto-saving.
 */

class EditorManager {
  constructor() {
    this.currentNoteId = null;
    this.saveTimeout = null;
    this.viewMode = 'edit'; // 'edit', 'split', 'preview'

    // DOM references
    this.titleInput = null;
    this.textarea = null;
    this.previewPane = null;
    this.bodyWrapper = null;
    this.saveStatusEl = null;
    this.folderSelect = null;
    this.tagContainer = null;
  }

  init(domElements) {
    this.titleInput = domElements.titleInput;
    this.textarea = domElements.textarea;
    this.previewPane = domElements.previewPane;
    this.bodyWrapper = domElements.bodyWrapper;
    this.saveStatusEl = domElements.saveStatusEl;
    this.folderSelect = domElements.folderSelect;
    this.tagContainer = domElements.tagContainer;

    this.bindEvents();
  }

  bindEvents() {
    // Title changes
    this.titleInput.addEventListener('input', () => {
      this.triggerAutoSave();
    });

    // Content changes
    this.textarea.addEventListener('input', () => {
      this.triggerAutoSave();
      if (this.viewMode === 'split' || this.viewMode === 'preview') {
        this.renderPreview();
      }
    });

    // Handle tab key in textarea for clean indentation
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.triggerAutoSave();
      }
    });

    // Interactive Checkboxes in Preview Pane
    this.previewPane.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('todo-checkbox')) {
        const itemIndex = parseInt(e.target.dataset.index, 10);
        this.toggleMarkdownCheckbox(itemIndex, e.target.checked);
      }
    });
  }

  loadNote(note) {
    if (!note) {
      this.currentNoteId = null;
      this.titleInput.value = '';
      this.textarea.value = '';
      this.previewPane.innerHTML = '';
      return;
    }

    this.currentNoteId = note.id;
    this.titleInput.value = note.title;
    this.textarea.value = note.content;

    this.renderPreview();
    this.updateStatus('Saved');
  }

  triggerAutoSave() {
    this.updateStatus('Typing...', true);
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(() => {
      this.saveCurrentNote();
    }, 400);
  }

  saveCurrentNote() {
    if (!this.currentNoteId) return;

    const title = this.titleInput.value.trim() || 'Untitled Note';
    const content = this.textarea.value;

    const updated = window.Storage.updateNote(this.currentNoteId, {
      title,
      content
    });

    if (updated) {
      this.updateStatus('Saved', false);
      if (window.App) {
        window.App.onNoteUpdated(updated);
      }
    }
  }

  updateStatus(text, isUnsaved = false) {
    if (!this.saveStatusEl) return;
    this.saveStatusEl.className = 'save-status' + (isUnsaved ? ' unsaved' : '');
    this.saveStatusEl.innerHTML = `<span class="save-status-indicator"></span><span>${text}</span>`;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.bodyWrapper.classList.remove('split', 'preview');

    if (mode === 'split') {
      this.bodyWrapper.classList.add('split');
      this.renderPreview();
    } else if (mode === 'preview') {
      this.bodyWrapper.classList.add('preview');
      this.renderPreview();
    }

    // Update active state in toolbar buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  // Formatting Shortcuts helper
  insertFormat(prefix, suffix = '', placeholder = '') {
    const el = this.textarea;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);

    const replacement = selected.length > 0 
      ? prefix + selected + suffix 
      : prefix + placeholder + suffix;

    el.value = el.value.substring(0, start) + replacement + el.value.substring(end);
    el.focus();

    const cursorOffset = selected.length > 0 ? start + replacement.length : start + prefix.length;
    el.selectionStart = cursorOffset;
    el.selectionEnd = cursorOffset + (selected.length > 0 ? 0 : placeholder.length);

    this.triggerAutoSave();
    if (this.viewMode !== 'edit') {
      this.renderPreview();
    }
  }

  // Toggle Markdown checklist checkbox [ ] <-> [x]
  toggleMarkdownCheckbox(targetIndex, isChecked) {
    let content = this.textarea.value;
    let currentIdx = 0;

    const newContent = content.replace(/^([ \t]*-\s*\[)([ xX])(\]\s+.*)$/gm, (match, prefix, check, suffix) => {
      if (currentIdx === targetIndex) {
        currentIdx++;
        return `${prefix}${isChecked ? 'x' : ' '}${suffix}`;
      }
      currentIdx++;
      return match;
    });

    this.textarea.value = newContent;
    this.saveCurrentNote();
    this.renderPreview();
  }

  // Markdown parsing engine
  renderPreview() {
    const raw = this.textarea.value;
    if (!raw.trim()) {
      this.previewPane.innerHTML = '<div style="color:var(--text-muted);font-style:italic;padding:1rem;">Nothing to preview yet. Start typing your note...</div>';
      return;
    }

    this.previewPane.innerHTML = this.parseMarkdown(raw);
  }

  parseMarkdown(text) {
    let html = text;

    // Escape raw HTML entities to prevent injection
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Fenced Code Blocks: ```lang ... ```
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline Code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers: # H1, ## H2, ### H3, #### H4
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal Rule: --- or ***
    html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr />');

    // Blockquotes: > quote
    html = html.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');

    // Checklists: - [ ] or - [x]
    let checkboxIndex = 0;
    html = html.replace(/^[ \t]*-\s*\[([ xX])\]\s+(.*$)/gim, (match, check, itemText) => {
      const isChecked = check.toLowerCase() === 'x';
      const idx = checkboxIndex++;
      return `<div class="todo-item ${isChecked ? 'checked' : ''}">
        <input type="checkbox" class="todo-checkbox" data-index="${idx}" ${isChecked ? 'checked' : ''} />
        <span>${itemText}</span>
      </div>`;
    });

    // Unordered lists: - item or * item
    html = html.replace(/^[ \t]*[-*]\s+(.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Ordered lists: 1. item
    html = html.replace(/^[ \t]*(\d+)\.\s+(.*$)/gim, '<ol><li>$2</li></ol>');
    html = html.replace(/<\/ol>\s*<ol>/gim, '');

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Links: [title](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Paragraphs & Line breaks: Convert double newlines to paragraphs
    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      // Don't wrap already block elements
      if (/^<(h[1-6]|pre|blockquote|ul|ol|hr|div)/i.test(p)) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    return html;
  }
}

window.Editor = new EditorManager();
