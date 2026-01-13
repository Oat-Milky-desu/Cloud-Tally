// AI Module - Handles AI-related functionality

const AI = {
    // Parse natural language input
    async parseText(text) {
        try {
            const result = await API.ai.parse(text);
            if (result && result.success) {
                return result.data;
            }
            throw new Error(result?.error || '解析失败');
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
                return result.data;
            }
            throw new Error(result?.error || '图片识别失败');
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

    // Format AI parsed data for preview
    formatPreview(data) {
        const typeText = data.type === 'income' ? '收入' : '支出';
        const typeClass = data.type === 'income' ? 'text-success' : 'text-danger';
        const typeEmoji = data.type === 'income' ? '📈' : '📉';

        return `
            <div class="card" style="background: var(--bg-primary);">
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
                ${data.items ? `
                    <div class="mt-4">
                        <div class="text-muted text-sm mb-2">明细</div>
                        <ul class="text-sm">
                            ${data.items.map(item => `<li>• ${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
};

window.AI = AI;
