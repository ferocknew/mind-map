/**
 * OpenAI 兼容接口适配器
 * 支持 OpenAI、火山引擎、DeepSeek、智谱 AI 等兼容 OpenAI 格式的 API
 */
class OpenAIAdapter {
    constructor() {
        this.headers = {}
        this.data = {}
        this.api = ''
        this.originalApi = '' // 保存原始 API 地址，用于代理
        this.method = 'POST'
    }

    /**
     * 初始化适配器
     * @param {Object} options - 配置选项
     * @param {string} options.api - API 地址
     * @param {string} options.key - API 密钥
     * @param {string} options.model - 模型名称
     * @param {string} options.method - 请求方法
     */
    init(options = {}) {
        let api = options.api || ''

        // 1. 先确保有正确的路径
        api = api.replace(/\/+$/, '')
        if (!api.includes('/chat/completions')) {
            api = api + '/chat/completions'
        }

        // 保存完整的原始 API 地址
        this.originalApi = api

        // 2. 开发环境使用通用代理
        if (this.isDev()) {
            this.api = '/proxy/ai'
            console.log(`[AI-OpenAI] 使用代理: ${api} -> /proxy/ai`)
        } else {
            this.api = api
        }

        this.method = options.method || 'POST'
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + options.key
        }
        this.data = {
            model: options.model,
            stream: true
        }
    }

    /**
     * 判断是否开发环境
     */
    isDev() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    }

    /**
     * 构建请求体
     * @param {Object} data - 消息数据
     * @returns {string} JSON 字符串
     */
    buildRequestBody(data) {
        return JSON.stringify({
            ...this.data,
            ...data
        })
    }

    /**
     * 获取请求配置
     * @returns {Object} 请求配置
     */
    getRequestConfig() {
        const headers = { ...this.headers }

        // 开发环境添加目标 URL 到请求头
        if (this.isDev() && this.originalApi) {
            headers['X-Target-URL'] = this.originalApi
        }

        return {
            api: this.api,
            method: this.method,
            headers: headers
        }
    }

    /**
     * 处理流式响应
     * @param {string} chunk - 响应数据块
     * @param {string} currentChunk - 当前不完整的数据块
     * @returns {Object} { content, isEnd, remainingChunk }
     */
    handleStream(chunk, currentChunk = '') {
        chunk = chunk.trim()

        // 拼接上一个不完整的切片
        if (currentChunk) {
            chunk = currentChunk + chunk
        }

        let content = ''
        let isEnd = false
        let remainingChunk = ''

        // 检查结束标记
        if (chunk.includes('[DONE]')) {
            isEnd = true
        }

        // 检查切片完整性
        if (!isEnd && chunk[chunk.length - 1] !== '}') {
            remainingChunk = chunk
            return { content, isEnd, remainingChunk }
        }

        // 解析数据
        const lines = chunk.split('\n').filter(item => {
            if (item.includes('[DONE]')) {
                isEnd = true
                return false
            }
            return !!item && item.startsWith('data:')
        })

        for (const line of lines) {
            try {
                const jsonStr = line.replace(/^data:\s*/, '')
                if (!jsonStr || jsonStr === '[DONE]') continue
                const data = JSON.parse(jsonStr)
                if (data.choices && data.choices.length > 0) {
                    const delta = data.choices[0].delta
                    if (delta && delta.content) {
                        content += delta.content
                    }
                }
            } catch (e) {
                console.warn('解析 OpenAI 响应失败:', e)
            }
        }

        return { content, isEnd, remainingChunk }
    }
}

export default OpenAIAdapter
