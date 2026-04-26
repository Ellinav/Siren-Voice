import {
  getSirenSettings,
  saveSirenSettings,
  saveToCharacterCard,
} from "./settings.js";
import { generateGptSovitsAudio } from "./gptsovits_logic.js";
import { bindSirenSliders, syncTtsWorldbookEntries } from "./utils.js";

// 统一下拉框和输入框的高度与盒模型，解决对齐问题
const rowInputStyle =
  "height: 32px !important; min-height: 32px !important; max-height: 32px !important; box-sizing: border-box !important; padding: 0 8px !important; line-height: 30px !important; margin: 0 !important; vertical-align: middle;";

// ==========================================
// 1. 获取 HTML 模板
// ==========================================
export function getGptSovitsHtml() {
  return `
        <style>
            .siren-no-spin::-webkit-inner-spin-button, 
            .siren-no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            .siren-no-spin { -moz-appearance: textfield; }
        </style>

        <div id="siren-gptsovits-wrapper" style="display: flex; flex-direction: column; gap: 15px;">
        <datalist id="siren-gsv-ref-list"></datalist>
            
            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
                <h4 style="color: #38bdf8; margin-top: 0; margin-bottom: 15px;">
                    <i class="fa-solid fa-server" style="margin-right: 5px;"></i>服务连接 (全局保存)
                </h4>
                
                <div class="siren-ext-setting-row siren-ext-flex-between" style="margin-bottom: 10px; gap: 10px;">
                    <div class="siren-ext-setting-label" style="white-space: nowrap; flex-shrink: 0;">API Base URL</div>
                    
                    <div style="display: flex; gap: 5px; flex: 1; max-width: 75%; min-width: 0; justify-content: flex-end;">
                        <input type="text" id="siren-gsv-api" class="siren-ext-input" style="flex: 1; min-width: 0; height: 32px; box-sizing: border-box;" placeholder="http://127.0.0.1:9880" value="http://127.0.0.1:9880">
                        
                        <button id="siren-gsv-check-btn" class="siren-ext-btn siren-ext-btn-secondary" title="测试连接" style="width: 32px; height: 32px; padding: 0; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-link"></i>
                        </button>
                    </div>
                </div>

                <div class="siren-ext-setting-row siren-ext-flex-between" style="margin-bottom: 10px;">
                    <div class="siren-ext-setting-label">API Key</div>
                    <input type="password" id="siren-gsv-apikey" class="siren-ext-input" style="max-width: 60%;" placeholder="App Key">
                </div>

                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label">
                        <label>参考音频上传</label>
                        <small style="display:block; color: #64748b;">上传参考音频到custom_refs</small>
                    </div>
                    <div>
                        <input type="file" id="siren-gsv-file-input" multiple accept=".wav,.mp3,.flac,.ogg" style="display: none;">
                        <button id="siren-gsv-upload-trigger" class="siren-ext-btn siren-ext-btn-secondary">
                            <i class="fa-solid fa-folder-open" style="margin-right: 5px;"></i>选择文件
                        </button>
                    </div>
                </div>

                <div id="siren-gsv-upload-staging" style="display: none; margin-top: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; border: 1px dashed #475569;">
                    <div id="siren-gsv-upload-tags" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                        </div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px;">
                        <button id="siren-gsv-upload-cancel" class="siren-ext-btn siren-ext-btn-secondary" style="color: #ef4444; border-color: rgba(239,68,68,0.3);">取消</button>
                        <button id="siren-gsv-upload-confirm" class="siren-ext-btn siren-ext-btn-secondary" style="color: #10b981; border-color: rgba(16,185,129,0.3);">确认</button>
                    </div>
                </div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
                <h4 style="color: #fbbf24; margin-top: 0; margin-bottom: 15px;">
                    <i class="fa-solid fa-sliders" style="margin-right: 5px;"></i>全局高级参数 (默认与降级兜底)
                </h4>
                
                <div style="display: flex; gap: 15px; align-items: flex-end; margin-bottom: 15px;">
    <div style="flex: 1.5;">
        <div class="siren-ext-setting-label" style="font-size: 0.85em; margin-bottom: 4px;">文本切分策略</div>
        <select id="siren-gsv-global-split" class="siren-ext-select" style="${rowInputStyle} width: 100%;">
            <option value="按标点符号切">按标点符号切 (推荐)</option>
            <option value="凑四句一切">凑四句一切</option>
            <option value="凑50字一切">凑50字一切</option>
            <option value="按中文句号。切">按中文句号。切</option>
            <option value="按英文句号.切">按英文句号.切</option>
            <option value="不切">不切</option>
        </select>
    </div>
    <div style="flex: 1;">
        <div style="display:flex; justify-content:space-between; font-size: 0.85em; color: #94a3b8; margin-bottom: 4px;">
            <span>句间停顿</span><span id="siren-gsv-interval-val" style="color: #facc15;">0.3s</span>
        </div>
        <input type="range" id="siren-gsv-global-interval" class="siren-ext-slider-input" min="0.1" max="0.5" step="0.05" value="0.3" style="--theme-color: #facc15;">
    </div>
    <div style="flex: 1; padding-bottom: 8px;">
        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <input type="checkbox" id="siren-gsv-global-parallel" checked>
            <span style="font-size: 0.85em; color: #cbd5e1;">并行推理</span>
        </label>
    </div>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; padding-top: 15px; border-top: 1px dashed rgba(51, 65, 85, 0.6);">
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#94a3b8;"><span>语速</span><span id="siren-gsv-global-speed-val" style="color:#facc15;">1.0</span></div>
        <input type="range" id="siren-gsv-global-speed" class="siren-ext-slider-input" min="0.6" max="1.65" step="0.05" value="1.0" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#94a3b8;"><span>温度</span><span id="siren-gsv-global-temp-val" style="color:#facc15;">1.0</span></div>
        <input type="range" id="siren-gsv-global-temp" class="siren-ext-slider-input" min="0" max="1" step="0.05" value="1.0" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#94a3b8;"><span>Top P</span><span id="siren-gsv-global-topp-val" style="color:#facc15;">1.0</span></div>
        <input type="range" id="siren-gsv-global-topp" class="siren-ext-slider-input" min="0" max="1" step="0.05" value="1.0" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#94a3b8;"><span>Top K</span><span id="siren-gsv-global-topk-val" style="color:#facc15;">15</span></div>
        <input type="range" id="siren-gsv-global-topk" class="siren-ext-slider-input" min="1" max="100" step="1" value="15" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#94a3b8;"><span>重复惩罚</span><span id="siren-gsv-global-rep-val" style="color:#facc15;">1.35</span></div>
        <input type="range" id="siren-gsv-global-rep" class="siren-ext-slider-input" min="1" max="2" step="0.05" value="1.35" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="font-size:0.8em; color:#94a3b8; margin-bottom:5px;">种子</div>
        <input type="number" id="siren-gsv-global-seed" class="siren-ext-input siren-no-spin" value="-1" style="${rowInputStyle} width: 100%;">
    </div>
</div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="color: #a855f7; margin: 0;">
                        <i class="fa-solid fa-users" style="margin-right: 5px;"></i>角色音色绑定
                    </h4>
                    <button id="siren-gsv-refresh-models" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 8px; font-size: 0.85em;">
                        <i class="fa-solid fa-rotate" style="margin-right: 4px;"></i>获取模型列表
                    </button>
                </div>
                
                <div id="siren-gsv-char-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
                    </div>
                
                <button id="siren-gsv-add-char" class="siren-ext-btn siren-ext-btn-secondary" style="width: 100%; border-style: dashed;">
                    <i class="fa-solid fa-plus"></i> 添加角色映射
                </button>
            </div>

            <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
                <h4 style="color: #f472b6; margin-top: 0; margin-bottom: 10px;">
                    <i class="fa-solid fa-masks-theater" style="margin-right: 5px;"></i>情绪规则配置
                </h4>
                <div id="siren-gsv-emo-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
                </div>
                
                <button id="siren-gsv-add-emo" class="siren-ext-btn siren-ext-btn-secondary" style="width: 100%; border-style: dashed;">
                    <i class="fa-solid fa-plus"></i> 添加情绪规则
                </button>
            </div>
            
            <div style="display: flex; justify-content: center; margin-top: 10px;">
                <button id="siren-gsv-save-btn" class="siren-ext-btn siren-ext-btn-primary" style="width: 100%; padding: 12px 0; justify-content: center; font-size: 1.05em; background: #10b981; border-color: #10b981;">
                    <i class="fa-solid fa-floppy-disk" style="margin-right: 8px;"></i>保存 GSV 配置
                </button>
            </div>

            <div style="margin-top: 10px; border-top: 1px dashed #475569; padding-top: 20px;">
                <h4 style="color: #10b981; margin-bottom: 10px; font-size: 1.1em;">
                    <i class="fa-solid fa-vial" style="margin-right: 5px;"></i> GPT-SoVITS 发音测试
                </h4>
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 15px;">
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select id="siren-gsv-test-char" class="siren-ext-select" style="${rowInputStyle} flex: 1;">
                            <option value="">(请先保存配置后选择角色)</option>
                        </select>
                        <select id="siren-gsv-test-mood" class="siren-ext-select" style="${rowInputStyle} flex: 1;">
                            <option value="">(使用默认角色情绪)</option>
                        </select>
                    </div>

                    <textarea id="siren-gsv-test-text" class="siren-ext-textarea" rows="2" placeholder="输入一句台词，测试 GSV 引擎输出..." style="margin-bottom: 10px;"></textarea>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <button id="siren-gsv-test-generate" class="siren-ext-btn siren-ext-btn-primary" style="background: #10b981; border-color: #10b981;">
                            <i class="fa-solid fa-bolt"></i> 生成
                        </button>
                        
                        <div id="siren-gsv-test-preview" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                            <audio id="siren-gsv-test-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                            
                            <a id="siren-gsv-test-download" class="siren-ext-btn siren-ext-btn-secondary" style="display: none; padding: 4px 10px; text-decoration: none; color: #cbd5e1;" download="siren_gsv_test.wav" title="下载音频排查吞字">
                                <i class="fa-solid fa-download"></i>
                            </a>
                            
                            <span id="siren-gsv-test-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;">等待生成...</span>
                        </div>
                    </div>
                </div>
            </div>

            <div id="siren-gsv-adv-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(6, 11, 23, 0.85); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;">
                <div style="background: #0f172a; border: 1px solid #f59e0b; border-radius: 12px; width: 450px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    <h3 style="margin: 0 0 15px 0; color: #fcd34d; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                        <i class="fa-solid fa-sliders" style="margin-right:8px;"></i>角色独立推理参数
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#9ca3af;"><span>语速</span><span id="siren-gsv-mod-speed-val" style="color:#facc15;">1.0</span></div>
        <input type="range" id="siren-gsv-mod-speed" class="siren-ext-slider-input" min="0.6" max="1.65" step="0.05" value="1.0" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#9ca3af;"><span>温度</span><span id="siren-gsv-mod-temp-val" style="color:#facc15;">1.0</span></div>
        <input type="range" id="siren-gsv-mod-temp" class="siren-ext-slider-input" min="0" max="1" step="0.05" value="1.0" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#9ca3af;"><span>Top P</span><span id="siren-gsv-mod-topp-val" style="color:#facc15;">1.0</span></div>
        <input type="range" id="siren-gsv-mod-topp" class="siren-ext-slider-input" min="0" max="1" step="0.05" value="1.0" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#9ca3af;"><span>Top K</span><span id="siren-gsv-mod-topk-val" style="color:#facc15;">15</span></div>
        <input type="range" id="siren-gsv-mod-topk" class="siren-ext-slider-input" min="1" max="100" step="1" value="15" style="--theme-color: #facc15;">
    </div>
    <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#9ca3af;"><span>重复惩罚</span><span id="siren-gsv-mod-rep-val" style="color:#facc15;">1.35</span></div>
        <input type="range" id="siren-gsv-mod-rep" class="siren-ext-slider-input" min="1" max="2" step="0.05" value="1.35" style="--theme-color: #facc15;">
    </div>
    <div></div>
    <div>
        <div style="font-size:0.85em; color:#9ca3af; margin-bottom: 8px;">种子</div>
        <input type="number" id="siren-gsv-mod-seed" class="siren-ext-input siren-no-spin" value="-1" style="${rowInputStyle} width: 100%;">
    </div>
    <div>
        <div style="font-size:0.85em; color:#9ca3af; margin-bottom: 8px;">输出语言</div>
        <select id="siren-gsv-mod-textlang" class="siren-ext-select" style="${rowInputStyle} width: 100%;">
            <option value="中文">中文</option>
            <option value="英语">英语</option>
            <option value="日语">日语</option>
            <option value="粤语">粤语</option>
            <option value="韩语">韩语</option>
            <option value="中英混合">中英混合</option>
            <option value="日英混合">日英混合</option>
            <option value="粤英混合">粤英混合</option>
            <option value="韩英混合">韩英混合</option>
            <option value="多语种混合">多语种混合</option>
            <option value="多语种混合(粤语)">多语种混合(粤语)</option>
        </select>
    </div>
</div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px;">
                        <button id="siren-gsv-mod-cancel" class="siren-ext-btn siren-ext-btn-secondary">取消</button>
                        <button id="siren-gsv-mod-save" class="siren-ext-btn siren-ext-btn-primary" style="background: linear-gradient(135deg, #d97706, #f59e0b); border: none; box-shadow: 0 2px 10px rgba(245,158,11,0.4);">
                            <i class="fa-solid fa-check"></i> 确认
                        </button>
                    </div>
                </div>
            </div>

        </div>
    `;
}

