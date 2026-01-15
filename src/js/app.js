// Main Application Module

const App = {
    // State
    state: {
        categories: [],
        wallets: [],
        currentPage: 'dashboard',
        recordsPage: 1,
        pendingAIData: null,
        theme: 'dark'
    },

    // Initialize the application
    async init() {
        // Initialize theme first (before auth check to avoid flash)
        this.initTheme();

        // Check authentication
        const isAuthenticated = await Auth.requireAuth();
        if (!isAuthenticated) return;

        // Update user info
        this.updateUserInfo();

        // Load initial data
        await this.loadCategories();
        await this.loadWallets();
        await this.loadDashboard();

        // Setup event listeners
        this.setupEventListeners();

        // Setup theme toggle
        this.setupThemeToggle();

        // Hide loading
        this.hideLoading();
    },

    // Initialize theme from localStorage or system preference
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.state.theme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.state.theme = prefersDark ? 'dark' : 'light';
        }
        this.applyTheme(this.state.theme);
    },

    // Apply theme to document
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.state.theme = theme;
        localStorage.setItem('theme', theme);
    },

    // Toggle theme
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    },

    // Setup theme toggle button
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    // Update user info in UI
    updateUserInfo() {
        if (Auth.user) {
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            if (userName) userName.textContent = Auth.user.username;
            if (userAvatar) userAvatar.textContent = Auth.user.username.charAt(0).toUpperCase();
        }
    },

    // Load categories
    async loadCategories() {
        try {
            const result = await API.categories.list();
            if (result && result.success) {
                this.state.categories = result.data;
                this.populateCategorySelects();
            }
        } catch (error) {
            this.showToast('加载类别失败', 'error');
        }
    },

    // Populate category select elements
    populateCategorySelects() {
        const selects = ['recordCategory', 'filterCategory'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            // Keep first option (if filter)
            const firstOption = id === 'filterCategory' ? '<option value="">全部</option>' : '';

            // Group by type
            const expenseCategories = this.state.categories.filter(c => c.type === 'expense');
            const incomeCategories = this.state.categories.filter(c => c.type === 'income');

            let html = firstOption;

            if (id === 'recordCategory') {
                // Will be filtered based on type selection
                const type = document.getElementById('recordType')?.value || 'expense';
                const categories = type === 'income' ? incomeCategories : expenseCategories;
                html = categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
            } else {
                html += `<optgroup label="支出">`;
                html += expenseCategories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
                html += `</optgroup><optgroup label="收入">`;
                html += incomeCategories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
                html += `</optgroup>`;
            }

            select.innerHTML = html;
        });
    },

    // Load wallets
    async loadWallets() {
        try {
            const result = await API.wallets.list();
            if (result && result.success) {
                this.state.wallets = result.data;
                this.populateWalletSelects();
            }
        } catch (error) {
            console.error('Load wallets error:', error);
        }
    },

    // Populate wallet select elements
    populateWalletSelects() {
        const select = document.getElementById('recordWallet');
        if (!select) return;

        let html = '<option value="">不指定钱包</option>';
        this.state.wallets.forEach(w => {
            const defaultMark = w.is_default ? ' (默认)' : '';
            html += `<option value="${w.id}">${w.icon} ${w.name}${defaultMark}</option>`;
        });
        select.innerHTML = html;
    },

    // Render wallets page
    renderWalletsPage() {
        const list = document.getElementById('walletsList');
        const totalAssetsEl = document.getElementById('totalAssets');
        const totalCreditEl = document.getElementById('totalCredit');

        if (!list) return;

        if (this.state.wallets.length === 0) {
            list.innerHTML = `
                <div class="wallets-empty">
                    <div class="wallets-empty-icon">💳</div>
                    <h4>还没有添加钱包</h4>
                    <p>点击上方按钮添加你的第一个钱包</p>
                </div>
            `;
            return;
        }

        // Calculate totals
        let totalAssets = 0;
        let totalCredit = 0;

        this.state.wallets.forEach(w => {
            if (w.type === 'credit_card') {
                totalCredit += w.credit_limit || 0;
            } else {
                totalAssets += w.available || 0;
            }
        });

        if (totalAssetsEl) totalAssetsEl.textContent = `¥${totalAssets.toFixed(2)}`;
        if (totalCreditEl) totalCreditEl.textContent = `¥${totalCredit.toFixed(2)}`;

        // Render wallet cards
        list.innerHTML = this.state.wallets.map(w => this.renderWalletCard(w)).join('');
    },

    // Render single wallet card
    renderWalletCard(wallet) {
        const typeNames = {
            'debit_card': '储蓄卡',
            'credit_card': '信用卡',
            'cash': '现金',
            'fund': '基金/投资',
            'e_wallet': '电子钱包'
        };

        const isCredit = wallet.type === 'credit_card';
        const balanceLabel = isCredit ? '可用额度' : '余额';
        const balanceValue = wallet.available || 0;
        const balanceClass = balanceValue >= 0 ? 'positive' : 'negative';

        return `
            <div class="wallet-card" data-type="${wallet.type}" data-id="${wallet.id}" style="--wallet-color: ${wallet.color}">
                ${wallet.is_default ? '<span class="wallet-default-badge">默认</span>' : ''}
                <div class="wallet-card-header">
                    <div class="wallet-info">
                        <div class="wallet-icon">${wallet.icon}</div>
                        <div>
                            <div class="wallet-name">${wallet.name}</div>
                            <div class="wallet-type">${typeNames[wallet.type] || wallet.type}</div>
                        </div>
                    </div>
                    <div class="wallet-actions">
                        <button class="wallet-action-btn" onclick="App.viewWalletRecords(${wallet.id})" title="查看记录">📋</button>
                        <button class="wallet-action-btn" onclick="App.editWallet(${wallet.id})" title="编辑">✏️</button>
                        <button class="wallet-action-btn" onclick="App.deleteWallet(${wallet.id})" title="删除">🗑️</button>
                    </div>
                </div>
                <div class="wallet-balance">
                    <div class="wallet-balance-label">${balanceLabel}</div>
                    <div class="wallet-balance-value ${balanceClass}">¥${Math.abs(balanceValue).toFixed(2)}</div>
                </div>
                ${isCredit ? `
                    <div class="wallet-credit-info">
                        <span>总额度</span>
                        <span>¥${(wallet.credit_limit || 0).toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="wallet-footer">
                    <button class="btn btn-sm btn-secondary" onclick="App.viewWalletRecords(${wallet.id})">
                        📝 查看记录
                    </button>
                </div>
            </div>
        `;
    },

    // Open wallet modal
    openWalletModal(wallet = null) {
        const modal = document.getElementById('walletModal');
        const title = document.getElementById('walletModalTitle');
        const form = document.getElementById('walletForm');

        title.textContent = wallet ? '编辑钱包' : '添加钱包';
        form.reset();

        if (wallet) {
            document.getElementById('walletId').value = wallet.id;
            document.getElementById('walletName').value = wallet.name;
            document.getElementById('walletType').value = wallet.type;
            document.getElementById('walletBalance').value = wallet.balance || 0;
            document.getElementById('walletCreditLimit').value = wallet.credit_limit || 0;
            document.getElementById('walletColor').value = wallet.color || '#3498DB';
            document.getElementById('walletIsDefault').checked = wallet.is_default;
        } else {
            document.getElementById('walletId').value = '';
        }

        this.toggleCreditLimitField();
        modal.classList.add('active');
    },

    // Close wallet modal
    closeWalletModal() {
        document.getElementById('walletModal').classList.remove('active');
    },

    // Toggle credit limit field based on wallet type
    toggleCreditLimitField() {
        const type = document.getElementById('walletType').value;
        const balanceGroup = document.getElementById('balanceGroup');
        const creditGroup = document.getElementById('creditLimitGroup');

        if (type === 'credit_card') {
            balanceGroup.style.display = 'none';
            creditGroup.style.display = 'block';
        } else {
            balanceGroup.style.display = 'block';
            creditGroup.style.display = 'none';
        }
    },

    // Save wallet
    async saveWallet() {
        const id = document.getElementById('walletId').value;
        const data = {
            name: document.getElementById('walletName').value,
            type: document.getElementById('walletType').value,
            balance: parseFloat(document.getElementById('walletBalance').value) || 0,
            credit_limit: parseFloat(document.getElementById('walletCreditLimit').value) || 0,
            color: document.getElementById('walletColor').value,
            is_default: document.getElementById('walletIsDefault').checked
        };

        try {
            if (id) {
                await API.wallets.update(id, data);
                this.showToast('钱包已更新', 'success');
            } else {
                await API.wallets.create(data);
                this.showToast('钱包已创建', 'success');
            }
            this.closeWalletModal();
            await this.loadWallets();
            this.renderWalletsPage();
        } catch (error) {
            this.showToast(error.message || '保存失败', 'error');
        }
    },

    // Edit wallet
    async editWallet(id) {
        const wallet = this.state.wallets.find(w => w.id === id);
        if (wallet) {
            this.openWalletModal(wallet);
        }
    },

    // Delete wallet
    async deleteWallet(id) {
        if (!confirm('确定要删除这个钱包吗？')) return;

        try {
            await API.wallets.delete(id);
            this.showToast('钱包已删除', 'success');
            await this.loadWallets();
            this.renderWalletsPage();
        } catch (error) {
            this.showToast(error.message || '删除失败', 'error');
        }
    },

    // View wallet records
    async viewWalletRecords(walletId) {
        const wallet = this.state.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        const modal = document.getElementById('walletRecordsModal');
        const title = document.getElementById('walletRecordsTitle');
        const content = document.getElementById('walletRecordsContent');

        title.innerHTML = `${wallet.icon} ${wallet.name} - 交易记录`;
        content.innerHTML = '<div class="loading">加载中...</div>';
        modal.classList.add('active');

        try {
            const result = await API.records.list({ walletId, limit: 50 });
            if (result && result.success) {
                this.renderWalletRecordsList(result.data, wallet);
            }
        } catch (error) {
            content.innerHTML = '<div class="error">加载失败</div>';
        }
    },

    // Render wallet records list
    renderWalletRecordsList(records, wallet) {
        const content = document.getElementById('walletRecordsContent');

        if (!records || records.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h4 class="empty-state-title">暂无记录</h4>
                    <p class="empty-state-text">此钱包还没有任何交易记录</p>
                </div>
            `;
            return;
        }

        // Calculate summary
        let totalIncome = 0;
        let totalExpense = 0;
        records.forEach(r => {
            if (r.type === 'income') totalIncome += r.amount;
            else totalExpense += r.amount;
        });

        let html = `
            <div class="wallet-records-summary">
                <div class="summary-item income">
                    <span class="summary-label">收入</span>
                    <span class="summary-value">+¥${totalIncome.toFixed(2)}</span>
                </div>
                <div class="summary-item expense">
                    <span class="summary-label">支出</span>
                    <span class="summary-value">-¥${totalExpense.toFixed(2)}</span>
                </div>
                <div class="summary-item balance">
                    <span class="summary-label">净额</span>
                    <span class="summary-value ${totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}">
                        ¥${(totalIncome - totalExpense).toFixed(2)}
                    </span>
                </div>
            </div>
            <div class="wallet-records-list">
        `;

        records.forEach(record => {
            const category = this.state.categories.find(c => c.name === record.category);
            const icon = category?.icon || '📌';
            const isIncome = record.type === 'income';

            html += `
                <div class="record-item">
                    <div class="record-icon" style="background: ${category?.color}20;">
                        ${icon}
                    </div>
                    <div class="record-info">
                        <div class="record-category">${record.category}</div>
                        <div class="record-desc">${record.description || '-'}</div>
                    </div>
                    <div class="record-right">
                        <div class="record-amount ${isIncome ? 'amount-income' : 'amount-expense'}">
                            ${isIncome ? '+' : '-'}¥${record.amount.toFixed(2)}
                        </div>
                        <div class="record-date">${record.date}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        content.innerHTML = html;
    },

    // Close wallet records modal
    closeWalletRecordsModal() {
        document.getElementById('walletRecordsModal').classList.remove('active');
    },

    // Load dashboard data
    async loadDashboard() {
        try {
            // Get current month date range
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            const result = await API.stats.get({ startDate, endDate });
            if (result && result.success) {
                this.updateDashboardStats(result.data);
                this.updateRecentRecords(result.data.recentRecords);
                this.updateExpenseChart(result.data.byCategory.expense);
            }
        } catch (error) {
            console.error('Load dashboard error:', error);
        }
    },

    // Update dashboard statistics
    updateDashboardStats(data) {
        const { summary } = data;

        document.getElementById('statIncome').textContent =
            `¥${summary.totalIncome.toFixed(2)}`;
        document.getElementById('statExpense').textContent =
            `¥${summary.totalExpense.toFixed(2)}`;
        document.getElementById('statBalance').textContent =
            `¥${summary.netBalance.toFixed(2)}`;
        document.getElementById('statSavings').textContent =
            `${summary.savingsRate}%`;
    },

    // Update recent records list
    updateRecentRecords(records) {
        const container = document.getElementById('recentRecords');
        if (!container) return;

        if (!records || records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h4 class="empty-state-title">暂无记录</h4>
                    <p class="empty-state-text">开始记录您的第一笔收支</p>
                </div>
            `;
            return;
        }

        container.innerHTML = records.map(record => this.renderRecordItem(record)).join('');
    },

    // Render a single record item
    renderRecordItem(record) {
        const category = this.state.categories.find(c => c.name === record.category);
        const icon = category?.icon || '📌';
        const isIncome = record.type === 'income';

        return `
            <div class="record-item" data-id="${record.id}">
                <div class="record-icon" style="background: ${category?.color}20;">
                    ${icon}
                </div>
                <div class="record-info">
                    <div class="record-category">${record.category}</div>
                    <div class="record-desc">${record.description || '-'}</div>
                </div>
                <div class="record-right">
                    <div class="record-amount ${isIncome ? 'amount-income' : 'amount-expense'}">
                        ¥${record.amount.toFixed(2)}
                    </div>
                    <div class="record-date">${record.date}</div>
                </div>
                <div class="record-actions">
                    <button class="record-action-btn edit-btn" data-id="${record.id}" title="编辑">
                        ✎
                    </button>
                    <button class="record-action-btn delete delete-btn" data-id="${record.id}" title="删除">
                        ✕
                    </button>
                </div>
            </div>
        `;
    },

    // Update expense chart
    updateExpenseChart(data) {
        const ctx = document.getElementById('expenseChart');
        if (!ctx || !data || data.length === 0) return;

        Charts.createExpenseChart(ctx, data);
    },

    // Load all records with filters
    async loadRecords(page = 1) {
        try {
            const params = {
                page,
                limit: 20,
                type: document.getElementById('filterType')?.value || '',
                category: document.getElementById('filterCategory')?.value || '',
                startDate: document.getElementById('filterStartDate')?.value || '',
                endDate: document.getElementById('filterEndDate')?.value || ''
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const result = await API.records.list(params);
            if (result && result.success) {
                this.state.recordsPage = page;
                this.updateRecordsList(result.data, result.pagination);
            }
        } catch (error) {
            this.showToast('加载记录失败', 'error');
        }
    },

    // Update records list in Records page
    updateRecordsList(records, pagination) {
        const container = document.getElementById('allRecords');
        const totalSpan = document.getElementById('totalRecords');
        const paginationContainer = document.getElementById('pagination');

        if (totalSpan) totalSpan.textContent = pagination.total;

        if (!records || records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h4 class="empty-state-title">没有找到记录</h4>
                    <p class="empty-state-text">尝试调整筛选条件</p>
                </div>
            `;
            paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = records.map(record => this.renderRecordItem(record)).join('');

        // Render pagination
        this.renderPagination(paginationContainer, pagination);
    },

    // Render pagination
    renderPagination(container, pagination) {
        const { page, totalPages } = pagination;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `<button class="btn btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">上一页</button>`;

        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn ${i === page ? 'btn-primary' : 'btn-secondary'} btn-sm" data-page="${i}">${i}</button>`;
        }

        // Next button
        html += `<button class="btn btn-secondary btn-sm" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">下一页</button>`;

        container.innerHTML = html;
    },

    // Load analysis data
    async loadAnalysis() {
        const startDate = document.getElementById('analysisStartDate')?.value;
        const endDate = document.getElementById('analysisEndDate')?.value;

        const btn = document.getElementById('generateAnalysisBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> 分析中...';

        try {
            const result = await AI.analyze(startDate, endDate);
            this.updateAnalysisView(result);
        } catch (error) {
            this.showToast(error.message || '分析失败', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>🤖</span> 生成 AI 分析';
        }
    },

    // Update analysis view
    updateAnalysisView(data) {
        const contentEl = document.getElementById('analysisContent');
        const suggestionsEl = document.getElementById('suggestionsList');
        const healthScoreEl = document.getElementById('healthScore');
        const scoreValueEl = document.getElementById('scoreValue');

        // Update content
        if (data.analysis) {
            contentEl.innerHTML = `<p>${data.analysis.replace(/\n/g, '</p><p>')}</p>`;
        }

        // Update health score
        if (data.healthScore) {
            healthScoreEl.style.display = 'flex';
            const scoreCircle = healthScoreEl.querySelector('.score-circle');
            scoreCircle.style.setProperty('--score', data.healthScore);
            scoreValueEl.textContent = data.healthScore;
        }

        // Update suggestions
        if (data.suggestions && data.suggestions.length > 0) {
            suggestionsEl.style.display = 'block';
            suggestionsEl.innerHTML = `
                <h4 class="text-lg font-semibold mb-2">💡 理财建议</h4>
                ${data.suggestions.map(s => `
                    <div class="suggestion-item">
                        <span class="suggestion-icon">✓</span>
                        <span>${s}</span>
                    </div>
                `).join('')}
            `;
        }

        // Update charts
        if (data.stats) {
            // Trend chart
            const trendCtx = document.getElementById('trendChart');
            if (trendCtx && data.stats.byMonth) {
                const trendData = Object.entries(data.stats.byMonth).map(([period, values]) => ({
                    period,
                    income: values.income,
                    expense: values.expense
                }));
                Charts.createTrendChart(trendCtx, trendData);
            }

            // Income chart
            const incomeCtx = document.getElementById('incomeChart');
            if (incomeCtx && data.stats.byCategory) {
                const incomeData = Object.entries(data.stats.byCategory)
                    .filter(([_, v]) => v.income > 0)
                    .map(([category, v]) => ({ category, total: v.income }));
                if (incomeData.length > 0) {
                    Charts.createIncomeChart(incomeCtx, incomeData);
                }
            }
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab, [data-page]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                if (page) this.switchPage(page);
            });
        });

        // User menu
        document.getElementById('userMenu')?.addEventListener('click', () => {
            document.getElementById('userMenuModal').classList.toggle('active');
        });

        document.getElementById('userMenuModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'userMenuModal') {
                e.target.classList.remove('active');
            }
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            Auth.logout();
        });

        // Add expense/income buttons
        document.getElementById('addExpenseBtn')?.addEventListener('click', () => {
            this.openRecordModal('expense');
        });

        document.getElementById('addIncomeBtn')?.addEventListener('click', () => {
            this.openRecordModal('income');
        });

        // Record modal
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeRecordModal();
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeRecordModal();
        });

        document.getElementById('recordModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'recordModal') {
                this.closeRecordModal();
            }
        });

        // Type tabs in modal
        document.querySelectorAll('#recordModal .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#recordModal .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const type = tab.dataset.type;
                document.getElementById('recordType').value = type;
                this.populateCategorySelects();
            });
        });

        // Save record
        document.getElementById('saveRecordBtn')?.addEventListener('click', () => {
            this.saveRecord();
        });

        // AI input
        document.getElementById('aiSubmitBtn')?.addEventListener('click', () => {
            this.handleAIInput();
        });

        document.getElementById('aiInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleAIInput();
            }
        });

        // Image upload
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });

        document.getElementById('imageInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });

        // Preview modal
        document.getElementById('closePreview')?.addEventListener('click', () => {
            this.closePreviewModal();
        });

        document.getElementById('cancelPreview')?.addEventListener('click', () => {
            this.closePreviewModal();
        });

        document.getElementById('previewModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') {
                this.closePreviewModal();
            }
        });

        document.getElementById('confirmPreview')?.addEventListener('click', () => {
            this.confirmAIRecord();
        });

        document.getElementById('editPreview')?.addEventListener('click', () => {
            this.editAIRecord();
        });

        // Filter button
        document.getElementById('applyFilterBtn')?.addEventListener('click', () => {
            this.loadRecords(1);
        });

        // Pagination
        document.getElementById('pagination')?.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            if (page && !e.target.disabled) {
                this.loadRecords(parseInt(page));
            }
        });

        // Analysis button
        document.getElementById('generateAnalysisBtn')?.addEventListener('click', () => {
            this.loadAnalysis();
        });

        // Wallet events
        document.getElementById('addWalletBtn')?.addEventListener('click', () => {
            this.openWalletModal();
        });

        document.getElementById('closeWalletModal')?.addEventListener('click', () => {
            this.closeWalletModal();
        });

        document.getElementById('cancelWalletBtn')?.addEventListener('click', () => {
            this.closeWalletModal();
        });

        document.getElementById('saveWalletBtn')?.addEventListener('click', () => {
            this.saveWallet();
        });

        document.getElementById('walletType')?.addEventListener('change', () => {
            this.toggleCreditLimitField();
        });

        document.getElementById('walletModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'walletModal') {
                this.closeWalletModal();
            }
        });

        // Wallet records modal events
        document.getElementById('closeWalletRecords')?.addEventListener('click', () => {
            this.closeWalletRecordsModal();
        });

        document.getElementById('closeWalletRecordsBtn')?.addEventListener('click', () => {
            this.closeWalletRecordsModal();
        });

        document.getElementById('walletRecordsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'walletRecordsModal') {
                this.closeWalletRecordsModal();
            }
        });

        // Record actions (using event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const id = e.target.dataset.id;
                this.editRecord(id);
            }
            if (e.target.classList.contains('delete-btn')) {
                const id = e.target.dataset.id;
                this.deleteRecord(id);
            }
        });

        // Set default dates for analysis
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        document.getElementById('analysisStartDate').value = startOfMonth.toISOString().split('T')[0];
        document.getElementById('analysisEndDate').value = now.toISOString().split('T')[0];
    },

    // Switch page view
    switchPage(page) {
        this.state.currentPage = page;

        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.page === page);
        });

        // Update page views
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.toggle('active', view.id === `page-${page}`);
        });

        // Load page-specific data
        if (page === 'records') {
            this.loadRecords(1);
        } else if (page === 'wallets') {
            this.renderWalletsPage();
        }
    },

    // Open record modal
    openRecordModal(type = 'expense', record = null) {
        const modal = document.getElementById('recordModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('recordForm');

        // Reset form
        form.reset();
        document.getElementById('recordId').value = '';
        document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];

        // Set type
        document.getElementById('recordType').value = type;
        document.querySelectorAll('#recordModal .tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        this.populateCategorySelects();

        // If editing
        if (record) {
            title.textContent = '编辑记录';
            document.getElementById('recordId').value = record.id;
            document.getElementById('recordAmount').value = record.amount;
            document.getElementById('recordCategory').value = record.category;
            document.getElementById('recordDate').value = record.date;
            document.getElementById('recordDescription').value = record.description || '';
        } else {
            title.textContent = type === 'income' ? '添加收入' : '添加支出';
        }

        modal.classList.add('active');
    },

    // Close record modal
    closeRecordModal() {
        document.getElementById('recordModal').classList.remove('active');
    },

    // Save record
    async saveRecord() {
        const id = document.getElementById('recordId').value;
        const walletId = document.getElementById('recordWallet')?.value;
        const data = {
            type: document.getElementById('recordType').value,
            amount: parseFloat(document.getElementById('recordAmount').value),
            category: document.getElementById('recordCategory').value,
            date: document.getElementById('recordDate').value,
            description: document.getElementById('recordDescription').value,
            wallet_id: walletId ? parseInt(walletId) : null
        };

        // Validate
        if (!data.amount || data.amount <= 0) {
            this.showToast('请输入有效金额', 'error');
            return;
        }

        if (!data.category) {
            this.showToast('请选择类别', 'error');
            return;
        }

        if (!data.date) {
            this.showToast('请选择日期', 'error');
            return;
        }

        try {
            if (id) {
                await API.records.update(id, data);
                this.showToast('记录已更新', 'success');
            } else {
                await API.records.create(data);
                this.showToast('记录已添加', 'success');
            }

            this.closeRecordModal();
            this.loadDashboard();
            // Refresh wallets to update balance
            await this.loadWallets();
            if (this.state.currentPage === 'records') {
                this.loadRecords(this.state.recordsPage);
            } else if (this.state.currentPage === 'wallets') {
                this.renderWalletsPage();
            }
        } catch (error) {
            this.showToast(error.message || '保存失败', 'error');
        }
    },

    // Edit record
    async editRecord(id) {
        try {
            const result = await API.records.get(id);
            if (result && result.success) {
                this.openRecordModal(result.data.type, result.data);
            }
        } catch (error) {
            this.showToast('加载记录失败', 'error');
        }
    },

    // Delete record
    async deleteRecord(id) {
        if (!confirm('确定要删除这条记录吗？')) return;

        try {
            await API.records.delete(id);
            this.showToast('记录已删除', 'success');
            this.loadDashboard();
            // Refresh wallets to update balance
            await this.loadWallets();
            if (this.state.currentPage === 'records') {
                this.loadRecords(this.state.recordsPage);
            } else if (this.state.currentPage === 'wallets') {
                this.renderWalletsPage();
            }
        } catch (error) {
            this.showToast(error.message || '删除失败', 'error');
        }
    },

    // Handle AI text input
    async handleAIInput() {
        const input = document.getElementById('aiInput');
        const text = input.value.trim();

        if (!text) {
            this.showToast('请输入记账描述', 'warning');
            return;
        }

        const btn = document.getElementById('aiSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';

        try {
            const data = await AI.parseText(text);
            this.showPreviewModal(data);
            input.value = '';
        } catch (error) {
            this.showToast(error.message || 'AI 解析失败', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
        }
    },

    // Handle image upload
    async handleImageUpload(file) {
        const btn = document.getElementById('uploadBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';

        try {
            const data = await AI.parseImage(file);
            this.showPreviewModal(data);
        } catch (error) {
            this.showToast(error.message || '图片识别失败', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
            document.getElementById('imageInput').value = '';
        }
    },

    // Show preview modal
    showPreviewModal(data) {
        this.state.pendingAIData = data;
        const content = document.getElementById('previewContent');
        content.innerHTML = AI.formatPreview(data);
        document.getElementById('previewModal').classList.add('active');
    },

    // Close preview modal
    closePreviewModal() {
        document.getElementById('previewModal').classList.remove('active');
        this.state.pendingAIData = null;
    },

    // Confirm AI record(s)
    async confirmAIRecord() {
        if (!this.state.pendingAIData) return;

        const data = this.state.pendingAIData;
        const records = data.records || [data];

        // Get default wallet
        const defaultWallet = this.state.wallets.find(w => w.is_default);
        const defaultWalletId = defaultWallet ? defaultWallet.id : null;

        try {
            let successCount = 0;
            for (const record of records) {
                await API.records.create({
                    type: record.type,
                    amount: parseFloat(record.amount),
                    category: record.category,
                    date: record.date,
                    description: record.description,
                    wallet_id: defaultWalletId
                });
                successCount++;
            }

            this.showToast(`已添加 ${successCount} 条记录`, 'success');
            this.closePreviewModal();
            this.loadDashboard();
            // Refresh wallets to update balance
            await this.loadWallets();
        } catch (error) {
            this.showToast(error.message || '保存失败', 'error');
        }
    },

    // Edit AI record (open in modal) - only works for single record
    editAIRecord() {
        if (!this.state.pendingAIData) return;

        const data = this.state.pendingAIData;
        const records = data.records || [data];

        if (records.length > 1) {
            this.showToast('多条记录请直接确认，或取消后逐条输入', 'warning');
            return;
        }

        const record = records[0];
        this.closePreviewModal();
        this.openRecordModal(record.type, {
            type: record.type,
            amount: record.amount,
            category: record.category,
            date: record.date,
            description: record.description
        });
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : '!'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Show loading overlay
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    },

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;
