/**
 * 工具名称：read_map
 * 描述：读取当前思维导图的数据。
 */

// 过滤掉不必要的字段，减少 token 消耗
const filterData = (data) => {
    const newData = {
        data: {
            text: data.data.text,
            uid: data.data.uid
        }
    }

    // 保留重要属性
    if (data.data.note) newData.data.note = data.data.note
    if (data.data.hyperlink) newData.data.hyperlink = data.data.hyperlink
    if (data.data.image) newData.data.image = data.data.image
    if (data.data.imageTitle) newData.data.imageTitle = data.data.imageTitle
    if (data.data.expand === false) newData.data.expand = false // 只在收起时保留
    if (data.data.richText) newData.data.richText = true // 保留富文本标记

    // 递归处理子节点
    if (data.children && data.children.length > 0) {
        newData.children = data.children.map(child => filterData(child))
    } else {
        newData.children = []
    }

    return newData
}

export default {
    definition: {
        type: 'function',
        function: {
            name: 'read_map',
            description: '读取当前思维导图的完整数据结构。返回的数据经过精简，移除了样式和布局信息。Read the entire mind map data structure (simplified).',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },

    handler: async (args, { mindMap }) => {
        console.log('[Tool: read_map] 入参:', args)

        try {
            const data = mindMap.getData()
            const simpleData = filterData(data)
            const result = {
                success: true,
                data: simpleData
            }
            console.log('[Tool: read_map] 出参 (data 已精简):', { success: result.success, nodeCount: JSON.stringify(result.data).length })
            return result
        } catch (e) {
            const result = {
                success: false,
                message: `读取失败: ${e.message}`
            }
            console.log('[Tool: read_map] 出参:', result)
            return result
        }
    }
}