// ==========================================
// 辅助函数：获取当前选中角色的卡片内拓展数据
// ==========================================
function getGptSovitsCardData() {
  const context = SillyTavern.getContext();
  const charId = context.characterId;
  if (
    charId !== undefined &&
    charId !== null &&
    context.characters &&
    context.characters[charId]
  ) {
    return (
      context.characters[charId].data?.extensions?.siren_voice_gptsovits || {}
    );
  }
  return {};
}

// ==========================================
// 辅助函数：同步角色列表到情绪的角色选择框
// ==========================================
function syncEmoCharDropdowns() {
  const charNames = [];
  $("#siren-gsv-char-list .siren-gsv-char-name").each(function () {
    const val = $(this).val().trim();
    if (val && !charNames.includes(val)) charNames.push(val);
  });

  $("#siren-gsv-emo-list .siren-gsv-emo-char").each(function () {
    const $sel = $(this);
    const currentVal = $sel.attr("data-current-val") || $sel.val(); // 优先读取缓存属性，防止重渲染时丢失

    $sel.empty();
    $sel.append('<option value="">选择关联角色...</option>');

    let found = false;
    charNames.forEach((name) => {
      const selected = name === currentVal ? "selected" : "";
      if (name === currentVal) found = true;
      $sel.append(`<option value="${name}" ${selected}>${name}</option>`);
    });

    // 如果原先绑定的角色被删除了，提供一个视觉反馈选项，但不阻断数据
    if (currentVal && !found) {
      $sel.append(
        `<option value="${currentVal}" selected>${currentVal} (未在列表中找到)</option>`,
      );
    }

    // 更新缓存值
    $sel.attr("data-current-val", $sel.val());
  });
}

