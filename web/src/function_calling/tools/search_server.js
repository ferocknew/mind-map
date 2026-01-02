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
            // 项目使用 storeLocalConfig 将配置保存到 SIMPLE_MIND_MAP_LOCAL_CONFIG 键中
            let aiConfig = {}
            try {
                // 尝试从项目标准的本地配置读取
                const localConfigStr = localStorage.getItem('SIMPLE_MIND_MAP_LOCAL_CONFIG')
                if (localConfigStr) {
                    const localConfig = JSON.parse(localConfigStr)
                    aiConfig = localConfig.aiConfig || {}

                    // 输出详细配置信息（脱敏）
                    console.log('[Tool: search_server] ========== 搜索配置信息 ==========')
                    console.log('[Tool: search_server] 配置来源: SIMPLE_MIND_MAP_LOCAL_CONFIG')
                    console.log('[Tool: search_server] 搜索引擎:', aiConfig.searchEngine || '未配置')
                    console.log('[Tool: search_server] 搜索地址:', aiConfig.searchUrl || '未配置')
                    console.log('[Tool: search_server] 是否启用认证:', aiConfig.searchIsAuth || false)
                    console.log('[Tool: search_server] 认证码:', aiConfig.searchAuthCode ? '已配置(长度:' + aiConfig.searchAuthCode.length + ')' : '未配置')
                    console.log('[Tool: search_server] 完整 aiConfig 对象:', JSON.stringify(aiConfig, null, 2))
                    console.log('[Tool: search_server] ======================================')
                } else {
                    console.warn('[Tool: search_server] 未找到 SIMPLE_MIND_MAP_LOCAL_CONFIG 配置')
                }
            } catch (e) {
                console.error('[Tool: search_server] 读取本地配置失败:', e)
            }

            const searchEngine = aiConfig.searchEngine || 'searxng'
            const searchUrl = aiConfig.searchUrl
            const searchIsAuth = aiConfig.searchIsAuth || false
            const searchAuthCode = aiConfig.searchAuthCode || ''

            if (!searchUrl) {
                console.error('[Tool: search_server] 搜索服务地址未配置')
                return {
                    success: false,
                    message: '未配置搜索服务地址，请在 AI 设置 -> 搜索配置 中填写服务地址。'
                }
            }

            if (searchEngine === 'searxng') {
                // 修复 URL 双斜杠问题：移除 searchUrl 末尾的斜杠
                const cleanSearchUrl = searchUrl.replace(/\/$/, '')
                const targetUrl = `${cleanSearchUrl}/search?q=${encodeURIComponent(keyword)}&categories=general&language=auto&time_range=&safesearch=0&theme=simple&format=json`

                console.log('[Tool: search_server] ========== 开始 SearXNG 搜索 ==========')
                console.log('[Tool: search_server] 搜索关键词:', keyword)
                console.log('[Tool: search_server] 目标 URL:', targetUrl)
                console.log('[Tool: search_server] 使用代理: /proxy/search')

                // 使用代理，避免 CORS 问题
                const proxyHeaders = {
                    'X-Search-URL': targetUrl
                }

                // 如果有认证，添加到代理头
                if (searchIsAuth && searchAuthCode) {
                    proxyHeaders['X-Search-Auth'] = `Bearer ${searchAuthCode}`
                    console.log('[Tool: search_server] 启用认证: 是 (Token长度: ' + searchAuthCode.length + ')')
                }

                console.log('[Tool: search_server] 代理请求头:', JSON.stringify({ ...proxyHeaders, 'X-Search-Auth': proxyHeaders['X-Search-Auth'] ? '***已隐藏***' : undefined }, null, 2))

                const response = await fetch('/proxy/search', {
                    headers: proxyHeaders
                })

                console.log('[Tool: search_server] 响应状态:', response.status, response.statusText)
                console.log('[Tool: search_server] 响应头 Content-Type:', response.headers.get('content-type'))

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('[Tool: search_server] HTTP 错误响应内容:', errorText)
                    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
                }

                const data = await response.json()
                console.log('[Tool: search_server] 响应数据结构:', JSON.stringify(Object.keys(data), null, 2))
                console.log('[Tool: search_server] 原始结果数量:', data.results?.length || 0)

                // 提取有用信息，减少 token
                // SearXNG json format usually has 'results' array
                const results = data.results || []

                const simplifiedResults = results.slice(0, 5).map(item => ({
                    title: item.title,
                    url: item.url,
                    content: item.content
                }))

                console.log('[Tool: search_server] ========== 搜索完成 ==========')
                console.log('[Tool: search_server] 返回结果数:', simplifiedResults.length)
                console.log('[Tool: search_server] ======================================')

                return {
                    success: true,
                    data: simplifiedResults
                }
            } else if (searchEngine === 'whoogle') {
                // 修复 URL 双斜杠问题：移除 searchUrl 末尾的斜杠
                const cleanSearchUrl = searchUrl.replace(/\/$/, '')
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

                const targetUrl = `${cleanSearchUrl}/search?${queryParams.toString()}`

                console.log('[Tool: search_server] ========== 开始 Whoogle 搜索 ==========')
                console.log('[Tool: search_server] 搜索关键词:', keyword)
                console.log('[Tool: search_server] 目标 URL:', targetUrl)
                console.log('[Tool: search_server] 使用代理: /proxy/search')

                // 使用代理，避免 CORS 问题
                const proxyHeaders = {
                    'X-Search-URL': targetUrl
                }

                // 如果有认证，添加到代理头
                if (searchIsAuth && searchAuthCode) {
                    proxyHeaders['X-Search-Auth'] = `Bearer ${searchAuthCode}`
                    console.log('[Tool: search_server] 启用认证: 是 (Token长度: ' + searchAuthCode.length + ')')
                }

                console.log('[Tool: search_server] 代理请求头:', JSON.stringify({ ...proxyHeaders, 'X-Search-Auth': proxyHeaders['X-Search-Auth'] ? '***已隐藏***' : undefined }, null, 2))

                const response = await fetch('/proxy/search', {
                    headers: proxyHeaders
                })

                console.log('[Tool: search_server] 响应状态:', response.status, response.statusText)
                console.log('[Tool: search_server] 响应头 Content-Type:', response.headers.get('content-type'))

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('[Tool: search_server] HTTP 错误响应内容:', errorText)
                    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
                }

                const data = await response.json()
                console.log('[Tool: search_server] 响应数据结构:', JSON.stringify(Object.keys(data), null, 2))

                let results = []
                if (Array.isArray(data)) {
                    results = data
                } else if (data.results) {
                    results = data.results
                } else {
                    results = data.links || []
                }

                console.log('[Tool: search_server] 原始结果数量:', results.length)

                const simplifiedResults = results.slice(0, 5).map(item => ({
                    title: item.title || item.text,
                    url: item.href || item.link || item.url,
                    content: item.body || item.snippet || item.desc || ''
                }))

                console.log('[Tool: search_server] ========== 搜索完成 ==========')
                console.log('[Tool: search_server] 返回结果数:', simplifiedResults.length)
                console.log('[Tool: search_server] ======================================')

                return {
                    success: true,
                    data: simplifiedResults
                }
            }

            return {
                success: false,
                message: `不支持的搜索引擎类型: ${searchEngine}`
            }

        } catch (e) {
            console.error('[Tool: search_server] ========== 搜索异常 ==========')
            console.error('[Tool: search_server] 异常类型:', e.constructor.name)
            console.error('[Tool: search_server] 异常信息:', e.message)
            console.error('[Tool: search_server] 异常堆栈:', e.stack)
            console.error('[Tool: search_server] ======================================')

            return {
                success: false,
                message: `搜索失败: ${e.message}`
            }
        }
    }
}
