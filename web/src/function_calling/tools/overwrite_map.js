/**
 * 工具名称：overwrite_map
 * 描述：使用新的 JSON 数据完全覆盖当前思维导图。
 */

export default {
    definition: {
        type: 'function',
        function: {
            name: 'overwrite_map',
            description: '使用新的 JSON 数据重置整个思维导图。慎用，这会清除当前所有内容。Overwrite the entire mind map with new JSON data.',
            parameters: {
                type: 'object',
                properties: {
                    data: {
                        type: 'object',
                        description: '完整的思维导图数据结构（包含 root 节点）。The complete mind map data.'
                    }
                },
                required: ['data']
            }
        }
    },

    handler: async ({ data }, { mindMap }) => {
        console.log('[Tool: overwrite_map] 入参 (data 已精简):', { hasData: !!data })

        try {
            // 简单校验数据结构
            if (!data || (!data.root && !data.data)) {
                const result = {
                    success: false,
                    message: '数据格式无效，必须包含 root 节点信息'
                }
                console.log('[Tool: overwrite_map] 出参:', result)
                return result
            }

            // 如果数据是精简格式（只有 children/text），可能需要适配一下
            // 假设传入的是标准格式或 read_map 返回的格式

            // 还原为 simple-mind-map 可接受的格式
            // 如果传入的是 { text: "Root", children: [...] } 这种直接作为 root 数据
            let rootData = data

            // 设置数据
            mindMap.setData(rootData)
            mindMap.view.reset() // 重置视图位置

            const result = {
                success: true,
                message: '思维导图已重置'
            }
            console.log('[Tool: overwrite_map] 出参:', result)
            return result
        } catch (e) {
            const result = {
                success: false,
                message: `覆盖失败: ${e.message}`
            }
            console.log('[Tool: overwrite_map] 出参:', result)
            return result
        }
    }
}