// ==========================================
// 2. 绑定交互事件
// ==========================================
export function bindGptSovitsEvents() {
  const settings = getSirenSettings();
  let pendingUploadFiles = [];
  let cachedAudioList = [];
  async function fetchCustomRefs() {
    const apiBase = $("#siren-gsv-api").val().trim().replace(/\/$/, "");
    if (!apiBase) return;

    try {
      // 调用你刚刚在 gsvi.py 里写的接口
      const res = await fetch(`${apiBase}/custom_refs`);
      if (res.ok) {
        const data = await res.json();
        cachedAudioList = data.files || [];

        // 将缓存的数组直接灌入 datalist 中
        const $datalist = $("#siren-gsv-ref-list");
        $datalist.empty();
        cachedAudioList.forEach((filename) => {
          $datalist.append(`<option value="${filename}">`);
        });

        console.log(
          `[Siren GSV] 成功拉取并缓存 ${cachedAudioList.length} 个参考音频`,
        );
      }
    } catch (e) {
      console.warn(
        "[Siren GSV] 获取参考音频列表失败，请检查后端接口:",
        e.message,
      );
    }
  }

  $("#siren-gptsovits-wrapper").on(
    "focus",
    "input[list='siren-gsv-ref-list']",
    function () {
      // 只有当 datalist 为空时才主动拉取
      if ($("#siren-gsv-ref-list").children().length === 0) {
        fetchCustomRefs();
      }
    },
  );

  // --- 1. 测试连接 ---
  $("#siren-gsv-check-btn").on("click", async function () {
    const apiBase = $("#siren-gsv-api").val().trim().replace(/\/$/, "");
    const $icon = $(this).find("i");
    $icon.removeClass("fa-link").addClass("fa-spinner fa-spin");

    try {
      const res = await fetch(`${apiBase}/version`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (window.toastr)
          window.toastr.success(`GSV 连接成功！版本: ${JSON.stringify(data)}`);
        fetchCustomRefs();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (window.toastr)
        window.toastr.error("连接失败，请检查后端是否启动及跨域设置");
      console.error("[Siren GSV] 连接测试失败:", err);
    } finally {
      $icon.removeClass("fa-spinner fa-spin").addClass("fa-link");
    }
  });

  // --- 3. 刷新模型列表 (顺次拉取防阻塞，兼容多字段) ---
  $("#siren-gsv-refresh-models").on("click", async function () {
    const apiBase = $("#siren-gsv-api").val().trim().replace(/\/$/, "");
    if (!apiBase) {
      if (window.toastr) window.toastr.warning("请先填写 API Base URL");
      return;
    }

    const $icon = $(this).find("i");
    $icon.removeClass("fa-rotate").addClass("fa-spinner fa-spin");

    // 加入你提到的三个版本
    const versions = ["v4", "v2Pro", "v2ProPlus"];
    let allGptOptions = [];
    let allSovitsOptions = [];

    try {
      // 采用顺次请求(for...of)，防止并发请求导致本地单线程后端阻塞或报错
      for (const v of versions) {
        try {
          const res = await fetch(`${apiBase}/classic_model_list/${v}`);
          if (!res.ok) continue; // 如果后端不支持该版本，直接跳过，不报错

          const data = await res.json();
          console.log(`[Siren GSV] 版本 [${v}] 获取到的原始数据:`, data);

          // 广度兼容绝大部分 GSV 衍生分支的字段命名习惯
          const gpts =
            data.gpt_models ||
            data.GPT_models ||
            data.gpt_model_list ||
            data.GPT_model_list ||
            data.gpt ||
            [];
          const sovits =
            data.sovits_models ||
            data.SoVITS_models ||
            data.sovits_model_list ||
            data.SoVITS_model_list ||
            data.sovits ||
            [];

          gpts.forEach((m) => {
            allGptOptions.push({
              label: `[${v}] ${m}`,
              value: `${v}::${m}`,
            });
          });

          sovits.forEach((m) => {
            allSovitsOptions.push({
              label: `[${v}] ${m}`,
              value: `${v}::${m}`,
            });
          });
        } catch (e) {
          console.warn(`[Siren GSV] 跳过版本 ${v}，原因:`, e.message);
        }
      }

      // 结果反馈
      if (allGptOptions.length === 0 && allSovitsOptions.length === 0) {
        if (window.toastr)
          window.toastr.warning(
            "接口调用成功，但未能解析到模型。请按 F12 检查控制台数据！",
          );
      } else {
        if (window.toastr)
          window.toastr.success(
            `模型同步成功！共发现 ${allGptOptions.length} 个GPT模型`,
          );
        fetchCustomRefs();
      }

      // 更新 UI 下拉框
      $(".siren-gsv-char-gpt, .siren-gsv-emo-gpt").each(function () {
        const currentVal = $(this).val();
        $(this).empty().append('<option value="">选择GPT模型</option>');
        allGptOptions.forEach((opt) =>
          $(this).append(`<option value="${opt.value}">${opt.label}</option>`),
        );
        // 恢复之前的选中状态
        if (currentVal && allGptOptions.find((o) => o.value === currentVal)) {
          $(this).val(currentVal);
        }
      });

      $(".siren-gsv-char-sovits").each(function () {
        const currentVal = $(this).val();
        $(this).empty().append('<option value="">选择SoVITS模型</option>');
        allSovitsOptions.forEach((opt) =>
          $(this).append(`<option value="${opt.value}">${opt.label}</option>`),
        );
        if (
          currentVal &&
          allSovitsOptions.find((o) => o.value === currentVal)
        ) {
          $(this).val(currentVal);
        }
      });
    } catch (err) {
      console.error("[Siren GSV] 刷新失败:", err);
      if (window.toastr)
        window.toastr.error("模型刷新出错，请检查网络或后端日志。");
    } finally {
      $icon.removeClass("fa-spinner fa-spin").addClass("fa-rotate");
    }
  });

  // --- 2. 文件上传逻辑 ---
  $("#siren-gsv-upload-trigger").on("click", () =>
    $("#siren-gsv-file-input").click(),
  );

  $("#siren-gsv-file-input").on("change", function (e) {
    pendingUploadFiles = Array.from(e.target.files);
    if (pendingUploadFiles.length === 0) return;

    const $tagsContainer = $("#siren-gsv-upload-tags");
    $tagsContainer.empty();

    pendingUploadFiles.forEach((file) => {
      $tagsContainer.append(`
                <span style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; border: 1px solid rgba(56, 189, 248, 0.3);">
                    <i class="fa-solid fa-music" style="margin-right: 4px;"></i>${file.name}
                </span>
            `);
    });

    $("#siren-gsv-upload-staging").slideDown(200);
  });

  $("#siren-gsv-upload-cancel").on("click", function () {
    pendingUploadFiles = [];
    $("#siren-gsv-file-input").val("");
    $("#siren-gsv-upload-staging").slideUp(200);
  });

  $("#siren-gsv-upload-confirm").on("click", async function () {
    if (pendingUploadFiles.length === 0) return;
    const apiBase = $("#siren-gsv-api").val().trim().replace(/\/$/, "");
    const $btn = $(this);
    const originalHtml = $btn.html();

    $btn
      .html('<i class="fa-solid fa-spinner fa-spin"></i> 上传中...')
      .prop("disabled", true);

    let successCount = 0;
    for (const file of pendingUploadFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${apiBase}/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(`上传文件 ${file.name} 失败:`, err);
      }
    }

    if (window.toastr) {
      if (successCount === pendingUploadFiles.length)
        window.toastr.success(`成功上传 ${successCount} 个文件`);
      else
        window.toastr.warning(
          `成功 ${successCount}/${pendingUploadFiles.length}`,
        );
    }

    $btn.html(originalHtml).prop("disabled", false);
    $("#siren-gsv-upload-cancel").click();
    fetchCustomRefs();
  });

  // --- 3. 初始化动态列表与事件代理 ---

  // 绑定添加按钮
  $("#siren-gsv-add-char").on("click", () => {
    createCharRow();
    syncEmoCharDropdowns();
  });
  $("#siren-gsv-add-emo").on("click", () => {
    createEmoRow();
    syncEmoCharDropdowns();
  });

  // 监听全局滑块
  $("#siren-gsv-global-interval").on("input", function () {
    $("#siren-gsv-interval-val").text($(this).val() + "s");
  });

  // ==========================================
  // 新增：全局滑块与弹窗滑块的数值联动显示
  // ==========================================
  const allSliders = [
    "global-interval",
    "global-speed",
    "global-temp",
    "global-topp",
    "global-topk",
    "global-rep",
    "mod-speed",
    "mod-temp",
    "mod-topp",
    "mod-topk",
    "mod-rep",
  ];
  allSliders.forEach((id) => {
    $(`#siren-gsv-${id}`).on("input", function () {
      let val = $(this).val();
      if (id === "global-interval") val += "s"; // 停顿间隔加个 s 单位
      $(`#siren-gsv-${id}-val`).text(val);
    });
  });

  bindSirenSliders([
    "siren-gsv-global-interval",
    "siren-gsv-global-speed",
    "siren-gsv-global-temp",
    "siren-gsv-global-topp",
    "siren-gsv-global-topk",
    "siren-gsv-global-rep",
    "siren-gsv-mod-speed",
    "siren-gsv-mod-temp",
    "siren-gsv-mod-topp",
    "siren-gsv-mod-topk",
    "siren-gsv-mod-rep",
  ]);

  // ==========================================
  // 新增：角色高级设置弹窗 (Modal) 交互逻辑
  // ==========================================
  let activeCharRowForAdv = null; // 用于记录当前正在编辑哪一个角色行

  // 1. 点击“高级设置”按钮打开弹窗
  $("#siren-gsv-char-list").on("click", ".siren-gsv-adv-btn", function () {
    activeCharRowForAdv = $(this).closest(".siren-gsv-row-item");

    // 读取该行绑定的 data-* 属性，回显到弹窗的滑块和输入框中
    $("#siren-gsv-mod-speed")
      .val(activeCharRowForAdv.attr("data-speed") || 1.0)
      .trigger("input");
    $("#siren-gsv-mod-temp")
      .val(activeCharRowForAdv.attr("data-temp") || 1.0)
      .trigger("input");
    $("#siren-gsv-mod-topp")
      .val(activeCharRowForAdv.attr("data-topp") || 1.0)
      .trigger("input");
    $("#siren-gsv-mod-topk")
      .val(activeCharRowForAdv.attr("data-topk") || 15)
      .trigger("input");
    $("#siren-gsv-mod-rep")
      .val(activeCharRowForAdv.attr("data-rep") || 1.35)
      .trigger("input");
    $("#siren-gsv-mod-seed").val(activeCharRowForAdv.attr("data-seed") || -1);
    $("#siren-gsv-mod-textlang").val(
      activeCharRowForAdv.attr("data-textlang") || "中文",
    );

    // 显示弹窗并带点淡入动画
    $("#siren-gsv-adv-modal").css("display", "flex").hide().fadeIn(200);
  });

  // 2. 取消关闭弹窗
  $("#siren-gsv-mod-cancel").on("click", function () {
    $("#siren-gsv-adv-modal").fadeOut(200);
    activeCharRowForAdv = null;
  });

  // 2. 取消关闭弹窗
  $("#siren-gsv-mod-cancel").on("click", function () {
    $("#siren-gsv-adv-modal").fadeOut(200);
    activeCharRowForAdv = null;
  });

  // 3. 确认保存，将数据写回到行标签上
  $("#siren-gsv-mod-save").on("click", function () {
    if (activeCharRowForAdv) {
      activeCharRowForAdv.attr("data-speed", $("#siren-gsv-mod-speed").val());
      activeCharRowForAdv.attr("data-temp", $("#siren-gsv-mod-temp").val());
      activeCharRowForAdv.attr("data-topp", $("#siren-gsv-mod-topp").val());
      activeCharRowForAdv.attr("data-topk", $("#siren-gsv-mod-topk").val());
      activeCharRowForAdv.attr("data-rep", $("#siren-gsv-mod-rep").val());
      activeCharRowForAdv.attr("data-seed", $("#siren-gsv-mod-seed").val());
      activeCharRowForAdv.attr(
        "data-textlang",
        $("#siren-gsv-mod-textlang").val(),
      );
    }
    $("#siren-gsv-adv-modal").fadeOut(200);
  });

  // 委托删除事件，并在删除角色行时同步下拉框
  $("#siren-gsv-char-list, #siren-gsv-emo-list").on(
    "click",
    ".siren-gsv-del-btn",
    function () {
      const isCharRow = $(this).closest("#siren-gsv-char-list").length > 0;
      $(this)
        .closest(".siren-gsv-row-item")
        .slideUp(200, function () {
          $(this).remove();
          if (isCharRow) syncEmoCharDropdowns(); // 删除角色后刷新下拉框
        });
    },
  );

  // 委托情绪控制模式切换事件
  $("#siren-gsv-emo-list").on("change", ".siren-gsv-emo-mode-sel", function () {
    const mode = $(this).val();
    const $row = $(this).closest(".siren-gsv-row-item");
    if (mode === "audio") {
      $row.find(".siren-gsv-emo-audio-group").show();
      $row.find(".siren-gsv-emo-model-group").hide();
    } else {
      $row.find(".siren-gsv-emo-audio-group").hide();
      $row.find(".siren-gsv-emo-model-group").show();
    }
  });

  // 监听角色名输入框变化，实时同步到情绪下拉框
  $("#siren-gsv-char-list").on("input", ".siren-gsv-char-name", function () {
    syncEmoCharDropdowns();
  });

  // 监听情绪角色选择下拉框的变更，更新 data 缓存
  $("#siren-gsv-emo-list").on("change", ".siren-gsv-emo-char", function () {
    $(this).attr("data-current-val", $(this).val());
  });

  // --- 4. 独立保存逻辑 (核心更新) ---
  $("#siren-gsv-save-btn").on("click", async function (e, isSilent = false) {
    // A. 保存全局 API 和 高级参数 (静默)
    if (!settings.tts.gptsovits) settings.tts.gptsovits = {};
    settings.tts.gptsovits.api_base = $("#siren-gsv-api").val().trim();
    settings.tts.gptsovits.api_key = $("#siren-gsv-apikey").val().trim();

    // 全局高级参数
    settings.tts.gptsovits.text_split_method = $(
      "#siren-gsv-global-split",
    ).val();
    settings.tts.gptsovits.fragment_interval = parseFloat(
      $("#siren-gsv-global-interval").val(),
    );
    settings.tts.gptsovits.parallel_infer = $("#siren-gsv-global-parallel").is(
      ":checked",
    );
    settings.tts.gptsovits.speed_factor = parseFloat(
      $("#siren-gsv-global-speed").val(),
    );
    settings.tts.gptsovits.temperature = parseFloat(
      $("#siren-gsv-global-temp").val(),
    );
    settings.tts.gptsovits.top_p = parseFloat(
      $("#siren-gsv-global-topp").val(),
    );
    settings.tts.gptsovits.top_k = parseInt($("#siren-gsv-global-topk").val());
    settings.tts.gptsovits.repetition_penalty = parseFloat(
      $("#siren-gsv-global-rep").val(),
    );
    settings.tts.gptsovits.seed = parseInt($("#siren-gsv-global-seed").val());
    saveSirenSettings(true);

    // B. 提取角色列表数据
    const charList = [];
    $("#siren-gsv-char-list .siren-gsv-row-item").each(function () {
      const charName = $(this).find(".siren-gsv-char-name").val().trim();
      if (charName) {
        charList.push({
          charName: charName,
          gptModel: $(this).find(".siren-gsv-char-gpt").val(),
          sovitsModel: $(this).find(".siren-gsv-char-sovits").val(),
          // 默认参考音频配置
          refPath: $(this).find(".siren-gsv-char-ref-path").val().trim(),
          promptLang: $(this).find(".siren-gsv-char-prompt-lang").val(),
          refText: $(this).find(".siren-gsv-char-ref-text").val().trim(),
          // 高级参数 (从绑定的 data 属性读取)
          speedFactor: parseFloat($(this).attr("data-speed") || 1.0),
          temperature: parseFloat($(this).attr("data-temp") || 1.0),
          topP: parseFloat($(this).attr("data-topp") || 1.0),
          topK: parseInt($(this).attr("data-topk") || 15),
          repetitionPenalty: parseFloat($(this).attr("data-rep") || 1.35),
          seed: parseInt($(this).attr("data-seed") || -1),
          textLang: $(this).attr("data-textlang") || "中文",
        });
      }
    });

    // C. 提取情绪规则数据
    const emoList = [];
    $("#siren-gsv-emo-list .siren-gsv-row-item").each(function () {
      const charName = $(this).find(".siren-gsv-emo-char").val();
      const emotion = $(this).find(".siren-gsv-emo-name").val().trim();
      const mode = $(this).find(".siren-gsv-emo-mode-sel").val();

      if (charName && emotion) {
        let config = {
          charName: charName,
          emotion: emotion,
          mode: mode,
        };

        // 根据模式读取不同的 DOM 节点
        if (mode === "audio") {
          config.refPath = $(this).find(".siren-gsv-emo-ref-path").val().trim();
          config.refText = $(this).find(".siren-gsv-emo-ref-text").val().trim();
        } else if (mode === "model") {
          config.gptModel = $(this).find(".siren-gsv-emo-gpt").val();
          config.promptLang = $(this)
            .find(".siren-gsv-emo-model-prompt-lang")
            .val();
          config.refPath = $(this)
            .find(".siren-gsv-emo-model-ref-path")
            .val()
            .trim();
          config.refText = $(this)
            .find(".siren-gsv-emo-model-ref-text")
            .val()
            .trim();
        }
        emoList.push(config);
      }
    });

    const payload = {
      characters: charList,
      emotions: emoList,
    };

    // D. 调用 utils 中封装的角色卡保存方法
    await saveToCharacterCard("siren_voice_gptsovits", payload, true);

    // 我们自己弹出更精准的提示
    if (!isSilent && window.toastr) {
      window.toastr.success("GSV: 配置已保存，已自动切换并同步世界书！");
    }
    if (typeof updateTestDropdowns === "function") {
      setTimeout(() => updateTestDropdowns(), 300);
    }

    // 强制切换为 GPT-SoVITS 并同步世界书
    const currentSettings = getSirenSettings();
    currentSettings.tts.provider = "gptsovits";
    currentSettings.tts.enabled = true;
    saveSirenSettings(true);
    await syncTtsWorldbookEntries("gptsovits", true);
  });

  // ==========================================
  // 5. 发音测试区专属逻辑
  // ==========================================
  // 监听：选择角色后，动态更新对应的情绪列表
  $("#siren-gsv-test-char").on("change", function () {
    const selChar = $(this).val();
    const cardData = getGptSovitsCardData();
    const emos = cardData.emotions || [];
    const $moodSel = $("#siren-gsv-test-mood");

    $moodSel.empty().append('<option value="">(使用默认角色情绪)</option>');
    if (selChar) {
      const charEmos = emos.filter((e) => e.charName === selChar);
      charEmos.forEach((e) => {
        const modeLabel = e.mode === "audio" ? "音频参考" : "模型切换";
        $moodSel.append(
          `<option value="${e.emotion}">${e.emotion} [${modeLabel}]</option>`,
        );
      });
    }
  });

  refreshGptSovitsData();
  fetchCustomRefs();

  $("#siren-gsv-test-generate").on("click", async function () {
    const text = $("#siren-gsv-test-text").val().trim();
    const charName = $("#siren-gsv-test-char").val();
    const moodName = $("#siren-gsv-test-mood").val();

    if (!text || !charName) {
      if (window.toastr) window.toastr.warning("请选择测试角色并输入台词！");
      return;
    }

    const $btn = $(this);
    const $status = $("#siren-gsv-test-status");
    const $audio = $("#siren-gsv-test-audio");
    const $download = $("#siren-gsv-test-download");

    // UI 状态切换
    $btn
      .prop("disabled", true)
      .html('<i class="fa-solid fa-spinner fa-spin"></i> 生成中...');
    $status.text("正在推理，请稍候...").css("color", "#0ea5e9");
    $audio.hide();
    $download.hide();

    try {
      // 调用数据层进行生成
      const blob = await generateGptSovitsAudio(text, charName, moodName);

      // 成功后装载音频
      const url = URL.createObjectURL(blob);
      $audio.attr("src", url).show();
      $download.attr("href", url).show();
      $status.text("✅ 推理完成").css("color", "#10b981");

      // 自动播放试听
      $audio[0].play();
    } catch (err) {
      console.error("[Siren GSV Test]", err);
      $status.text("❌ " + err.message).css("color", "#ef4444");
    } finally {
      $btn
        .prop("disabled", false)
        .html('<i class="fa-solid fa-bolt"></i> 生成');
    }
  });
}

