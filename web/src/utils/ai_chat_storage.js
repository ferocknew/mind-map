import { createUid } from 'simple-mind-map/src/utils'

const STORAGE_KEY = 'MIND_MAP_AI_CHAT_SESSIONS'

// Get all sessions
export const getSessions = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        const sessions = data ? JSON.parse(data) : []
        // 按 updatedAt 降序排序，最后更新的排在最前面
        return sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    } catch (e) {
        console.error('Failed to parse chat sessions', e)
        return []
    }
}

// Get a specific session
export const getSession = (id) => {
    const sessions = getSessions()
    return sessions.find(s => s.id === id) || null
}

// Save or update a session
export const saveSession = (id, list, title = '') => {
    const sessions = getSessions()
    const now = Date.now()
    const existingIndex = sessions.findIndex(s => s.id === id)

    // Generate title from first user message if not provided
    let sessionTitle = title
    if (!sessionTitle && list.length > 0) {
        const firstUserMsg = list.find(item => item.type === 'user')
        if (firstUserMsg) {
            sessionTitle = firstUserMsg.content.slice(0, 50)
        }
    }
    if (!sessionTitle) {
        sessionTitle = 'New Chat'
    }

    const sessionData = {
        id,
        title: sessionTitle,
        list,
        updatedAt: now
    }

    if (existingIndex > -1) {
        sessions[existingIndex] = { ...sessions[existingIndex], ...sessionData }
    } else {
        sessionData.createdAt = now
        sessions.unshift(sessionData)
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (e) {
        console.error('Failed to save chat sessions', e)
    }
}

// Delete a session
export const deleteSession = (id) => {
    const sessions = getSessions()
    const newSessions = sessions.filter(s => s.id !== id)
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions))
    } catch (e) {
        console.error('Failed to save chat sessions', e)
    }
    return newSessions
}

// Create a new session ID
export const createNewSessionId = () => {
    return createUid()
}

// Clear all sessions
export const clearAllSessions = () => {
    localStorage.removeItem(STORAGE_KEY)
}
