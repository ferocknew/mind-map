/**
 * 工具名称：add_node
 * 描述：在当前选中的节点下添加一个子节点。如果没有选中节点，则添加到根节点。
 */

export default {
    // 工具定义 (JSON Schema)
    definition: {
        type: 'function',
        function: {
            name: 'add_node',
            description: '向思维导图添加一个新的子节点。Add a new child node to the mind map.',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: '因为需要添加到节点上的文本内容。The text content of the new node.'
                    },
                    parentUid: {
                        type: 'string',
                        description: '父节点的 UID。如果不提供，默认添加到当前选中节点或根节点。The UID of the parent node.'
                    }
                },
                required: ['text']
            }
        }
    },

    // 执行函数
    handler: async ({ text, parentUid }, { mindMap }) => {
        try {
            // 1. 确定父节点
            let parentNode = null
            if (parentUid) {
                parentNode = mindMap.renderer.findNodeByUid(parentUid)
            } else {
                // 获取当前选中节点
                const activeNodeList = mindMap.renderer.activeNodeList
                if (activeNodeList && activeNodeList.length > 0) {
                    parentNode = activeNodeList[0]
                } else {
                    // 默认为根节点
                    parentNode = mindMap.renderer.root
                }
            }

            if (!parentNode) {
                return {
                    success: false,
                    message: '未找到父节点 (Parent node not found)'
                }
            }

            // 2. 执行添加添加节点的操作
            // 注意：simple-mind-map 通常使用 commands 或直接操作 data
            // 这里我们使用 execCommand 以支持撤销/重做
            mindMap.execCommand('INSERT_NODE', false, [], {
                text: text
            }, parentNode)

            return {
                success: true,
                message: `成功添加节点: "${text}"`,
                nodeId: parentNode.children ? parentNode.children[parentNode.children.length - 1].uid : 'unknown'
            }
        } catch (e) {
            console.error('add_node 执行失败:', e)
            return {
                success: false,
                message: `执行失败: ${e.message}`
            }
        }
    }
}
