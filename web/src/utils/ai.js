import OpenAIAdapter from './ai_adapters/openai'
import AnthropicAdapter from './ai_adapters/anthropic'

class Ai {
  constructor() {
    this.adapter = null
    this.controller = null
    this.currentChunk = ''
    this.content = ''
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
      const reader = await this.postMsg(data)
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          end(this.content)
          return
        }

        const text = decoder.decode(value)
        const result = this.adapter.handleStream(text, this.currentChunk)

        this.currentChunk = result.remainingChunk
        if (result.content) {
          this.content += result.content
        }

        if (result.isEnd) {
          end(this.content)
          return
        }

        progress(this.content)
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
    this.controller.abort()
    this.controller = new AbortController()
  }
}

export default Ai
