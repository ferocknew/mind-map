<template>
  <el-dialog
    class="aiConfigDialog"
    :custom-class="'aiConfigDialog ' + (isDark ? 'isDark' : '')"
    :title="$t('ai.AIConfiguration')"
    :visible.sync="dialogVisible"
    width="680px"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="aiConfigBox">
      <!-- 顶部信息 -->
      <p class="subtitle">{{ $t('ai.AIConfigSubtitle') }}</p>

      <!-- 当前模式卡片 -->
      <div class="current-mode-card">
        <div class="left">
          <div class="icon">
            <i class="el-icon-monitor" v-if="isLocalMode"></i>
            <i class="el-icon-cloudy" v-else></i>
          </div>
          <div class="info">
            <div class="label">{{ $t('ai.currentMode') }}</div>
            <div class="value">
              {{ isLocalMode ? $t('ai.localCustomMode') : $t('ai.serverMode') }}
            </div>
          </div>
        </div>
        <div class="right">
          <el-button
            v-if="isLocalMode"
            size="small"
            plain
            @click="switchToTab('server')"
          >
            {{ $t('ai.serverConfigWithPwd') }}
          </el-button>
        </div>
      </div>

      <!-- 标签页切换 -->
      <div class="tabs-container">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'local' }"
          @click="switchToTab('local')"
        >
          <i class="el-icon-monitor"></i> {{ $t('ai.localConfig') }}
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'server' }"
          @click="switchToTab('server')"
        >
          <i class="el-icon-files"></i> {{ $t('ai.accessPassword') }}
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'rules' }"
          @click="switchToTab('rules')"
        >
          <i class="el-icon-cpu"></i> {{ $t('ai.globalRules') }}
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'search' }"
          @click="switchToTab('search')"
        >
          <i class="el-icon-search"></i> {{ $t('ai.searchConfig') }}
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="content-area">
        <!-- 本地配置内容 -->
        <div v-if="activeTab === 'local'" class="local-content">
          <p class="desc">{{ $t('ai.localConfigDesc') }}</p>

          <div class="local-manager-btn" @click="openLocalManager">
            <span>{{ $t('ai.manageLocalConfig') }}</span>
            <i class="el-icon-setting"></i>
          </div>
        </div>

        <!-- 访问密码内容 -->
        <div v-else-if="activeTab === 'server'" class="server-content">
          <p class="desc">{{ $t('ai.serverConfigDesc') }}</p>
          <div class="password-input-container">
            <el-input
              v-model="accessPassword"
              type="password"
              :placeholder="$t('ai.enterPasswordPlaceholder')"
              show-password
              prefix-icon="el-icon-lock"
              @keyup.enter.native="verifyPassword"
            >
              <el-button slot="append" @click="verifyPassword">{{ $t('ai.verify') }}</el-button>
            </el-input>
          </div>
          <p v-if="serverVerified" class="success-tip">
            <i class="el-icon-success"></i> {{ $t('ai.serverVerifiedTip') }}
          </p>
        </div>

        <!-- 全局规则内容 -->
         <div v-else-if="activeTab === 'rules'" class="rules-content">
             <p class="desc">{{ $t('ai.globalRulesDesc') }}</p>
             <el-input
                 type="textarea"
                 :rows="5"
                 :placeholder="$t('ai.globalRulesPlaceholder')"
                 v-model="aiSystemPrompt"
                 resize="none"
             ></el-input>
         </div>

        <!-- 搜索配置内容 -->
        <div v-else-if="activeTab === 'search'" class="search-content">
            <p class="desc">{{ $t('ai.searchConfigDesc') }}</p>
            <div class="search-form">
                <div class="form-item">
                    <label>{{ $t('ai.searchEngine') }}</label>
                    <el-select v-model="searchEngine" :placeholder="$t('ai.searchEngine')">
                        <el-option value="searxng" :label="$t('ai.searxng')"></el-option>
                        <el-option value="whoogle" :label="$t('ai.whoogle')"></el-option>
                    </el-select>
                </div>
                <div class="form-item">
                    <label>{{ $t('ai.searchUrl') }}</label>
                    <el-input
                        v-model="searchUrl"
                        :placeholder="searchEngine === 'searxng' ? $t('ai.searxngUrlTip') : $t('ai.whoogleUrlTip')"
                    ></el-input>
                </div>
            </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div slot="footer" class="dialog-footer">
      <el-button @click="close">{{ $t('ai.cancel') }}</el-button>
      <el-button type="primary" @click="saveAndApply" :loading="saving">
        <i class="el-icon-document-checked"></i> {{ $t('ai.saveAndApply') }}
      </el-button>
    </div>

    <!-- 本地配置管理弹窗 -->
    <AiLocalConfigManager
      v-if="localManagerVisible"
      :visible.sync="localManagerVisible"
    />
  </el-dialog>
</template>

<script>
import { aiConfigDialogMixin } from './index.js'
import AiLocalConfigManager from '../ai_local_config_manager.vue'

export default {
  name: 'AiConfigDialog',
  components: {
    AiLocalConfigManager
  },
  mixins: [aiConfigDialogMixin]
}
</script>

<style lang="less" scoped>
@import './index.css';
</style>
