import OpenAIAdapter from './ai_adapters/openai'
import AnthropicAdapter from './ai_adapters/anthropic'
import { getToolHandler } from '@/function_calling'

class Ai {
  constructor(mindMap) {
    this.mindMap = mindMap // Context for tools
    this.adapter = null
    this.controller = null
    this.currentChunk = ''
    this.content = ''
    this.toolCallsCache = {} // Map to accumulate tool call fragments by index
  }

  /**
   * 初始化 AI 实例
   * @param {string} type - 类型标识（保留参数，兼容旧调用）
   * @param {Object} options - 配置选项
   */
  init(type = 'huoshan', options = {}) {
    // 根据类型选择适配器
    const adapterType = options.type || 'OpenAI'

    if (adapterType === 'Anthropic') {
      this.adapter = new AnthropicAdapter()
    } else {
      this.adapter = new OpenAIAdapter()
    }

    this.adapter.init(options)
  }

  /**
   * 发起流式请求
   * @param {Object} data - 请求数据
   * @param {Function} progress - 进度回调
   * @param {Function} end - 结束回调
   * @param {Function} err - 错误回调
   */
  async request(data, progress = () => { }, end = () => { }, err = () => { }) {
    try {
      this.toolCallsCache = {} // Reset cache
      const reader = await this.postMsg(data)
      const decoder = new TextDecoder()

      let hasToolCalls = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Stream ended
          // Check if we have gathered any tool calls to execute
          if (hasToolCalls) {
            await this.processToolCalls(data.messages, progress, end, err)
            return
          }

          end(this.content)
          return
        }

        const text = decoder.decode(value)
        const result = this.adapter.handleStream(text, this.currentChunk)

        this.currentChunk = result.remainingChunk

        // Handle Content
        if (result.content) {
          this.content += result.content
          progress(this.content) // Only notify progress for text content
        }

        // Handle Tool Calls Accumulation
        if (result.toolCalls && result.toolCalls.length > 0) {
          hasToolCalls = true
          this.accumulateToolCalls(result.toolCalls)
        }

        if (result.isEnd) {
          if (hasToolCalls) {
            await this.processToolCalls(data.messages, progress, end, err)
            return
          }
          end(this.content)
          return
        }
      }
    } catch (error) {
      console.log(error)
      // 手动停止请求不需要触发错误回调
      if (!(error && error.name === 'AbortError')) {
        err(error)
      }
    }
  }

  /**
   * 累积工具调用分片
   * 兼容 OpenAI (分片) 和 Claude (事件)
   */
  accumulateToolCalls(toolCalls) {
    toolCalls.forEach(call => {
      // Claude style
      if (call.type === 'tool_use_start') {
        this.toolCallsCache[call.index] = {
          id: call.id,
          name: call.name,
          arguments: ''
        }
        return
      }
      if (call.type === 'tool_use_delta') {
        if (this.toolCallsCache[call.index]) {
          this.toolCallsCache[call.index].arguments += call.partial_json
        }
        return
      }

      // OpenAI style (usually has an index field in the object)
      if (call.index !== undefined) {
        if (!this.toolCallsCache[call.index]) {
          this.toolCallsCache[call.index] = {
            id: call.id || '',
            name: call.function?.name || '',
            arguments: ''
          }
        }
        if (call.id) this.toolCallsCache[call.index].id = call.id
        if (call.function?.name) this.toolCallsCache[call.index].name = call.function.name
        if (call.function?.arguments) this.toolCallsCache[call.index].arguments += call.function.arguments
      }
    })
  }

  /**
   * 处理并执行工具调用
   */
  async processToolCalls(historyMessages, progress, end, err) {
    const toolCalls = Object.values(this.toolCallsCache)
    if (toolCalls.length === 0) {
      end(this.content)
      return
    }

    // 1. Add assistant message with tool calls to history
    const assistantMessage = {
      role: 'assistant',
      content: this.content || null,
      tool_calls: toolCalls.map(t => ({
        id: t.id,
        type: 'function',
        function: {
          name: t.name,
          arguments: t.arguments
        }
      }))
    }

    const newMessages = [...historyMessages, assistantMessage]

    // 2. Execute tools
    for (const tool of toolCalls) {
      const handler = getToolHandler(tool.name)
      let resultContent = ''

      if (handler && this.mindMap) {
        try {
          const args = JSON.parse(tool.arguments)
          // Notice: We pass mindMap instance to the handler
          const result = await handler(args, { mindMap: this.mindMap })
          resultContent = JSON.stringify(result)
        } catch (e) {
          resultContent = JSON.stringify({ error: e.message })
        }
      } else {
        resultContent = JSON.stringify({ error: 'Tool not found or context missing' })
      }

      // 3. Add tool result to history
      newMessages.push({
        role: 'tool',
        tool_call_id: tool.id,
        name: tool.name,
        content: resultContent
      })
    }

    // 4. Recursive call to AI with new history
    // Create new AI instance to avoid state pollution or reuse? Reusing is fine if we reset state.
    // But we are inside an async method of `this`.
    // We need to re-initialize state for the next turn.
    this.currentChunk = ''
    this.content = '' // Reset content for the new answer
    // Wait for the recursive request
    await this.request({ messages: newMessages }, progress, end, err)
  }

  /**
   * 发送请求
   * @param {Object} data - 请求数据
   * @returns {ReadableStreamDefaultReader} 响应流读取器
   */
  async postMsg(data) {
    this.controller = new AbortController()

    const config = this.adapter.getRequestConfig()
    const body = this.adapter.buildRequestBody(data)

    const res = await fetch(config.api, {
      signal: this.controller.signal,
      method: config.method,
      headers: config.headers,
      body: body
    })

    if (res.status && res.status !== 200) {
      const errorText = await res.text()
      console.error('API 请求失败:', res.status, errorText)
      throw new Error(`请求失败: ${res.status}`)
    }

    return res.body.getReader()
  }

  /**
   * 停止请求
   */
  stop() {
    if (this.controller) {
      this.controller.abort()
      this.controller = new AbortController()
    }
  }
}

export default Ai
