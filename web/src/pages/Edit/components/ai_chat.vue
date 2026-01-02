<template>
  <Sidebar ref="sidebar" :title="$t('ai.chatTitle')">
    <div class="aiChatBox" :class="{ isDark: isDark }">
      <div class="chatHeader">
        <div class="left-btn-group">
           <el-tooltip :content="$t('ai.newChat')" placement="bottom">
             <el-button size="mini" circle @click="startNewChat">
               <i class="el-icon-plus"></i>
             </el-button>
           </el-tooltip>
        </div>
        
        <div class="right-btn-group">
            <el-tooltip :content="$t('ai.historyRecords')" placement="bottom">
              <el-button size="mini" circle @click="showHistory">
                <i class="el-icon-time"></i>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('ai.modifyAIConfiguration')" placement="bottom">
               <el-button size="mini" circle @click="modifyAiConfig">
                 <i class="el-icon-setting"></i>
               </el-button>
            </el-tooltip>
        </div>
      </div>
      <div class="chatResBox customScrollbar" ref="chatResBoxRef">
        <div
          class="chatItem"
          v-for="item in chatList"
          :key="item.id"
          :class="[item.type]"
        >
          <div class="chatItemInner" v-if="item.type === 'user'">
            <div class="avatar">
              <span class="icon el-icon-user"></span>
            </div>
            <div class="content" :style="{ color: themeColor }">{{ item.content }}</div>
          </div>
          <div class="chatItemInner" v-else-if="item.type === 'ai'">
            <div class="avatar">
              <span class="icon iconfont iconAIshengcheng"></span>
            </div>
            <div class="content" v-html="item.content" :style="{ color: themeColor }"></div>
          </div>
        </div>
      </div>
      <div class="chatInputBox">
        <textarea
          v-model="text"
          class="customScrollbar"
          :placeholder="$t('ai.chatInputPlaceholder')"
          @keydown="onKeydown"
        ></textarea>
        <el-button class="btn" size="mini" @click="send" :loading="isCreating">
          {{ $t('ai.send') }}
          <span class="el-icon-position"></span>
        </el-button>
        <el-button
          class="stop"
          size="mini"
          type="warning"
          @click="stop"
          v-show="isCreating"
        >
          {{ $t('ai.stopGenerating') }}
        </el-button>
      </div>
    </div>
    
    <AiChatHistory @restore="restoreSession"></AiChatHistory>
  </Sidebar>
</template>

<script>
import Sidebar from './Sidebar.vue'
import { mapState } from 'vuex'
import { createUid } from 'simple-mind-map/src/utils'
import MarkdownIt from 'markdown-it'
import { saveSession, createNewSessionId } from '@/utils/ai_chat_storage'
import AiChatHistory from './ai_chat_history.vue'
import { throttle } from '@/utils'

let md = null

export default {
  components: {
    Sidebar,
    AiChatHistory
  },
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
          return item.type === 'user'
        })
        .map(item => {
          return item.content
        })
      this.chatList.push({
        id: createUid(),
        type: 'user',
        content: text
      })
      this.chatList.push({
        id: createUid(),
        type: 'ai',
        content: ''
      })
      this.isCreating = true
      const textList = [...historyUserMsgList, text]
      this.$bus.$emit(
        'ai_chat',
        textList,
        res => {
          if (!md) {
            md = new MarkdownIt()
          }
          this.chatList[this.chatList.length - 1].content = md.render(res)
          this.$refs.chatResBoxRef.scrollTop = this.$refs.chatResBoxRef.scrollHeight
        },
        () => {
          this.isCreating = false
          // Save session on completion
          if(this.currentSessionId) {
              saveSession(this.currentSessionId, this.chatList)
          }
        },
        () => {
          this.isCreating = false
          this.$message.error(this.$t('ai.generationFailed'))
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
</script>

<style lang="less" scoped>
.aiChatBox {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &.isDark {
    .chatHeader {
      border-bottom-color: hsla(0, 0%, 100%, 0.1);
    }

    .chatResBox {
      .chatItem {
        .chatItemInner {
          .avatar {
            background-color: #262a2e;
          }

          /deep/ .content {
            color: #fff;
          }
        }
      }
    }

    .chatInputBox {
      border-top-color: hsla(0, 0%, 100%, 0.1);

      textarea {
        background-color: #262a2e;
        color: #fff;
      }
    }
  }

  .chatHeader {
    height: 50px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    
    .left-btn-group, .right-btn-group {
        display: flex;
        align-items: center;
        
        /deep/ .el-button {
             margin-left: 10px;
             &:first-child {
                 margin-left: 0;
             }
         }
    }
  }

  .chatResBox {
    width: 100%;
    height: 100%;
    padding: 0 12px;
    margin: 12px 0;
    overflow-y: auto;
    overflow-x: hidden;

    .chatItem {
      margin-bottom: 20px;
      border: 1px solid;
      position: relative;
      border-radius: 10px;

      &:last-of-type {
        margin-bottom: 0;
      }

      &.ai {
        border-color: #409eff;

        .chatItemInner {
          .avatar {
            border-color: #409eff;
            left: -12px;
            top: -12px;

            .icon {
              color: #409eff;
            }
          }
        }
      }

      &.user {
        border-color: #f56c6c;

        .chatItemInner {
          .avatar {
            border-color: #f56c6c;
            right: -12px;
            top: -12px;

            .icon {
              color: #f56c6c;
            }
          }
        }
      }

      .chatItemInner {
        width: 100%;
        padding: 12px;

        .avatar {
          width: 30px;
          height: 30px;
          border: 1px solid;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: absolute;
          background-color: #fff;

          .icon {
            font-size: 18px;
            font-weight: bold;
          }
        }

          /deep/ .content {
            width: 100%;
            overflow: hidden;
            font-size: 14px;
            line-height: 1.5;
            color: #3f4a54;

            p {
              margin-bottom: 12px;

              &:last-of-type {
                margin-bottom: 0;
              }
            }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-top: 24px;
            margin-bottom: 16px;
          }

          code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            white-space: break-spaces;
            background-color: rgba(175, 184, 193, 0.2);
            border-radius: 6px;
            font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas,
              Liberation Mono, monospace;
          }

          pre {
            padding: 12px;
            background-color: rgba(175, 184, 193, 0.2);

            code {
              background-color: transparent;
              padding: 0;
              overflow: hidden;
            }
          }
        }
      }
    }
  }

  .chatInputBox {
    flex-shrink: 0;
    width: 100%;
    height: 150px;
    border-top: 1px solid #e8e8e8;
    position: relative;

    textarea {
      width: 100%;
      height: 100%;
      outline: none;
      padding: 12px;
      border: none;
    }

    .btn {
      position: absolute;
      right: 12px;
      bottom: 12px;
    }

    .stop {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: -30px;
    }
  }
}
</style>
