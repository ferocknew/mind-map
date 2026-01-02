import add_node from './tools/add_node'

// 注册所有工具
const tools = {
    add_node
}

/**
 * 获取所有工具的定义列表 (供 LLM 使用)
 */
export const getToolsDefinitions = () => {
    return Object.values(tools).map(tool => tool.definition)
}

/**
 * 根据名称获取工具处理器
 * @param {string} name 工具名称
 */
export const getToolHandler = (name) => {
    const tool = tools[name]
    return tool ? tool.handler : null
}

export default tools
