import { getIndexTtsHtml, bindIndexTtsEvents } from "./indextts.js";
import { getMinimaxHtml, bindMinimaxEvents } from "./minimax.js";
import { getDoubaoHtml, bindDoubaoEvents } from "./doubao.js";
import { getGptSovitsHtml, bindGptSovitsEvents } from "./gpt-sovits.js";
import { getSirenSettings, saveSirenSettings } from "./settings.js";
import { compileSirenCss, syncTtsWorldbookEntries } from "./utils.js";
import {
  getTtsHistory,
  deleteTtsRecord,
  toggleFavoriteTtsRecord,
} from "./db.js";
import { enqueueTTSBlob } from "./tts_logic.js";

let tempTtsStyles = {};
let currentTtsStyleName = "默认气泡";

export function initTtsSettings() {
  const ttsTab = document.getElementById("tab-tts");
  if (!ttsTab) return;

  // 保持你原有的 HTML 模板不变
  const ttsHtml = `
        <div class="siren-ext-settings-container">
            <h3 style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-microphone-lines fa-fw" style="color:#a855f7; margin-right:8px;"></i>塞壬之声 (TTS)</span>
                <div>
                    <i id="siren-tts-history-btn" class="fa-solid fa-clock-rotate-left" style="cursor: pointer; color: #a855f7; font-size: 1.2em; margin-right: 15px;" title="查看语音历史"></i>
                    <i id="siren-tts-save-global-btn" class="fa-solid fa-floppy-disk" style="cursor: pointer; color: #10b981; font-size: 1.2em;" title="保存全局TTS设置"></i>
                </div>
            </h3>

            <div class="siren-ext-setting-row siren-ext-flex-between" style="border-color: #06b6d4; background: rgba(6, 182, 212, 0.1);">
                <div class="siren-ext-setting-label">
                    <label for="siren-tts-enable" style="color: #06b6d4; font-size: 1.1em; font-weight: bold;">启用 TTS</label>
                </div>
                <label class="siren-ext-switch">
                    <input type="checkbox" id="siren-tts-enable">
                    <span class="siren-ext-slider"></span>
                </label>
            </div>

            <div id="siren-tts-main-wrapper" style="display: none; margin-top: 15px;">
                
                <h4 style="color: #94a3b8; margin-bottom: 10px;"><i class="fa-solid fa-sliders" style="margin-right: 5px;"></i> 通用设置</h4>
                
                <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid #334155; border-radius: 6px; padding: 10px 15px; margin-bottom: 15px;">
                    <div class="siren-ext-setting-row siren-ext-flex-between" style="border-bottom: 1px solid rgba(51, 65, 85, 0.5); padding-bottom: 10px; margin-bottom: 10px;">
                        <div class="siren-ext-setting-label">
                            <label>保存最新语音</label>
                            <small style="display:block;">限制本地存储的语音数量条数</small>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <style>
                                #siren-tts-history-length::-webkit-outer-spin-button,
                                #siren-tts-history-length::-webkit-inner-spin-button {
                                    -webkit-appearance: none;
                                    margin: 0;
                                }
                                #siren-tts-history-length {
                                    -moz-appearance: textfield; 
                                }
                            </style>
                            <input type="number" id="siren-tts-history-length" class="siren-ext-input" style="width: 60px; text-align: center;" min="0" max="200">
                            <span style="color: #94a3b8;">条</span>
                        </div>
                    </div>

                    <div class="siren-ext-setting-row siren-ext-flex-between" style="padding-bottom: 5px;">
                        <div class="siren-ext-setting-label">
                            <label>向大模型隐藏语音标签</label>
                            <small style="display:block;">开启后，发送给LLM的上下文中不再包含 &lt;speak&gt; 代码</small>
                        </div>
                        <label class="siren-ext-switch">
                            <input type="checkbox" id="siren-tts-clean-prompt">
                            <span class="siren-ext-slider"></span>
                        </label>
                    </div>

                    <div id="siren-tts-clean-replacement-wrapper" style="display: none;">
                        <div class="siren-ext-flex-between" style="background: rgba(0,0,0,0.2); padding: 8px 15px; border-left: 2px solid #06b6d4; border-radius: 4px 4px 0 0; margin-top: 10px;">
                            <div class="siren-ext-setting-label">
                                <label style="color: #e2e8f0; font-size: 1.05em;">普通语音 (&lt;speak&gt;) 替换为</label>
                            </div>
                            <input type="text" id="siren-tts-clean-replacement-speak" class="siren-ext-input" style="width: 80px; text-align: center;" placeholder="“”">
                        </div>
                        <div class="siren-ext-flex-between" style="background: rgba(0,0,0,0.2); padding: 8px 15px; border-left: 2px solid #06b6d4; border-top: 1px solid rgba(255,255,255,0.05);">
                            <div class="siren-ext-setting-label">
                                <label style="color: #e2e8f0; font-size: 1.05em;">电话语音 (&lt;phone&gt;) 替换为</label>
                            </div>
                            <input type="text" id="siren-tts-clean-replacement-phone" class="siren-ext-input" style="width: 80px; text-align: center;" placeholder="“”">
                        </div>
                        <div class="siren-ext-flex-between" style="background: rgba(0,0,0,0.2); padding: 8px 15px; border-left: 2px solid #06b6d4; border-top: 1px solid rgba(255,255,255,0.05); border-radius: 0 0 4px 4px;">
                            <div class="siren-ext-setting-label">
                                <label style="color: #e2e8f0; font-size: 1.05em;">想法语音 (&lt;inner&gt;) 替换为</label>
                            </div>
                            <input type="text" id="siren-tts-clean-replacement-inner" class="siren-ext-input" style="width: 80px; text-align: center;" placeholder="**">
                        </div>
                    </div>

                </div>
                <hr class="siren-ext-divider">

                <div id="siren-tts-beautify-wrapper" style="background: rgba(15, 23, 42, 0.5); border: 1px dashed #64748b; padding: 15px; border-radius: 6px; margin-bottom: 20px; margin-top: 20px;">
                    <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(51, 65, 85, 0.5);">
                        <div class="siren-ext-setting-label" style="margin-bottom: 12px;">
                            <label style="color: #f472b6; font-size: 1.15em; font-weight: bold;"><i class="fa-solid fa-wand-magic-sparkles" style="margin-right: 8px;"></i>✨ 语音条美化</label>
                        </div>
    
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px;">
                            <span style="color: #e2e8f0; font-size: 14px; white-space: nowrap;">当前美化:</span>
                            <select id="siren-tts-beautify-select" class="siren-ext-select" style="flex: 1; background: rgba(0,0,0,0.3); border-color: #334155; min-width: 0;">
                            </select>
                        </div>
    
                        <div style="display: flex; gap: 15px; align-items: center; justify-content: space-around; padding: 5px 10px; background: rgba(0,0,0,0.1); border-radius: 4px;">
                            <button id="siren-tts-beautify-import" class="siren-ext-btn" style="background:none; border:none; padding:8px; width:auto; min-width:0; color:#cbd5e1;" title="导入">
                                <i class="fa-solid fa-file-import" style="font-size: 1.2em;"></i>
                            </button>
                            <button id="siren-tts-beautify-export" class="siren-ext-btn" style="background:none; border:none; padding:8px; width:auto; min-width:0; color:#cbd5e1;" title="导出">
                                <i class="fa-solid fa-file-export" style="font-size: 1.2em;"></i>
                            </button>
                            <button id="siren-tts-beautify-add" class="siren-ext-btn" style="background:none; border:none; padding:8px; width:auto; min-width:0; color:#cbd5e1;" title="添加">
                                <i class="fa-solid fa-plus" style="font-size: 1.2em;"></i>
                            </button>
                            <button id="siren-tts-beautify-del" class="siren-ext-btn" style="background:none; border:none; padding:8px; width:auto; min-width:0; color:#ef4444;" title="删除">
                                <i class="fa-solid fa-trash" style="font-size: 1.2em;"></i>
                            </button>
                            <input type="file" id="siren-tts-beautify-file-import" accept=".json" style="display: none;">
                        </div>
                    </div>
                    <textarea id="siren-tts-beautify-css" class="siren-ext-textarea" rows="5" placeholder="/* 在此编辑 CSS/HTML 结构 */" style="font-family: 'Consolas', 'Courier New', monospace; border: 1px solid #334155; border-radius: 6px; padding: 10px; background: #0f172a; resize: vertical; line-height: 1.5; color: #e2e8f0;"></textarea>
                    <div class="siren-ext-style-preview-box" style="margin-top: 15px; background: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-radius: 8px; padding: 15px;">
                        <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 12px; display:flex; justify-content:space-between;">
                            <span><i class="fa-solid fa-eye"></i> 语音条实机预览</span>
                            <span id="siren-tts-preview-status" style="color:#10b981;">已就绪</span>
                        </div>
                        
                        <div class="siren-ext-chat-msg-mock" style="display: flex; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 1.2em; border: 1px solid #06b6d4; box-shadow: 0 0 8px rgba(6, 182, 212, 0.4); flex-shrink: 0;">🌊</div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.85em; color: #94a3b8; margin-bottom: 4px;">Siren</div>
                                <div style="color: #cbd5e1; font-size: 0.9em; line-height: 1.5;">
                                    今天想要听什么呢？
                                    <div id="siren-tts-preview-render" style="margin-top: 8px;">
                                        <div class="siren-speak-card" data-siren-speak="1" tabindex="0">
                                            <span class="siren-btn-wrap siren-play-wrap" title="播放">
                                                <i class="fa-solid fa-circle-play"></i>
                                            </span>
                                            <span class="siren-speak-text">来自深海的呼唤...</span>
                                            <span class="siren-btn-wrap siren-regen-wrap" title="重新生成">
                                                <i class="fa-solid fa-rotate-right"></i>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="siren-ext-divider">

                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label">
                        <label style="color: #a855f7; font-size: 1.1em; font-weight: bold;"><i class="fa-solid fa-microchip" style="margin-right: 5px;"></i>当前 TTS</label>
                    </div>
                    <select id="siren-tts-provider" class="siren-ext-select" style="max-width: 200px;">
                        <option value="indextts">Index-TTS 2</option>
                        <option value="gptsovits">GPT-SoVITS</option>
                        <option value="doubao">豆包 Doubao</option>
                        <option value="minimax">MiniMax</option>
                    </select>
                </div>

                <div id="siren-tts-provider-settings" style="margin-top: 15px; border: 1px dashed #64748b; border-radius: 6px; padding: 15px; background: rgba(15, 23, 42, 0.5);">
                    </div>

                <hr class="siren-ext-divider">
            </div>
        </div>

        <div id="siren-tts-history-overlay" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:9998; backdrop-filter: blur(2px); align-items: center; justify-content: center;">
            
            <div id="siren-tts-history-modal" style="display:flex; width:650px; max-width:90vw; height:70vh; max-height:85vh; background:#0f172a; border:1px solid #38bdf8; border-radius:10px; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.7);">
                <div style="padding: 15px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; background: rgba(56, 189, 248, 0.1); border-radius: 10px 10px 0 0;">
                    <h3 style="margin:0; color:#38bdf8; font-size: 1.2em;"><i class="fa-solid fa-clock-rotate-left" style="margin-right:8px;"></i>历史语音记录</h3>
                    <i id="siren-tts-history-close" class="fa-solid fa-xmark" style="cursor:pointer; color:#ef4444; font-size:1.5em; transition: color 0.2s;"></i>
                </div>
                <div id="siren-tts-history-list" style="padding: 15px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px;">
                    <div style="text-align:center; color:#64748b; margin-top: 20px;">正在加载历史记录...</div>
                </div>
            </div>
            
        </div>
    `;

  ttsTab.innerHTML = ttsHtml;

  // ==========================================
  // 🟢 1. 从全局设置中读取并还原 UI 状态
  // ==========================================
  const settings = getSirenSettings();

  // -- 主开关 --
  $("#siren-tts-enable").prop("checked", settings.tts.enabled);
  if (settings.tts.enabled) $("#siren-tts-main-wrapper").show();

  // -- 通用设置 --
  $("#siren-tts-history-length").val(settings.tts.history_length ?? 30);

  const isCleanPromptEnabled = settings.tts.clean_speak_tags_to_llm ?? false;
  $("#siren-tts-clean-prompt").prop("checked", isCleanPromptEnabled);
  $("#siren-tts-clean-replacement-speak").val(
    settings.tts.clean_speak_tags_replacement || "“”",
  );
  $("#siren-tts-clean-replacement-phone").val(
    settings.tts.clean_phone_tags_replacement || "“”",
  );
  $("#siren-tts-clean-replacement-inner").val(
    settings.tts.clean_inner_tags_replacement || "**",
  );
  if (isCleanPromptEnabled) {
    $("#siren-tts-clean-replacement-wrapper").show();
  }

  // -- 🌟 语音条美化 (初始化暂存数据) --
  // 读取已保存的列表，如果没有则初始化一个默认的
  tempTtsStyles = settings.tts.beautify_list || { 默认气泡: "" };
  currentTtsStyleName = settings.tts.beautify_current || "默认气泡";

  // 防错：如果当前名字在字典里找不到，强行切回第一个
  if (!tempTtsStyles[currentTtsStyleName]) {
    currentTtsStyleName = Object.keys(tempTtsStyles)[0] || "默认气泡";
  }

  // 动态生成下拉框选项
  const $select = $("#siren-tts-beautify-select");
  $select.empty();
  for (const name in tempTtsStyles) {
    $select.append(`<option value="${name}">${name}</option>`);
  }
  $select.val(currentTtsStyleName);

  applyTtsBeautifyCss();

  // 把当前选中的 CSS 填入输入框
  updateTextareaState(currentTtsStyleName);

  // -- Provider 选择 --
  if (settings.tts.provider) {
    $("#siren-tts-provider").val(settings.tts.provider);
  }

  // ==========================================
  // 2. 绑定事件并渲染子级 Provider 设置
  // ==========================================
  bindTtsGlobalUiEvents();
  renderProviderSettings();

  const context = SillyTavern.getContext();
  context.eventSource.on("chat_id_changed", () => {
    if ($("#siren-tts-history-modal").is(":visible")) {
      console.log("[Siren Voice] 检测到 ChatID 变更，刷新历史面板...");
      renderTtsHistory();
    }
  });
}

