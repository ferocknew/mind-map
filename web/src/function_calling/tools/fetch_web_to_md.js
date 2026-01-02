/**
 * 工具名称：fetch_web_to_md
 * 描述：获取指定 URL 的网页 HTML 内容，并将其转换为 Markdown 格式返回。
 * 注意：此工具返回的是 Markdown 格式的文本，不是原始 HTML。
 */

export default {
    definition: {
        type: 'function',
        function: {
            name: 'fetch_web_to_md',
            description: '获取指定 URL 的网页 HTML 内容，并将其转换为 Markdown 格式返回。只提取主要内容区域（文章正文），自动忽略导航栏、侧边栏、页脚、广告等无关内容。返回格式为 Markdown 文本，便于阅读和处理。⚠️ 注意：1) 此工具无法提取 JavaScript 动态渲染的内容，只能获取 HTML 源码中的静态内容。2) 如果某个网站访问超时或失败，请尝试其他搜索结果中的网站。3) 工具会自动重试 2 次，每次间隔 1 秒。',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: '要获取内容的网页 URL'
                    },
                    maxLength: {
                        type: 'number',
                        description: '返回内容的最大字符数，默认 8000。用于控制内容长度。',
                        default: 8000
                    }
                },
                required: ['url']
            }
        }
    },

    handler: async (args) => {
        const { url, maxLength = 8000 } = args
        console.log('[Tool: fetch_web] 入参:', { url, maxLength })

        // 重试函数
        const fetchWithRetry = async (retries = 2) => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await attemptFetch()
                } catch (e) {
                    console.warn(`[Tool: fetch_web] 第 ${i + 1} 次尝试失败:`, e.message)
                    if (i < retries - 1) {
                        console.log(`[Tool: fetch_web] 等待 1 秒后重试...`)
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            }
            throw new Error('所有重试均失败')
        }

        const attemptFetch = async () => {
            // 验证 URL 格式
            let targetUrl
            try {
                targetUrl = new URL(url)
            } catch (e) {
                throw new Error(`无效的 URL 格式: ${url}`)
            }

            console.log('[Tool: fetch_web] ========== 开始获取网页内容 ==========')
            console.log('[Tool: fetch_web] 目标 URL:', targetUrl.href)
            console.log('[Tool: fetch_web] 最大长度:', maxLength)
            console.log('[Tool: fetch_web] 使用代理: /proxy/search')

            // 使用代理获取网页内容，避免 CORS 问题
            const proxyHeaders = {
                'X-Search-URL': targetUrl.href,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }

            // 添加 30 秒超时
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)

            try {
                const response = await fetch('/proxy/search', {
                    headers: proxyHeaders,
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                console.log('[Tool: fetch_web] 响应状态:', response.status, response.statusText)
                console.log('[Tool: fetch_web] Content-Type:', response.headers.get('content-type'))

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('[Tool: fetch_web] HTTP 错误:', errorText)
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
                }

                // 获取 HTML 内容
                const html = await response.text()
                console.log('[Tool: fetch_web] HTML 原始长度:', html.length)

                // 提取 body 并转换为 Markdown
                const markdown = htmlToMarkdown(html, maxLength)

                console.log('[Tool: fetch_web] Markdown 转换后长度:', markdown.length)
                console.log('[Tool: fetch_web] Token 压缩率:', ((1 - markdown.length / html.length) * 100).toFixed(2) + '%')

                // 调试：输出提取的内容预览
                if (markdown.length < 500) {
                    console.warn('[Tool: fetch_web] ⚠️ 提取内容过少，可能是动态加载页面')
                    console.warn('[Tool: fetch_web] 提取内容预览:', markdown.substring(0, 500))
                }

                console.log('[Tool: fetch_web] ========== 获取完成 ==========')

                return {
                    success: true,
                    data: {
                        url: url,
                        title: extractTitle(html) || url,
                        content: markdown,
                        contentLength: markdown.length,
                        originalLength: html.length
                    }
                }
            } finally {
                clearTimeout(timeoutId)
            }
        }

        try {
            return await fetchWithRetry(2) // 重试 2 次
        } catch (e) {
            console.error('[Tool: fetch_web] ========== 获取异常 ==========')
            console.error('[Tool: fetch_web] 异常类型:', e.constructor.name)
            console.error('[Tool: fetch_web] 异常信息:', e.message)
            console.error('[Tool: fetch_web] ======================================')

            return {
                success: false,
                message: `获取网页内容失败: ${e.message}。建议：1) 检查 URL 是否正确，2) 尝试其他搜索结果中的网站，3) 某些网站可能需要 JavaScript 执行才能显示内容。`
            }
        }
    }
}

/**
 * 将 HTML 转换为 Markdown（轻量级实现）
 * 只提取主要内容，忽略无关元素
 */
