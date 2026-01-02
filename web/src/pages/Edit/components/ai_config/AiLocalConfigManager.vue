<template>
  <el-dialog
    class="aiLocalConfigManager"
    :title="$t('ai.localConfigManager')"
    :visible.sync="visibleComputed"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
  >
    <!-- 顶部提示 -->
    <div class="subtitle">
        {{ $t('ai.manageTip') }}
    </div>

    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div class="tip-bar">
        <i class="el-icon-info"></i>
        <span>{{ $t('ai.passwordModeTip') }}</span>
      </div>
      <div class="actions">
        <!-- 暂时隐去导入导出功能，后续实现
        <el-button size="small" icon="el-icon-upload2">{{ $t('ai.import') }}</el-button>
        <el-button size="small" icon="el-icon-download">{{ $t('ai.export') }}</el-button>
        -->
        <el-button type="primary" size="small" icon="el-icon-plus" @click="createNewConfig">
          {{ $t('ai.newConfig') }}
        </el-button>
      </div>
    </div>

    <!-- 配置列表 -->
    <div class="config-list">
      <el-empty v-if="localConfigs.length === 0" :description="$t('ai.noConfigTip')"></el-empty>
      
      <div
        class="config-item"
        v-for="item in localConfigs"
        :key="item.id"
        :class="{ active: currentConfigId === item.id }"
        @click="selectConfig(item.id)"
      >
        <div class="left-info">
          <div class="name-row">
            <span class="name">{{ item.name }}</span>
            <span class="badge active-badge" v-if="currentConfigId === item.id">
              <i class="el-icon-success"></i> {{ $t('ai.currentUsing') }}
            </span>
          </div>
          <div class="detail-row">
            <span class="provider">
               <i class="el-icon-connection"></i> {{ item.api }}
            </span>
            <span class="model">
               <i class="el-icon-cpu"></i> {{ item.model }}
            </span>
            <span class="type-tag">{{ item.type || 'OpenAI' }}</span>
          </div>
        </div>
        
        <div class="right-actions">
          <!-- 测试按钮 -->
          <el-tooltip :content="$t('ai.testConfig')" placement="top">
             <el-button type="text" icon="el-icon-data-line" @click.stop="testConfig(item)"></el-button>
          </el-tooltip>
          <!-- 编辑按钮 -->
          <el-tooltip :content="$t('ai.edit')" placement="top">
            <el-button type="text" icon="el-icon-edit" @click.stop="editConfig(item)"></el-button>
          </el-tooltip>
          <!-- 复制按钮 -->
          <el-tooltip :content="$t('ai.copy')" placement="top">
            <el-button type="text" icon="el-icon-document-copy" @click.stop="copyConfig(item)"></el-button>
          </el-tooltip>
          <!-- 删除按钮 -->
          <el-tooltip :content="$t('ai.delete')" placement="top">
            <el-button type="text" icon="el-icon-delete" class="delete-btn" @click.stop="deleteConfig(item.id)"></el-button>
          </el-tooltip>
        </div>
      </div>
    </div>
    
    <!-- 编辑/新建弹窗 -->
    <AiConfigItemEditor
      v-if="editorVisible"
      :visible.sync="editorVisible"
      :edit-data="currentEditData"
      @save="handleSaveConfig"
    />
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { createUid } from 'simple-mind-map/src/utils'
import AiConfigItemEditor from './AiConfigItemEditor.vue'