// 🌟 辅助函数：根据当前选择的样式名称，切换输入框的读写状态
function updateTextareaState(styleName) {
  const $textarea = $("#siren-tts-beautify-css");

  if (styleName === "默认气泡") {
    // 锁定输入框，改变外观提示用户
    $textarea.prop("readonly", true);
    $textarea.css({
      background: "rgba(30, 41, 59, 0.5)",
      color: "#64748b",
      cursor: "not-allowed",
    });
    $textarea.val(
      "/* 默认气泡使用内置样式，不可编辑。\n   请点击右上角 [+] 新建您的自定义样式。 */",
    );
  } else {
    // 解锁输入框，恢复深海终端外观
    $textarea.prop("readonly", false);
    $textarea.css({
      background: "#0f172a",
      color: "#e2e8f0",
      cursor: "text",
    });
    $textarea.val(tempTtsStyles[styleName] || "");
  }

  // 立即触发 input 事件，强制刷新下方的实机预览
  $textarea.trigger("input");
}

function bindTtsGlobalUiEvents() {
  $("#siren-tts-enable").on("change", async function () {
    // 🌟 加上 async
    const isEnabled = $(this).is(":checked");
    const currentProvider = $("#siren-tts-provider").val();

    // 1. UI 动画控制
    if (isEnabled) {
      $("#siren-tts-main-wrapper").slideDown(300);
    } else {
      $("#siren-tts-main-wrapper").slideUp(300);
    }

    // 2. 🌟 立即保存开关状态到本地 (传入 true 表示静默保存，不弹右下角提示打扰用户)
    const settings = getSirenSettings();
    settings.tts.enabled = isEnabled;
    saveSirenSettings(true);

    // 3. 🌟 立即同步世界书条目 (关闭时会关掉所有 TTS-* 条目)
    await syncTtsWorldbookEntries(currentProvider, isEnabled);
  });

  $("#siren-tts-clean-prompt").on("change", function () {
    if ($(this).is(":checked")) {
      // 丝滑下拉，不再有闪烁
      $("#siren-tts-clean-replacement-wrapper").slideDown(250);
    } else {
      $("#siren-tts-clean-replacement-wrapper").slideUp(200);
    }
  });

  // 1. 切换下拉框时
  $("#siren-tts-beautify-select").on("change", function () {
    currentTtsStyleName = $(this).val();
    updateTextareaState(currentTtsStyleName);
  });

  // 2. 点击添加按钮
  $("#siren-tts-beautify-add")
    .off("click")
    .on("click", function () {
      const newName = prompt("请输入新的美化样式名称 (例如: 赛博终端风)：");
      if (!newName || !newName.trim()) return;

      const cleanName = newName.trim();
      if (tempTtsStyles[cleanName] !== undefined) {
        if (window.toastr) window.toastr.warning("该样式名称已存在！");
        return;
      }
      tempTtsStyles[cleanName] = "";

      $("#siren-tts-beautify-select").append(
        `<option value="${cleanName}">${cleanName}</option>`,
      );
      $("#siren-tts-beautify-select").val(cleanName).trigger("change");

      if (window.toastr) window.toastr.success(`已创建暂存样式: ${cleanName}`);
    });

  // 3. 点击删除按钮
  $("#siren-tts-beautify-del")
    .off("click")
    .on("click", function () {
      if (currentTtsStyleName === "默认气泡") {
        if (window.toastr)
          window.toastr.error("内置的 [默认气泡] 无法被删除！");
        return;
      }

      if (
        confirm(
          `确定要删除美化样式 [${currentTtsStyleName}] 吗？\n注意：必须点击右上角保存才会真正生效。`,
        )
      ) {
        delete tempTtsStyles[currentTtsStyleName];
        $(
          `#siren-tts-beautify-select option[value="${currentTtsStyleName}"]`,
        ).remove();

        // 回退到默认气泡
        currentTtsStyleName = "默认气泡";
        $("#siren-tts-beautify-select").val("默认气泡").trigger("change");
      }
    });

  // 5. 🌟 导出美化样式
  $("#siren-tts-beautify-export")
    .off("click")
    .on("click", function () {
      if (currentTtsStyleName === "默认气泡") {
        if (window.toastr)
          window.toastr.warning("内置的 [默认气泡] 无需导出！");
        return;
      }

      const currentCss = tempTtsStyles[currentTtsStyleName] || "";
      const exportData = {
        name: currentTtsStyleName,
        css: currentCss,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // 自动用当前样式名作为文件名
      a.download = `siren_tts_style_${currentTtsStyleName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  // 6. 🌟 导入美化样式
  const ttsStyleFileInput = document.getElementById(
    "siren-tts-beautify-file-import",
  );
  $("#siren-tts-beautify-import")
    .off("click")
    .on("click", function () {
      ttsStyleFileInput.click();
    });

  $(ttsStyleFileInput).on("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);

        // 校验格式是否匹配
        if (!importedData || typeof importedData.css !== "string") {
          throw new Error("文件格式错误，非 Siren 样式导出件");
        }

        // 默认建议名称优先用原文件内记录的名字，其次用文件名
        let defaultName =
          importedData.name || file.name.replace(/\.json$/i, "");
        let newName = prompt("请输入导入的语音条样式名称：", defaultName);

        if (!newName) {
          ttsStyleFileInput.value = "";
          return; // 用户取消
        }

        let cleanName = newName.trim();
        let finalName = cleanName;
        let counter = 1;

        // 核心查重：检测当前暂存区是否已有同名样式，有的话自动加后缀避免覆盖
        while (tempTtsStyles[finalName] !== undefined) {
          finalName = `${cleanName}_${counter}`;
          counter++;
        }

        // 直接作为新样式并入暂存区
        tempTtsStyles[finalName] = importedData.css;

        // 更新下拉框并切换过去
        $("#siren-tts-beautify-select").append(
          `<option value="${finalName}">${finalName}</option>`,
        );
        $("#siren-tts-beautify-select").val(finalName).trigger("change");

        if (window.toastr)
          window.toastr.success(`成功导入并创建样式：${finalName}`);
      } catch (err) {
        console.error(err);
        if (window.toastr)
          window.toastr.error("样式导入失败：文件格式不正确或已损坏");
      }

      // 清空 value 允许用户反复导入同一个文件
      ttsStyleFileInput.value = "";
    };
    reader.readAsText(file);
  });

  // 4. 文本框实时输入事件 (核心：拦截对默认气泡的数据污染)
  $("#siren-tts-beautify-css").on("input", function () {
    const cssContent = $(this).val();

    let styleTag = document.getElementById("siren-tts-beautify-style");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "siren-tts-beautify-style";
      document.head.appendChild(styleTag);
    }

    if (currentTtsStyleName === "默认气泡") {
      // 默认气泡：清空 style 标签以显示 ST 内置气泡
      styleTag.textContent = "";
    } else {
      // 自定义气泡：保存到暂存区
      tempTtsStyles[currentTtsStyleName] = cssContent;
      // 🌟 核心修改：实时注入编译后的 CSS，让实机聊天气泡也能“所见即所得”！
      styleTag.textContent = compileSirenCss(cssContent);
    }

    // UI 反馈
    if (currentTtsStyleName !== "默认气泡") {
      const $status = $("#siren-tts-preview-status");
      $status.text("正在预览...").css("color", "#0ea5e9");

      clearTimeout(window.sirenPreviewTimer);
      window.sirenPreviewTimer = setTimeout(() => {
        $status.text("未保存").css("color", "#f59e0b");
      }, 800);
    } else {
      $("#siren-tts-preview-status").text("系统默认").css("color", "#64748b");
    }
  });

  $("#siren-tts-provider").on("change", function () {
    renderProviderSettings();
  });

  $("#siren-tts-history-btn")
    .off("click")
    .on("click", function () {
      // 只需要把外层父级设为 flex 并淡入即可，子级会跟着显示并完美居中
      $("#siren-tts-history-overlay").css("display", "flex").hide().fadeIn(200);
      renderTtsHistory();
    });

  $("#siren-tts-history-close, #siren-tts-history-overlay")
    .off("click")
    .on("click", function (e) {
      // 关键拦截：只有点击遮罩背景或 X 按钮时才关闭，防止点击列表内容导致意外关闭
      if (
        e.target.id === "siren-tts-history-overlay" ||
        e.target.id === "siren-tts-history-close"
      ) {
        $("#siren-tts-history-overlay").fadeOut(200);
      }
    });

  // 🌟 全局保存按钮：保存通用设置，并向下分发保存指令
  $("#siren-tts-save-global-btn")
    .off("click")
    .on("click", async function () {
      const settings = getSirenSettings();

      // 1. 获取并更新当前 UI 上的通用设置
      const isEnabled = $("#siren-tts-enable").is(":checked");
      const currentProvider = $("#siren-tts-provider").val();

      settings.tts.enabled = isEnabled;
      settings.tts.provider = currentProvider;

      const histLen = parseInt($("#siren-tts-history-length").val());
      settings.tts.history_length = isNaN(histLen) ? 30 : Math.max(0, histLen);

      settings.tts.clean_speak_tags_to_llm = $("#siren-tts-clean-prompt").is(
        ":checked",
      );

      // 修复原版可能存在的 ID 抓取错误，分别抓取三个标签的替换符
      settings.tts.clean_speak_tags_replacement =
        $("#siren-tts-clean-replacement-speak").val() || "“”";
      settings.tts.clean_phone_tags_replacement =
        $("#siren-tts-clean-replacement-phone").val() || "“”";
      settings.tts.clean_inner_tags_replacement =
        $("#siren-tts-clean-replacement-inner").val() || "**";

      // 2. 保存美化设置到暂存区
      settings.tts.beautify_enabled = true;
      settings.tts.beautify_list = tempTtsStyles;
      settings.tts.beautify_current = currentTtsStyleName;
      settings.tts.beautify_css = tempTtsStyles[currentTtsStyleName];

      // 3. 执行通用存盘和样式注入 (传入 true 进行静默保存，不弹框，把提示机会留给子渠道)
      saveSirenSettings(true);
      applyTtsBeautifyCss();

      // 4. 同步世界书的 TTS 条目状态
      await syncTtsWorldbookEntries(currentProvider, isEnabled);

      // 5. 核心逻辑：触发当前所选 Provider 的专属保存按钮！
      if (currentProvider === "indextts") {
        $("#siren-idx-global-save").trigger("click", [true]);
      } else if (currentProvider === "minimax") {
        $("#siren-mm-save-all").trigger("click", [true]);
      } else if (currentProvider === "doubao") {
        $("#siren-db-char-save").trigger("click", [true]);
      } else if (currentProvider === "gptsovits") {
        $("#siren-gsv-save-btn").trigger("click", [true]);
      }

      if (window.toastr) {
        window.toastr.success(
          `全量数据更新：通用设置及 [${currentProvider}] 配置已分流保存至全局与角色卡！`,
        );
      }

      const $status = $("#siren-tts-preview-status");
      $status.text("全局与渠道配置已同步！").css("color", "#10b981");
    });

  $("#siren-idx-char-save")
    .off("click")
    .on("click", async function () {
      const context = SillyTavern.getContext();
      const { writeExtensionField, characterId } = context;

      // 拦截异常状态：群聊或未选中角色
      if (characterId === undefined || characterId === null) {
        if (window.toastr)
          window.toastr.warning(
            "当前未选中任何角色（或处于群聊中），无法保存到角色卡！",
          );
        return;
      }

      // 收集 DOM 中所有的角色行数据
      const voiceMap = {};
      $("#siren-idx-char-list .siren-ext-setting-row").each(function () {
        const charName = $(this).find("input").eq(0).val().trim();
        const voicePath = $(this).find("input").eq(1).val().trim();

        if (charName && voicePath) {
          voiceMap[charName] = voicePath;
        }
      });

      try {
        // 将数据写入 ST 角色卡的 extensions 字段下
        await writeExtensionField(characterId, "siren_voice_tts", {
          voices: voiceMap,
        });

        if (window.toastr)
          window.toastr.success("角色音色配置已成功写入当前角色卡！");
        console.log("[Siren Voice] 写入角色卡成功:", voiceMap);
      } catch (err) {
        console.error("[Siren Voice] 写入角色卡失败:", err);
        if (window.toastr) window.toastr.error("写入角色卡失败！");
      }
    });
}

function renderProviderSettings() {
  const provider = $("#siren-tts-provider").val();
  const container = $("#siren-tts-provider-settings");
  container.empty();

  if (provider === "indextts") {
    container.html(getIndexTtsHtml());
    bindIndexTtsEvents();
  } else if (provider === "minimax") {
    container.html(getMinimaxHtml());
    bindMinimaxEvents();
  } else if (provider === "doubao") {
    container.html(getDoubaoHtml());
    bindDoubaoEvents();
  } else if (provider === "gptsovits") {
    container.html(getGptSovitsHtml());
    bindGptSovitsEvents();
  } else {
    container.html(
      `<div style="text-align:center; padding: 20px; color:#64748b;">${provider} 设置界面构建中... 🚧</div>`,
    );
  }
}

// 🌟 CSS 编译器：自动兼容 ST 的 custom- 前缀劫持

// 在 tts.js 文件末尾新增这个函数
export function applyTtsBeautifyCss() {
  const settings = getSirenSettings();
  const customCss = settings?.tts?.beautify_css ?? "";

  let styleTag = document.getElementById("siren-tts-beautify-style");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "siren-tts-beautify-style";
    document.head.appendChild(styleTag);
  }

  if (customCss) {
    // 🌟 核心修改：注入前先编译！
    styleTag.textContent = compileSirenCss(customCss);
  } else {
    styleTag.textContent = "";
  }
}

// tts.js 中的 renderTtsHistory 函数
async function renderTtsHistory() {
  const context = SillyTavern.getContext();
  const currentChatId = context.chatId;
  const listContainer = $("#siren-tts-history-list");
  if (!currentChatId) {
    listContainer.html(
      `<div style="text-align:center; color:#64748b; margin-top: 20px;">未检测到活动对话，请先开启一个聊天。</div>`,
    );
    return;
  }
  listContainer.html(
    `<div style="text-align:center; color:#64748b; margin-top: 20px;"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>正在打捞当前对话的记忆...</div>`,
  );

  // 👈 [传入 ChatID] 获取过滤后的历史
  const records = await getTtsHistory(currentChatId);
  listContainer.empty();

  if (records.length === 0) {
    listContainer.html(
      `<div style="text-align:center; color:#64748b; margin-top: 20px;">暂无语音记录</div>`,
    );
    return;
  }

  records.forEach((record) => {
    // 👇 [修改] 时间戳只显示到小时和分钟
    const timeStr = new Date(record.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const floorDisplay = record.floor ? `楼层 ${record.floor}` : "自由潜流";
    const shortText =
      record.text.length > 80
        ? record.text.substring(0, 80) + "..."
        : record.text;

    // 根据收藏状态决定初始 UI
    const isFav = record.isFavorite;
    const favColor = isFav ? "#f59e0b" : ""; // 收藏变成金色
    const favIconClass = isFav ? "fa-solid fa-star" : "fa-regular fa-star";

    const html = `
            <div class="siren-tts-history-item" data-id="${record.id}" style="background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;">
                    <span style="color: #94a3b8;"><i class="fa-solid fa-hashtag" style="margin-right:3px;"></i>${floorDisplay} | 👤 ${record.char || "System"}</span>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${record.provider}</span>
                        <span style="color: #64748b;">${timeStr}</span>
                    </div>
                </div>
                <div style="color: #e2e8f0; font-size: 1.05em; line-height: 1.4;" title="${record.text}">${shortText}</div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
                    <button class="siren-ext-btn siren-ext-btn-secondary siren-tts-btn-fav" data-fav="${isFav ? "1" : "0"}" style="padding: 4px 10px; font-size: 0.9em; color: ${favColor};">
                        <i class="${favIconClass}" style="margin-right: 5px;"></i>收藏
                    </button>
                    <button class="siren-ext-btn siren-ext-btn-secondary siren-tts-btn-replay" style="padding: 4px 10px; font-size: 0.9em;"><i class="fa-solid fa-play" style="margin-right: 5px;"></i>重听</button>
                    <button class="siren-ext-btn siren-ext-btn-secondary siren-tts-btn-download" style="padding: 4px 10px; font-size: 0.9em;"><i class="fa-solid fa-download" style="margin-right: 5px;"></i>下载</button>
                    <button class="siren-ext-btn siren-ext-btn-secondary siren-tts-btn-delete" style="padding: 4px 10px; font-size: 0.9em; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1);">
                        <i class="fa-solid fa-trash" style="margin-right: 5px;"></i>删除
                    </button>
                </div>
            </div>
        `;
    const $el = $(html);

    // 绑定【收藏】按钮事件
    $el.find(".siren-tts-btn-fav").on("click", async function () {
      const isFavNow = $(this).attr("data-fav") === "1";
      const newFavState = !isFavNow; // 反转状态

      // 写入数据库
      await toggleFavoriteTtsRecord(record.id, newFavState);

      // 更新 UI 状态
      $(this).attr("data-fav", newFavState ? "1" : "0");
      $(this).css("color", newFavState ? "#f59e0b" : "");
      const $icon = $(this).find("i");
      if (newFavState) {
        $icon.removeClass("fa-regular").addClass("fa-solid");
        if (window.toastr) window.toastr.success("已收藏，清理时将被保留！");
      } else {
        $icon.removeClass("fa-solid").addClass("fa-regular");
        if (window.toastr) window.toastr.info("已取消收藏");
      }
    });

    // 绑定【删除】按钮事件
    $el.find(".siren-tts-btn-delete").on("click", async function () {
      // UI 动画：缩放并淡出
      $el.css({ transform: "scale(0.95)", opacity: 0 });
      setTimeout(async () => {
        $el.slideUp(200, function () {
          $(this).remove();
        });
        // 彻底从数据库删除
        await deleteTtsRecord(record.id);
      }, 150);
    });

    // 绑定【重听】按钮 (保留你之前的代码)
    $el.find(".siren-tts-btn-replay").on("click", function () {
      const $icon = $(this).find("i");
      $icon.removeClass("fa-play").addClass("fa-spinner fa-spin");
      setTimeout(
        () => $icon.removeClass("fa-spinner fa-spin").addClass("fa-play"),
        1000,
      );
      enqueueTTSBlob(record.audioBlob);
    });

    // 绑定【下载】按钮 (保留你之前的代码)
    $el.find(".siren-tts-btn-download").on("click", function () {
      const blobUrl = URL.createObjectURL(record.audioBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Siren_${record.provider}_${record.char}_Floor${record.floor}_${record.timestamp}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });

    listContainer.append($el);
  });
}
