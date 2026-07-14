/**
 * 页面分析脚本
 * 用于记录页面停留时间和发送统计数据到服务器
 */

class PageAnalytics {
    constructor() {
        this.pageEnterTime = Date.now();
        this.pageUrl = window.location.pathname;
        this.isActive = true;

        this.init();
    }

    init() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isActive = false;
            } else {
                this.isActive = true;
                this.pageEnterTime = Date.now(); // 重新记录进入时间
            }
        });

        // 监听页面卸载（用户离开页面）
        window.addEventListener('beforeunload', () => {
            this.sendPageDuration();
        });

        // 监听页面关闭
        window.addEventListener('unload', () => {
            this.sendPageDuration();
        });

        console.log(`📊 页面分析已启动: ${this.pageUrl}`);
    }

    // 计算页面停留时间并发送到服务器
    sendPageDuration() {
        if (!this.isActive) return;

        const duration = Date.now() - this.pageEnterTime;

        // 使用navigator.sendBeacon在页面卸载时可靠地发送数据
        if (navigator.sendBeacon) {
            const data = JSON.stringify({
                page: this.pageUrl,
                duration: duration,
                timestamp: new Date().toISOString()
            });

            navigator.sendBeacon('/api/page-duration', data);
        } else {
            // 降级方案：使用XMLHttpRequest
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/page-duration', false); // 同步请求确保在页面关闭前发送
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                page: this.pageUrl,
                duration: duration,
                timestamp: new Date().toISOString()
            }));
        }
    }

    // 手动记录页面事件
    trackEvent(eventName, eventData = {}) {
        const eventPayload = {
            event: eventName,
            page: this.pageUrl,
            timestamp: new Date().toISOString(),
            data: eventData
        };

        // 尝试发送事件数据
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/page-event', JSON.stringify(eventPayload));
            } else {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/page-event', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(eventPayload));
            }
        } catch (error) {
            console.warn('发送事件数据失败:', error);
        }
    }
}

// 自动初始化页面分析
let pageAnalytics = null;

document.addEventListener('DOMContentLoaded', () => {
    pageAnalytics = new PageAnalytics();

    // 示例：记录特定事件
    // pageAnalytics.trackEvent('page_view', { referrer: document.referrer });
});

// 提供全局访问接口
window.PageAnalytics = {
    trackEvent: (eventName, eventData) => {
        if (pageAnalytics) {
            pageAnalytics.trackEvent(eventName, eventData);
        }
    }
};