function htmlToMarkdown(html, maxLength = 8000) {
    let structuredData = ''

    // 尝试提取 JSON-LD 结构化数据
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLdMatch && jsonLdMatch[1]) {
        try {
            const data = JSON.parse(jsonLdMatch[1].trim())
            const dataStr = JSON.stringify(data, null, 2)
            structuredData += `\n## 结构化数据 (JSON-LD)\n\`\`\`json\n${dataStr.substring(0, 2000)}\n\`\`\`\n\n`
            console.log('[fetch_web_to_md] 提取到 JSON-LD 数据')
        } catch (e) {
            console.warn('[fetch_web_to_md] JSON-LD 解析失败:', e.message)
        }
    }

    // 提取 meta 标签的 OG 和 Twitter 卡片数据
    const metaTags = []
    const metaMatches = html.matchAll(/<meta[^>]*property=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)
    for (const match of metaMatches) {
        if (match[1].startsWith('og:') || match[1].startsWith('twitter:')) {
            metaTags.push(`- ${match[1]}: ${match[2]}`)
        }
    }
    if (metaTags.length > 0) {
        structuredData += `\n## 页面元数据\n${metaTags.join('\n')}\n\n`
    }

    // 提取 body 内容
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    let content = bodyMatch ? bodyMatch[1] : html

    // 移除无关标签和内容
    const removePatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /<style[^>]*>[\s\S]*?<\/style>/gi,
        /<noscript[^>]*>[\s\S]*?<\/noscript>/gi,
        /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
        /<svg[^>]*>[\s\S]*?<\/svg>/gi,
        /<!--[\s\S]*?-->/g,  // 注释
        /<header[^>]*>[\s\S]*?<\/header>/gi,  // 页头
        /<footer[^>]*>[\s\S]*?<\/footer>/gi,  // 页脚
        /<nav[^>]*>[\s\S]*?<\/nav>/gi,  // 导航栏
        /<aside[^>]*>[\s\S]*?<\/aside>/gi,  // 侧边栏
        /<div[^>]*class="[^"]*?(?:sidebar|menu|navigation|advertisement|ad-)[^"]*?"[^>]*>[\s\S]*?<\/div>/gi,  // 广告和侧边栏
    ]

    removePatterns.forEach(pattern => {
        content = content.replace(pattern, '')
    })

    // 转换为 Markdown
    let markdown = content

    // 处理标题 h1-h6
    markdown = markdown.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n\n')
                      .replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n\n')
                      .replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n\n')
                      .replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n\n')
                      .replace(/<h5[^>]*>([^<]+)<\/h5>/gi, '##### $1\n\n')
                      .replace(/<h6[^>]*>([^<]+)<\/h6>/gi, '###### $1\n\n')

    // 处理段落
    markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, p1) => {
        const text = p1.trim()
        return text ? `${text}\n\n` : ''
    })

    // 处理列表
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
        return content.replace(/<li[^>]*>([^<]*)<\/li>/gi, '- $1\n').trim() + '\n\n'
    })
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let index = 1
        return content.replace(/<li[^>]*>([^<]*)<\/li>/gi, () => `${index++}. $1\n`).trim() + '\n\n'
    })

    // 处理粗体和斜体
    markdown = markdown.replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**')
                      .replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**')
                      .replace(/<em[^>]*>([^<]+)<\/em>/gi, '*$1*')
                      .replace(/<i[^>]*>([^<]+)<\/i>/gi, '*$1*')

    // 处理链接
    markdown = markdown.replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')
                      .replace(/<a[^>]*href='([^']+)'[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')

    // 处理换行
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n')

    // 处理表格（简单提取）
    markdown = markdown.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
        // 提取表格文本，简化处理
        const cells = match.match(/<t[dh][^>]*>([^<]+)<\/t[dh]>/gi)
        if (cells) {
            return '\n' + cells.map(c => c.replace(/<t[dh][^>]*>/gi, '').trim()).join(' | ') + '\n\n'
        }
        return ''
    })

    // 移除剩余的所有 HTML 标签
    markdown = markdown.replace(/<[^>]+>/g, '')

    // 解码 HTML 实体
    const entities = {
        '&nbsp;': ' ',
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': "'",
        '&hellip;': '...',
        '&mdash;': '—',
        '&ndash;': '–',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™'
    }

    Object.entries(entities).forEach(([entity, char]) => {
        markdown = markdown.replace(new RegExp(entity, 'g'), char)
    })

    // 清理空白
    markdown = markdown.replace(/[ \t]+/g, ' ')  // 多个空格合并为一个
                      .replace(/\n{3,}/g, '\n\n')  // 多个空行合并为两个
                      .replace(/^ +/gm, '')  // 移除行首空格
                      .trim()

    // 截断到最大长度（在段落边界截断）
    if (markdown.length > maxLength) {
        markdown = markdown.substring(0, maxLength)
        // 尝试在最近的段落边界截断
        const lastParagraph = markdown.lastIndexOf('\n\n')
        if (lastParagraph > maxLength * 0.7) {
            markdown = markdown.substring(0, lastParagraph).trim()
        }
        markdown += '\n\n...(内容已截断)'
    }

    // 如果提取到了结构化数据，添加到结果前面
    if (structuredData) {
        markdown = structuredData + markdown
    }

    return markdown
}

/**
 * 从 HTML 中提取标题
 */
function extractTitle(html) {
    // 尝试从 title 标签提取
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim()
    }

    // 尝试从 h1 标签提取
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
    if (h1Match && h1Match[1]) {
        return h1Match[1].trim()
    }

    // 尝试从 meta 标签提取
    const metaMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    if (metaMatch && metaMatch[1]) {
        return metaMatch[1].trim()
    }

    return null
}
