import { mapState, mapMutations } from 'vuex'
import { DEFAULT_AI_RULES } from '@/utils/config'

export const aiConfigDialogMixin = {
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
      aiSystemPrompt: '',
      searchEngine: 'searxng',
      searchUrl: ''
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
        // 如果 aiSystemPrompt 为空，则使用默认规则
        this.aiSystemPrompt = this.aiConfig.aiSystemPrompt || DEFAULT_AI_RULES
        // 初始化搜索配置
        this.searchEngine = this.aiConfig.searchEngine || 'searxng'
        this.searchUrl = this.aiConfig.searchUrl || ''
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
        mode: this.activeTab === 'rules' || this.activeTab === 'search' ? this.aiConfig.mode : this.activeTab,
        aiSystemPrompt: this.aiSystemPrompt,
        searchEngine: this.searchEngine,
        searchUrl: this.searchUrl
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
