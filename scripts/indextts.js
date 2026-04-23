import {
  getSirenSettings,
  saveSirenSettings,
  saveToCharacterCard,
} from "./settings.js";
import { getCharacterTtsConfig, requestIndexTTS } from "./indextts_logic.js";

export function getIndexTtsHtml() {
  return `
        <style>
            .siren-idx-search-item:hover { background: rgba(6, 182, 212, 0.2); color: #06b6d4 !important; }
            .siren-idx-search-results::-webkit-scrollbar { width: 4px; }
            .siren-idx-search-results::-webkit-scrollbar-thumb { background: #06b6d4; border-radius: 2px; }
            /* 强制对齐修复 */
            .siren-idx-align-fix { margin: 0 !important; height: 34px !important; box-sizing: border-box !important; }
            
            /* 👇 新增：隐藏数字输入框的上下箭头，使其变成纯粹的输入框 */
            .siren-idx-emo-weight-input::-webkit-outer-spin-button,
            .siren-idx-emo-weight-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .siren-idx-emo-weight-input[type=number] {
                -moz-appearance: textfield;
            }
        </style>

        <div>
            <div style="margin-bottom: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                    <h4 style="margin: 0; color: #cbd5e1; font-size: 1.1em; white-space: nowrap;"><i class="fa-solid fa-link" style="margin-right: 5px;"></i>API Base</h4>
                    <input type="text" id="siren-indextts-api" class="siren-ext-input" value="http://127.0.0.1:7880" style="flex: 1;">
                    <button id="siren-indextts-check" class="siren-ext-btn siren-ext-btn-secondary" title="健康检查"><i class="fa-solid fa-heart-pulse" style="color:#ef4444;"></i></button>
                    
                    <button id="siren-idx-select-files-btn" class="siren-ext-btn siren-ext-btn-secondary" title="选择需要上传的音频文件">
                        <i class="fa-solid fa-cloud-arrow-up" style="color:#38bdf8;"></i>
                    </button>
                    <input type="file" id="siren-idx-file-input" multiple accept=".wav,.mp3,.flac,.m4a,.ogg,audio/*" style="display: none;">
                </div>

                <div id="siren-idx-upload-staging-area" style="display: none; background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px dashed rgba(56, 189, 248, 0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                        <div id="siren-idx-file-tags-container" style="flex: 1; display: flex; flex-wrap: wrap; gap: 8px; min-height: 34px;">
                        </div>
                        <button id="siren-idx-confirm-upload-btn" class="siren-ext-btn siren-ext-btn-primary" style="flex-shrink: 0; background: linear-gradient(135deg, #0284c7, #38bdf8);">
                            <i class="fa-solid fa-cloud-arrow-up"></i> 确认上传
                        </button>
                    </div>
                </div>
            </div>

            <hr class="siren-ext-divider" style="border-color: #334155;">

            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #38bdf8; font-size: 1.1em;"><i class="fa-solid fa-users" style="margin-right: 5px;"></i>角色列表</h4>
                    <button id="siren-idx-char-add" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 2px 8px; font-size: 0.85em;"><i class="fa-solid fa-plus"></i> 添加</button>
                </div>
                
                <div id="siren-idx-char-list" style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; margin-bottom: 10px; min-height: 50px;">
                    </div>
            </div>

            <hr class="siren-ext-divider" style="border-color: #334155;">

            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #fb7185; font-size: 1.1em;"><i class="fa-solid fa-masks-theater" style="margin-right: 5px;"></i>情绪列表</h4>
                    <button id="siren-idx-emo-add" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 2px 8px; font-size: 0.85em;"><i class="fa-solid fa-plus"></i> 添加</button>
                </div>
                
                <div id="siren-idx-emo-list" style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; margin-bottom: 15px; min-height: 50px;">
                </div>
                <div class="siren-ext-setting-row siren-ext-flex-between" style="border: none; padding: 0;">
                    <div class="siren-ext-setting-label">
                        <label style="font-size: 1.1em; color: #cbd5e1;">全局情绪权重</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; width: 50%;">
                        <input type="range" id="siren-idx-emo-weight" class="siren-ext-progress-bar" min="0" max="1.6" step="0.05" value="0.65" style="flex: 1; --progress: 40.625%;">
                        <span id="siren-idx-emo-weight-val" style="font-family: monospace; width: 35px; text-align: right; color: #06b6d4;">0.65</span>
                    </div>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #94a3b8; font-size: 1.1em;"><i class="fa-solid fa-wrench" style="margin-right: 5px;"></i>高级参数</h4>
    
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; color: #cbd5e1; cursor: pointer;">
                        <input type="checkbox" id="siren-idx-param-dosample" checked style="accent-color: #10b981;"> 采样
                    </label>
                    <label style="display: flex; align-items: center; gap: 5px; font-size: 0.85em; color: #cbd5e1; cursor: pointer;" title="作用于自然语言情绪控制">
                        <input type="checkbox" id="siren-idx-param-emorandom" style="accent-color: #a855f7;"> 情绪随机
                    </label>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="20-600">分句最大 Token</label>
                        <input type="text" id="siren-idx-param-maxtxt" value="120" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="0.1-2">温度 (Temp)</label>
                        <input type="text" id="siren-idx-param-temp" value="0.8" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="0-1">Top P</label>
                        <input type="text" id="siren-idx-param-topp" value="0.8" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="0-100">Top K</label>
                        <input type="text" id="siren-idx-param-topk" value="30" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="1-10">Num Beams</label>
                        <input type="text" id="siren-idx-param-beams" value="3" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title=">=1.0">重复惩罚</label>
                        <input type="text" id="siren-idx-param-rep" value="10.0" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="-10 ~ 10">长度惩罚</label>
                        <input type="text" id="siren-idx-param-len" value="0.0" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.85em; color: #cbd5e1;" title="50-1815">max_mel_tokens</label>
                        <input type="text" id="siren-idx-param-mel" value="1500" class="siren-ext-input" style="width: 70px; text-align: center;">
                    </div>
                </div>
            </div>
            <button id="siren-idx-global-save" class="siren-ext-btn siren-ext-btn-primary" style="width: 100%; padding: 12px 0; justify-content: center; font-size: 1.05em; margin-top: 15px; background: linear-gradient(135deg, #0ea5e9, #10b981); border: none;">
                <i class="fa-solid fa-layer-group"></i> 保存全部配置
            </button>

            <hr class="siren-ext-divider" style="border-color: #334155;">

            <div id="siren-idx-vector-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(6, 11, 23, 0.85); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;">
                <div style="background: #0f172a; border: 1px solid #a855f7; border-radius: 12px; width: 450px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    <h3 style="margin: 0 0 15px 0; color: #d8b4fe; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                        <i class="fa-solid fa-wave-square" style="margin-right:8px;"></i>情感向量调节仪
                    </h3>

                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 15px 20px; border-radius: 8px;">
                        
                        <div style="flex: 3;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: #cbd5e1; margin-bottom: 8px;">
                                <span>情感权重</span>
                                <span id="siren-idx-modal-weight-val" style="color: #06b6d4; font-family: monospace;">0.65</span>
                            </div>
                            <input type="range" id="siren-idx-modal-weight-slider" class="siren-ext-progress-bar" min="0" max="1.0" step="0.05" value="0.65" style="--progress: 65%; width: 100%;">
                        </div>

                        <div style="width: 1px; height: 35px; background: rgba(255, 255, 255, 0.1);"></div>
                        
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                            <span style="font-size: 0.9em; color: #cbd5e1;">随机化</span>
                            <label class="siren-ext-switch">
                                <input type="checkbox" id="siren-idx-modal-random-cb">
                                <span class="siren-ext-slider"></span>
                            </label>
                        </div>
                        
                    </div>
                    
                    <div id="siren-idx-vector-sliders" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                        </div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px;">
                        <button id="siren-idx-vec-cancel" class="siren-ext-btn siren-ext-btn-secondary">取消</button>
                        <button id="siren-idx-vec-save" class="siren-ext-btn siren-ext-btn-primary" style="background: linear-gradient(135deg, #7e22ce, #a855f7); border: none; box-shadow: 0 2px 10px rgba(168,85,247,0.4);">
                            <i class="fa-solid fa-check"></i> 确认保存
                        </button>
                    </div>
                </div>
            </div>
            <hr class="siren-ext-divider" style="border-color: #334155;">

            <h4 style="color: #10b981; margin-bottom: 10px; font-size: 1.1em;"><i class="fa-solid fa-vial" style="margin-right: 5px;"></i> IndexTTS 发音测试</h4>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 10px;">
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select id="siren-idx-test-char" class="siren-ext-select" style="flex: 1;">
                        <option value="">(选择角色音色)</option>
                    </select>
                    <select id="siren-idx-test-mood" class="siren-ext-select" style="flex: 1;">
                        <option value="0">使用参考音频情绪 (默认)</option>
                        <option value="3">自然语言描述 (Text)</option> </select>
                </div>

                <div id="siren-idx-test-emo-text-wrapper" style="display: none; margin-bottom: 10px;">
                    <input type="text" id="siren-idx-test-emo-text" class="siren-ext-input" style="width: 100%;" placeholder="输入情感描述，例如：十分悲伤地、兴奋地、充满诱惑地...">
                </div>
                <textarea id="siren-idx-test-text" class="siren-ext-textarea" rows="2" placeholder="输入一句台词，测试 IndexTTS 引擎输出..."></textarea>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <button id="siren-idx-test-generate" class="siren-ext-btn siren-ext-btn-primary" style="background: #10b981; border-color: #10b981;"><i class="fa-solid fa-bolt"></i> 生成</button>
                    
                    <div id="siren-idx-test-preview" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                        <audio id="siren-idx-test-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                        
                        <a id="siren-idx-test-download" class="siren-ext-btn siren-ext-btn-secondary" style="display: none; padding: 4px 10px; text-decoration: none; color: #cbd5e1;" download="siren_test.wav" title="下载音频排查吞字">
                            <i class="fa-solid fa-download"></i>
                        </a>
                        
                        <span id="siren-idx-test-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;">等待生成...</span>
                    </div>
                </div>
            </div>
        </div>

        </div>
    `;
}

