/**
 * 工具名称：delete_node
 * 描述：删除指定的节点。
 */

export default {
    definition: {
        type: 'function',
        function: {
            name: 'delete_node',
            description: '删除思维导图中的指定节点。Delete a specific node from the mind map.',
            parameters: {
                type: 'object',
                properties: {
                    uid: {
                        type: 'string',
                        description: '要删除节点的 UID。The UID of the node to delete.'
                    }
                },
                required: ['uid']
            }
        }
    },

    handler: async ({ uid }, { mindMap }) => {
        try {
            const node = mindMap.renderer.findNodeByUid(uid)
            if (!node) {
                return {
                    success: false,
                    message: `未找到 UID 为 ${uid} 的节点`
                }
            }

            // 如果是根节点，通常不允许完全删除，或者只能清空内容
            if (node.isRoot) {
                return {
                    success: false,
                    message: '不能删除根节点'
                }
            }

            // 执行删除
            mindMap.execCommand('REMOVE_NODE', [node])

            return {
                success: true,
                message: `成功删除节点: ${uid}`
            }
        } catch (e) {
            return {
                success: false,
                message: `删除失败: ${e.message}`
            }
        }
    }
}
