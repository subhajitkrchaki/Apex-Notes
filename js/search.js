/**
 * ApexNotes - Search, Filter, and Sort Engine
 */

class SearchFilterManager {
  constructor() {
    this.currentFilter = { type: 'all', value: null };
    this.searchQuery = '';
    this.sortBy = 'updated-desc';
  }

  setFilter(type, value = null) {
    this.currentFilter = { type, value };
  }

  setSearchQuery(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
  }

  setSortBy(sortKey) {
    this.sortBy = sortKey;
  }

  getFilteredAndSortedNotes() {
    const isTrashView = this.currentFilter.type === 'trash';
    let notes = window.Storage.getAllNotes(isTrashView);

    // 1. Filter by category/folder/tag
    if (this.currentFilter.type === 'trash') {
      notes = notes.filter(n => n.trash);
    } else {
      notes = notes.filter(n => !n.trash);

      if (this.currentFilter.type === 'pinned') {
        notes = notes.filter(n => n.pinned);
      } else if (this.currentFilter.type === 'favorites') {
        notes = notes.filter(n => n.favorite);
      } else if (this.currentFilter.type === 'folder' && this.currentFilter.value) {
        notes = notes.filter(n => n.folder === this.currentFilter.value);
      } else if (this.currentFilter.type === 'tag' && this.currentFilter.value) {
        notes = notes.filter(n => n.tags && n.tags.includes(this.currentFilter.value));
      }
    }

    // 2. Filter by search query
    if (this.searchQuery) {
      const q = this.searchQuery;
      notes = notes.filter(note => {
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const contentMatch = (note.content || '').toLowerCase().includes(q);
        const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));
        const folderMatch = (note.folder || '').toLowerCase().includes(q);
        return titleMatch || contentMatch || tagMatch || folderMatch;
      });
    }

    // 3. Sort notes
    notes.sort((a, b) => {
      // Pin priority: Pinned notes appear first unless in Trash view
      if (!isTrashView) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
      }

      switch (this.sortBy) {
        case 'updated-asc':
          return (a.updatedAt || 0) - (b.updatedAt || 0);
        case 'created-desc':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'updated-desc':
        default:
          return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
    });

    return notes;
  }
}

window.SearchFilter = new SearchFilterManager();
