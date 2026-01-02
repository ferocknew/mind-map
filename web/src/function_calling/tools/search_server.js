/**
 * 工具名称：search_server
 * 描述：联网搜索。当用户询问的问题超出当前上下文或需要实时信息时使用。
 */

export default {
    definition: {
        type: 'function',
        function: {
            name: 'search_server',
            description: '当用户询问的问题需要实时联网搜索，或者超出当前上下文时，使用此工具进行搜索。Search the internet for real-time information.',
            parameters: {
                type: 'object',
                properties: {
                    keyword: {
                        type: 'string',
                        description: '搜索关键词'
                    }
                },
                required: ['keyword']
            }
        }
    },

    handler: async (args) => {
        const { keyword } = args
        console.log('[Tool: search_server] 入参:', args)

        try {
            // 从 localStorage 读取配置
            // 注意：localStorage 存储的是字符串，Vuex 持久化可能存储为 JSON 字符串，也可能直接存值
            // 这里参考 ai_config_dialog 的逻辑，实际上配置通常保存在 localStorage 的 'MINIMAP_AI_CONFIG' 或类似 key 中
            // 但根据 ai_config_dialog/index.js，数据在 vuex 的 aiConfig 中
            // 我们在非组件环境中，可以直接读取 localStorage
            // 假设 vuex-persistedstate 将 'aiConfig' 存放在 'vuex' key 下，或者直接存放在 'aiConfig' key 下
            // 基于 mind-map 项目常见结构，通常是 store.js 配置了持久化
            // 简单起见，我们尝试从 localStorage 中的 store 状态读取，或者假设 config 被同步到了 localStorage 的某个特定 key
            // 观察 ai_config_dialog.js，它用了 mapMutations(['setAiConfig'])，这暗示用了 vuex。

            // 为了稳健性，先尝试读取 vuex 持久化数据
            let aiConfig = {}
            try {
                const vuexState = JSON.parse(localStorage.getItem('vuex') || '{}')
                aiConfig = vuexState.aiConfig || {}
            } catch (e) {
                console.warn('[Tool: search_server] 读取 Vuex state 失败:', e)
            }

            // 如果没找到，尝试读取旧的或备用的存储位（如果有）
            // 这里假设主要配置就在 vuex.aiConfig

            const searchEngine = aiConfig.searchEngine || 'searxng'
            const searchUrl = aiConfig.searchUrl
            const searchIsAuth = aiConfig.searchIsAuth || false
            const searchAuthCode = aiConfig.searchAuthCode || ''

            if (!searchUrl) {
                return {
                    success: false,
                    message: '未配置搜索服务地址，请在 AI 设置 -> 搜索配置 中填写服务地址。'
                }
            }

            const headers = {}
            if (searchIsAuth && searchAuthCode) {
                headers['Authorization'] = `Bearer ${searchAuthCode}`
            }

            if (searchEngine === 'searxng') {
                const url = `${searchUrl}/search?q=${encodeURIComponent(keyword)}&categories=general&language=auto&time_range=&safesearch=0&theme=simple&format=json`

                console.log('[Tool: search_server] Requesting:', url)
                if (Object.keys(headers).length > 0) {
                    console.log('[Tool: search_server] With headers:', JSON.stringify(headers))
                }

                const response = await fetch(url, { headers })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()

                // 提取有用信息，减少 token
                // SearXNG json format usually has 'results' array
                const results = data.results || []

                const simplifiedResults = results.slice(0, 5).map(item => ({
                    title: item.title,
                    url: item.url,
                    content: item.content
                }))

                const result = {
                    success: true,
                    data: simplifiedResults
                }
                console.log('[Tool: search_server] 搜索成功，结果数:', simplifiedResults.length)
                return result
            } else if (searchEngine === 'whoogle') {
                // 暂时只实现 searxng，whoogle 预留
                // return {
                //    success: false,
                //    message: '暂不支持 Whoogle 搜索，请切换为 SearXNG。'
                // }

                const queryParams = new URLSearchParams({
                    q: keyword,
                    format: 'json',
                    gl: 'CN',
                    hl: 'zh-CN',
                    pws: '0',
                    cr: 'countryCN',
                    lr: 'lang_zh-CN',
                    page: '1'
                })

                const url = `${searchUrl}/search?${queryParams.toString()}`

                console.log('[Tool: search_server] Requesting (Whoogle):', url)
                if (Object.keys(headers).length > 0) {
                    console.log('[Tool: search_server] With headers:', JSON.stringify(headers))
                }

                const response = await fetch(url, { headers })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()

                // Whoogle (via certain instances/configurations) might return different structures.
                // Assuming standard Google-like result or whatever the user's Whoogle instance returns for format=json
                // Based on common Whoogle implementations, format=json might return direct results or need parsing.
                // However, without a specific response format provided by the user, we will assume a generic 'results' or top-level array
                // If the user's example implies standard integration, let's look for 'results' or map directly if it's an array.

                // Note: Whoogle usually returns HTML unless specifically patched or using an API wrapper. 
                // But the user specified `format: json`, implying their instance supports it.
                // We will try to adapt to common JSON structures.

                let results = []
                if (Array.isArray(data)) {
                    results = data
                } else if (data.results) {
                    results = data.results
                } else {
                    // Fallback: try to see if data itself is the result object or contains items
                    // Some proxies return { links: [...] }
                    results = data.links || []
                }

                const simplifiedResults = results.slice(0, 5).map(item => ({
                    title: item.title || item.text,
                    url: item.href || item.link || item.url,
                    content: item.body || item.snippet || item.desc || ''
                }))

                const result = {
                    success: true,
                    data: simplifiedResults
                }
                console.log('[Tool: search_server] Whoogle 搜索成功，结果数:', simplifiedResults.length)
                return result
            }

            return {
                success: false,
                message: `不支持的搜索引擎类型: ${searchEngine}`
            }

        } catch (e) {
            const result = {
                success: false,
                message: `搜索失败: ${e.message}`
            }
            console.error('[Tool: search_server] Error:', e)
            return result
        }
    }
}
