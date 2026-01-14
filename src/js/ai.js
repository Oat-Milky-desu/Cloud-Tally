// AI Module - Handles AI-related functionality

const AI = {
    // Parse natural language input - returns object with data and multiple flag
    async parseText(text) {
        try {
            const result = await API.ai.parse(text);
            if (result && result.success) {
                // Return object indicating if multiple records
                return {
                    records: Array.isArray(result.data) ? result.data : [result.data],
                    multiple: result.multiple || false
                };
            }
            // Include debug info if available
            const errorMsg = result?.error || '解析失败';
            const debugInfo = result?.debug ? `\n调试信息: ${result.debug}` : '';
            throw new Error(errorMsg + debugInfo);
        } catch (error) {
            console.error('AI parse error:', error);
            throw error;
        }
    },

    // Parse image (OCR)
    async parseImage(imageFile) {
        try {
            // Convert file to base64
            const base64 = await this.fileToBase64(imageFile);

            const result = await API.ai.ocr(base64);
            if (result && result.success) {
                return {
                    records: Array.isArray(result.data) ? result.data : [result.data],
                    multiple: result.multiple || false
                };
            }
            // Include debug info if available
            const errorMsg = result?.error || '图片识别失败';
            const debugInfo = result?.debug ? `\n调试信息: ${result.debug}` : '';
            throw new Error(errorMsg + debugInfo);
        } catch (error) {
            console.error('AI OCR error:', error);
            throw error;
        }
    },

    // Generate analysis report
    async analyze(startDate, endDate) {
        try {
            const result = await API.ai.analyze({ startDate, endDate });
            if (result && result.success) {
                return result.data;
            }
            throw new Error(result?.error || '分析失败');
        } catch (error) {
            console.error('AI analyze error:', error);
            throw error;
        }
    },

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Format single record for preview
    formatSinglePreview(data) {
        const typeText = data.type === 'income' ? '收入' : '支出';
        const typeClass = data.type === 'income' ? 'text-success' : 'text-danger';
        const typeEmoji = data.type === 'income' ? '📈' : '📉';

        return `
            <div class="card" style="background: var(--bg-primary); margin-bottom: 1rem;">
                <div class="flex items-center justify-between mb-4">
                    <span class="badge ${data.type === 'income' ? 'badge-income' : 'badge-expense'}">
                        ${typeEmoji} ${typeText}
                    </span>
                    <span class="text-muted">${data.date}</span>
                </div>
                <div class="text-center mb-4">
                    <div class="text-muted text-sm mb-1">金额</div>
                    <div class="text-2xl font-bold ${typeClass}">
                        ¥${parseFloat(data.amount).toFixed(2)}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-muted text-sm mb-1">类别</div>
                        <div class="font-medium">${data.category}</div>
                    </div>
                    <div>
                        <div class="text-muted text-sm mb-1">描述</div>
                        <div class="font-medium">${data.description || '-'}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Format AI parsed data for preview (supports multiple records)
    formatPreview(parseResult) {
        const records = parseResult.records || [parseResult];

        if (records.length === 1) {
            return this.formatSinglePreview(records[0]);
        }

        // Multiple records
        let html = `<div class="text-center mb-4"><span class="badge badge-info">识别到 ${records.length} 笔记录</span></div>`;
        html += records.map((data, index) => `
            <div class="card" style="background: var(--bg-primary); margin-bottom: 1rem; position: relative;">
                <div style="position: absolute; top: 0.5rem; left: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">#${index + 1}</div>
                <div class="flex items-center justify-between mb-3" style="padding-top: 0.5rem;">
                    <span class="badge ${data.type === 'income' ? 'badge-income' : 'badge-expense'}">
                        ${data.type === 'income' ? '📈 收入' : '📉 支出'}
                    </span>
                    <span class="text-muted text-sm">${data.date}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <div class="font-medium">${data.category}</div>
                        <div class="text-muted text-sm">${data.description || '-'}</div>
                    </div>
                    <div class="text-xl font-bold ${data.type === 'income' ? 'text-success' : 'text-danger'}">
                        ¥${parseFloat(data.amount).toFixed(2)}
                    </div>
                </div>
            </div>
        `).join('');

        return html;
    }
};

window.AI = AI;
