<template>
  <el-dialog
    v-if="dialogVisible"
    class="aiChatHistoryDialog"
    :title="$t('ai.historyRecords')"
    :visible.sync="dialogVisible"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    :custom-class="'aiChatHistoryDialog ' + (isDark ? 'isDark' : '')"
  >
    <div class="header" slot="title">
        <div class="left">
             <i class="el-icon-time" style="margin-right: 8px; font-size: 18px;"></i>
            <span class="title">{{ $t('ai.historyRecords') }}</span>
             <span class="sub-title">{{ $t('ai.historyDesc') }}</span>
        </div>
         <el-button type="text" class="clear-btn" icon="el-icon-delete" @click="clearAll">
             {{ $t('ai.clearAll') }}
         </el-button>
    </div>
    
    <div class="tips">
        <i class="el-icon-connection"></i>
        {{ $t('ai.localHistoryTip') }}
    </div>

    <div class="historyList customScrollbar" v-loading="loading">
      <div v-if="historyList.length === 0" class="empty">
        {{ $t('ai.noHistory') }}
      </div>
      <div
        v-else
        class="historyItem"
        v-for="item in historyList"
        :key="item.id"
      >
        <div class="info">
            <div class="top-row">
                 <div class="tag">{{ $t('ai.chat') }}</div>
                 <div class="time">{{ formatDate(item.updatedAt) }}</div>
            </div>
            <div class="content-row">
                <i class="el-icon-document"></i>
                <div class="text">{{ item.title || $t('ai.defaultTitle') }}</div>
            </div>
           <div class="bottom-row">
               <i class="el-icon-box"></i>
               <span class="model">Unknown</span>
           </div>
        </div>
        <div class="actions">
          <el-button size="small" type="primary" plain @click="restore(item)">
             <i class="el-icon-refresh-left"></i>
             {{ $t('ai.restore') }}
          </el-button>
          <el-button size="small" type="text" class="del-btn" @click="del(item)">
              <i class="el-icon-delete"></i>
              {{ $t('ai.delete') }}
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { getSessions, deleteSession, clearAllSessions } from '@/utils/ai_chat_storage'
import { formatDate } from 'simple-mind-map/src/utils'
import { mapState } from 'vuex'

export default {
  data() {
    return {
      dialogVisible: false,
      historyList: [],
      loading: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark
    })
  },
  created() {
      this.$bus.$on('show_ai_history', this.show)
  },
  beforeDestroy() {
       this.$bus.$off('show_ai_history', this.show)
  },
  methods: {
    show() {
      this.dialogVisible = true
      this.loadList()
    },
    loadList() {
      this.historyList = getSessions()
    },
    formatDate(timestamp) {
       if(!timestamp) return ''
       const date = new Date(timestamp)
       return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    },
    restore(item) {
      this.$emit('restore', item)
      this.dialogVisible = false
    },
    del(item) {
        this.$confirm(this.$t('ai.confirmDeleteHistory'), this.$t('ai.prompt'), {
            confirmButtonText: this.$t('ai.confirm'),
            cancelButtonText: this.$t('ai.cancel'),
            type: 'warning'
        }).then(() => {
            this.historyList = deleteSession(item.id)
        }).catch(() => {})
    },
    clearAll() {
         this.$confirm(this.$t('ai.confirmClearAllHistory'), this.$t('ai.prompt'), {
            confirmButtonText: this.$t('ai.confirm'),
            cancelButtonText: this.$t('ai.cancel'),
            type: 'warning'
        }).then(() => {
            clearAllSessions()
             this.loadList()
        }).catch(() => {})
    }
  }
}
</script>

