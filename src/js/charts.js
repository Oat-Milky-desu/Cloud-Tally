// Charts Module - Chart.js configuration and management

const Charts = {
    instances: {},

    // Chart.js global defaults
    init() {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
        Chart.defaults.font.family = "'Inter', sans-serif";
    },

    // Common options
    getCommonOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        };
    },

    // Create expense pie chart
    createExpenseChart(ctx, data) {
        if (this.instances.expense) {
            this.instances.expense.destroy();
        }

        const colors = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
            '#06b6d4', '#84cc16'
        ];

        this.instances.expense = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.category),
                datasets: [{
                    data: data.map(d => d.total),
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                ...this.getCommonOptions(),
                cutout: '65%',
                plugins: {
                    ...this.getCommonOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `¥${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        return this.instances.expense;
    },

    // Create income pie chart
    createIncomeChart(ctx, data) {
        if (this.instances.income) {
            this.instances.income.destroy();
        }

        const colors = [
            '#10b981', '#22c55e', '#14b8a6', '#059669',
            '#34d399', '#6ee7b7', '#a7f3d0', '#86efac'
        ];

        this.instances.income = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.category),
                datasets: [{
                    data: data.map(d => d.total),
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                ...this.getCommonOptions(),
                cutout: '65%',
                plugins: {
                    ...this.getCommonOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                return `¥${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        return this.instances.income;
    },

    // Create trend line chart
    createTrendChart(ctx, data) {
        if (this.instances.trend) {
            this.instances.trend.destroy();
        }

        this.instances.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.period),
                datasets: [
                    {
                        label: '收入',
                        data: data.map(d => d.income),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: '支出',
                        data: data.map(d => d.expense),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                ...this.getCommonOptions(),
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            callback: (value) => '¥' + value
                        }
                    }
                },
                plugins: {
                    ...this.getCommonOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ¥${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        return this.instances.trend;
    },

    // Update chart data
    updateChart(chartName, data) {
        const chart = this.instances[chartName];
        if (chart) {
            chart.data.labels = data.labels || chart.data.labels;
            chart.data.datasets.forEach((dataset, i) => {
                dataset.data = data.datasets[i]?.data || dataset.data;
            });
            chart.update();
        }
    },

    // Destroy all charts
    destroyAll() {
        Object.values(this.instances).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.instances = {};
    }
};

// Initialize Chart.js defaults
Charts.init();

window.Charts = Charts;
