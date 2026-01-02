import { mapState, mapMutations } from 'vuex'
import { downTypeList } from '@/config'
import { isMobile } from 'simple-mind-map/src/utils/index'
import MarkdownIt from 'markdown-it'

// 导出
let md = null

export const exportMixin = {
  data() {
    return {
      dialogVisible: false,
      exportType: 'smm',
      fileName: this.$t('export.defaultFileName'),
      widthConfig: true,
      isTransparent: false,
      loading: false,
      loadingText: '',
      paddingX: 10,
      paddingY: 10,
      extraText: '',
      isMobile: isMobile(),
      isFitBg: true,
      imageFormat: 'png'
    }
  },
  computed: {
    ...mapState({
      openNodeRichText: state => state.localConfig.openNodeRichText,
      isDark: state => state.localConfig.isDark,
    }),

    downTypeList() {
      const list = downTypeList[this.$i18n.locale] || downTypeList.zh
      return list.filter(item => {
        if (item.type === 'mm') {
          return false
        }
        if (item.type === 'xlsx') {
          return false
        } else {
          return true
        }
      })
    },

    currentTypeData() {
      const cur = this.downTypeList.find(item => {
        return item.type === this.exportType
      })
      return cur
    },

    showFitBgOption() {
      return ['png', 'pdf'].includes(this.exportType) && !this.isTransparent
    },

    noOptions() {
      return ['md', 'xmind', 'txt', 'xlsx', 'mm'].includes(this.exportType)
    }
  },
  created() {
    this.$bus.$on('showExport', this.handleShowExport)
  },
  beforeDestroy() {
    this.$bus.$off('showExport', this.handleShowExport)
  },
  methods: {
    ...mapMutations(['setExtraTextOnExport']),

    handleShowExport() {
      this.dialogVisible = true
    },

    onPaddingChange() {
      this.$bus.$emit('paddingChange', {
        exportPaddingX: Number(this.paddingX),
        exportPaddingY: Number(this.paddingY)
      })
    },

    cancel() {
      this.dialogVisible = false
    },

    confirm() {
      this.setExtraTextOnExport(this.extraText)
      if (this.exportType === 'svg') {
        this.$bus.$emit(
          'export',
          this.exportType,
          true,
          this.fileName,
          `* {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }`
        )
      } else if (['smm', 'json'].includes(this.exportType)) {
        this.$bus.$emit(
          'export',
          this.exportType,
          true,
          this.fileName,
          this.widthConfig
        )
      } else if (this.exportType === 'png') {
        this.$bus.$emit(
          'export',
          this.imageFormat,
          true,
          this.fileName,
          this.isTransparent,
          null,
          this.isFitBg
        )
      } else if (this.exportType === 'pdf') {
        this.$bus.$emit(
          'export',
          this.exportType,
          true,
          this.fileName,
          this.isTransparent,
          this.isFitBg
        )
      } else {
        this.$bus.$emit('export', this.exportType, true, this.fileName)
      }
      this.$notify.info({
        title: this.$t('export.notifyTitle'),
        message: this.$t('export.notifyMessage')
      })
      this.cancel()
    }
  }
}
