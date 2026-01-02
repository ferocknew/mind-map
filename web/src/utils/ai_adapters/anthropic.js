/**
 * Anthropic 接口适配器
 * 支持 Claude API
 */
class AnthropicAdapter {
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
     * @param {string} options.api - API 基础地址
     * @param {string} options.key - API 密钥
     * @param {string} options.model - 模型名称
     * @param {string} options.method - 请求方法
     */
    init(options = {}) {
        let api = options.api || ''

        // 1. 先确保有正确的路径
        api = api.replace(/\/+$/, '')
        if (!api.includes('/v1/messages')) {
            api = api + '/v1/messages'
        }

        // 保存完整的原始 API 地址
        this.originalApi = api

        // 2. 开发环境使用通用代理
        if (this.isDev()) {
            this.api = '/proxy/ai'
            console.log(`[AI-Anthropic] 使用代理: ${api} -> /proxy/ai`)
        } else {
            this.api = api
        }

        this.method = options.method || 'POST'
        this.headers = {
            'Content-Type': 'application/json',
            'x-api-key': options.key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        }
        this.data = {
            model: options.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
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
            messages: data.messages
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

        if (currentChunk) {
            chunk = currentChunk + chunk
        }

        let content = ''
        let isEnd = false
        let remainingChunk = ''

        if (chunk.includes('message_stop')) {
            isEnd = true
        }

        if (!isEnd && chunk[chunk.length - 1] !== '}') {
            remainingChunk = chunk
            return { content, isEnd, remainingChunk }
        }

        const lines = chunk.split('\n').filter(item => !!item.trim())

        for (const line of lines) {
            if (line.startsWith('event:')) {
                const event = line.replace(/^event:\s*/, '').trim()
                if (event === 'message_stop') {
                    isEnd = true
                }
                continue
            }

            if (line.startsWith('data:')) {
                try {
                    const jsonStr = line.replace(/^data:\s*/, '')
                    if (!jsonStr) continue
                    const data = JSON.parse(jsonStr)

                    if (data.type === 'content_block_delta' && data.delta) {
                        if (data.delta.type === 'text_delta' && data.delta.text) {
                            content += data.delta.text
                        }
                    }
                } catch (e) {
                    console.warn('解析 Anthropic 响应失败:', e)
                }
            }
        }

        return { content, isEnd, remainingChunk }
    }
}

export default AnthropicAdapter
