<template>
  <el-dialog
    class="nodeExportDialog"
    :class="{ isMobile: isMobile, isDark: isDark }"
    :title="$t('export.title')"
    :visible.sync="dialogVisible"
    v-loading.fullscreen.lock="loading"
    :element-loading-text="loadingText"
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(0, 0, 0, 0.8)"
    :width="isMobile ? '90%' : '800px'"
    :top="isMobile ? '20px' : '15vh'"
  >
    <div class="exportContainer" :class="{ isDark: isDark }">
      <!-- 导出类型选择 -->
      <div class="downloadTypeSelectBox">
        <!-- 类型列表 -->
        <div class="downloadTypeList customScrollbar">
          <div
            class="downloadTypeItem"
            v-for="item in downTypeList"
            :key="item.type"
            :class="{
              active: exportType === item.type
            }"
            @click="exportType = item.type"
          >
            <div class="typeIcon" :class="[item.type]"></div>
            <div class="name">{{ item.name }}</div>
            <div class="icon checked el-icon-check"></div>
          </div>
        </div>
        <!-- 类型内容 -->
        <div class="downloadTypeContent">
          <!-- 文件名称输入 -->
          <div class="nameInputBox">
            <div class="nameInput">
              <span class="name">{{ $t('export.filename') }}</span>
              <el-input
                style="max-width: 250px"
                v-model="fileName"
                size="mini"
                @keydown.native.stop
              ></el-input>
            </div>
            <span class="closeBtn el-icon-close" @click="cancel"></span>
          </div>
          <!-- 配置 -->
          <div class="contentBox customScrollbar">
            <div class="contentRow">
              <div class="contentName">{{ $t('export.format') }}</div>
              <div class="contentValue info">
                {{ currentTypeData ? '.' + currentTypeData.type : '' }}
              </div>
            </div>
            <div class="contentRow">
              <div class="contentName">{{ $t('export.desc') }}</div>
              <div class="contentValue info">
                {{ currentTypeData ? currentTypeData.desc : '' }}
              </div>
            </div>
            <div class="contentRow">
              <div class="contentName">{{ $t('export.options') }}</div>
              <div class="contentValue info" v-if="noOptions">无</div>
              <div class="contentValue" v-else>
                <div
                  class="valueItem"
                  v-show="['smm', 'json'].includes(exportType)"
                >
                  <el-checkbox v-model="widthConfig">{{
                    $t('export.include')
                  }}</el-checkbox>
                </div>
                <div
                  class="valueItem"
                  v-show="['svg', 'png', 'pdf'].includes(exportType)"
                >
                  <div class="valueSubItem" v-if="['png'].includes(exportType)">
                    <span class="name">{{ $t('export.format') }}</span>
                    <el-radio-group v-model="imageFormat">
                      <el-radio label="png">PNG</el-radio>
                    </el-radio-group>
                  </div>
                  <div class="valueSubItem">
                    <span class="name">{{ $t('export.paddingX') }}</span>
                    <el-input
                      style="width: 200px"
                      v-model="paddingX"
                      size="mini"
                      @change="onPaddingChange"
                      @keydown.native.stop
                    ></el-input>
                  </div>
                  <div class="valueSubItem">
                    <span class="name">{{ $t('export.paddingY') }}</span>
                    <el-input
                      style="width: 200px"
                      v-model="paddingY"
                      size="mini"
                      @change="onPaddingChange"
                      @keydown.native.stop
                    ></el-input>
                  </div>
                  <div class="valueSubItem">
                    <span class="name">{{
                      this.$t('export.addFooterText')
                    }}</span>
                    <el-input
                      style="width: 200px"
                      v-model="extraText"
                      size="mini"
                      :placeholder="$t('export.addFooterTextPlaceholder')"
                      @keydown.native.stop
                    ></el-input>
                  </div>
                  <div class="valueSubItem">
                    <el-checkbox
                      v-show="['png', 'pdf'].includes(exportType)"
                      v-model="isTransparent"
                      >{{ $t('export.isTransparent') }}</el-checkbox
                    >
                  </div>
                  <div class="valueSubItem">
                    <el-checkbox v-show="showFitBgOption" v-model="isFitBg">{{
                      $t('export.isFitBg')
                    }}</el-checkbox>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 按钮 -->
          <div class="btnList">
            <el-button @click="cancel" size="small">{{
              $t('dialog.cancel')
            }}</el-button>
            <el-button type="primary" @click="confirm" size="small">{{
              $t('export.confirm')
            }}</el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { exportMixin } from './index.js'

export default {
  mixins: [exportMixin]
}
</script>

<style lang="less" scoped>
@import './index.css';
</style>
