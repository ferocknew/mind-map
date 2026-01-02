/**
 * 工具名称：add_node
 * 描述：在当前选中的节点下添加一个子节点。如果没有选中节点，则添加到根节点。
 */

import { createUid } from 'simple-mind-map/src/utils'

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
        console.log('[Tool: add_node] 入参:', { text, parentUid })

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
                const result = {
                    success: false,
                    message: '未找到父节点 (Parent node not found)'
                }
                console.log('[Tool: add_node] 出参:', result)
                return result
            }

            // 2. 记录添加前的子节点数量
            const beforeChildCount = parentNode.children ? parentNode.children.length : 0
            console.log('[Tool: add_node] 添加前子节点数:', beforeChildCount)

            // 3. 执行添加节点的操作 - 使用 INSERT_CHILD_NODE
            // 参考官方文档：INSERT_CHILD_NODE 在指定节点下插入子节点
            const newUid = createUid()
            mindMap.execCommand('INSERT_CHILD_NODE', false, [parentNode], {
                uid: newUid,
                text: text,
                richText: true
            })

            // 4. 等待渲染完成
            await new Promise(resolve => setTimeout(resolve, 200))

            // 5. 验证节点是否真的被添加
            // 需要重新获取父节点引用，因为可能已经重新渲染
            const updatedParentNode = mindMap.renderer.findNodeByUid(parentNode.uid)
            const afterChildCount = updatedParentNode.children ? updatedParentNode.children.length : 0
            console.log('[Tool: add_node] 添加后子节点数:', afterChildCount)

            // 查找新添加的节点
            let addedNode = null
            if (afterChildCount > beforeChildCount) {
                // 如果子节点增加了，找到新添加的节点
                addedNode = updatedParentNode.children[afterChildCount - 1]
                console.log('[Tool: add_node] 找到新节点:', { uid: addedNode.uid, text: addedNode.getData('text') })
            } else {
                // 如果数量没增加，尝试通过 UID 查找
                addedNode = mindMap.renderer.findNodeByUid(newUid)
                if (addedNode) {
                    console.log('[Tool: add_node] 通过 UID 找到新节点:', { uid: addedNode.uid, text: addedNode.getData('text') })
                }
            }

            const result = {
                success: true,
                message: `成功添加节点: "${text}"`,
                nodeId: addedNode ? addedNode.uid : newUid,
                nodeText: text,
                parentUid: parentNode.uid
            }
            console.log('[Tool: add_node] 出参:', result)
            return result
        } catch (e) {
            const result = {
                success: false,
                message: `执行失败: ${e.message}`
            }
            console.log('[Tool: add_node] 出参:', result)
            console.error('[Tool: add_node] 错误详情:', e)
            return result
        }
    }
}
