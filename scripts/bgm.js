import { getSirenSettings, saveSirenSettings } from "./settings.js";
import { syncBgmWorldbookEntries } from "./utils.js";

let localBgmState = {
  fade_duration: 2.0,
  karaoke_speed: 1.0,
  current_list: "default",
  libraries: { default: [] },
  karaoke_style: { current: "default", dict: {} },
  card_style: { current: "default", dict: {} },
};

export function initBgmSettings() {
  const container = document.getElementById("tab-bgm");
  if (!container) return;

  const globalSettings = getSirenSettings();
  localBgmState = JSON.parse(JSON.stringify(globalSettings.bgm || {}));

  // --- 补全 BGM 保底逻辑 ---
  if (typeof localBgmState.enabled === "undefined")
    localBgmState.enabled = true;
  if (!localBgmState.current_list) localBgmState.current_list = "default";
  if (!localBgmState.libraries) localBgmState.libraries = { default: [] };
  if (typeof localBgmState.auto_play === "undefined")
    localBgmState.auto_play = true;
  if (typeof localBgmState.custom_end_tags === "undefined")
    localBgmState.custom_end_tags = "";

  // --- 样式与速度保底 (已有逻辑) ---
  if (localBgmState.karaoke_speed === undefined)
    localBgmState.karaoke_speed = 1.0;
  if (!localBgmState.karaoke_style)
    localBgmState.karaoke_style = { current: "default", dict: {} };
  if (!localBgmState.card_style)
    localBgmState.card_style = { current: "default", dict: {} };
  if (!localBgmState.sfx_card_style)
    localBgmState.sfx_card_style = { current: "default", dict: {} };

  // --- 补全 SFX 保底逻辑 ---
  if (!localBgmState.sfx_libraries) {
    localBgmState.sfx_current_list = "default";
    localBgmState.sfx_libraries = { default: [] };
  }

  container.innerHTML = `
        <style>
            #siren-bgm-fade-input::-webkit-outer-spin-button,
            #siren-bgm-fade-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            #siren-bgm-fade-input { -moz-appearance: textfield; }
            .siren-style-textarea { width: 100%; height: 80px; background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 12px; outline: none; resize: vertical; }
            .siren-style-textarea:focus { border-color: #3b82f6; }
            .siren-icon-btn { background: transparent; color: #e2e8f0; border: 1px solid #475569; border-radius: 4px; width: 30px; height: 30px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
            .siren-icon-btn:hover { background: #334155; }
            .siren-section-title { color: #e2e8f0; font-size: 1.05em; font-weight: bold; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 8px; letter-spacing: 0.5px; }
            
            /* 🌟 新增：滑块开关样式 */
            .siren-toggle-switch { position: relative; display: inline-block; width: 44px; height: 22px; flex-shrink: 0; }
            .siren-toggle-switch input { opacity: 0; width: 0; height: 0; }
            .siren-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #475569; transition: .3s; border-radius: 22px; }
            .siren-toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
            .siren-toggle-switch input:checked + .siren-toggle-slider { background-color: #10b981; }
            .siren-toggle-switch input:checked + .siren-toggle-slider:before { transform: translateX(22px); }
        </style>
        
        <div class="siren-ext-settings-container">
            <h3 style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-wand-magic-sparkles fa-fw" style="color:#3b82f6; margin-right:8px;"></i>幻境氛围 (BGM)</span>
                <i id="siren-bgm-save-btn" class="fa-solid fa-floppy-disk interactable" style="color: #10b981; font-size: 1.2em; transition: transform 0.2s; cursor: pointer;" title="保存全局配置"></i>
            </h3>
            
            <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-power-off"></i> 幻境启动
                    </span>
                    <label class="siren-toggle-switch">
                        <input type="checkbox" id="siren-bgm-enable-toggle">
                        <span class="siren-toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div id="siren-bgm-settings-body" style="${localBgmState.enabled ? "" : "display: none;"}">

                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #3b82f6; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-play"></i> 场控播报策略
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #e2e8f0; font-size: 14px;">全局自动播放 (Auto Play)</span>
                        <label class="siren-toggle-switch">
                            <input type="checkbox" id="siren-bgm-auto-play">
                            <span class="siren-toggle-slider"></span>
                        </label>
                    </div>

                    <div id="siren-bgm-custom-end-tags-wrapper" style="display: ${localBgmState.auto_play ? "flex" : "none"}; align-items: center; justify-content: space-between; margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="color: #e2e8f0; font-size: 14px;">自定义触发标签</span>
                            <span style="color: #64748b; font-size: 12px;">覆盖默认标点，多个用逗号隔开</span>
                        </div>
                        <input type="text" id="siren-bgm-custom-end-tags" placeholder="默认使用标点" 
                               style="width: 130px; height: 28px; box-sizing: border-box; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 0 8px; font-size: 13px; text-align: center; outline: none;">
                    </div>
                </div>
                
                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <span style="font-weight: bold; color: #e2e8f0;">平滑过渡</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="number" id="siren-bgm-fade-input" step="0.5" min="0" style="width: 50px; height: 28px; box-sizing: border-box; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 0 4px; font-size: 14px; text-align: center; outline: none;">
                            <span style="color: #94a3b8; font-size: 14px;">秒</span>
                        </div>
                    </div>
                    
    
                    <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="font-weight: bold; color: #e2e8f0;">起始标签</span>
                            <input type="text" id="siren-bgm-start-tag-input" placeholder="<content>" 
                                   style="width: 200px; height: 28px; box-sizing: border-box; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 0 8px; font-family: monospace; font-size: 14px; text-align: center; outline: none;">
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="font-weight: bold; color: #e2e8f0;">终止标签</span>
                            <input type="text" id="siren-bgm-end-tag-input" placeholder="</content>" 
                                   style="width: 200px; height: 28px; box-sizing: border-box; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 0 8px; font-family: monospace; font-size: 14px; text-align: center; outline: none;">
                        </div>
                    </div>
                </div> <div class="siren-section-title" style="color: #f472b6;">
                    <i class="fa-solid fa-palette" style="color: #f472b6;"></i> 幻彩贝壳
                </div>

                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #a855f7; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-microphone-lines"></i> 旁白滚动
                    </div>
                
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: white; font-size: 14px;">滚动速度</span>
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; margin-left: 20px;">
                            <input type="range" id="siren-bgm-karaoke-speed" class="siren-ext-progress-bar" min="0.5" max="2.0" step="0.1" style="flex: 1;">
                            <span id="siren-bgm-karaoke-speed-val" style="color: white; font-size: 14px; width: 35px; text-align: right;"></span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <span style="color: white; font-size: 14px;">样式:</span>
                        <select id="siren-k-style-sel" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 4px; outline: none;"></select>
                        <button class="siren-icon-btn" id="siren-k-btn-new" title="新增"><i class="fa-solid fa-plus"></i></button>
                        <button class="siren-icon-btn" id="siren-k-btn-del" title="删除"><i class="fa-solid fa-trash"></i></button>
                        <button class="siren-icon-btn" id="siren-k-btn-export" title="导出"><i class="fa-solid fa-file-export"></i></button>
                        <button class="siren-icon-btn" id="siren-k-btn-import" title="导入"><i class="fa-solid fa-file-import"></i></button>
                        <input type="file" id="siren-k-file-import" accept=".json" style="display: none;">
                    </div>
                    <textarea id="siren-k-css-input" class="siren-style-textarea" spellcheck="false"></textarea>
                </div>

                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #0ed0e9; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-palette"></i> 背景音美化
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <span style="color: white; font-size: 14px;">样式:</span>
                        <select id="siren-b-style-sel" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 4px; outline: none;"></select>
                        <button class="siren-icon-btn" id="siren-b-btn-new" title="新增"><i class="fa-solid fa-plus"></i></button>
                        <button class="siren-icon-btn" id="siren-b-btn-del" title="删除"><i class="fa-solid fa-trash"></i></button>
                        <button class="siren-icon-btn" id="siren-b-btn-export" title="导出"><i class="fa-solid fa-file-export"></i></button>
                        <button class="siren-icon-btn" id="siren-b-btn-import" title="导入"><i class="fa-solid fa-file-import"></i></button>
                        <input type="file" id="siren-b-file-import" accept=".json" style="display: none;">
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <span style="color: white; font-size: 14px;">图标:</span>
                        <input type="text" id="siren-b-icon-input" placeholder="fa-solid fa-music" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 4px 8px; outline: none; font-family: monospace;">
                    </div>
                    <textarea id="siren-b-css-input" class="siren-style-textarea" spellcheck="false"></textarea>
                </div>

                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #fbbf24; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-bolt"></i> 效果音美化
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <span style="color: white; font-size: 14px;">样式:</span>
                        <select id="siren-s-style-sel" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 4px; outline: none;"></select>
                        <button class="siren-icon-btn" id="siren-s-btn-new" title="新增"><i class="fa-solid fa-plus"></i></button>
                        <button class="siren-icon-btn" id="siren-s-btn-del" title="删除"><i class="fa-solid fa-trash"></i></button>
                        <button class="siren-icon-btn" id="siren-s-btn-export" title="导出"><i class="fa-solid fa-file-export"></i></button>
                        <button class="siren-icon-btn" id="siren-s-btn-import" title="导入"><i class="fa-solid fa-file-import"></i></button>
                        <input type="file" id="siren-s-file-import" accept=".json" style="display: none;">
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                        <span style="color: white; font-size: 14px;">图标:</span>
                        <input type="text" id="siren-s-icon-input" placeholder="fa-solid fa-bolt" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 4px 8px; outline: none; font-family: monospace;">
                    </div>
                    <textarea id="siren-s-css-input" class="siren-style-textarea" spellcheck="false"></textarea>
                </div>

                <div class="siren-ext-style-preview-box" style="margin-top: 5px; margin-bottom: 15px; background: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-radius: 8px; padding: 15px; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                    <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 12px; display:flex; justify-content:space-between;">
                        <span><i class="fa-solid fa-eye"></i> 场景实机双模预览</span>
                        <span id="siren-bgm-preview-status" style="color:#10b981;">已就绪</span>
                    </div>
                
                    <div class="siren-ext-chat-msg-mock" style="display: flex; gap: 12px; background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 1.2em; border: 1px solid #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); flex-shrink: 0;">🌊</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.85em; color: #94a3b8; margin-bottom: 4px;">Siren Scene</div>
                            <div class="mes_text siren-scene-active" style="color: #cbd5e1; font-size: 0.9em; line-height: 1.6;">
                                <span class="siren-karaoke-done">这是一段来自深海的录音带。</span>
                                <br>
                                <span class="siren-karaoke-playing" style="--k-prog: 45%;">可以工作了吗？继续测试...</span>
                                <br>
                                <span class="siren-karaoke-target">收到来自深海的呼唤。</span>
                            
                                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
                                    <div class="siren-bgm-card" data-siren-bgm="1" tabindex="0">
                                        <span class="siren-btn-wrap" data-siren-action="play_bgm" title="播放背景音">
                                            <i class="fa-solid fa-music"></i>
                                        </span>
                                        <span class="siren-bgm-text">雨声</span>
                                    </div>
                                    <div class="siren-sfx-card" data-siren-sfx="1" tabindex="0">
                                        <span class="siren-btn-wrap" data-siren-action="play_sfx" title="播放效果音">
                                            <i class="fa-solid fa-bolt"></i>
                                        </span>
                                        <span class="siren-sfx-text">雷鸣</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="siren-section-title" style="margin-top: 24px;">
                    <i class="fa-solid fa-compact-disc" style="color: #06b6d4;"></i> 深海音轨匣
                </div>

                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155;">
                    <div style="display: flex; gap: 12px; margin-bottom: 15px; align-items: center;">
                        <span style="color: #e2e8f0; font-weight: bold; font-size: 14px; white-space: nowrap;">当前BGM</span>
                        <select id="siren-bgm-list-select" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 6px; outline: none;"></select>
                        <div style="display: flex; gap: 8px;">
                            <button class="siren-icon-btn" id="siren-bgm-btn-import-list" title="导入背景库"><i class="fa-solid fa-file-import"></i></button>
                            <button class="siren-icon-btn" id="siren-bgm-btn-export-list" title="导出当前背景库"><i class="fa-solid fa-file-export"></i></button>
                            <button class="siren-icon-btn" id="siren-bgm-btn-new-list" title="新增背景库"><i class="fa-solid fa-plus"></i></button>
                            <button class="siren-icon-btn" id="siren-bgm-btn-del-list" title="删除当前背景库"><i class="fa-solid fa-trash"></i></button>
                            <input type="file" id="siren-bgm-file-import-list" accept=".json" style="display: none;">
                        </div>
                    </div>
                
                    <div id="siren-bgm-items-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding-right: 4px; margin-bottom: 12px;"></div>
                
                    <button id="siren-bgm-btn-add-row" style="width: 100%; padding: 8px; background: rgba(59, 130, 246, 0.1); border: 1px dashed #3b82f6; color: #3b82f6; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-plus"></i> 新增 BGM
                    </button>
                </div>
                
                <div class="siren-section-title" style="margin-top: 24px;">
                    <i class="fa-solid fa-volume-high" style="color: #fbbf24;"></i> 浅水回声
                </div>

                <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #334155;">
                    <div style="display: flex; gap: 12px; margin-bottom: 15px; align-items: center;">
                        <span style="color: #e2e8f0; font-weight: bold; font-size: 14px; white-space: nowrap;">当前SFX</span>
                        <select id="siren-sfx-list-select" style="flex: 1; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 6px; outline: none;"></select>
                        <div style="display: flex; gap: 8px;">
                            <button class="siren-icon-btn" id="siren-sfx-btn-import-list" title="导入效果音库"><i class="fa-solid fa-file-import"></i></button>
                            <button class="siren-icon-btn" id="siren-sfx-btn-export-list" title="导出当前效果音库"><i class="fa-solid fa-file-export"></i></button>
                            <button class="siren-icon-btn" id="siren-sfx-btn-new-list" title="新增效果音库"><i class="fa-solid fa-plus"></i></button>
                            <button class="siren-icon-btn" id="siren-sfx-btn-del-list" title="删除当前库"><i class="fa-solid fa-trash"></i></button>
                            <input type="file" id="siren-sfx-file-import-list" accept=".json" style="display: none;">
                        </div>
                    </div>
                
                    <div id="siren-sfx-items-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding-right: 4px; margin-bottom: 12px;"></div>
                
                    <button id="siren-sfx-btn-add-row" style="width: 100%; padding: 8px; background: rgba(245, 158, 11, 0.1); border: 1px dashed #fbbf24; color: #fbbf24; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-plus"></i> 新增 SFX
                    </button>
                </div>

                <button id="siren-bgm-save-btn-bottom" style="width: 100%; margin-top: 24px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; font-weight: bold; font-size: 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <i class="fa-solid fa-floppy-disk"></i> 保存全局配置
                </button>
                
            </div> </div> `;

  bindBgmEvents();
  renderBgmAll();
}

