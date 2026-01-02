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
import { mapState, mapMutations } from 'vuex'
import AiLocalConfigManager from './ai_local_config_manager.vue'

export default {
  name: 'AiConfigDialog',
  components: {
    AiLocalConfigManager
  },
  model: {
    prop: 'visible',
    event: 'update:visible'
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dialogVisible: false,
      activeTab: 'local',
      accessPassword: '',
      serverVerified: false,
      saving: false,
      localManagerVisible: false,
      aiSystemPrompt: ''
    }
  },
  computed: {
    ...mapState(['aiConfig']),
    ...mapState({
      isDark: state => state.localConfig.isDark
    }),
    isLocalMode() {
      return this.aiConfig.mode === 'local'
    }
  },
  watch: {
    visible(val) {
      this.dialogVisible = val
      if (val) {
        // 初始化状态
        this.activeTab = this.aiConfig.mode
        this.serverVerified = this.aiConfig.serverPasswordVerified
        if (this.serverVerified) {
            this.accessPassword = '*****' // 仅作显示，不暴露真实密码
        } else {
            this.accessPassword = ''
        }
        this.aiSystemPrompt = this.aiConfig.aiSystemPrompt || ''
      }
    },
    dialogVisible(val) {
      if (!val) {
        this.$emit('update:visible', false)
      }
    }
  },
  methods: {
    ...mapMutations(['setAiConfig']),

    switchToTab(tab) {
      this.activeTab = tab
    },

    openLocalManager() {
      this.localManagerVisible = true
    },

    verifyPassword() {
      if (!this.accessPassword) return
      
      const configuredPassword = process.env.VUE_APP_AI_ACCESS_PASSWORD
      
      if (!configuredPassword) {
        this.$message.warning(this.$t('ai.serverPasswordNot configured'))
        return
      }

      if (this.accessPassword === configuredPassword) {
        this.serverVerified = true
        this.$message.success(this.$t('ai.verifySuccess'))
      } else {
        this.serverVerified = false
        this.$message.error(this.$t('ai.verifyFailed'))
      }
    },

    saveAndApply() {
      this.saving = true
      
      // 保存设置
      const newConfig = {
        ...this.aiConfig,
        mode: this.activeTab === 'rules' ? this.aiConfig.mode : this.activeTab,
        aiSystemPrompt: this.aiSystemPrompt
      }
      
      if (this.activeTab === 'server') {
        if (!this.serverVerified) {
          this.$message.warning(this.$t('ai.pleaseVerifyPasswordFirst'))
          this.saving = false
          return
        }
        newConfig.serverPasswordVerified = true
      }

      this.setAiConfig(newConfig)
      
      setTimeout(() => {
        this.saving = false
        this.dialogVisible = false
        this.$message.success(this.$t('ai.configSaveSuccessTip'))
      }, 500)
    },

    close() {
      this.dialogVisible = false
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 20px 24px;
  }
}

.aiConfigBox {
  .subtitle {
    color: #909399;
    font-size: 14px;
    margin-bottom: 20px;
  }
}

.current-mode-card {
  background: #f0f7ff;
  border: 1px solid #cce4ff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .left {
    display: flex;
    align-items: center;

    .icon {
      width: 40px;
      height: 40px;
      background: #e6f1fe;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      color: #409eff;
      font-size: 20px;
    }

    .info {
      .label {
        color: #909399;
        font-size: 12px;
        margin-bottom: 4px;
      }
      .value {
        color: #0052cc;
        font-weight: bold;
        font-size: 16px;
      }
    }
  }
}

.tabs-container {
  display: flex;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 20px;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    cursor: pointer;
    border-radius: 6px;
    font-size: 14px;
    color: #606266;
    transition: all 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    &.active {
      background: #fff;
      color: #303133;
      font-weight: 500;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    i {
      margin-right: 6px;
    }
  }
}

.content-area {
  min-height: 120px;

  .desc {
    color: #606266;
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .local-manager-btn {
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s;
    color: #303133;

    &:hover {
      border-color: #409eff;
      background: #f0f9eb;
    }

    i {
      color: #909399;
    }
  }

  .password-input-container {
    max-width: 400px;
    margin: 0 auto;
  }
  
  .success-tip {
    text-align: center;
    color: #67c23a;
    margin-top: 10px;
    font-size: 13px;
  }
}
</style>

<style lang="less">
.aiConfigDialog {
  &.isDark {
    &.el-dialog {
      background-color: #262a2e;
      
      .el-dialog__header {
        .el-dialog__title {
          color: #fff;
        }
        .el-dialog__headerbtn {
          .el-dialog__close {
            color: hsla(0,0%,100%,.7);
          }
        }
      }
      
      .el-dialog__body {
        .aiConfigBox {
          .subtitle {
            color: hsla(0,0%,100%,.7);
          }
          
          .current-mode-card {
            background: #1d1e1f;
            border-color: #444;
            
            .left {
              .icon {
                background: #363b3f;
                color: #409eff;
              }
              
              .info {
                .label {
                  color: hsla(0,0%,100%,.6);
                }
                .value {
                  color: #409eff;
                }
              }
            }
          }
          
          .tabs-container {
            background: #1d1e1f;
            
            .tab-item {
              color: hsla(0,0%,100%,.7);
              
              &:hover {
                background: rgba(255, 255, 255, 0.1);
              }
              
              &.active {
                background: #363b3f;
                color: #fff;
              }
            }
          }
          
          .content-area {
            .desc {
              color: hsla(0,0%,100%,.7);
            }
            
            .local-manager-btn {
              border-color: #444;
              color: #fff;
              background: transparent;
              
              &:hover {
                border-color: #409eff;
                background: rgba(64, 158, 255, 0.1);
              }
              
              span {
                color: #fff;
              }
              
              i {
                color: hsla(0,0%,100%,.6);
              }
            }
            
            .el-input {
              .el-input__inner {
                background-color: #1d1e1f;
                border-color: #444;
                color: #fff;
                
                &::placeholder {
                  color: hsla(0,0%,100%,.4);
                }
              }
            }
            
            .el-textarea {
              .el-textarea__inner {
                background-color: #1d1e1f;
                border-color: #444;
                color: #fff;
                
                &::placeholder {
                  color: hsla(0,0%,100%,.4);
                }
              }
            }
          }
        }
      }
      
      .el-dialog__footer {
        border-top-color: #444;
        
        .el-button--default {
          background-color: transparent;
          border-color: #444;
          color: hsla(0,0%,100%,.7);
          
          &:hover {
            border-color: #409eff;
            color: #409eff;
          }
        }
      }
    }
  }
}
</style>

