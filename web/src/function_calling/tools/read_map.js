/**
 * 工具名称：read_map
 * 描述：读取当前思维导图的数据。
 */

// 过滤掉不必要的字段，减少 token 消耗
const filterData = (data) => {
    const newData = {
        text: data.data.text,
        uid: data.data.uid
    }

    // 保留重要属性
    if (data.data.note) newData.note = data.data.note
    if (data.data.hyperlink) newData.hyperlink = data.data.hyperlink
    if (data.data.image) newData.image = data.data.image
    if (data.data.imageTitle) newData.imageTitle = data.data.imageTitle
    if (data.data.expand === false) newData.expand = false // 只在收起时保留

    // 递归处理子节点
    if (data.children && data.children.length > 0) {
        newData.children = data.children.map(child => filterData(child))
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
        try {
            const data = mindMap.getData()
            const simpleData = filterData(data)
            return {
                success: true,
                data: simpleData
            }
        } catch (e) {
            return {
                success: false,
                message: `读取失败: ${e.message}`
            }
        }
    }
}
