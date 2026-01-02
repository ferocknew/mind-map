/**
 * 工具名称：update_node
 * 描述：修改指定节点的文本或其他属性。
 */

export default {
    definition: {
        type: 'function',
        function: {
            name: 'update_node',
            description: '更新节点的文本内容。Update the text content of a node.',
            parameters: {
                type: 'object',
                properties: {
                    uid: {
                        type: 'string',
                        description: '要修改节点的 UID。The UID of the node to update.'
                    },
                    text: {
                        type: 'string',
                        description: '新的文本内容。The new text content.'
                    }
                },
                required: ['uid', 'text']
            }
        }
    },

    handler: async ({ uid, text }, { mindMap }) => {
        console.log('[Tool: update_node] 入参:', { uid, text })

        try {
            const node = mindMap.renderer.findNodeByUid(uid)
            if (!node) {
                const result = {
                    success: false,
                    message: `未找到 UID 为 ${uid} 的节点`
                }
                console.log('[Tool: update_node] 出参:', result)
                return result
            }

            // 执行更新
            // 这里的命令需要查看 simple-mind-map 文档，通常是 SET_NODE_TEXT 或类似
            // 也可以使用通用的 UPDATE_NODE 如果支持
            // 这里假设使用 setText 或者更新 data

            // mindMap.execCommand('SET_NODE_TEXT', node, text)
            // 直接修改数据可能会绕过历史栈，最好用 execCommand

            // 检查命令:
            // simple-mind-map 常用命令: SET_NODE_TEXT
            mindMap.execCommand('SET_NODE_TEXT', node, text)

            const result = {
                success: true,
                message: `成功更新节点 ${uid} 的文本为: "${text}"`
            }
            console.log('[Tool: update_node] 出参:', result)
            return result
        } catch (e) {
            const result = {
                success: false,
                message: `更新失败: ${e.message}`
            }
            console.log('[Tool: update_node] 出参:', result)
            return result
        }
    }
}