function updateTestDropdowns() {
  // 重新从角色卡读取最新数据
  const cardData = getGptSovitsCardData();
  const chars = cardData.characters || [];

  const $charSel = $("#siren-gsv-test-char");
  const lastSelected = $charSel.val(); // 记录当前选了谁

  $charSel.empty().append('<option value="">(选择角色音色)</option>');

  if (chars.length > 0) {
    chars.forEach((c) => {
      $charSel.append(`<option value="${c.charName}">${c.charName}</option>`);
    });
    if (lastSelected && chars.find((c) => c.charName === lastSelected)) {
      $charSel.val(lastSelected);
    }
  } else {
    $charSel.append('<option value="">(未检测到角色配置)</option>');
  }

  // 触发一次 change 以便刷新情绪列表
  $charSel.trigger("change");
}

// 🌟 核心封装：读取最新配置并重新渲染整个 GSV 面板
function refreshGptSovitsData() {
  // 1. 刷新全局设置 (API 相关)
  const currentSettings = getSirenSettings();
  if (currentSettings.tts?.gptsovits) {
    $("#siren-gsv-api").val(
      currentSettings.tts.gptsovits.api_base || "http://127.0.0.1:9880",
    );
    $("#siren-gsv-apikey").val(currentSettings.tts.gptsovits.api_key || "");

    // 渲染新增加的全局参数
    $("#siren-gsv-global-split").val(
      currentSettings.tts.gptsovits.text_split_method || "按标点符号切",
    );
    $("#siren-gsv-global-interval").val(
      currentSettings.tts.gptsovits.fragment_interval || 0.3,
    );
    $("#siren-gsv-interval-val").text(
      $("#siren-gsv-global-interval").val() + "s",
    );
    $("#siren-gsv-global-parallel").prop(
      "checked",
      currentSettings.tts.gptsovits.parallel_infer ?? true,
    );
  }

  // 2. 清空并重新加载角色卡局部设置
  $("#siren-gsv-char-list").empty();
  $("#siren-gsv-emo-list").empty();

  const cardData = getGptSovitsCardData();
  const savedChars = cardData.characters || [];
  const savedEmos = cardData.emotions || [];

  if (savedChars.length === 0) createCharRow();
  else savedChars.forEach((c) => createCharRow(c));

  if (savedEmos.length === 0) createEmoRow();
  else savedEmos.forEach((e) => createEmoRow(e));

  // 3. 重新同步下拉框
  syncEmoCharDropdowns();

  // 4. 如果测试区的更新函数已加载，一并更新
  updateTestDropdowns();
}