function updateProgressBar(inputEl) {
  const min = parseFloat(inputEl.min) || 0;
  const max = parseFloat(inputEl.max) || 100;
  const val = parseFloat(inputEl.value) || 0;
  const percentage = ((val - min) / (max - min)) * 100;
  inputEl.style.setProperty("--progress", `${percentage}%`);
}

function renderStyleModule(stateObj, prefix) {
  const sel = document.getElementById(`siren-${prefix}-style-sel`);
  const txt = document.getElementById(`siren-${prefix}-css-input`);
  sel.innerHTML = "";
  Object.entries(stateObj.dict).forEach(([key, val]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = val.name;
    if (key === stateObj.current) option.selected = true;
    sel.appendChild(option);
  });
  const currentCode = stateObj.dict[stateObj.current]?.code || "";
  txt.value = currentCode;

  const iconInput = document.getElementById(`siren-${prefix}-icon-input`);
  if (iconInput) {
    const defaultIcon =
      prefix === "b" ? "fa-solid fa-music" : "fa-solid fa-bolt";
    iconInput.value = stateObj.dict[stateObj.current]?.icon || defaultIcon;
  }

  // 渲染完立马触发一次预览更新
  updateBgmPreview();
}

function renderBgmAll() {
  document.getElementById("siren-bgm-enable-toggle").checked =
    localBgmState.enabled;
  document.getElementById("siren-bgm-auto-play").checked =
    localBgmState.auto_play;
  document.getElementById("siren-bgm-custom-end-tags").value =
    localBgmState.custom_end_tags || "";
  document.getElementById("siren-bgm-custom-end-tags-wrapper").style.display =
    localBgmState.auto_play ? "flex" : "none";
  document.getElementById("siren-bgm-fade-input").value =
    localBgmState.fade_duration;
  document.getElementById("siren-bgm-start-tag-input").value =
    localBgmState.start_tag || "<content>";
  document.getElementById("siren-bgm-end-tag-input").value =
    localBgmState.end_tag || "</content>";

  const speedInput = document.getElementById("siren-bgm-karaoke-speed");
  speedInput.value = localBgmState.karaoke_speed || 1.0;
  document.getElementById("siren-bgm-karaoke-speed-val").textContent =
    Number(localBgmState.karaoke_speed).toFixed(1) + "x";
  updateProgressBar(speedInput);

  renderStyleModule(localBgmState.karaoke_style, "k");
  renderStyleModule(localBgmState.card_style, "b");
  renderStyleModule(localBgmState.sfx_card_style, "s");

  const select = document.getElementById("siren-bgm-list-select");
  select.innerHTML = "";
  Object.keys(localBgmState.libraries).forEach((listName) => {
    const option = document.createElement("option");
    option.value = listName;
    option.textContent = listName;
    if (listName === localBgmState.current_list) option.selected = true;
    select.appendChild(option);
  });
  renderBgmRows();

  const sfxSelect = document.getElementById("siren-sfx-list-select");
  if (sfxSelect) {
    sfxSelect.innerHTML = "";
    Object.keys(localBgmState.sfx_libraries).forEach((listName) => {
      const option = document.createElement("option");
      option.value = listName;
      option.textContent = listName;
      if (listName === localBgmState.sfx_current_list) option.selected = true;
      sfxSelect.appendChild(option);
    });
    renderSfxRows(); // 调用下面新增的函数
  }
}

