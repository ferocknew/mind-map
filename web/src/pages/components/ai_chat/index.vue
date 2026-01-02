<template>
  <Sidebar ref="sidebar" :title="$t('ai.chatTitle')" :width="sidebarWidth">
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
            <el-tooltip :content="sidebarWidth > defaultWidth ? $t('ai.restoreWidth') : $t('ai.expandWidth')" placement="bottom">
               <el-button size="mini" circle @click="sidebarWidth > defaultWidth ? restoreWidth() : expandWidth()">
                 <i :class="sidebarWidth > defaultWidth ? 'el-icon-d-arrow-left' : 'el-icon-d-arrow-right'"></i>
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
          :class="[item.type, { loading: item.loading, error: item.error }]"
        >
          <div class="chatItemInner" v-if="item.type === 'user'">
            <div class="avatar">
              <span class="icon el-icon-user"></span>
            </div>
            <div class="content" :style="isDark ? { color: '#fff' } : {}">{{ item.content }}</div>
            <el-button
              class="retryBtn"
              size="mini"
              circle
              icon="el-icon-refresh-right"
              @click="resend(item)"
              :title="$t('ai.resend')"
            ></el-button>
          </div>
          <div class="chatItemInner" v-else-if="item.type === 'ai'">
            <div class="avatar">
              <span class="icon iconfont iconAIshengcheng"></span>
            </div>
            <div class="content" :style="isDark ? { color: '#fff' } : {}">
              <div v-if="item.loading" class="loadingIndicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <div v-else-if="item.error" class="errorIndicator">
                <i class="el-icon-warning"></i>
                <span>{{ item.error }}</span>
              </div>
              <div v-else v-html="item.content"></div>
            </div>
            <el-button
              v-if="!item.loading && item.content"
              class="retryBtn"
              size="mini"
              circle
              icon="el-icon-refresh-right"
              @click="regenerate(item)"
              :title="$t('ai.regenerate')"
            ></el-button>
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
import { chatMixin } from './index.js'
import Sidebar from '../sidebar/index.vue'
import AiChatHistory from '../ai_chat_history.vue'

export default {
  components: {
    Sidebar,
    AiChatHistory
  },
  mixins: [chatMixin]
}
</script>

<style lang="less" scoped>
@import './index.css';
</style>