// 2. 监听事件：当切换聊天/角色时，自动刷新面板数据
$(window)
  .off("siren:character_changed.gsv")
  .on("siren:character_changed.gsv", function () {
    // 只有当 GPT-SoVITS 面板处于渲染状态时，才去执行刷新，节省性能
    if ($("#siren-gptsovits-wrapper").length > 0) {
      console.log("[Siren GSV] 🔄 检测到对话切换，正在加载新角色卡配置...");
      refreshGptSovitsData();
    }
  });

// ----------------------------------------------------
// 行创建辅助函数
// ----------------------------------------------------
// 🌟 新增：将底层的 "v4::ModelName" 翻译为 "[v4] ModelName" 供初始渲染显示
function formatModelNameForDisplay(rawVal) {
  if (!rawVal) return "";
  if (rawVal.includes("::")) {
    const parts = rawVal.split("::");
    return `[${parts[0]}] ${parts[1]}`;
  }
  return rawVal;
}

function createCharRow(data = {}) {
  const langOptions = [
    "中文",
    "英语",
    "日语",
    "粤语",
    "韩语",
    "中英混合",
    "日英混合",
    "粤英混合",
    "韩英混合",
    "多语种混合",
    "多语种混合(粤语)",
  ];
  const buildLangOpts = (selected) =>
    langOptions
      .map(
        (l) =>
          `<option value="${l}" ${l === (selected || "中文") ? "selected" : ""}>${l}</option>`,
      )
      .join("");

  // 注意我们将高级参数通过 data-* 属性绑定在根节点上，方便读取
  const html = `
        <div class="siren-gsv-row-item siren-ext-setting-row" 
             data-speed="${data.speedFactor || 1.0}" data-temp="${data.temperature || 1.0}" 
             data-topp="${data.topP || 1.0}" data-topk="${data.topK || 15}" 
             data-rep="${data.repetitionPenalty || 1.35}" data-seed="${data.seed || -1}" data-textlang="${data.textLang || "中文"}"
             style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 4px;">
            
            <div style="display: flex; gap: 8px; align-items: center; width: 100%; flex-wrap: wrap;">
                <input type="text" class="siren-ext-input siren-gsv-char-name" placeholder="角色名" value="${data.charName || ""}" style="${rowInputStyle} flex: 1.2; min-width: 100px;">
                <select class="siren-ext-select siren-gsv-char-gpt" style="${rowInputStyle} flex: 1.5; min-width: 130px;">
                    <option value="${data.gptModel || ""}">${formatModelNameForDisplay(data.gptModel) || "GPT模型..."}</option>
                </select>
                <select class="siren-ext-select siren-gsv-char-sovits" style="${rowInputStyle} flex: 1.5; min-width: 130px;">
                    <option value="${data.sovitsModel || ""}">${formatModelNameForDisplay(data.sovitsModel) || "SoVITS模型..."}</option>
                </select>
                <div style="display: flex; gap: 8px; margin-left: auto;">
                    <button class="siren-ext-btn siren-ext-btn-secondary siren-gsv-adv-btn" style="height: 32px; padding: 0 10px; color: #f59e0b; flex-shrink: 0;" title="高级设置"><i class="fa-solid fa-sliders"></i></button>
                    <button class="siren-ext-btn siren-ext-btn-secondary siren-gsv-del-btn" style="height: 32px; color: #ef4444; padding: 0 10px; flex-shrink: 0;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; width: 100%; flex-wrap: wrap;">
                <input type="text" list="siren-gsv-ref-list" class="siren-ext-input siren-gsv-char-ref-path" placeholder="默认参考音频文件名" value="${data.refPath || ""}" style="${rowInputStyle} flex: 2; min-width: 150px;">
                <select class="siren-ext-select siren-gsv-char-prompt-lang" style="${rowInputStyle} flex: 1; min-width: 100px;" title="参考音频语种">
                    ${buildLangOpts(data.promptLang)}
                </select>
            </div>
            
            <div style="width: 100%;">
                <input type="text" class="siren-ext-input siren-gsv-char-ref-text" placeholder="默认参考音频文件内容" value="${data.refText || ""}" style="${rowInputStyle} width: 100%;">
            </div>
        </div>
    `;
  $("#siren-gsv-char-list").append(html);
}