const charRowHtml = `
<div class="siren-ext-setting-row" style="display: flex; gap: 8px; border: none; padding: 0; margin-bottom: 5px; align-items: center;">
    
    <div style="flex: 2; display: flex; min-width: 0;">
        <input type="text" class="siren-ext-input siren-idx-align-fix" placeholder="角色名" style="width: 100%; min-width: 0;">
    </div>
    
    <div style="position: relative; flex: 3; display: flex; gap: 4px; min-width: 0;">
        <input type="text" class="siren-ext-input siren-idx-audio-input siren-idx-align-fix" placeholder="输入关键字搜索" style="flex: 1; min-width: 0;">
        <div class="siren-idx-search-results" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; width: 100%; max-height: 150px; overflow-y: auto; background: #1e293b; border: 1px solid #06b6d4; border-radius: 6px; z-index: 100;"></div>
    </div>
    <button class="siren-ext-btn siren-ext-btn-secondary siren-idx-row-del siren-idx-align-fix" style="color: #ef4444; flex-shrink: 0;" title="删除"><i class="fa-solid fa-trash"></i></button>
</div>
`;

// 情绪行模板
const emoRowHtml = `
<div class="siren-ext-setting-row" style="display: flex; gap: 8px; border: none; padding: 0; margin-bottom: 8px; align-items: center;">
  
    <div style="display: flex; gap: 8px; flex: 2; min-width: 0;">
        <input type="text" class="siren-ext-input siren-idx-align-fix" placeholder="情绪名" style="flex: 1.5; min-width: 0;">
        <select class="siren-ext-select siren-idx-emo-method-select siren-idx-align-fix" style="flex: 1.5; min-width: 0;">
            <option value="audio" selected>参考音频</option>
            <option value="vector">情绪向量</option>
        </select>
    </div>
  
    <div class="siren-idx-audio-mode-ui" style="position: relative; flex: 3; display: flex; gap: 4px; min-width: 0;">
        <input type="text" class="siren-ext-input siren-idx-audio-input siren-idx-align-fix" placeholder="关键字搜索" style="flex: 2; min-width: 0;">
        <input type="number" class="siren-ext-input siren-idx-emo-weight-input siren-idx-align-fix" placeholder="情绪权重" min="0" max="1.6" step="0.05" style="width: 95px; flex-shrink: 0; text-align: center;" title="独立情绪权重 (0-1.6)">
        <div class="siren-idx-search-results" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; width: 100%; max-height: 150px; overflow-y: auto; background: #1e293b; border: 1px solid #06b6d4; border-radius: 6px; z-index: 100;"></div>
    </div>
    
    <div class="siren-idx-vector-mode-ui" style="flex: 3; display: none; gap: 8px; min-width: 0; align-items: center;">
        <button class="siren-ext-btn siren-idx-vec-open-btn siren-idx-align-fix" style="flex: 1; background: rgba(168, 85, 247, 0.1); border: 1px solid #a855f7; color: #d8b4fe; justify-content: center; min-width: 0;">
            <i class="fa-solid fa-sliders"></i> 调整 8 维向量
        </button>
        <input type="hidden" class="siren-idx-vec-data" value="[0,0,0,0,0,0,0,0]">
        <input type="hidden" class="siren-idx-vec-weight-hidden" value="">
        <input type="hidden" class="siren-idx-vec-random-hidden" value="false">
    </div>
    <button class="siren-ext-btn siren-ext-btn-secondary siren-idx-row-del siren-idx-align-fix" style="color: #ef4444; flex-shrink: 0;"><i class="fa-solid fa-trash"></i></button>
</div>
`;