function renderBgmRows() {
  const container = document.getElementById("siren-bgm-items-container");
  container.innerHTML = "";
  const currentLib = localBgmState.libraries[localBgmState.current_list] || [];
  currentLib.forEach((item, index) => {
    const row = document.createElement("div");
    row.style.cssText = "display: flex; gap: 8px; align-items: center;";
    row.innerHTML = `
            <input type="text" class="siren-bgm-input-name" data-idx="${index}" placeholder="名称" value="${item.name}" style="width: 30%; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; padding: 6px; outline: none;">
            <input type="text" class="siren-bgm-input-url" data-idx="${index}" placeholder="URL" value="${item.url}" style="flex: 1; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; padding: 6px; outline: none;">
            <button class="siren-bgm-btn-del-row" data-idx="${index}" title="删除" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; width: 30px; height: 30px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
        `;
    container.appendChild(row);
  });
}

function renderSfxRows() {
  const container = document.getElementById("siren-sfx-items-container");
  if (!container) return;

  container.innerHTML = "";
  const currentLib =
    localBgmState.sfx_libraries[localBgmState.sfx_current_list] || [];

  currentLib.forEach((item, index) => {
    const row = document.createElement("div");
    row.style.cssText = "display: flex; gap: 8px; align-items: center;";
    row.innerHTML = `
            <input type="text" class="siren-sfx-input-name" data-idx="${index}" placeholder="名称" value="${item.name}" style="width: 30%; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; padding: 6px; outline: none;">
            <input type="text" class="siren-sfx-input-url" data-idx="${index}" placeholder="URL" value="${item.url}" style="flex: 1; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 4px; padding: 6px; outline: none;">
            <button class="siren-sfx-btn-del-row" data-idx="${index}" title="删除" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; width: 30px; height: 30px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
        `;
    container.appendChild(row);
  });
}

