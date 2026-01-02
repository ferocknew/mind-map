import { mapState } from 'vuex'
import { createUid } from 'simple-mind-map/src/utils'
import MarkdownIt from 'markdown-it'
import { saveSession, createNewSessionId } from '@/utils/ai_chat_storage'
import { throttle } from '@/utils'

let md = null

export const chatMixin = {
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      text: '',
      chatList: [],
      isCreating: false,
      currentSessionId: null,
      themeColor: ''
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      activeSidebar: state => state.activeSidebar
    })
  },
  watch: {
    activeSidebar(val) {
      if (val === 'ai') {
        this.$refs.sidebar.show = true
        // Initialize session if empty
        if (!this.currentSessionId) {
            this.startNewChat()
        }
      } else {
        this.$refs.sidebar.show = false
      }
    },
    chatList: {
        deep: true,
        handler: throttle(function(val) {
            if (val.length > 0 && this.currentSessionId) {
                saveSession(this.currentSessionId, val)
            }
        }, 1000)
    },
    mindMap: {
      handler(val) {
        if (val) {
          this.items = []
          this.updateThemeColor()
          this.mindMap.on('view_theme_change', this.updateThemeColor)
          this.mindMap.on('data_change', this.updateThemeColor)
        }
      },
      immediate: true
    }
  },
  created() {},
  beforeDestroy() {
    if (this.mindMap) {
      this.mindMap.off('view_theme_change', this.updateThemeColor)
      this.mindMap.off('data_change', this.updateThemeColor)
    }
  },
  methods: {
    onKeydown(e) {
      if (e.keyCode === 13) {
        if (!e.shiftKey) {
          e.preventDefault()
          this.send()
        } else {
        }
      }
    },

    send() {
      if (this.isCreating) return
      const text = this.text.trim()
      if (!text) {
        return
      }
      this.text = ''

      // If no session, create one
      if (!this.currentSessionId) {
          this.currentSessionId = createNewSessionId()
      }

      const historyUserMsgList = this.chatList
        .filter(item => {
          return item.type === 'user' && !item.error
        })
        .map(item => {
          return item.content
        })
      const userMsg = {
        id: createUid(),
        type: 'user',
        content: text
      }
      const aiMsg = {
        id: createUid(),
        type: 'ai',
        content: '',
        loading: true
      }
      this.chatList.push(userMsg)
      this.chatList.push(aiMsg)
      this.isCreating = true
      const textList = [...historyUserMsgList, text]
      this.$bus.$emit(
        'ai_chat',
        textList,
        res => {
          if (!md) {
            md = new MarkdownIt()
          }
          aiMsg.loading = false
          aiMsg.content = md.render(res)
          this.$refs.chatResBoxRef.scrollTop = this.$refs.chatResBoxRef.scrollHeight
        },
        () => {
          this.isCreating = false
          aiMsg.loading = false
          // Save session on completion
          if(this.currentSessionId) {
              saveSession(this.currentSessionId, this.chatList)
          }
        },
        (error) => {
          this.isCreating = false
          aiMsg.loading = false
          aiMsg.error = error || this.$t('ai.generationFailed')
          this.$message.error(aiMsg.error)
        }
      )
    },

    resend(userMsg) {
      if (this.isCreating) return

      // Find the index of the user message
      const userIndex = this.chatList.findIndex(item => item.id === userMsg.id)
      if (userIndex === -1) return

      // Get all valid user messages before this one
      const historyUserMsgList = this.chatList
        .slice(0, userIndex)
        .filter(item => item.type === 'user' && !item.error)
        .map(item => item.content)

      // Remove the AI response after this user message if exists
      if (userIndex + 1 < this.chatList.length && this.chatList[userIndex + 1].type === 'ai') {
        this.chatList.splice(userIndex + 1, 1)
      }

      // Add new AI response with loading state
      const aiMsg = {
        id: createUid(),
        type: 'ai',
        content: '',
        loading: true
      }
      this.chatList.splice(userIndex + 1, 0, aiMsg)
      this.isCreating = true
      const textList = [...historyUserMsgList, userMsg.content]
      this.$bus.$emit(
        'ai_chat',
        textList,
        res => {
          if (!md) {
            md = new MarkdownIt()
          }
          aiMsg.loading = false
          aiMsg.content = md.render(res)
          this.$refs.chatResBoxRef.scrollTop = this.$refs.chatResBoxRef.scrollHeight
        },
        () => {
          this.isCreating = false
          aiMsg.loading = false
          if(this.currentSessionId) {
              saveSession(this.currentSessionId, this.chatList)
          }
        },
        (error) => {
          this.isCreating = false
          aiMsg.loading = false
          aiMsg.error = error || this.$t('ai.generationFailed')
          this.$message.error(aiMsg.error)
        }
      )
    },

    regenerate(aiMsg) {
      if (this.isCreating) return

      // Find the user message before this AI message
      const aiIndex = this.chatList.findIndex(item => item.id === aiMsg.id)
      if (aiIndex <= 0) return

      const userMsg = this.chatList[aiIndex - 1]
      if (userMsg.type !== 'user') return

      // Get all valid user messages before this one
      const historyUserMsgList = this.chatList
        .slice(0, aiIndex - 1)
        .filter(item => item.type === 'user' && !item.error)
        .map(item => item.content)

      // Update AI message with loading state
      aiMsg.loading = true
      aiMsg.error = null
      aiMsg.content = ''
      this.isCreating = true
      const textList = [...historyUserMsgList, userMsg.content]
      this.$bus.$emit(
        'ai_chat',
        textList,
        res => {
          if (!md) {
            md = new MarkdownIt()
          }
          aiMsg.loading = false
          aiMsg.content = md.render(res)
          this.$refs.chatResBoxRef.scrollTop = this.$refs.chatResBoxRef.scrollHeight
        },
        () => {
          this.isCreating = false
          aiMsg.loading = false
          if(this.currentSessionId) {
              saveSession(this.currentSessionId, this.chatList)
          }
        },
        (error) => {
          this.isCreating = false
          aiMsg.loading = false
          aiMsg.error = error || this.$t('ai.generationFailed')
          this.$message.error(aiMsg.error)
        }
      )
    },

    stop() {
      this.$bus.$emit('ai_chat_stop')
      this.isCreating = false
    },

    clear() {
      // Deprecated, use startNewChat instead
      this.startNewChat()
    },
    
    startNewChat() {
       this.chatList = []
       this.currentSessionId = createNewSessionId()
       this.text = ''
       this.isCreating = false
    },
    
    showHistory() {
        this.$bus.$emit('show_ai_history')
    },
    
    restoreSession(session) {
        this.currentSessionId = session.id
        this.chatList = session.list || []
         this.$nextTick(() => {
            if(this.$refs.chatResBoxRef){
                this.$refs.chatResBoxRef.scrollTop = this.$refs.chatResBoxRef.scrollHeight
            }
        })
    },

    modifyAiConfig() {
      this.$bus.$emit('showAiConfigDialog')
    },

    updateThemeColor() {
      if (this.mindMap && this.mindMap.renderer && this.mindMap.renderer.root) {
        const color = this.mindMap.renderer.root.getStyle('color')
        this.themeColor = color
      }
    }
  }
}