export default {
  name: 'AiLocalConfigManager',
  components: {
    AiConfigItemEditor
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      editorVisible: false,
      currentEditData: null
    }
  },
  computed: {
    ...mapState(['aiConfig']),
    
    visibleComputed: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    
    localConfigs() {
      return this.aiConfig.configs || []
    },
    
    currentConfigId() {
      return this.aiConfig.currentConfigId
    }
  },
  methods: {
    ...mapMutations(['setAiConfig']),
    
    createNewConfig() {
      this.currentEditData = null // null means new config
      this.editorVisible = true
    },
    
    editConfig(item) {
      this.currentEditData = { ...item }
      this.editorVisible = true
    },
    
    copyConfig(item) {
      const newConfig = {
        ...item,
        id: createUid(),
        name: `${item.name} - Copy`
      }
      const newConfigs = [...this.localConfigs, newConfig]
      this.updateConfigs(newConfigs)
    },
    
    deleteConfig(id) {
      this.$confirm(this.$t('ai.deleteConfirm'), this.$t('ai.tip'), {
        confirmButtonText: this.$t('ai.confirm'),
        cancelButtonText: this.$t('ai.cancel'),
        type: 'warning'
      }).then(() => {
        const newConfigs = this.localConfigs.filter(item => item.id !== id)
        this.updateConfigs(newConfigs)
        
        // 如果删除的是当前选中的配置，则清空选中状态或选中第一个
        if (id === this.currentConfigId) {
            let nextId = ''
            if (newConfigs.length > 0) {
                nextId = newConfigs[0].id
            }
             this.setAiConfig({
                ...this.aiConfig,
                currentConfigId: nextId
             })
        }
        this.$message.success(this.$t('ai.deleteSuccess'))
      }).catch(() => {})
    },
    
    selectConfig(id) {
      this.setAiConfig({
        ...this.aiConfig,
        currentConfigId: id
      })
    },
    
    handleSaveConfig(configData) {
      let newConfigs = [...this.localConfigs]
      
      if (this.currentEditData) {
        // Edit existing
        const index = newConfigs.findIndex(c => c.id === configData.id)
        if (index !== -1) {
          newConfigs[index] = configData
        }
      } else {
        // Create new
        const newConfig = {
            ...configData,
            id: createUid()
        }
        newConfigs.push(newConfig)
        
        // 如果是第一个配置，自动选中
        if (newConfigs.length === 1) {
             this.setAiConfig({
                ...this.aiConfig,
                currentConfigId: newConfig.id
             })
        }
      }
      
      this.updateConfigs(newConfigs)
      this.editorVisible = false
    },
    
    updateConfigs(configs) {
      this.setAiConfig({
        ...this.aiConfig,
        configs
      })
    },

    testConfig(item) {
      this.$message.info(this.$t('ai.testingConfig'))
      // 简单的连接测试逻辑，可以根据需要增强
       fetch(item.api, {
          method: 'OPTIONS' // 很多API不支持OPTIONS，这里仅演示
       }).then(() => {
           this.$message.success(this.$t('ai.connectPossible'))
       }).catch(() => {
           // 即使失败也不一定代表不通，因为跨域等原因。
           // 实际应发送一个真实的 chat 请求测试，但这里仅作 UI 示意
           this.$message.warning(this.$t('ai.connectTestDone'))
       })
    }
  }
}
</script>

<style lang="less" scoped>
.aiLocalConfigManager {
  /deep/ .el-dialog__body {
    padding: 10px 20px 20px;
    background: #f8f9fa;
  }
}

.subtitle {
    color: #909399;
    font-size: 13px;
    margin-bottom: 15px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .tip-bar {
    background: #e6f1fe;
    color: #409eff;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    
    i {
      margin-right: 6px;
    }
  }
}

.config-list {
  max-height: 400px;
  overflow-y: auto;
  
  .config-item {
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border-color: #c0c4cc;
    }
    
    &.active {
      border-color: #409eff;
      box-shadow: 0 0 0 1px #409eff inset;
      background: #f0f9eb;
    }

    .left-info {
        flex: 1;
        
        .name-row {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            
            .name {
                font-weight: bold;
                font-size: 16px;
                color: #303133;
                margin-right: 10px;
            }
            
            .badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                
                &.active-badge {
                    background: #303133;
                    color: #fff;
                }
            }
        }
        
        .detail-row {
            display: flex;
            align-items: center;
            font-size: 13px;
            color: #909399;
            
            span {
                margin-right: 20px;
                display: flex;
                align-items: center;
                
                i {
                    margin-right: 4px;
                }
            }
            
            .type-tag {
                background: #f4f4f5;
                color: #909399;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
            }
        }
    }
    
    .right-actions {
        display: flex;
        
        .el-button {
            margin-left: 8px;
            color: #909399;
            font-size: 16px;
            
            &:hover {
                color: #409eff;
            }
            
            &.delete-btn:hover {
                color: #f56c6c;
            }
        }
    }
  }
}
</style>