export function loadCharacterTtsList() {
  const $charList = $("#siren-idx-char-list");
  $charList.empty(); // 清空旧列表

  const context = SillyTavern.getContext();
  if (context && context.characterId !== undefined) {
    const charConfig = getCharacterTtsConfig(context.characterId);
    if (charConfig && charConfig.voices) {
      Object.entries(charConfig.voices).forEach(([charName, voicePath]) => {
        const $row = $(charRowHtml);
        $row.find('input[placeholder="角色名"]').val(charName);
        $row.find(".siren-idx-audio-input").val(voicePath);
        $charList.append($row);
      });
    }
  }
}

export async function loadIndexTtsData() {
  const settings = getSirenSettings();
  const ttsSettings = settings?.tts?.indextts || {};

  // 基础与高级参数回显
  $("#siren-indextts-api").val(ttsSettings.api_base || "http://127.0.0.1:7880");
  $("#siren-idx-param-dosample").prop("checked", ttsSettings.do_sample ?? true);
  $("#siren-idx-param-emorandom").prop(
    "checked",
    ttsSettings.emo_random || false,
  );
  $("#siren-idx-param-maxtxt").val(
    ttsSettings.max_text_tokens_per_segment ?? 120,
  );
  $("#siren-idx-param-temp").val(ttsSettings.temperature ?? 0.8);
  $("#siren-idx-param-topp").val(ttsSettings.top_p ?? 0.8);
  $("#siren-idx-param-topk").val(ttsSettings.top_k ?? 30);
  $("#siren-idx-param-beams").val(ttsSettings.num_beams ?? 3);
  $("#siren-idx-param-rep").val(ttsSettings.repetition_penalty ?? 10.0);
  $("#siren-idx-param-len").val(ttsSettings.length_penalty ?? 0.0);
  $("#siren-idx-param-mel").val(ttsSettings.max_mel_tokens ?? 1500);
  $("#siren-idx-emo-weight")
    .val(ttsSettings.emo_weight ?? 0.65)
    .trigger("input");

  // 情绪列表回显
  const $emoList = $("#siren-idx-emo-list");
  $emoList.empty();
  if (Array.isArray(ttsSettings.emotion_presets)) {
    ttsSettings.emotion_presets.forEach((emo) => {
      const $row = $(emoRowHtml);
      $row.find('input[placeholder="情绪名"]').val(emo.name);
      if (emo.method === "vector") {
        $row.find(".siren-idx-emo-method-select").val("vector");
        $row.find(".siren-idx-audio-mode-ui").hide();
        $row.find(".siren-idx-vector-mode-ui").css("display", "flex");
        $row
          .find(".siren-idx-vec-data")
          .val(JSON.stringify(emo.emo_vec || [0, 0, 0, 0, 0, 0, 0, 0]));
        $row
          .find(".siren-idx-vec-random-hidden")
          .val(emo.emo_random ? "true" : "false");
        if (emo.emo_weight !== undefined && emo.emo_weight !== null) {
          $row.find(".siren-idx-vec-weight-hidden").val(emo.emo_weight);
        } else {
          $row.find(".siren-idx-vec-weight-hidden").val("");
        }
      } else {
        $row.find(".siren-idx-emo-method-select").val("audio");
        $row
          .find(".siren-idx-audio-mode-ui .siren-idx-audio-input")
          .val(emo.ref_audio || "");
        if (emo.emo_weight !== undefined && emo.emo_weight !== null) {
          $row
            .find(".siren-idx-audio-mode-ui .siren-idx-emo-weight-input")
            .val(emo.emo_weight);
        }
      }
      $emoList.append($row);
    });
  }
  loadCharacterTtsList();

  // 角色列表（读取当前角色卡）回显
  const $charList = $("#siren-idx-char-list");
  $charList.empty();
  const context = SillyTavern.getContext();
  if (context && context.characterId !== undefined) {
    const charConfig = getCharacterTtsConfig(context.characterId);
    if (charConfig && charConfig.voices) {
      Object.entries(charConfig.voices).forEach(([charName, voicePath]) => {
        const $row = $(charRowHtml); // 确保 charRowHtml 在作用域内
        $row.find('input[placeholder="角色名"]').val(charName);
        $row.find(".siren-idx-audio-input").val(voicePath);
        $charList.append($row);
      });
    }
  }
}