// 🌟 编译工具：负责将 CSS 编译成 ST 认得出来的防劫持形态
function compileSirenCss(rawCss) {
  if (!rawCss) return "";
  // 拦截全局群攻伤害，将其限制在穿了马甲的 target 上
  let safeCss = rawCss.replace(
    /\.siren-scene-active\s+\.mes_text/gi,
    ".siren-scene-active .siren-karaoke-target",
  );
  return safeCss.replace(
    /\.siren-([a-zA-Z0-9_-]+)/g,
    ":is(.siren-$1, .custom-siren-$1)",
  );
}

// 🌟 更新预览视图室
function updateBgmPreview() {
  const kCss =
    localBgmState.karaoke_style.dict[localBgmState.karaoke_style.current]
      ?.code || "";
  const bCss =
    localBgmState.card_style.dict[localBgmState.card_style.current]?.code || "";
  const sCss =
    localBgmState.sfx_card_style.dict[localBgmState.sfx_card_style.current]
      ?.code || "";
  const bIcon =
    localBgmState.card_style.dict[localBgmState.card_style.current]?.icon ||
    "fa-solid fa-music";
  const sIcon =
    localBgmState.sfx_card_style.dict[localBgmState.sfx_card_style.current]
      ?.icon || "fa-solid fa-bolt";

  const mockBgmIcon = document.querySelector(
    ".siren-ext-chat-msg-mock .siren-bgm-card i",
  );
  const mockSfxIcon = document.querySelector(
    ".siren-ext-chat-msg-mock .siren-sfx-card i",
  );

  if (mockBgmIcon) mockBgmIcon.className = bIcon;
  if (mockSfxIcon) mockSfxIcon.className = sIcon;

  let styleTag = document.getElementById("siren-bgm-preview-style");
  if (styleTag) {
    styleTag.remove();
  }
  styleTag = document.createElement("style");
  styleTag.id = "siren-bgm-preview-style";
  document.head.appendChild(styleTag);

  // 编译合并双方 CSS 后注入
  styleTag.textContent =
    compileSirenCss(kCss) +
    "\n" +
    compileSirenCss(bCss) +
    "\n" +
    compileSirenCss(sCss);

  const status = document.getElementById("siren-bgm-preview-status");
  if (status) {
    status.textContent = "正在预览...";
    status.style.color = "#0ea5e9";
    clearTimeout(window.sirenBgmPreviewTimer);
    window.sirenBgmPreviewTimer = setTimeout(() => {
      status.textContent = "未保存";
      status.style.color = "#f59e0b";
    }, 800);
  }
}

