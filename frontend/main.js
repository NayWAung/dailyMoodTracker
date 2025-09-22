/**
 * Daily Mood Tracker - Frontend JavaScript
 * Constitutional Performance: <100ms mood entry, <500ms analytics
 * Features: API communication, offline support, form validation
 */

class MoodTracker {
    constructor() {
        // Configuration
        this.API_BASE = 'http://localhost:3001/api';
        this.STORAGE_KEY = 'mood_tracker_offline';
        this.isOnline = navigator.onLine;
        
        // DOM elements
        this.elements = this.initializeElements();
        
        // State
        this.currentMoods = [];
        this.isLoading = false;
        this.offlineEntries = this.getOfflineEntries();
        
        // Initialize app
        this.init();
    }

    initializeElements() {
        return {
            // Form elements
            form: document.getElementById('mood-form'),
            dateInput: document.getElementById('mood-date'),
            emojiInputs: document.querySelectorAll('input[name="emoji"]'),
            noteTextarea: document.getElementById('mood-note'),
            submitBtn: document.getElementById('submit-btn'),
            
            // Error elements
            dateError: document.getElementById('date-error'),
            emojiError: document.getElementById('emoji-error'),
            noteError: document.getElementById('note-error'),
            formMessage: document.getElementById('form-message'),
            
            // History elements
            historyList: document.getElementById('history-list'),
            historyLoading: document.getElementById('history-loading'),
            historyEmpty: document.getElementById('history-empty'),
            historyFilter: document.getElementById('history-filter'),
            refreshBtn: document.getElementById('refresh-btn'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            
            // UI elements
            noteCounter: document.getElementById('note-counter'),
            onlineStatus: document.getElementById('online-status'),
            offlineToast: document.getElementById('offline-toast'),
        };
    }

    init() {
        this.setupEventListeners();
        this.setupFormDefaults();
        this.updateOnlineStatus();
        this.loadMoodHistory();
        
        // Sync offline entries if online
        if (this.isOnline && this.offlineEntries.length > 0) {
            this.syncOfflineEntries();
        }
        
        console.log('Daily Mood Tracker initialized');
    }

    setupEventListeners() {
        // Form submission
        this.elements.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Note character counter
        this.elements.noteTextarea.addEventListener('input', () => this.updateNoteCounter());
        
        // History controls
        this.elements.historyFilter.addEventListener('change', () => this.loadMoodHistory());
        this.elements.refreshBtn.addEventListener('click', () => this.loadMoodHistory(true));
        this.elements.loadMoreBtn.addEventListener('click', () => this.loadMoreHistory());
        
        // Online/offline events
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
        
        // Toast close
        const toastClose = this.elements.offlineToast.querySelector('.toast__close');
        if (toastClose) {
            toastClose.addEventListener('click', () => this.hideOfflineToast());
        }
        
        // Form validation on input
        this.elements.dateInput.addEventListener('change', () => this.clearError('date'));
        this.elements.emojiInputs.forEach(input => {
            input.addEventListener('change', () => this.clearError('emoji'));
        });
        this.elements.noteTextarea.addEventListener('input', () => this.clearError('note'));
    }

    setupFormDefaults() {
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        this.elements.dateInput.value = today;
        this.elements.dateInput.max = today; // Prevent future dates
        
        // Initialize note counter
        this.updateNoteCounter();
    }

    // Form Handling
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = this.getFormData();
        const validation = this.validateFormData(formData);
        
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        this.setFormLoading(true);
        
        try {
            if (this.isOnline) {
                await this.submitMoodEntry(formData);
            } else {
                this.saveMoodOffline(formData);
            }
            
            this.showMessage('Mood entry saved successfully!', 'success');
            this.resetForm();
            this.loadMoodHistory();
            
        } catch (error) {
            console.error('Error submitting mood:', error);
            
            if (!this.isOnline) {
                this.saveMoodOffline(formData);
                this.showMessage('Saved offline. Will sync when online.', 'success');
                this.resetForm();
            } else {
                this.showMessage('Failed to save mood entry. Please try again.', 'error');
            }
        } finally {
            this.setFormLoading(false);
        }
    }

    getFormData() {
        const selectedEmoji = document.querySelector('input[name="emoji"]:checked');
        
        return {
            date: this.elements.dateInput.value,
            emoji: selectedEmoji ? selectedEmoji.value : '',
            note: this.elements.noteTextarea.value.trim() || null
        };
    }

