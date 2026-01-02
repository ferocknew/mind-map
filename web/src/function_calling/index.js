import add_node from './tools/add_node'
import read_map from './tools/read_map'
import delete_node from './tools/delete_node'
import update_node from './tools/update_node'
import overwrite_map from './tools/overwrite_map'
import search_server from './tools/search_server'
import fetch_web_to_md from './tools/fetch_web_to_md'

// 注册所有工具
const tools = {
    add_node,
    read_map,
    delete_node,
    update_node,
    overwrite_map,
    search_server,
    fetch_web_to_md
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