function createEmoRow(data = {}) {
  const mode = data.mode || "audio";
  const langOptions = [
    "中文",
    "英语",
    "日语",
    "粤语",
    "韩语",
    "中英混合",
    "日英混合",
    "粤英混合",
    "韩英混合",
    "多语种混合",
    "多语种混合(粤语)",
  ];
  const buildLangOpts = (selected) =>
    langOptions
      .map(
        (l) =>
          `<option value="${l}" ${l === (selected || "中文") ? "selected" : ""}>${l}</option>`,
      )
      .join("");

  const html = `
        <div class="siren-gsv-row-item siren-ext-setting-row" style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
            
            <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                <select class="siren-ext-select siren-gsv-emo-char" data-current-val="${data.charName || ""}" style="${rowInputStyle} flex: 1; min-width: 100px;">
                    <option value="">选择角色</option>
                </select>
                <input type="text" class="siren-ext-input siren-gsv-emo-name" placeholder="情绪名" value="${data.emotion || ""}" style="${rowInputStyle} flex: 1; min-width: 100px;">
                <button class="siren-ext-btn siren-ext-btn-secondary siren-gsv-del-btn" style="height: 32px; color: #ef4444; padding: 0 10px; flex-shrink: 0;"><i class="fa-solid fa-trash"></i></button>
            </div>
            
            <div style="width: 100%;">
                <select class="siren-ext-select siren-gsv-emo-mode-sel" style="${rowInputStyle} width: 100%;">
                    <option value="audio" ${mode === "audio" ? "selected" : ""}>音频参考</option>
                    <option value="model" ${mode === "model" ? "selected" : ""}>模型控制</option>
                </select>
            </div>
            
            <div class="siren-gsv-emo-audio-group" style="display: ${mode === "audio" ? "flex" : "none"}; gap: 8px; padding-left: 12px; border-left: 2px solid #38bdf8; flex-wrap: wrap;">
                <input type="text" list="siren-gsv-ref-list" class="siren-ext-input siren-gsv-emo-ref-path" placeholder="选择情绪参考音频..." value="${mode === "audio" ? data.refPath || "" : ""}" style="${rowInputStyle} flex: 1; min-width: 140px;">
                <input type="text" class="siren-ext-input siren-gsv-emo-ref-text" placeholder="情绪参考音频文本内容" value="${mode === "audio" ? data.refText || "" : ""}" style="${rowInputStyle} flex: 2; min-width: 140px;">
            </div>

            <div class="siren-gsv-emo-model-group" style="display: ${mode === "model" ? "flex" : "none"}; flex-direction: column; padding-left: 12px; border-left: 2px solid #a855f7; width: 100%;">
                
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <select class="siren-ext-select siren-gsv-emo-gpt" style="${rowInputStyle} flex: 1.5; min-width: 140px;">
                        <option value="${data.gptModel || ""}">${formatModelNameForDisplay(data.gptModel) || "选择情绪GPT模型..."}</option>
                    </select>
                    <select class="siren-ext-select siren-gsv-emo-model-prompt-lang" style="${rowInputStyle} flex: 1; min-width: 100px;" title="独立参考音频语种">
                        ${buildLangOpts(data.promptLang)}
                    </select>
                    <input type="text" list="siren-gsv-ref-list" class="siren-ext-input siren-gsv-emo-model-ref-path" placeholder="独立参考音频(不填用角色默认)" value="${mode === "model" ? data.refPath || "" : ""}" style="${rowInputStyle} flex: 1.5; min-width: 150px;">
                </div>
                
                <div style="width: 100%;">
                    <input type="text" class="siren-ext-input siren-gsv-emo-model-ref-text" placeholder="独立参考音频文本(不填用角色默认)" value="${mode === "model" ? data.refText || "" : ""}" style="${rowInputStyle} width: 100%;">
                </div>
                
            </div>
        </div>
    `;
  $("#siren-gsv-emo-list").append(html);
}