export function bindIndexTtsEvents() {
  // 1. 情绪权重滑块动画 (统一使用 jQuery，解决 .trigger('input') 无法唤醒原生事件导致加载时错位的问题)
  $("#siren-idx-emo-weight")
    .off("input")
    .on("input", function () {
      const val = parseFloat($(this).val());
      $("#siren-idx-emo-weight-val").text(val.toFixed(2));
      // 最大值为 1.6，所以进度百分比为 val / 1.6
      $(this).css("--progress", `${(val / 1.6) * 100}%`);
    });

  // 2. 搜索音频核心逻辑 (支持点击放大镜，以及输入框边打字边搜索)
  let searchTimeout = null;

  // 封装一个独立的搜索函数
  async function executeVoiceSearch($container, keyword) {
    const $results = $container.find(".siren-idx-search-results");
    const apiBase = $("#siren-indextts-api").val().replace(/\/+$/, "");
    try {
      const res = await fetch(`${apiBase}/api/v1/voices`);
      if (!res.ok) throw new Error("API 请求失败");
      const data = await res.json();
      const voices = data.voices || [];
      const filtered = keyword
        ? voices.filter((v) => v.toLowerCase().includes(keyword.toLowerCase()))
        : voices;
      $results.empty();
      if (filtered.length === 0) {
        $results.append(
          '<div style="padding: 10px; color: #94a3b8; font-size: 0.85em; text-align: center;">未找到匹配的音频</div>',
        );
      } else {
        filtered.forEach((voice) => {
          $results.append(
            `<div class="siren-idx-search-item" style="padding: 8px 12px; cursor: pointer; color: #e2e8f0; font-size: 0.9em; border-bottom: 1px solid #1e293b; transition: all 0.2s;">${voice}</div>`,
          );
        });
      }
      $(".siren-idx-search-results").not($results).slideUp(200);
      $results.slideDown(200);
    } catch (err) {
      console.error("获取音频列表失败", err);
      $results
        .empty()
        .append(
          '<div style="padding: 10px; color: #ef4444; font-size: 0.85em; text-align: center;">获取失败，请检查服务</div>',
        );
      $results.slideDown(200);
    }
  }

  // （已移除点击放大镜事件）
  // 绑定输入框的输入事件（防抖，打字停顿 0.4 秒后自动搜索）
  $("#siren-tts-provider-settings")
    .off("input", ".siren-idx-audio-input")
    .on("input", ".siren-idx-audio-input", function () {
      const $container = $(this).parent();
      const keyword = $(this).val().trim();

      clearTimeout(searchTimeout);

      // 如果输入框被清空了，隐藏下拉框
      if (!keyword) {
        $container.find(".siren-idx-search-results").slideUp(200);
        return;
      }
      searchTimeout = setTimeout(() => {
        executeVoiceSearch($container, keyword);
      }, 400);
    });

  // 绑定输入框获取焦点事件
  $("#siren-tts-provider-settings")
    .off("focus", ".siren-idx-audio-input")
    .on("focus", ".siren-idx-audio-input", function () {
      const $container = $(this).parent();
      const keyword = $(this).val().trim();

      // 只有当输入框里已经有字的时候，点击聚焦才展开搜索；空白时不操作避免闪现
      if (keyword) {
        executeVoiceSearch($container, keyword);
      }
    });

  // 3. 点击下拉列表，将选中的文本填入输入框
  $("#siren-tts-provider-settings")
    .off("click", ".siren-idx-search-item")
    .on("click", ".siren-idx-search-item", function () {
      const $item = $(this);
      const text = $item.text();

      // 【修改这里】：通过搜索结果框找它的父容器，最稳妥
      const $container = $item.closest(".siren-idx-search-results").parent();

      $container.find(".siren-idx-audio-input").val(text);
      $container.find(".siren-idx-search-results").slideUp(200);
    });

  // 4. 点击外部空白处，隐藏搜索结果框
  $(document)
    .off("click.sirenHideSearch")
    .on("click.sirenHideSearch", function (e) {
      if (
        !$(e.target).closest(
          ".siren-idx-audio-search, .siren-idx-search-results",
        ).length
      ) {
        $(".siren-idx-search-results").slideUp(200);
      }
    });

  // ==========================================
  // 3. 测试区域逻辑 (读取面板临时状态并发送请求)
  // ==========================================

  // 动态抓取当前面板上的角色和情绪，填充到下拉菜单 (不需要点保存也能测)
  function updateTestDropdowns() {
    const $charSelect = $("#siren-idx-test-char");
    const $moodSelect = $("#siren-idx-test-mood");

    const currentChar = $charSelect.val();
    const currentMood = $moodSelect.val();

    $charSelect.empty().append('<option value="">(选择角色音色)</option>');

    // 保持固定选项
    $moodSelect.empty().append(`
            <option value="0">使用音色音频情绪 (默认)</option>
            <option value="3">自然语言描述 (Text)</option>
        `);

    // 抓取角色行 (保持原有逻辑)
    $("#siren-idx-char-list .siren-ext-setting-row").each(function () {
      const name = $(this).find('input[placeholder="角色名"]').val().trim();
      const path = $(this).find(".siren-idx-audio-input").val().trim();
      if (name && path) {
        $charSelect.append(`<option value="${path}">${name}</option>`);
      }
    });

    // 抓取全局情绪预设行 (保持原有逻辑)
    $("#siren-idx-emo-list .siren-ext-setting-row").each(function () {
      const name = $(this).find('input[placeholder="情绪名"]').val().trim();
      const method = $(this).find(".siren-idx-emo-method-select").val();

      let dataVal = "";
      let weightVal = 0.65;
      let randomVal = false;

      if (method === "audio") {
        dataVal = $(this)
          .find(".siren-idx-audio-mode-ui .siren-idx-audio-input")
          .val()
          .trim();
        const w = $(this)
          .find(".siren-idx-audio-mode-ui .siren-idx-emo-weight-input")
          .val();
        weightVal = w === "" ? 0.65 : parseFloat(w);
      } else if (method === "vector") {
        dataVal = $(this).find(".siren-idx-vec-data").val();
        randomVal =
          $(this).find(".siren-idx-vec-random-hidden").val() === "true";
        const w = $(this).find(".siren-idx-vec-weight-hidden").val();
        weightVal = w === "" ? 0.65 : parseFloat(w);
      }

      if (name) {
        // 把 weight 和 random 一并打包进 value 里
        const optVal = JSON.stringify({
          method,
          data: dataVal,
          weight: weightVal,
          random: randomVal,
        });
        $moodSelect.append(
          `<option value='${optVal}'>${name} (${method === "audio" ? "参考音频" : "情感向量"})</option>`,
        );
      }
    });

    if (currentChar) $charSelect.val(currentChar);
    if (currentMood) $moodSelect.val(currentMood);
  }

  // 当鼠标点进下拉框时，自动拉取最新的配置
  $("#siren-idx-test-char, #siren-idx-test-mood").on(
    "mousedown",
    updateTestDropdowns,
  );

  // 监听测试区域情绪下拉框变化
  $("#siren-idx-test-mood")
    .off("change")
    .on("change", function () {
      const val = $(this).val();
      if (val === "3") {
        $("#siren-idx-test-emo-text-wrapper").slideDown(200);
      } else {
        $("#siren-idx-test-emo-text-wrapper").slideUp(200);
      }
    });

  // 点击生成按钮发请求
  $("#siren-idx-test-generate")
    .off("click")
    .on("click", async function () {
      const charAudioPath = $("#siren-idx-test-char").val();
      let text = $("#siren-idx-test-text").val().trim(); // 把 const 改成 let
      const moodVal = $("#siren-idx-test-mood").val();

      if (!charAudioPath) return window.toastr?.warning("请先选择角色音色！");
      if (!text) return window.toastr?.warning("请输入要测试的台词！");

      // 👇 【防吞字补丁】：强制在开头加一个省略号，给模型缓冲时间
      // text = "..." + text;

      const apiBase = $("#siren-indextts-api").val().replace(/\/+$/, "");
      const $btn = $(this);
      const $status = $("#siren-idx-test-status");
      const $audio = $("#siren-idx-test-audio");

      try {
        $btn
          .html('<i class="fa-solid fa-spinner fa-spin"></i> 生成中...')
          .prop("disabled", true);
        $status.text("正在与局域网服务器合成...").css("color", "#0ea5e9");
        $audio.hide();

        // 构建符合你 api.py 的请求体
        // 构建符合 api.py 的请求体
        const payload = {
          text: text,
          prompt_audio: charAudioPath,
          clean_text: true,
          // 移除旧的全局查 DOM 逻辑，移到下面通过下拉选项解析
          emo_weight: parseFloat($("#siren-idx-emo-weight").val()) || 0.65,
          emo_random: $("#siren-idx-param-emorandom").is(":checked"),

          do_sample: $("#siren-idx-param-dosample").is(":checked"),
          max_text_tokens_per_segment:
            parseInt($("#siren-idx-param-maxtxt").val()) || 120,
          temperature: parseFloat($("#siren-idx-param-temp").val()) || 0.8,
          top_p: parseFloat($("#siren-idx-param-topp").val()) || 0.8,
          top_k: parseInt($("#siren-idx-param-topk").val()) || 30,
          repetition_penalty:
            parseFloat($("#siren-idx-param-rep").val()) || 10.0,
          length_penalty: parseFloat($("#siren-idx-param-len").val()) || 0.0,
          max_mel_tokens: parseInt($("#siren-idx-param-mel").val()) || 1500,
        };

        const moodVal = $("#siren-idx-test-mood").val();

        if (moodVal === "3") {
          // 自然语言模式
          payload.emo_control_method = 3;
          payload.emo_text = $("#siren-idx-test-emo-text").val().trim() || text;
          // emo_random 已经取了全局变量，无需修改
        } else if (moodVal === "0") {
          // 默认模式
          payload.emo_control_method = 0;
        } else {
          // 预设模式 (Audio 或 Vector)
          try {
            const moodObj = JSON.parse(moodVal);
            if (moodObj.method === "audio") {
              payload.emo_control_method = 1;
              payload.emo_ref_path = moodObj.data;
              payload.emo_weight = moodObj.weight;
            } else if (moodObj.method === "vector") {
              payload.emo_control_method = 2;
              payload.emo_vec = JSON.parse(moodObj.data);
              payload.emo_random = moodObj.random; // 👇 覆盖为列表里独立的随机参数
              payload.emo_weight = moodObj.weight;
            }
          } catch (e) {
            payload.emo_control_method = 0;
          }
        }

        // 发起 Fetch
        const res = await fetch(`${apiBase}/api/v1/tts/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);

        $audio.attr("src", audioUrl);
        $audio.show();
        const $downloadBtn = $("#siren-idx-test-download");
        $downloadBtn.attr("href", audioUrl);
        $downloadBtn.show();
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.frequency.value = 20; // 【修改】20Hz 次声波（人耳几乎听不到）
          gain.gain.value = 0.01; // 【修改】极小音量（骗过蓝牙音箱的休眠检测）

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5); // 【修改】播放 0.5 秒
        } catch (e) {
          console.warn("[Siren Voice] 唤醒音频硬件失败", e);
        }

        // 【修改】延迟 500 毫秒（等次声波把音箱彻底敲醒），然后再播放真正的语音
        setTimeout(() => {
          $audio[0].play().catch((e) => console.warn("播放失败", e));
        }, 500);

        $status.text("生成成功！").css("color", "#10b981");
      } catch (err) {
        console.error("测试生成失败:", err);
        $status.text("生成失败，请检查控制台。").css("color", "#ef4444");
      } finally {
        $btn
          .html('<i class="fa-solid fa-bolt"></i> 生成')
          .prop("disabled", false);
      }
    });

  // ==========================================
  // 6. API 健康检查逻辑
  // ==========================================
  $("#siren-indextts-check")
    .off("click")
    .on("click", async function (e) {
      e.preventDefault();
      const $btn = $(this);
      const apiBase = $("#siren-indextts-api").val().replace(/\/+$/, "");

      try {
        // 变成加载圈
        $btn.html(
          '<i class="fa-solid fa-spinner fa-spin" style="color:#06b6d4;"></i>',
        );
        const res = await fetch(`${apiBase}/health`);

        if (res.ok) {
          if (window.toastr) window.toastr.success("IndexTTS 引擎连接成功！");
          // 变成绿色打勾
          $btn.html('<i class="fa-solid fa-check" style="color:#10b981;"></i>');
        } else {
          throw new Error("状态码异常");
        }
      } catch (err) {
        console.error(err);
        if (window.toastr)
          window.toastr.error("无法连接到 IndexTTS 服务，请检查端口是否开启。");
        // 保持红色心跳
        $btn.html(
          '<i class="fa-solid fa-heart-pulse" style="color:#ef4444;"></i>',
        );
      }

      // 2秒后恢复原状
      setTimeout(() => {
        $btn.html(
          '<i class="fa-solid fa-heart-pulse" style="color:#ef4444;"></i>',
        );
      }, 2000);
    });

  // ==========================================
  // 6.5 音频上传逻辑
  // ==========================================
  // 点击按钮触发隐藏的 input
  let pendingFiles = []; // 维护待上传的文件队列

  // 渲染暂存区 UI 的辅助函数
  function renderStagingArea() {
    const $container = $("#siren-idx-file-tags-container");
    const $stagingArea = $("#siren-idx-upload-staging-area");
    $container.empty();

    if (pendingFiles.length === 0) {
      $stagingArea.slideUp(200); // 如果清空了，就收起面板
      return;
    }

    // 遍历生成标签
    pendingFiles.forEach((file, index) => {
      const tagHtml = `
                <div class="siren-idx-file-tag">
                    <i class="fa-solid fa-file-audio" style="color: #38bdf8;"></i>
                    <span>${file.name}</span>
                    <i class="fa-solid fa-xmark siren-idx-file-tag-remove" data-index="${index}" title="移除"></i>
                </div>
            `;
      $container.append(tagHtml);
    });

    $stagingArea.slideDown(200); // 展开面板
  }

  // 1. 点击“选择音频”按钮，触发隐藏的 input
  $("#siren-idx-select-files-btn")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      $("#siren-idx-file-input").click();
    });

  // 2. 捕获文件选择，并加入暂存队列
  $("#siren-idx-file-input")
    .off("change")
    .on("change", function (e) {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      // 文件去重（避免重复选择同名文件）
      const existingNames = pendingFiles.map((f) => f.name);
      files.forEach((f) => {
        if (!existingNames.includes(f.name)) {
          pendingFiles.push(f);
        }
      });

      renderStagingArea();
      $(this).val(""); // 清空 input 的值，允许下次选同一个文件
    });

  // 3. 暂存区标签的“移除”按钮点击事件（事件委托）
  $("#siren-idx-file-tags-container")
    .off("click", ".siren-idx-file-tag-remove")
    .on("click", ".siren-idx-file-tag-remove", function () {
      const index = $(this).data("index");
      pendingFiles.splice(index, 1); // 从数组中剔除
      renderStagingArea(); // 重新渲染
    });

  // 4. 执行最终的批量上传
  $("#siren-idx-confirm-upload-btn")
    .off("click")
    .on("click", async function () {
      if (pendingFiles.length === 0) return;

      const apiBase = $("#siren-indextts-api").val().replace(/\/+$/, "");
      const $btn = $(this);
      const originalHtml = $btn.html();

      // 改变按钮状态为“上传中”并禁用
      $btn
        .html('<i class="fa-solid fa-spinner fa-spin"></i> 上传中...')
        .prop("disabled", true);
      $(".siren-idx-file-tag-remove").hide(); // 隐藏删除按钮，防误触

      let successCount = 0;
      let failCount = 0;

      // 挨个发送 POST 请求
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch(`${apiBase}/api/v1/upload`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`上传异常: ${file.name}`, err);
          failCount++;
        }
      }

      // 恢复按钮原状
      $btn.html(originalHtml).prop("disabled", false);

      // 处理结果与清理
      if (window.toastr) {
        if (failCount === 0) {
          window.toastr.success(`成功上传 ${successCount} 个音频！`);
          pendingFiles = []; // 成功后清空队列
          renderStagingArea(); // 收起面板
        } else if (successCount > 0) {
          window.toastr.warning(
            `部分成功：成功 ${successCount} 个，失败 ${failCount} 个。`,
          );
          pendingFiles = []; // 避免状态混乱，直接清空让用户重新选
          renderStagingArea();
        } else {
          window.toastr.error(
            "全部上传失败，请检查控制台报错或文件格式是否支持！",
          );
          $(".siren-idx-file-tag-remove").show(); // 恢复移除按钮
        }
      }
    });

  // ==========================================
  // 7. 动态添加行逻辑
  // ==========================================

  // 角色行模板

  // 绑定添加按钮
  $("#siren-idx-char-add")
    .off("click")
    .on("click", function () {
      $("#siren-idx-char-list").append(charRowHtml);
    });

  $("#siren-idx-emo-add")
    .off("click")
    .on("click", function () {
      $("#siren-idx-emo-list").append(emoRowHtml);
    });

  $("#siren-idx-emo-list")
    .off("change", ".siren-idx-emo-method-select")
    .on("change", ".siren-idx-emo-method-select", function () {
      const val = $(this).val();
      const $row = $(this).closest(".siren-ext-setting-row");

      if (val === "audio") {
        $row.find(".siren-idx-audio-mode-ui").show();
        $row.find(".siren-idx-vector-mode-ui").hide();
      } else {
        $row.find(".siren-idx-audio-mode-ui").hide();
        $row.find(".siren-idx-vector-mode-ui").css("display", "flex"); // 必须用 flex，否则内部元素不对齐
      }
    });

  // ==========================================
  // 向量弹窗核心逻辑
  // ==========================================
  const vectorLabels = [
    "维度1 (喜悦)",
    "维度2 (愤怒)",
    "维度3 (悲伤)",
    "维度4 (恐惧)",
    "维度5 (厌恶)",
    "维度6 (惊讶)",
    "维度7 (平静)",
    "维度8 (激动)",
  ];
  let currentRowVectorInput = null; // 用于记录当前是哪一行的输入框被打开了

  // 动态生成弹窗内的 8 个滑块
  const $slidersContainer = $("#siren-idx-vector-sliders");
  $slidersContainer.empty();
  for (let i = 0; i < 8; i++) {
    $slidersContainer.append(`
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85em; color: #cbd5e1;">
                    <span>${vectorLabels[i]}</span>
                    <span id="siren-vec-val-${i}" style="color: #d8b4fe; font-family: monospace;">0.00</span>
                </div>
                <input type="range" class="siren-ext-progress-bar siren-vec-slider" data-idx="${i}" min="0" max="1.4" step="0.05" value="0" style="--progress: 0%;">
            </div>
        `);
  }

  // 监听弹窗内滑块拖动，更新数值和进度条颜色
  $(".siren-vec-slider").on("input", function () {
    const val = parseFloat($(this).val());
    const idx = $(this).data("idx");
    $(`#siren-vec-val-${idx}`).text(val.toFixed(2));

    // 修改：范围是 0 到 1.4，所以直接除以 1.4 即可得出百分比
    const percentage = (val / 1.4) * 100;
    $(this).css("--progress", `${percentage}%`);
  });

  // 监听弹窗内权重滑块
  $("#siren-idx-modal-weight-slider").on("input", function () {
    const val = parseFloat($(this).val());
    $("#siren-idx-modal-weight-val").text(val.toFixed(2));
    $(this).css("--progress", `${(val / 1.0) * 100}%`);
  });

  // 点击大按钮打开弹窗
  $("#siren-idx-emo-list")
    .off("click", ".siren-idx-vec-open-btn")
    .on("click", ".siren-idx-vec-open-btn", function () {
      const $hiddenInput = $(this).siblings(".siren-idx-vec-data");
      currentRowVectorInput = $hiddenInput; // 锁定当前行

      // 读取并设置权重与随机化
      const savedWeight = $(this)
        .siblings(".siren-idx-vec-weight-hidden")
        .val();
      const isRandom =
        $(this).siblings(".siren-idx-vec-random-hidden").val() === "true";

      // 如果行内未设置权重，抓取全局权重作为回显默认值
      const displayWeight =
        savedWeight !== ""
          ? parseFloat(savedWeight)
          : parseFloat($("#siren-idx-emo-weight").val()) || 0.65;

      $("#siren-idx-modal-weight-slider").val(displayWeight).trigger("input");
      $("#siren-idx-modal-random-cb").prop("checked", isRandom);

      // 读取隐藏的数组数据并回填到滑块
      try {
        const dataArr = JSON.parse($hiddenInput.val());
        $(".siren-vec-slider").each(function () {
          const idx = $(this).data("idx");
          const val = parseFloat(dataArr[idx]) || 0;
          $(this).val(val).trigger("input"); // 触发 input 事件以更新 UI
        });
      } catch (e) {
        console.warn("解析向量数据出错，重置为 0");
      }

      // 显示弹窗 (使用 flex 居中)
      $("#siren-idx-vector-modal").css("display", "flex");
    });

  // 弹窗：取消
  $("#siren-idx-vec-cancel").on("click", function () {
    $("#siren-idx-vector-modal").hide();
    currentRowVectorInput = null;
  });

  // 弹窗：保存
  $("#siren-idx-vec-save").on("click", function () {
    if (!currentRowVectorInput) return;

    // 收集 8 个滑块的值，存入数组
    const newVec = [];
    $(".siren-vec-slider").each(function () {
      newVec.push(parseFloat($(this).val()));
    });

    // 存回那一行原本隐藏的 input 中
    currentRowVectorInput.val(JSON.stringify(newVec));

    // 保存权重和随机化状态到行内的隐藏字段
    currentRowVectorInput
      .siblings(".siren-idx-vec-weight-hidden")
      .val($("#siren-idx-modal-weight-slider").val());
    currentRowVectorInput
      .siblings(".siren-idx-vec-random-hidden")
      .val($("#siren-idx-modal-random-cb").is(":checked") ? "true" : "false");

    $("#siren-idx-vector-modal").hide();

    currentRowVectorInput = null;
    if (window.toastr) window.toastr.success("情感向量已暂存。");
  });

  // ==========================================
  // 8. 动态删除行逻辑
  // ==========================================
  // 监听角色列表和情绪列表中，所有带有删除图标(fa-trash)按钮的点击事件
  $("#siren-idx-char-list, #siren-idx-emo-list")
    .off("click", ".fa-trash")
    .on("click", ".fa-trash", function () {
      // 找到当前点击的垃圾桶所在的整行(.siren-ext-setting-row)，将其从 DOM 中移除
      $(this).closest(".siren-ext-setting-row").remove();
    });

  // ==========================================
  // 统一保存核心逻辑 (自动分流保存角色卡与全局设置，解决弹窗重叠)
  // ==========================================
  const performUnifiedSave = async (isGlobalButton = false) => {
    // === 1. 严格校验高级参数合法性 ===
    const pMaxTxt = parseInt($("#siren-idx-param-maxtxt").val());
    const pTemp = parseFloat($("#siren-idx-param-temp").val());
    const pTopp = parseFloat($("#siren-idx-param-topp").val());
    const pTopk = parseInt($("#siren-idx-param-topk").val());
    const pBeams = parseInt($("#siren-idx-param-beams").val());
    const pRep = parseFloat($("#siren-idx-param-rep").val());
    const pLen = parseFloat($("#siren-idx-param-len").val());
    const pMel = parseInt($("#siren-idx-param-mel").val());

    if (isNaN(pMaxTxt) || pMaxTxt < 20 || pMaxTxt > 600)
      return window.toastr?.warning("分句最大 Token 范围应为 20-600");
    if (isNaN(pTemp) || pTemp < 0.1 || pTemp > 2.0)
      return window.toastr?.warning("温度 (Temperature) 范围应为 0.1-2.0");
    if (isNaN(pTopp) || pTopp < 0.0 || pTopp > 1.0)
      return window.toastr?.warning("Top P 范围应为 0-1");
    if (isNaN(pTopk) || pTopk < 0 || pTopk > 100)
      return window.toastr?.warning("Top K 范围应为 0-100");
    if (isNaN(pBeams) || pBeams < 1 || pBeams > 10)
      return window.toastr?.warning("Num Beams 范围应为 1-10");
    if (isNaN(pRep) || pRep < 1.0)
      return window.toastr?.warning(
        "重复惩罚 (Repetition Penalty) 推荐 >= 1.0",
      );
    if (isNaN(pMel) || pMel < 50 || pMel > 1815)
      return window.toastr?.warning("max_mel_tokens 范围应为 50-1815");

    // === 2. 收集角色卡音色数据 ===
    const voiceMap = {};
    $("#siren-idx-char-list .siren-ext-setting-row").each(function () {
      const charName = $(this).find('input[placeholder="角色名"]').val().trim();
      const voicePath = $(this).find(".siren-idx-audio-input").val().trim();
      if (charName && voicePath) {
        voiceMap[charName] = voicePath;
      }
    });

    let isCharSaved = false;
    const context = SillyTavern.getContext();
    // 只有当前处于具体角色聊天中，才尝试保存角色卡数据
    if (
      context &&
      context.characterId !== undefined &&
      context.characterId !== null
    ) {
      try {
        // 【修改点 1】：传入 silent = true，抑制角色卡保存的内置弹窗
        await saveToCharacterCard(
          "siren_voice_tts",
          {
            voices: voiceMap,
            updated_at: Date.now(),
          },
          true,
        );
        isCharSaved = true;
      } catch (e) {
        console.warn("[Siren Voice] 角色卡音色保存失败", e);
      }
    }

    // === 3. 收集全局设置数据 ===
    const settings = getSirenSettings();
    const tts = settings.tts.indextts;

    tts.api_base = $("#siren-indextts-api").val().trim();
    tts.emo_weight = parseFloat($("#siren-idx-emo-weight").val()) || 0.65;
    tts.do_sample = $("#siren-idx-param-dosample").is(":checked");
    tts.emo_random = $("#siren-idx-param-emorandom").is(":checked");
    tts.max_text_tokens_per_segment = pMaxTxt;
    tts.temperature = pTemp;
    tts.top_p = pTopp;
    tts.top_k = pTopk;
    tts.num_beams = pBeams;
    tts.repetition_penalty = pRep;
    tts.length_penalty = pLen;
    tts.max_mel_tokens = pMel;

    const emotionPresets = [];
    $("#siren-idx-emo-list .siren-ext-setting-row").each(function () {
      const name = $(this).find('input[placeholder="情绪名"]').val().trim();
      if (!name) return;

      const method = $(this).find(".siren-idx-emo-method-select").val();
      const preset = {
        id: `emo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: name,
        method: method,
      };

      if (method === "audio") {
        preset.ref_audio = $(this)
          .find(".siren-idx-audio-mode-ui .siren-idx-audio-input")
          .val()
          .trim();
        const weightVal = $(this)
          .find(".siren-idx-audio-mode-ui .siren-idx-emo-weight-input")
          .val();
        preset.emo_weight = weightVal === "" ? null : parseFloat(weightVal);
        preset.emo_vec = null;
        preset.emo_random = false;
      } else {
        try {
          preset.emo_vec = JSON.parse(
            $(this).find(".siren-idx-vec-data").val(),
          );
        } catch (e) {
          preset.emo_vec = [0, 0, 0, 0, 0, 0, 0, 0];
        }
        preset.emo_random =
          $(this).find(".siren-idx-vec-random-hidden").val() === "true";
        const weightVal = $(this).find(".siren-idx-vec-weight-hidden").val();
        preset.emo_weight = weightVal === "" ? null : parseFloat(weightVal);
        preset.ref_audio = null;
      }
      emotionPresets.push(preset);
    });

    tts.emotion_presets = emotionPresets;

    // === 4. 分流处理保存操作与弹窗 UI ===
    if (isGlobalButton) {
      // 【情况 A】如果是点击主面板的全局保存按钮：
      // 我们只负责静默更新数据。不要调用 saveSirenSettings() 也不要弹任何窗。
      // 函数结束后，全局按钮自带的原生监听器会接管，执行它自己的 saveSirenSettings()
      // 并弹出那唯一的一个 "Siren Voice 设置已保存！"。
    } else {
      // 【情况 B】如果是点击咱们面板内长长的合并保存按钮：
      // 【修改点 2】：传入 silent = true 抑制 saveSirenSettings 的内置弹窗
      saveSirenSettings(true);
      // 弹出唯一的一个综合专属提示
      if (window.toastr) {
        if (isCharSaved) {
          window.toastr.success("全局参数与角色音色已同步保存！");
        } else {
          window.toastr.success(
            "全局参数已保存 (当前未选中角色，跳过音色保存)",
          );
        }
      }
      const currentSettings = getSirenSettings();
      if (currentSettings.tts.provider === "indextts") {
        await syncTtsWorldbookEntries("indextts", currentSettings.tts.enabled);
      }
    }
  };

  // 内部合并保存按钮：触发定制提示逻辑
  $("#siren-idx-global-save")
    .off("click.indexTtsSave")
    .on("click.indexTtsSave", async function () {
      await performUnifiedSave(false);
    });

  // 外部主全局保存按钮：借壳更新数据，弹窗交给它的原生事件处理
  $("#siren-tts-save-global-btn")
    .off("click.indexTtsSave")
    .on("click.indexTtsSave", async function () {
      const settings =
        SillyTavern.getContext()?.extensionSettings?.siren_voice_settings;
      if (settings?.tts?.provider !== "indextts") return;

      await performUnifiedSave(true);
    });

  const context = SillyTavern.getContext();
  if (context && context.eventSource) {
    // 先移除监听，防止因为多次渲染 UI 导致重复绑定
    context.eventSource.removeListener("chat_id_changed", loadCharacterTtsList);
    // 绑定监听器，一切换聊天就只刷新角色列表
    context.eventSource.on("chat_id_changed", loadCharacterTtsList);
  }

  // 最后，在绑定完所有事件后，执行一次数据回显加载
  loadIndexTtsData();
}
