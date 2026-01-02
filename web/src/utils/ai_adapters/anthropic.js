import BaseAdapter from './base'
import { DEFAULT_AI_CONFIG } from '@/utils/config'

/**
 * Anthropic 接口适配器
 * 支持 Claude API
 */
class AnthropicAdapter extends BaseAdapter {
    constructor() {
        super()
        // ...
    }

    /**
     * 初始化适配器
     * @param {Object} options - 配置选项
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

        // Configurable Parameters
        // Configurable Parameters
        const maxTokens = options.maxTokens !== undefined ? parseInt(options.maxTokens) : DEFAULT_AI_CONFIG.maxTokens
        this.maxContext = options.maxContext !== undefined ? parseInt(options.maxContext) : DEFAULT_AI_CONFIG.maxContext

        this.data = {
            model: options.model || 'claude-3-5-sonnet-20241022',
            max_tokens: maxTokens,
            stream: true
        }
    }

    /**
     * 构建请求体
     * @param {Object} data - 消息数据
     * @returns {string} JSON 字符串
     */
    buildRequestBody(data) {
        let messages = []
        let system = ''

        // 1. 处理消息格式转换
        data.messages.forEach(msg => {
            if (msg.role === 'system') {
                system = msg.content
                return
            }

            // 处理工具返回结果: role:tool -> role:user (content: tool_result)
            if (msg.role === 'tool') {
                messages.push({
                    role: 'user',
                    content: [
                        {
                            type: 'tool_result',
                            tool_use_id: msg.tool_call_id,
                            content: msg.content
                        }
                    ]
                })
                return
            }

            // 处理助手调用工具: role:assistant (tool_calls) -> role:assistant (content: tool_use)
            if (msg.role === 'assistant' && msg.tool_calls) {
                const content = []
                // 如果有文本内容，先添加文本
                if (msg.content) {
                    content.push({
                        type: 'text',
                        text: msg.content
                    })
                }
                // 添加工具调用
                msg.tool_calls.forEach(tool => {
                    content.push({
                        type: 'tool_use',
                        id: tool.id,
                        name: tool.function.name,
                        input: JSON.parse(tool.function.arguments)
                    })
                })
                messages.push({
                    role: 'assistant',
                    content: content
                })
                return
            }

            // 普通用户消息或助手消息
            messages.push(msg)
        })

        // 2. Max Context Handling (Heuristic: 1 token ~= 4 chars)
        if (this.maxContext > 0) {
            const charLimit = this.maxContext * 4
            let currentChars = system.length

            // Calculate initial length
            // Note: This is a rough approximation. 
            // We should ideally traverse from the end to the beginning to keep recent messages.

            // Reverse messages to count from newest
            const reversedMessages = [...messages].reverse()
            const keptMessages = []

            for (const msg of reversedMessages) {
                let msgLength = 0
                if (typeof msg.content === 'string') {
                    msgLength = msg.content.length
                } else if (Array.isArray(msg.content)) {
                    msgLength = JSON.stringify(msg.content).length
                }

                if (currentChars + msgLength > charLimit) {
                    break
                }

                currentChars += msgLength
                keptMessages.unshift(msg)
            }

            messages = keptMessages
        }

        const payload = {
            ...this.data,
            messages: messages
        }

        if (system) {
            payload.system = system
        }

        const tools = this.getTools()
        if (tools && tools.length > 0) {
            // 转换工具定义格式: OpenAI function -> Anthropic tool input_schema
            payload.tools = tools.map(tool => ({
                name: tool.function.name,
                description: tool.function.description,
                input_schema: tool.function.parameters
            }))
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

        if (currentChunk) {
            chunk = currentChunk + chunk
        }

        let content = ''
        let isEnd = false
        let remainingChunk = ''
        let toolCalls = []

        // 调试日志
        if (chunk.length > 0) {
//            console.log('[Anthropic] 接收到数据块，长度:', chunk.length, '前100字符:', chunk.substring(0, 100))
        }

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

                    // Claude tool use streaming is different (content_block_start -> content_block_delta type=input_json_delta)
                    // Handling streaming tool calls for Claude is complex. 
                    // For simplicity, we might only handle the final 'message_stop' or accumulate in 'ai.js' if possible.
                    // Or we check for 'content_block_start' with 'tool_use'.

                    // Note: Claude returns `tool_use` block first, then streams `input_json_delta` inside it.
                    // This is much harder to parse in a simple loop without a state machine.
                    // For MVP, we might defer tool use to non-streaming or try to capture it.
                    // Let's attempt to capture standard tool_use events if present in specific blocks.

                    /* 
                       Claude Stream Format for Tools:
                       event: content_block_start
                       data: {"type": "content_block_start", "index": 1, "content_block": {"type": "tool_use", "id": "toolu_01...", "name": "get_weather", "input": {}}}
                       
                       event: content_block_delta
                       data: {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\"loc"}}
                    */

                    if (data.type === 'content_block_start' && data.content_block && data.content_block.type === 'tool_use') {
                        toolCalls.push({
                            type: 'tool_use_start',
                            id: data.content_block.id,
                            name: data.content_block.name,
                            index: data.index,
                            input: data.content_block.input || {}
                        })
                        console.log('[Anthropic] 检测到工具调用开始:', data.content_block.name)
                    }

                    if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'input_json_delta') {
                        // partial_json 是不完整的 JSON，需要累积，这里先保存原始字符串
                        toolCalls.push({
                            type: 'tool_use_delta',
                            partial_json: data.delta.partial_json,
                            index: data.index
                        })
                        console.log('[Anthropic] 工具参数片段:', data.delta.partial_json)
                    }

                } catch (e) {
                    console.warn('解析 Anthropic 响应失败:', e, '原始数据:', jsonStr)
                }
            }
        }

        return { content, isEnd, remainingChunk, toolCalls }
    }
}

export default AnthropicAdapter