function bindStyleEvents(stateObj, prefix) {
  document
    .getElementById(`siren-${prefix}-style-sel`)
    .addEventListener("change", (e) => {
      stateObj.current = e.target.value;
      renderStyleModule(stateObj, prefix);
    });

  document
    .getElementById(`siren-${prefix}-css-input`)
    .addEventListener("input", (e) => {
      if (stateObj.dict[stateObj.current]) {
        stateObj.dict[stateObj.current].code = e.target.value;
      }
      updateBgmPreview(); // 👈 输入时触发动态渲染
    });

  const iconInput = document.getElementById(`siren-${prefix}-icon-input`);
  if (iconInput) {
    let iconDebounceTimer = null; // 定义定时器
    iconInput.addEventListener("input", (e) => {
      if (stateObj.dict[stateObj.current]) {
        stateObj.dict[stateObj.current].icon = e.target.value.trim();
      }

      // 每次输入时，清除上一次的定时任务
      if (iconDebounceTimer) clearTimeout(iconDebounceTimer);

      // 重新开始计时，500毫秒（0.5秒）内没有新输入，才执行预览更新
      iconDebounceTimer = setTimeout(() => {
        updateBgmPreview();
      }, 500);
    });
  }

  document
    .getElementById(`siren-${prefix}-btn-new`)
    .addEventListener("click", () => {
      const name = prompt("请输入新样式名称：");
      if (!name) return;
      const key = "custom_" + Date.now();
      stateObj.dict[key] = { name: name, code: "" };
      stateObj.current = key;
      renderStyleModule(stateObj, prefix);
    });

  document
    .getElementById(`siren-${prefix}-btn-del`)
    .addEventListener("click", () => {
      if (stateObj.current === "default") {
        if (window.toastr) window.toastr.warning("默认样式不可删除！");
        return;
      }
      if (confirm("确定删除当前样式吗？")) {
        delete stateObj.dict[stateObj.current];
        stateObj.current = "default";
        renderStyleModule(stateObj, prefix);
      }
    });

  document
    .getElementById(`siren-${prefix}-btn-export`)
    .addEventListener("click", () => {
      const dataStr = JSON.stringify(stateObj.dict, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siren_${prefix}_styles.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const fileInput = document.getElementById(`siren-${prefix}-file-import`);
  document
    .getElementById(`siren-${prefix}-btn-import`)
    .addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        Object.assign(stateObj.dict, imported);
        renderStyleModule(stateObj, prefix);
        if (window.toastr) window.toastr.success("样式导入成功！");
      } catch (err) {
        if (window.toastr) window.toastr.error("导入失败：格式错误");
      }
      fileInput.value = "";
    };
    reader.readAsText(file);
  });
}

