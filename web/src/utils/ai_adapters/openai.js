import BaseAdapter from './base'
import { DEFAULT_AI_CONFIG } from '@/utils/config'

/**
 * OpenAI 兼容接口适配器
 * 支持 OpenAI、火山引擎、DeepSeek、智谱 AI 等兼容 OpenAI 格式的 API
 */
class OpenAIAdapter extends BaseAdapter {
    constructor() {
        super()
        // ... (rest of constructor is handled by super or implicit)
    }

    /**
     * 初始化适配器
     * @param {Object} options - 配置选项
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

        // Configurable Parameters
        // Configurable Parameters
        const maxTokens = options.maxTokens !== undefined ? parseInt(options.maxTokens) : DEFAULT_AI_CONFIG.maxTokens
        this.maxContext = options.maxContext !== undefined ? parseInt(options.maxContext) : DEFAULT_AI_CONFIG.maxContext

        this.data = {
            model: options.model,
            max_tokens: maxTokens,
            stream: true,
            // 注入工具定义
            tools: this.getTools()
        }
    }

    /**
     * 构建请求体
     * @param {Object} data - 消息数据
     * @returns {string} JSON 字符串
     */
    buildRequestBody(data) {
        // OpenAI format: tools are at the top level usually
        // But we put them in this.data in init

        // Handle Max Context
        let messages = data.messages || []

        if (this.maxContext > 0 && messages.length > 0) {
            const charLimit = this.maxContext * 4
            let currentChars = 0

            // Keep system prompt if it's the first message
            let systemMsg = null
            let otherMessages = [...messages]

            if (otherMessages.length > 0 && otherMessages[0].role === 'system') {
                systemMsg = otherMessages.shift()
                currentChars += systemMsg.content.length
            }

            const keptMessages = []
            const reversedMessages = otherMessages.reverse()

            for (const msg of reversedMessages) {
                const msgLength = msg.content ? msg.content.length : 0
                if (currentChars + msgLength > charLimit) {
                    break
                }
                currentChars += msgLength
                keptMessages.unshift(msg)
            }

            messages = systemMsg ? [systemMsg, ...keptMessages] : keptMessages
        }

        // Ensure tools is removed if empty to avoid API errors on some providers
        const payload = {
            ...this.data,
            ...data,
            messages: messages
        }

        const tools = this.getTools()
        if (tools && tools.length > 0) {
            payload.tools = tools
            payload.tool_choice = 'auto'
        }

        return JSON.stringify(payload)
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
     * @returns {Object} { content, isEnd, remainingChunk, toolCalls }
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
        let toolCalls = []

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

                    // 1. 处理普通文本
                    if (delta && delta.content) {
                        content += delta.content
                    }

                    // 2. 处理 Function Calling (工具调用)
                    if (delta && delta.tool_calls) {
                        // OpenAI 流式返回 tool_calls 是分片的
                        // 我们需要累积这些分片，通常在 ai.js 中处理累积
                        // 这里只返回当前切片信息
                        toolCalls.push(...delta.tool_calls)
                    }
                }
            } catch (e) {
                console.warn('解析 OpenAI 响应失败:', e)
            }
        }

        return { content, isEnd, remainingChunk, toolCalls }
    }
}

export default OpenAIAdapter