    validateFormData(data) {
        const errors = {};
        let isValid = true;
        
        // Date validation
        if (!data.date) {
            errors.date = 'Date is required';
            isValid = false;
        } else {
            const selectedDate = new Date(data.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            
            if (selectedDate > today) {
                errors.date = 'Cannot log mood for future dates';
                isValid = false;
            }
        }
        
        // Emoji validation
        if (!data.emoji) {
            errors.emoji = 'Please select how you\'re feeling';
            isValid = false;
        }
        
        // Note validation
        if (data.note && data.note.length > 500) {
            errors.note = 'Note must be 500 characters or less';
            isValid = false;
        }
        
        return { isValid, errors };
    }

    showValidationErrors(errors) {
        // Clear previous errors
        this.clearAllErrors();
        
        // Show specific errors
        Object.keys(errors).forEach(field => {
            this.showError(field, errors[field]);
        });
    }

    showError(field, message) {
        const errorElement = this.elements[`${field}Error`];
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearError(field) {
        const errorElement = this.elements[`${field}Error`];
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    clearAllErrors() {
        ['date', 'emoji', 'note'].forEach(field => this.clearError(field));
    }

    // API Communication
    async submitMoodEntry(data) {
        const response = await fetch(`${this.API_BASE}/moods`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    async loadMoodHistory(forceRefresh = false) {
        if (this.isLoading && !forceRefresh) return;
        
        this.setHistoryLoading(true);
        
        try {
            const filter = this.elements.historyFilter.value;
            const params = new URLSearchParams();
            
            if (filter !== 'all') {
                const days = parseInt(filter);
                const fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - days);
                params.set('from', fromDate.toISOString().split('T')[0]);
            }
            
            params.set('limit', '50');
            
            const response = await fetch(`${this.API_BASE}/moods?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.currentMoods = data.moods || [];
            this.renderMoodHistory();
            
        } catch (error) {
            console.error('Error loading mood history:', error);
            
            if (!this.isOnline) {
                this.showOfflineMoods();
            } else {
                this.showHistoryError();
            }
        } finally {
            this.setHistoryLoading(false);
        }
    }

    async deleteMoodEntry(date) {
        if (!confirm('Are you sure you want to delete this mood entry?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/moods/${date}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.showMessage('Mood entry deleted successfully!', 'success');
            this.loadMoodHistory();
            
        } catch (error) {
            console.error('Error deleting mood:', error);
            this.showMessage('Failed to delete mood entry. Please try again.', 'error');
        }
    }

    // Offline Functionality
    saveMoodOffline(data) {
        this.offlineEntries.push({
            ...data,
            timestamp: Date.now(),
            id: `offline_${Date.now()}`
        });
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.offlineEntries));
        console.log('Mood saved offline:', data);
    }

    getOfflineEntries() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading offline entries:', error);
            return [];
        }
    }

    async syncOfflineEntries() {
        if (this.offlineEntries.length === 0) return;
        
        console.log(`Syncing ${this.offlineEntries.length} offline entries...`);
        
        const syncPromises = this.offlineEntries.map(async (entry) => {
            try {
                await this.submitMoodEntry({
                    date: entry.date,
                    emoji: entry.emoji,
                    note: entry.note
                });
                return { success: true, entry };
            } catch (error) {
                console.error('Failed to sync entry:', entry, error);
                return { success: false, entry, error };
            }
        });
        
        const results = await Promise.allSettled(syncPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        if (successful > 0) {
            // Clear successfully synced entries
            this.offlineEntries = [];
            localStorage.removeItem(this.STORAGE_KEY);
            
            this.showMessage(`${successful} offline entries synced successfully!`, 'success');
            this.loadMoodHistory();
        }
    }

    showOfflineMoods() {
        // Show offline entries when no network
        const offlineMoods = this.offlineEntries.map(entry => ({
            ...entry,
            isOffline: true
        }));
        
        this.currentMoods = offlineMoods;
        this.renderMoodHistory();
    }

    // UI Updates
    setFormLoading(loading) {
        this.isLoading = loading;
        this.elements.submitBtn.disabled = loading;
        this.elements.submitBtn.classList.toggle('loading', loading);
    }

    setHistoryLoading(loading) {
        this.elements.historyLoading.style.display = loading ? 'flex' : 'none';
        this.elements.historyList.style.display = loading ? 'none' : 'block';
    }

    renderMoodHistory() {
        const container = this.elements.historyList;
        
        if (this.currentMoods.length === 0) {
            this.elements.historyEmpty.style.display = 'block';
            container.style.display = 'none';
            return;
        }
        
        this.elements.historyEmpty.style.display = 'none';
        container.style.display = 'block';
        
        container.innerHTML = this.currentMoods.map(mood => this.createHistoryItemHTML(mood)).join('');
        
        // Add event listeners for delete buttons
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.dataset.date;
                this.deleteMoodEntry(date);
            });
        });
    }

    createHistoryItemHTML(mood) {
        const date = new Date(mood.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const moodClass = this.getMoodClass(mood.emoji);
        const offlineBadge = mood.isOffline ? '<span class="offline-badge">Offline</span>' : '';
        
        return `
            <div class="history-item history-item--${moodClass}" role="listitem">
                <div class="history-item__header">
                    <span class="history-item__emoji">${mood.emoji}</span>
                    <div>
                        <span class="history-item__date">${formattedDate}</span>
                        ${offlineBadge}
                    </div>
                </div>
                ${mood.note ? `<p class="history-item__note">${this.escapeHtml(mood.note)}</p>` : ''}
                <div class="history-item__actions">
                    <button class="btn btn--secondary btn--small delete-btn" data-date="${mood.date}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    getMoodClass(emoji) {
        const moodMap = {
            '😢': 'sad',
            '😐': 'neutral', 
            '😊': 'happy',
            '😄': 'excited',
            '😍': 'love'
        };
        return moodMap[emoji] || 'neutral';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showHistoryError() {
        this.elements.historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">⚠️</div>
                <h3 class="empty-state__title">Unable to load mood history</h3>
                <p class="empty-state__text">Please check your connection and try again.</p>
            </div>
        `;
    }

    updateNoteCounter() {
        const length = this.elements.noteTextarea.value.length;
        this.elements.noteCounter.textContent = `${length}/500`;
        
        if (length > 450) {
            this.elements.noteCounter.style.color = 'var(--color-warning)';
        } else if (length > 500) {
            this.elements.noteCounter.style.color = 'var(--color-error)';
        } else {
            this.elements.noteCounter.style.color = 'var(--color-text-secondary)';
        }
    }

    showMessage(text, type = 'success') {
        const message = this.elements.formMessage;
        message.textContent = text;
        message.className = `message message--${type} show`;
        
        setTimeout(() => {
            message.classList.remove('show');
        }, 5000);
    }

    resetForm() {
        this.elements.form.reset();
        this.setupFormDefaults();
        this.clearAllErrors();
    }

    // Online/Offline Handling
    handleOnlineStatusChange(isOnline) {
        this.isOnline = isOnline;
        this.updateOnlineStatus();
        
        if (isOnline) {
            this.hideOfflineToast();
            if (this.offlineEntries.length > 0) {
                this.syncOfflineEntries();
            }
            this.loadMoodHistory();
        } else {
            this.showOfflineToast();
        }
    }

    updateOnlineStatus() {
        const statusDot = this.elements.onlineStatus.querySelector('.status-dot');
        const statusText = this.elements.onlineStatus.querySelector('.status-text');
        
        if (this.isOnline) {
            statusDot.classList.remove('offline');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }

    showOfflineToast() {
        this.elements.offlineToast.classList.add('show');
        this.elements.offlineToast.setAttribute('aria-hidden', 'false');
    }

    hideOfflineToast() {
        this.elements.offlineToast.classList.remove('show');
        this.elements.offlineToast.setAttribute('aria-hidden', 'true');
    }

    // Load more functionality (placeholder for pagination)
    loadMoreHistory() {
        // This would implement pagination for large datasets
        console.log('Load more history - not implemented yet');
    }
}

// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
            console.log(`Page load time: ${entry.loadEventEnd - entry.loadEventStart}ms`);
        }
    }
});

if (window.PerformanceObserver) {
    performanceObserver.observe({ entryTypes: ['navigation'] });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.moodTracker = new MoodTracker();
    });
} else {
    window.moodTracker = new MoodTracker();
}

// Service Worker utilities
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
            console.log('New version available. Refresh to update.');
        }
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoodTracker;
}