/**
 * AI Adapter Base Class
 */
import { getToolsDefinitions } from '@/function_calling'

class BaseAdapter {
    constructor() {
        this.headers = {}
        this.data = {}
        this.api = ''
        this.originalApi = ''
        this.method = 'POST'
    }

    /**
     * Determine if running in development environment
     */
    isDev() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    }

    /**
     * Initialize function calling tools
     * @returns {Array} List of tool definitions
     */
    getTools() {
        return getToolsDefinitions()
    }

    /**
     * Inject tools into the request payload
     * @param {Object} data Request data
     */
    injectTools(data) {
        // Default implementation: do nothing
        // Subclasses should override this
        return data
    }
}

export default BaseAdapter