<style lang="less" scoped>
.aiChatHistoryDialog {
  /deep/ .el-dialog__header {
      padding: 0;
      margin: 0;
      border-bottom: none;
      .el-dialog__headerbtn {
          top: 20px;
      }
      .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          
          .left {
              display: flex;
              align-items: center;
              .title {
                  font-size: 18px;
                  color: #303133;
                  font-weight: bold;
              }
              .sub-title {
                  font-size: 12px;
                  color: #909399;
                  margin-left: 10px;
                  font-weight: normal;
              }
          }
          
          .clear-btn {
              color: #F56C6C;
              margin-right: 20px;
              padding-left: 12px;
              padding-right: 12px;
              &:hover {
                  opacity: 0.8;
              }
          }
      }
  }
  
    /deep/ .el-dialog__body {
        padding: 10px 20px 20px;
    }

  .tips {
      background-color: #ecf5ff;
      border: 1px solid #d9ecff;
      color: #409eff;
      padding: 8px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
      margin-top: 0;
      font-size: 12px;
      display: flex;
      align-items: center;
      i {
          margin-right: 5px;
          font-size: 14px;
      }
  }

  .historyList {
    height: 400px;
    overflow-y: auto;
    
    .empty {
        text-align: center;
        color: #909399;
        margin-top: 50px;
    }

    .historyItem {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #EBEEF5;
      border-radius: 8px;
      margin-bottom: 15px;
      
      &:hover {
           box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
      }

      .info {
        flex: 1;
        margin-right: 20px;
        
        .top-row {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            .tag {
                background-color: #ecf5ff;
                color: #409eff;
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 4px;
                margin-right: 10px;
            }
            .time {
                color: #909399;
                font-size: 12px;
            }
        }
        
        .content-row {
             display: flex;
             align-items: flex-start;
             margin-bottom: 8px;
             i {
                 color: #909399;
                 margin-right: 5px;
                 margin-top: 3px;
             }
             .text {
                 color: #303133;
                 font-size: 14px;
                 line-height: 1.5;
             }
        }
        
        .bottom-row {
            display: flex;
            align-items: center;
             i {
                 color: #909399;
                 margin-right: 5px;
                 font-size: 12px;
             }
             .model {
                  color: #909399;
                  font-size: 12px;
             }
        }
      }
      
      .actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          
          .el-button + .el-button {
              margin-left: 0;
              margin-top: 10px;
          }
          
          .del-btn {
               color: #909399;
               padding-left: 12px;
               padding-right: 12px;
               &:hover {
                   color: #F56C6C;
               }
          }
      }
    }
  }
}
</style>

<style lang="less">
.aiChatHistoryDialog {
   &.isDark {
       &.el-dialog {
           background-color: #262a2e;
           
           .el-dialog__header {
               .header {
                   .left {
                       i {
                           color: hsla(0,0%,100%,.7);
                       }
                       .title {
                           color: #fff;
                       }
                       .sub-title {
                           color: hsla(0,0%,100%,.7);
                       }
                   }
               }
               .el-dialog__headerbtn {
                   .el-dialog__close {
                       color: hsla(0,0%,100%,.7);
                   }
               }
           }
           
           .el-dialog__body {
               .tips {
                   background-color: #1d1e1f;
                   border-color: #363b3f;
                   color: #409eff;
               }
               
               .historyList {
                   .empty {
                       color: hsla(0,0%,100%,.5);
                   }
                   
                   .historyItem {
                       border-color: #444;
                       background-color: transparent;
                       
                       &:hover {
                           box-shadow: 0 2px 12px 0 rgba(255,255,255,.1);
                       }
                       
                       .info {
                           .top-row {
                               .tag {
                                   background-color: #363b3f;
                                   color: #409eff;
                               }
                               .time {
                                   color: hsla(0,0%,100%,.6);
                               }
                           }
                           
                           .content-row {
                               i {
                                   color: hsla(0,0%,100%,.6);
                               }
                               .text {
                                   color: #fff;
                               }
                           }
                           
                           .bottom-row {
                               i {
                                   color: hsla(0,0%,100%,.5);
                               }
                               .model {
                                   color: hsla(0,0%,100%,.5);
                               }
                           }
                       }
                       
                       .actions {
                           .del-btn {
                               color: hsla(0,0%,100%,.5);
                               &:hover {
                                   color: #F56C6C;
                               }
                           }
                       }
                   }
               }
           }
       }
   }
}
</style>
