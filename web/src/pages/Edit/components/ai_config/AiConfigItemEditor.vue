<template>
  <el-dialog
    class="aiConfigItemEditor"
    :title="isEdit ? $t('ai.editConfig') : $t('ai.newConfig')"
    :visible.sync="visibleComputed"
    width="500px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form
      ref="form"
      :model="form"
      :rules="rules"
      label-width="110px"
      class="config-form"
    >
      <el-form-item :label="$t('ai.configName')" prop="name">
        <el-input v-model="form.name" :placeholder="$t('ai.configNamePlaceholder')"></el-input>
      </el-form-item>

      <el-form-item :label="$t('ai.requestType')" prop="type">
        <el-select v-model="form.type" placeholder="请选择" style="width: 100%">
          <el-option label="OpenAI (或兼容)" value="OpenAI"></el-option>
          <el-option label="Anthropic" value="Anthropic"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item :label="$t('ai.apiAddress')" prop="api">
        <el-input v-model="form.api" :placeholder="$t('ai.apiAddressPlaceholder')"></el-input>
        <div class="tip">{{ $t('ai.apiTip') }}</div>
      </el-form-item>

      <el-form-item :label="$t('ai.apiKey')" prop="key">
        <el-input v-model="form.key" type="password" show-password :placeholder="$t('ai.apiKeyPlaceholder')"></el-input>
      </el-form-item>

      <el-form-item :label="$t('ai.modelName')" prop="model">
        <el-input v-model="form.model" :placeholder="$t('ai.modelNamePlaceholder')"></el-input>
      </el-form-item>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button @click="visibleComputed = false">{{ $t('ai.cancel') }}</el-button>
      <el-button type="primary" @click="save">{{ $t('ai.save') }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'AiConfigItemEditor',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    editData: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      form: {
        id: '',
        name: '',
        type: 'OpenAI',
        api: '',
        key: '',
        model: ''
      },
      rules: {
        name: [{ required: true, message: this.$t('ai.required'), trigger: 'blur' }],
        type: [{ required: true, message: this.$t('ai.required'), trigger: 'change' }],
        api: [{ required: true, message: this.$t('ai.required'), trigger: 'blur' }],
        key: [{ required: true, message: this.$t('ai.required'), trigger: 'blur' }],
        model: [{ required: true, message: this.$t('ai.required'), trigger: 'blur' }]
      }
    }
  },
  computed: {
    visibleComputed: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    isEdit() {
      return !!this.editData
    }
  },
  watch: {
    visible: {
      handler(val) {
        if (val) {
          if (this.editData) {
            this.form = { ...this.editData }
          } else {
            this.resetForm()
          }
          this.$nextTick(() => {
            this.$refs.form && this.$refs.form.clearValidate()
          })
        }
      },
      immediate: true
    }
  },
  created() {
    // 组件创建时，如果有编辑数据则填充表单
    if (this.editData) {
      this.form = { ...this.editData }
    }
  },
  methods: {
    resetForm() {
      this.form = {
        id: '',
        name: '',
        type: 'OpenAI',
        api: '',
        key: '',
        model: ''
      }
    },
    save() {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.$emit('save', { ...this.form })
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigItemEditor {
  /deep/ .el-dialog__body {
    padding: 20px;
  }
}

.tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.4;
}
</style>