function bindBgmEvents() {
  bindStyleEvents(localBgmState.karaoke_style, "k");
  bindStyleEvents(localBgmState.card_style, "b");
  bindStyleEvents(localBgmState.sfx_card_style, "s");

  document
    .getElementById("siren-bgm-enable-toggle")
    .addEventListener("change", async (e) => {
      const isEnabled = e.target.checked;
      localBgmState.enabled = isEnabled;

      // 🌟 动态切换下方配置区的显示状态
      const settingsBody = document.getElementById("siren-bgm-settings-body");
      if (settingsBody) {
        settingsBody.style.display = isEnabled ? "block" : "none";
      }

      // 依然触发世界书同步
      await syncBgmWorldbookEntries(isEnabled);
    });

  const performSave = async (btnEl) => {
    btnEl.style.transform = "scale(0.98)";
    setTimeout(() => (btnEl.style.transform = "scale(1)"), 150);

    const globalSettings = getSirenSettings();
    globalSettings.bgm = JSON.parse(JSON.stringify(localBgmState));
    saveSirenSettings(false);

    // 🌟 新增：全局设置存盘后，立即将最新的列表数据同步进世界书
    await syncBgmWorldbookEntries(localBgmState.enabled);

    window.dispatchEvent(new CustomEvent("siren:bgm_settings_updated"));

    const status = document.getElementById("siren-bgm-preview-status");
    if (status) {
      status.textContent = "已存盘！";
      status.style.color = "#10b981";
    }
  };

  // 绑定顶部图标保存按钮
  document
    .getElementById("siren-bgm-save-btn")
    .addEventListener("click", function () {
      performSave(this);
    });

  // 🌟 绑定底部全宽保存按钮
  document
    .getElementById("siren-bgm-save-btn-bottom")
    .addEventListener("click", function () {
      performSave(this);
    });

  document
    .getElementById("siren-bgm-auto-play")
    .addEventListener("change", (e) => {
      localBgmState.auto_play = e.target.checked;
      const wrapper = document.getElementById(
        "siren-bgm-custom-end-tags-wrapper",
      );
      if (wrapper)
        wrapper.style.display = localBgmState.auto_play ? "flex" : "none";
    });

  document
    .getElementById("siren-bgm-custom-end-tags")
    .addEventListener("input", (e) => {
      localBgmState.custom_end_tags = e.target.value;
    });

  document
    .getElementById("siren-bgm-fade-input")
    .addEventListener("input", (e) => {
      localBgmState.fade_duration = parseFloat(e.target.value) || 0;
    });

  document
    .getElementById("siren-bgm-start-tag-input")
    .addEventListener("input", (e) => {
      localBgmState.start_tag = e.target.value.trim();
    });
  document
    .getElementById("siren-bgm-end-tag-input")
    .addEventListener("input", (e) => {
      localBgmState.end_tag = e.target.value.trim();
    });

  const speedInput = document.getElementById("siren-bgm-karaoke-speed");
  speedInput.addEventListener("input", (e) => {
    localBgmState.karaoke_speed = parseFloat(e.target.value);
    document.getElementById("siren-bgm-karaoke-speed-val").textContent =
      localBgmState.karaoke_speed.toFixed(1) + "x";
    updateProgressBar(e.target);
  });

  document
    .getElementById("siren-bgm-list-select")
    .addEventListener("change", (e) => {
      localBgmState.current_list = e.target.value;
      renderBgmRows();
    });

  document
    .getElementById("siren-bgm-btn-new-list")
    .addEventListener("click", () => {
      const name = prompt("请输入新列表名称：");
      if (name && !localBgmState.libraries[name]) {
        localBgmState.libraries[name] = [];
        localBgmState.current_list = name;
        renderBgmAll();
      }
    });

  // --- BGM 列表导入导出逻辑 ---
  document
    .getElementById("siren-bgm-btn-export-list")
    .addEventListener("click", () => {
      const currentListName = localBgmState.current_list;
      const currentData = localBgmState.libraries[currentListName];
      if (!currentData || currentData.length === 0) {
        if (window.toastr) window.toastr.warning("当前列表为空，无需导出！");
        return;
      }
      const dataStr = JSON.stringify(currentData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siren_bgm_list_${currentListName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const bgmListFileInput = document.getElementById(
    "siren-bgm-file-import-list",
  );
  document
    .getElementById("siren-bgm-btn-import-list")
    .addEventListener("click", () => bgmListFileInput.click());
  bgmListFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData))
          throw new Error("文件格式错误：非数组结构");

        // 默认使用文件名去后缀作为列表名
        let defaultName = file.name.replace(/\.json$/i, "");
        let newListName = prompt("请输入导入的 BGM 库名称：", defaultName);

        if (!newListName) {
          bgmListFileInput.value = "";
          return; // 用户取消
        }

        // 查重：如果有重名的，自动加上 _1, _2 等后缀，确保是新增
        let finalName = newListName;
        let counter = 1;
        while (localBgmState.libraries[finalName]) {
          finalName = `${newListName}_${counter}`;
          counter++;
        }

        localBgmState.libraries[finalName] = importedData;
        localBgmState.current_list = finalName;
        renderBgmAll(); // 刷新整个面版，更新下拉框
        if (window.toastr)
          window.toastr.success(`成功导入并创建列表：${finalName}`);
      } catch (err) {
        console.error(err);
        if (window.toastr)
          window.toastr.error("BGM 列表导入失败：文件格式不正确");
      }
      bgmListFileInput.value = ""; // 重置 input 允许重复导入同名文件
    };
    reader.readAsText(file);
  });

  // --- SFX 列表导入导出逻辑 ---
  document
    .getElementById("siren-sfx-btn-export-list")
    .addEventListener("click", () => {
      const currentListName = localBgmState.sfx_current_list;
      const currentData = localBgmState.sfx_libraries[currentListName];
      if (!currentData || currentData.length === 0) {
        if (window.toastr) window.toastr.warning("当前列表为空，无需导出！");
        return;
      }
      const dataStr = JSON.stringify(currentData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siren_sfx_list_${currentListName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const sfxListFileInput = document.getElementById(
    "siren-sfx-file-import-list",
  );
  document
    .getElementById("siren-sfx-btn-import-list")
    .addEventListener("click", () => sfxListFileInput.click());
  sfxListFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData))
          throw new Error("文件格式错误：非数组结构");

        let defaultName = file.name.replace(/\.json$/i, "");
        let newListName = prompt("请输入导入的 SFX 库名称：", defaultName);

        if (!newListName) {
          sfxListFileInput.value = "";
          return;
        }

        let finalName = newListName;
        let counter = 1;
        while (localBgmState.sfx_libraries[finalName]) {
          finalName = `${newListName}_${counter}`;
          counter++;
        }

        localBgmState.sfx_libraries[finalName] = importedData;
        localBgmState.sfx_current_list = finalName;
        renderBgmAll();
        if (window.toastr)
          window.toastr.success(`成功导入并创建列表：${finalName}`);
      } catch (err) {
        console.error(err);
        if (window.toastr)
          window.toastr.error("SFX 列表导入失败：文件格式不正确");
      }
      sfxListFileInput.value = "";
    };
    reader.readAsText(file);
  });

  document
    .getElementById("siren-bgm-btn-del-list")
    .addEventListener("click", () => {
      if (localBgmState.current_list !== "default" && confirm("删除此列表？")) {
        delete localBgmState.libraries[localBgmState.current_list];
        localBgmState.current_list = "default";
        renderBgmAll();
      }
    });

  document
    .getElementById("siren-bgm-btn-add-row")
    .addEventListener("click", () => {
      localBgmState.libraries[localBgmState.current_list].push({
        name: "",
        url: "",
      });
      renderBgmRows();
    });

  document
    .getElementById("siren-bgm-items-container")
    .addEventListener("input", (e) => {
      if (e.target.tagName !== "INPUT") return;
      const idx = e.target.getAttribute("data-idx");
      const list = localBgmState.libraries[localBgmState.current_list];
      if (e.target.classList.contains("siren-bgm-input-name"))
        list[idx].name = e.target.value;
      else if (e.target.classList.contains("siren-bgm-input-url"))
        list[idx].url = e.target.value;
    });

  document
    .getElementById("siren-bgm-items-container")
    .addEventListener("click", (e) => {
      const btn = e.target.closest(".siren-bgm-btn-del-row");
      if (!btn) return;
      const idx = btn.getAttribute("data-idx");
      localBgmState.libraries[localBgmState.current_list].splice(idx, 1);
      renderBgmRows();
    });

  // 🌟 SFX 事件绑定
  document
    .getElementById("siren-sfx-list-select")
    .addEventListener("change", (e) => {
      localBgmState.sfx_current_list = e.target.value;
      renderSfxRows();
    });

  document
    .getElementById("siren-sfx-btn-new-list")
    .addEventListener("click", () => {
      const name = prompt("请输入新 SFX 库名称：");
      if (name && !localBgmState.sfx_libraries[name]) {
        localBgmState.sfx_libraries[name] = [];
        localBgmState.sfx_current_list = name;
        renderBgmAll(); // 刷新整个面板以更新下拉框
      }
    });

  document
    .getElementById("siren-sfx-btn-del-list")
    .addEventListener("click", () => {
      if (
        localBgmState.sfx_current_list !== "default" &&
        confirm("确定删除此 SFX 库吗？")
      ) {
        delete localBgmState.sfx_libraries[localBgmState.sfx_current_list];
        localBgmState.sfx_current_list = "default";
        renderBgmAll();
      }
    });

  document
    .getElementById("siren-sfx-btn-add-row")
    .addEventListener("click", () => {
      localBgmState.sfx_libraries[localBgmState.sfx_current_list].push({
        name: "",
        url: "",
      });
      renderSfxRows();
    });

  document
    .getElementById("siren-sfx-items-container")
    .addEventListener("input", (e) => {
      if (e.target.tagName !== "INPUT") return;
      const idx = e.target.getAttribute("data-idx");
      const list = localBgmState.sfx_libraries[localBgmState.sfx_current_list];
      if (e.target.classList.contains("siren-sfx-input-name"))
        list[idx].name = e.target.value;
      else if (e.target.classList.contains("siren-sfx-input-url"))
        list[idx].url = e.target.value;
    });

  document
    .getElementById("siren-sfx-items-container")
    .addEventListener("click", (e) => {
      const btn = e.target.closest(".siren-sfx-btn-del-row");
      if (!btn) return;
      const idx = btn.getAttribute("data-idx");
      localBgmState.sfx_libraries[localBgmState.sfx_current_list].splice(
        idx,
        1,
      );
      renderSfxRows();
    });
}
