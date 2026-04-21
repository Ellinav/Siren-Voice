import {
    getSirenSettings,
    saveToCharacterCard,
    saveSirenSettings,
} from "./settings.js";
import { fetchMinimaxVoices } from "./minimax_logic.js";
import { bindSirenSliders, syncTtsWorldbookEntries } from "./utils.js";

let currentEditingRow = null;
let availableVoices = [];

function getDefaultMinimaxAdvData() {
    return {
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
        modify_pitch: 0,
        modify_intensity: 0,
        modify_timbre: 0,
        sound_effect: "none",
    };
}

export function getMinimaxHtml() {
    return `
    <div id="siren-minimax-wrapper">
        <h4 style="color: #06b6d4; font-size: 1.1em; margin-bottom: 10px; border-bottom: 1px solid rgba(6, 182, 212, 0.3); padding-bottom: 5px;">
            <i class="fa-solid fa-server" style="margin-right: 5px;"></i> MiniMax API 配置
        </h4>
        <div class="siren-ext-setting-row siren-ext-flex-between">
            <div class="siren-ext-setting-label"><label>API 来源</label></div>
            <select id="siren-mm-region" class="siren-ext-select" style="width: 280px;">
                <option value="cn">国内版 (api.minimaxi.com)</option>
                <option value="global">国际版 (api.minimax.io)</option>
            </select>
        </div>
        
        <div class="siren-ext-setting-row siren-ext-flex-between">
            <div class="siren-ext-setting-label"><label>API Key</label></div>
            <input type="password" id="siren-mm-apikey" class="siren-ext-input" style="width: 280px;" placeholder="输入 MiniMax API Key">
        </div>
        
        <div class="siren-ext-setting-row siren-ext-flex-between">
            <div class="siren-ext-setting-label"><label>合成模型</label></div>
            <select id="siren-mm-model" class="siren-ext-select" style="width: 280px;">
                <option value="speech-2.8-hd">speech-2.8-hd</option>
                <option value="speech-2.8-turbo">speech-2.8-turbo</option>
                <option value="speech-2.6-hd">speech-2.6-hd</option>
                <option value="speech-2.6-turbo">speech-2.6-turbo</option>
                <option value="speech-02-hd">speech-02-hd</option>
                <option value="speech-02-turbo">speech-02-turbo</option>
                <option value="speech-01-hd">speech-01-hd</option>
                <option value="speech-01-turbo">speech-01-turbo</option>
            </select>
        </div>
        
        <div class="siren-ext-setting-row siren-ext-flex-between">
            <div class="siren-ext-setting-label">
                <label>文本智能规范化</label>
                <small style="display:block;">优化数字、日期的朗读，但会略微增加延迟</small>
            </div>
            <label class="siren-ext-switch">
                <input type="checkbox" id="siren-mm-norm">
                <span class="siren-ext-slider"></span>
            </label>
        </div>

        <h4 style="color: #a78bfa; font-size: 1.1em; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid rgba(168, 85, 247, 0.3); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid fa-users-viewfinder" style="margin-right: 5px;"></i> 角色音色配置</span>
            <div>
                <button id="siren-mm-fetch-voices" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; font-size: 0.9em; margin-right: 8px;">
                    <i class="fa-solid fa-cloud-arrow-down"></i> 同步可用音色
                </button>
                <button id="siren-mm-char-save" class="siren-ext-btn siren-ext-btn-primary" style="padding: 4px 10px; font-size: 0.9em; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981;">
                    <i class="fa-solid fa-floppy-disk"></i> 保存到角色卡
                </button>
            </div>
        </h4>
        
        <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid #334155;">
            <div id="siren-mm-char-list" style="display: flex; flex-direction: column; gap: 10px;">
            </div>
            
            <div style="margin-top: 10px; text-align: center;">
                <button id="siren-mm-char-add" class="siren-ext-btn siren-ext-btn-secondary" style="width: 100%; border: 1px dashed #64748b; color: #94a3b8; background: transparent;">
                    <i class="fa-solid fa-plus"></i> 新增角色音色映射
                </button>
            </div>
            <div style="margin-top: 15px;">
                <button id="siren-mm-save-all" class="siren-ext-btn siren-ext-btn-primary" style="width: 100%; padding: 12px 0; justify-content: center; font-size: 1.05em; margin-top: 10px; background: #0284c7; border-color: #0284c7; color: #fff;">
                    <i class="fa-solid fa-floppy-disk"></i> 保存全部设置 (全局 API + 角色卡)
                </button>
            </div>
        </div>

        <h4 style="color: #f59e0b; margin-bottom: 10px; font-size: 1.1em; margin-top: 25px;"><i class="fa-solid fa-microphone-lines" style="margin-right: 5px;"></i> 音色克隆 </h4>
        <div style="background: rgba(0,0,0,0.2); border: 1px solid #334155; border-radius: 6px; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
            
            <div class="siren-ext-flex-between">
                <div style="flex: 1; margin-right: 10px;">
                    <label style="color:#cbd5e1; font-size:0.9em;">复刻音频 (需 10s-5m)</label>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <input type="file" id="siren-mm-clone-file" accept=".mp3,.m4a,.wav" style="display: none;">
                        <button id="siren-mm-btn-choose-clone" class="siren-ext-btn siren-ext-btn-secondary" style="white-space: nowrap;"><i class="fa-solid fa-folder-open"></i> 选择文件</button>
                        <button id="siren-mm-btn-up-clone" class="siren-ext-btn siren-ext-btn-primary" style="white-space: nowrap;"><i class="fa-solid fa-cloud-arrow-up"></i> 上传</button>
                        <input type="text" id="siren-mm-clone-id" class="siren-ext-input" readonly placeholder="上传后自动填入 File ID" style="width: 100%; background: rgba(0,0,0,0.3);">
                    </div>
                    <div id="siren-mm-clone-filename" style="font-size: 0.8em; color: #64748b; margin-top: 4px;">未选择文件</div>
                </div>
            </div>

            <div class="siren-ext-flex-between">
                <div style="flex: 1; margin-right: 10px;">
                    <label style="color:#cbd5e1; font-size:0.9em;">示例音频 (可选，需 &lt; 8s)</label>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <input type="file" id="siren-mm-prompt-file" accept=".mp3,.m4a,.wav" style="display: none;">
                        <button id="siren-mm-btn-choose-prompt" class="siren-ext-btn siren-ext-btn-secondary" style="white-space: nowrap;"><i class="fa-solid fa-folder-open"></i> 选择文件</button>
                        <button id="siren-mm-btn-up-prompt" class="siren-ext-btn siren-ext-btn-primary" style="white-space: nowrap;"><i class="fa-solid fa-cloud-arrow-up"></i> 上传</button>
                        <input type="text" id="siren-mm-prompt-id" class="siren-ext-input" readonly placeholder="上传后自动填入 File ID" style="width: 100%; background: rgba(0,0,0,0.3);">
                    </div>
                    <div id="siren-mm-prompt-filename" style="font-size: 0.8em; color: #64748b; margin-top: 4px;">未选择文件</div>
                </div>
            </div>

            <div style="display: flex; gap: 15px;">
                <div style="flex: 2;">
                    <label style="color:#cbd5e1; font-size:0.9em; display:block; margin-bottom:5px;">示例音频文本</label>
                    <input type="text" id="siren-mm-prompt-text" class="siren-ext-input" placeholder="如上传示例音频，则必须填入对应文本（带标点）" style="width: 100%;">
                </div>
                <div style="flex: 1;">
                    <label style="color:#f59e0b; font-size:0.9em; display:block; margin-bottom:5px;">Voice ID <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="siren-mm-clone-vid" class="siren-ext-input" placeholder="允许数字、字母、-、_" style="width: 100%; border-color: rgba(245, 158, 11, 0.5);">
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="color:#cbd5e1; font-size:0.9em;">试听文本 <span style="color:#ef4444;">*</span></label>
                <textarea id="siren-mm-clone-text" class="siren-ext-textarea" rows="2" placeholder="输入一段试听文本（将在成功后返回朗读音频）..."></textarea>
            </div>

            <div class="siren-ext-setting-row siren-ext-flex-between" style="border: none; padding: 0; background: transparent;">
                <div class="siren-ext-setting-label"><label>音频降噪</label></div>
                <label class="siren-ext-switch">
                    <input type="checkbox" id="siren-mm-clone-nr">
                    <span class="siren-ext-slider"></span>
                </label>
            </div>

            <div>
                <div style="color: #ef4444; font-size: 0.8em; margin-bottom: 10px;">
                    <i class="fa-solid fa-triangle-exclamation"></i> 注意：克隆并试听满意后，请必须正式请求（发音测试/实际使用）至少一次此音色，否则将会在 7 天内自动删除！
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <button id="siren-mm-btn-doclone" class="siren-ext-btn siren-ext-btn-primary" style="background: #a855f7; border: 1px solid #9333ea; color: #ffffff; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3); font-weight: bold;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> 立即克隆
                    </button>
                    
                    <div id="siren-mm-clone-status-box" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                        <audio id="siren-mm-clone-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                        <span id="siren-mm-clone-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;"></span>
                    </div>
                </div>
            </div>
        </div>

        <h4 style="color: #10b981; margin-bottom: 10px; font-size: 1.1em; margin-top: 25px;"><i class="fa-solid fa-vial" style="margin-right: 5px;"></i> MiniMax 发音测试</h4>
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 10px;">
            
            <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 12px; line-height: 1.5;">
                <i class="fa-solid fa-circle-info" style="margin-right: 4px; color: #10b981;"></i> 一般无需手动指定情绪，模型会根据输入文本自动匹配。<br>
                <span style="margin-left: 18px;"><b>生动 (fluent)</b>、<b>低语 (whisper)</b> 仅对 <span style="color: #cbd5e1;">speech-2.6-turbo / hd</span> 模型生效。</span>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <select id="siren-mm-test-char" class="siren-ext-select" style="flex: 1;">
                    <option value="">(点击选择已配置的角色)</option>
                </select>
                <select id="siren-mm-test-mood" class="siren-ext-select" style="flex: 1;">
                    <option value="">自动匹配情绪</option>
                    <option value="happy">高兴（happy）</option>
                    <option value="sad">悲伤（sad）</option>
                    <option value="angry">愤怒（angry）</option>
                    <option value="fearful">害怕（fearful）</option>
                    <option value="disgusted">厌恶（disgusted）</option>
                    <option value="surprised">惊讶（surprised）</option>
                    <option value="calm">冷静（clam）</option>
                    <option value="fluent">生动（fluent）</option>
                    <option value="whisper">低语（whisper）</option>
                </select>
            </div>

            <textarea id="siren-mm-test-text" class="siren-ext-textarea" rows="2" placeholder="输入一句台词测试效果，支持穿插语气词。例如：今天真的很开心！(laughs) 我们走吧。"></textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <button id="siren-mm-test-generate" class="siren-ext-btn siren-ext-btn-primary" style="background: #10b981; border: 1px solid #059669; color: #ffffff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); font-weight: bold;">
                    <i class="fa-solid fa-bolt"></i> 生成测试
                </button>
                
                <div id="siren-mm-test-preview" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                    <audio id="siren-mm-test-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                    
                    <a id="siren-mm-test-download" class="siren-ext-btn siren-ext-btn-secondary" style="display: none; padding: 4px 10px; text-decoration: none; color: #cbd5e1;" download="minimax_test.mp3" title="下载音频">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    
                    <span id="siren-mm-test-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;">等待生成...</span>
                </div>
            </div>
        </div>

        <datalist id="siren-mm-voice-datalist"></datalist>

    </div> <div id="siren-mm-adv-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(6, 11, 23, 0.85); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;">
        <div style="background: #0f172a; border: 1px solid #06b6d4; border-radius: 12px; width: 480px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            <h3 style="margin: 0 0 15px 0; color: #06b6d4; border-bottom: 1px solid #1e293b; padding-bottom: 10px; display: flex; align-items: center;">
                <i class="fa-solid fa-sliders" style="margin-right:8px;"></i> 高级声音塑形 (Voice Modify)
                <span id="siren-mm-adv-charname" style="margin-left: auto; font-size: 0.8em; color: #64748b; background: #1e293b; padding: 2px 8px; border-radius: 4px;">未命名</span>
            </h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>语速 (0.5~2.0)</span><span id="val-mm-speed" style="color:#0ea5e9;">1.0</span>
                    </div>
                    <input type="range" id="adv-mm-speed" min="0.5" max="2.0" step="0.1" value="1.0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>音量 (0.1~10.0)</span><span id="val-mm-vol" style="color:#0ea5e9;">1.0</span>
                    </div>
                    <input type="range" id="adv-mm-vol" min="0.1" max="10.0" step="0.1" value="1.0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>语调 (-12~12)</span><span id="val-mm-pitch" style="color:#0ea5e9;">0</span>
                    </div>
                    <input type="range" id="adv-mm-pitch" min="-12" max="12" step="1" value="0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>低沉/明亮 (-100~100)</span><span id="val-mm-mpitch" style="color:#0ea5e9;">0</span>
                    </div>
                    <input type="range" id="adv-mm-mpitch" min="-100" max="100" step="1" value="0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>刚劲/轻柔 (-100~100)</span><span id="val-mm-int" style="color:#0ea5e9;">0</span>
                    </div>
                    <input type="range" id="adv-mm-int" min="-100" max="100" step="1" value="0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>浑厚/清脆 (-100~100)</span><span id="val-mm-timbre" style="color:#0ea5e9;">0</span>
                    </div>
                    <input type="range" id="adv-mm-timbre" min="-100" max="100" step="1" value="0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px; margin-bottom: 25px;">
                <div style="color:#94a3b8; font-size:0.9em;">空间音效设置</div>
                <select id="adv-mm-sfx" class="siren-ext-select" style="width: 100%;">
                    <option value="none">无效果</option>
                    <option value="spacious_echo">空旷回音</option>
                    <option value="auditorium_echo">礼堂广播</option>
                    <option value="lofi_telephone">电话失真</option>
                    <option value="robotic">机械电音</option>
                </select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button id="siren-mm-adv-cancel" class="siren-ext-btn siren-ext-btn-secondary">取消</button>
                <button id="siren-mm-adv-save" class="siren-ext-btn siren-ext-btn-primary" style="background: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; color: #06b6d4; box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);">
                    <i class="fa-solid fa-check"></i> 确认保存
                </button>
            </div>
        </div>
    </div>
    `;
}

function buildVoiceOptions(selectedId) {
    if (availableVoices.length === 0) {
        return `<option value="${selectedId}">${selectedId || "请先同步音色..."}</option>`;
    }
    let html = "";
    availableVoices.forEach((v) => {
        const isSelected = v.id === selectedId ? "selected" : "";
        html += `<option value="${v.id}" ${isSelected}>${v.name}</option>`;
    });
    // 如果之前保存的 ID 不在列表里（比如 API 删除了），也要显示出来防止数据丢失
    if (selectedId && !availableVoices.find((v) => v.id === selectedId)) {
        html += `<option value="${selectedId}" selected>${selectedId} (未在列表中找到)</option>`;
    }
    return html;
}

function updateVoiceDatalist() {
    const $datalist = $("#siren-mm-voice-datalist");
    $datalist.empty();
    availableVoices.forEach((v) => {
        // value 是真实的 ID，展示时由于浏览器特性，会显示为 "ID (名称)"
        $datalist.append(`<option value="${v.id}">${v.name}</option>`);
    });
}

// 动态创建一行角色配置 UI
function createMinimaxCharRow(charName = "", voiceId = "", advData = null) {
    if (!advData) advData = getDefaultMinimaxAdvData();
    const dataStr = encodeURIComponent(JSON.stringify(advData));

    // 👇 核心修改：把 <select> 换回 <input>，并绑定 list="siren-mm-voice-datalist"
    return `
        <div class="siren-ext-setting-row siren-mm-char-item" style="display:flex; gap:8px; align-items:center; padding: 5px;">
            <input type="text" class="siren-ext-input mm-char-name" placeholder="角色名" value="${charName}" style="flex: 1;">
            <input type="text" list="siren-mm-voice-datalist" class="siren-ext-input mm-voice-id" placeholder="双击选择或粘贴ID" value="${voiceId}" style="flex: 1.5;">
            <button class="siren-ext-btn mm-btn-adv" style="border: 1px solid #06b6d4; color: #06b6d4; background: rgba(6,182,212,0.1); padding: 4px 10px;" title="高级声音配置"><i class="fa-solid fa-sliders"></i></button>
            <button class="siren-ext-btn mm-btn-del" style="color: #ef4444; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); padding: 4px 10px;"><i class="fa-solid fa-trash"></i></button>
            <input type="hidden" class="mm-adv-data" value="${dataStr}">
        </div>
    `;
}

export function bindMinimaxEvents() {
    const settings = getSirenSettings();
    if (!settings.tts.minimax) {
        settings.tts.minimax = {
            api_key: "",
            model: "speech-2.8-hd",
            text_norm: false,
        };
    }

    // 1. 初始化全局参数 UI
    const mmConfig = settings.tts.minimax;
    $("#siren-mm-region").val(mmConfig.region || "cn");
    $("#siren-mm-apikey").val(mmConfig.api_key || "");
    $("#siren-mm-model").val(mmConfig.model || "speech-2.8-hd");
    $("#siren-mm-norm").prop("checked", mmConfig.text_norm || false);

    // 2. 从当前角色卡加载数据并渲染列表
    loadCharDataFromST();

    $("#siren-mm-fetch-voices")
        .off("click")
        .on("click", async function () {
            const apiKey = $("#siren-mm-apikey").val().trim();
            if (!apiKey) {
                if (window.toastr) window.toastr.warning("请先输入 API Key！");
                return;
            }

            const $btn = $(this);
            const originalHtml = $btn.html();
            $btn.html(
                '<i class="fa-solid fa-spinner fa-spin"></i> 同步中...',
            ).prop("disabled", true);

            try {
                const region = $("#siren-mm-region").val(); // 获取当前来源
                availableVoices = await fetchMinimaxVoices(apiKey, region);
                if (window.toastr)
                    window.toastr.success(
                        `成功拉取 ${availableVoices.length} 个音色！`,
                    );

                // 👇 修改：不再去遍历替换 select，而是直接更新全局的 datalist
                updateVoiceDatalist();
            } catch (e) {
                if (window.toastr)
                    window.toastr.error("拉取音色失败：" + e.message);
            } finally {
                $btn.html(originalHtml).prop("disabled", false);
            }
        });

    // 3. 绑定“新增角色行”按钮
    $("#siren-mm-char-add")
        .off("click")
        .on("click", function () {
            $("#siren-mm-char-list").append(createMinimaxCharRow());
            bindRowEvents(); // 为新添加的行绑定事件
        });

    // 4. 监听全局输入，自动保存到 utils 的 settings (注：全局保存由主界面的磁盘按钮接管，这里只需实时更新内存对象)
    $("#siren-mm-region, #siren-mm-apikey, #siren-mm-model, #siren-mm-norm").on(
        "change input",
        function () {
            const settings = getSirenSettings();
            settings.tts.minimax.region = $("#siren-mm-region").val(); // 新增：保存来源
            settings.tts.minimax.api_key = $("#siren-mm-apikey").val().trim();
            settings.tts.minimax.model = $("#siren-mm-model").val();
            settings.tts.minimax.text_norm = $("#siren-mm-norm").is(":checked");
            // 不在这里调用 saveSirenSettings()，交给 tts.js 里的全局保存统一处理，减少磁盘IO
        },
    );

    // 5. 绑定高级弹窗相关的滑动条数值实时显示
    const sliders = [
        { id: "#adv-mm-speed", valId: "#val-mm-speed" },
        { id: "#adv-mm-vol", valId: "#val-mm-vol" },
        { id: "#adv-mm-pitch", valId: "#val-mm-pitch" },
        { id: "#adv-mm-mpitch", valId: "#val-mm-mpitch" },
        { id: "#adv-mm-int", valId: "#val-mm-int" },
        { id: "#adv-mm-timbre", valId: "#val-mm-timbre" },
    ];
    sliders.forEach((s) => {
        $(s.id).on("input", function () {
            $(s.valId).text($(this).val());
        });
    });

    bindSirenSliders([
        "adv-mm-speed",
        "adv-mm-vol",
        "adv-mm-pitch",
        "adv-mm-mpitch",
        "adv-mm-int",
        "adv-mm-timbre",
    ]);

    // 6. 弹窗：取消按钮
    $("#siren-mm-adv-cancel")
        .off("click")
        .on("click", function () {
            $("#siren-mm-adv-modal").css("display", "none");
            currentEditingRow = null;
        });

    // 7. 弹窗：保存按钮 (将数据写回 DOM 的隐藏域)
    $("#siren-mm-adv-save")
        .off("click")
        .on("click", function () {
            if (!currentEditingRow) return;

            const newData = {
                speed: parseFloat($("#adv-mm-speed").val()),
                vol: parseFloat($("#adv-mm-vol").val()),
                pitch: parseInt($("#adv-mm-pitch").val()),
                modify_pitch: parseInt($("#adv-mm-mpitch").val()),
                modify_intensity: parseInt($("#adv-mm-int").val()),
                modify_timbre: parseInt($("#adv-mm-timbre").val()),
                sound_effect: $("#adv-mm-sfx").val(),
            };

            // 写回并用 URI 编码
            currentEditingRow
                .find(".mm-adv-data")
                .val(encodeURIComponent(JSON.stringify(newData)));

            // UI 反馈
            currentEditingRow.find(".mm-btn-adv").css({
                background: "rgba(16, 185, 129, 0.2)",
                "border-color": "#10b981",
                color: "#10b981",
            });

            $("#siren-mm-adv-modal").css("display", "none");
            currentEditingRow = null;
        });

    // 8. 角色卡保存按钮
    $("#siren-mm-save-all")
        .off("click")
        .on("click", async function () {
            // === 阶段一：保存全局 API 配置 ===
            const settings = getSirenSettings();
            settings.tts.minimax.region = $("#siren-mm-region").val();
            settings.tts.minimax.api_key = $("#siren-mm-apikey").val().trim();
            settings.tts.minimax.model = $("#siren-mm-model").val();
            settings.tts.minimax.text_norm = $("#siren-mm-norm").is(":checked");

            // 调用 utils.js 提供的全局保存功能 (传 true 表示静默保存，由下面统一发 Toast 提示)
            saveSirenSettings(true);

            // === 阶段二：保存当前角色卡配置 ===
            const mapData = {};
            $("#siren-mm-char-list .siren-mm-char-item").each(function () {
                const charName = $(this).find(".mm-char-name").val().trim();
                const voiceId = $(this).find(".mm-voice-id").val();
                if (charName && voiceId) {
                    const advDataStr = decodeURIComponent(
                        $(this).find(".mm-adv-data").val(),
                    );
                    let advData = getDefaultMinimaxAdvData();
                    try {
                        advData = { ...advData, ...JSON.parse(advDataStr) };
                    } catch (e) {}
                    mapData[charName] = { voice_id: voiceId, ...advData };
                }
            });

            // 写入当前角色卡扩展区 (新增传入 true 开启静默保存，抑制双重弹窗)
            const isSaved = await saveToCharacterCard(
                "siren_voice_tts_minimax",
                {
                    voices: mapData,
                },
                true,
            );

            // 统一 UI 成功反馈
            if (window.toastr) {
                window.toastr.success("全局参数与角色音色配置已全部成功保存！");
            }
            const currentSettings = getSirenSettings();
            if (currentSettings.tts.provider === "minimax") {
                await syncTtsWorldbookEntries(
                    "minimax",
                    currentSettings.tts.enabled,
                );
            }
        });

    window.addEventListener("siren:character_changed", () => {
        // 只有当 MiniMax 容器存在时才执行，避免在其他 Provider 下空跑
        if ($("#siren-mm-char-list").length > 0) {
            console.log(
                "[Siren Voice] 🔄 检测到聊天切换，正在刷新 MiniMax 音色映射...",
            );
            loadCharDataFromST();
        }
    });

    // ==========================================
    // 🌟 发音测试面板交互逻辑
    // ==========================================

    // 1. 当下拉框被点击/聚焦时，实时从上方的 DOM 列表中抓取当前已有的角色名
    $("#siren-mm-test-char")
        .off("focus")
        .on("focus", function () {
            const $select = $(this);
            const currentVal = $select.val();
            $select
                .empty()
                .append('<option value="">(点击选择已配置的角色)</option>');

            $("#siren-mm-char-list .siren-mm-char-item").each(function () {
                const charName = $(this).find(".mm-char-name").val().trim();
                if (charName) {
                    $select.append(
                        `<option value="${charName}">${charName}</option>`,
                    );
                }
            });

            // 如果之前选中的角色还在，保持选中状态
            if ($select.find(`option[value="${currentVal}"]`).length > 0) {
                $select.val(currentVal);
            }
        });

    // 2. 点击“生成测试”按钮
    $("#siren-mm-test-generate")
        .off("click")
        .on("click", async function () {
            const charName = $("#siren-mm-test-char").val();
            if (!charName) {
                if (window.toastr)
                    window.toastr.warning("请先在左侧下拉框选择要测试的角色！");
                return;
            }

            const text = $("#siren-mm-test-text").val().trim();
            if (!text) {
                if (window.toastr) window.toastr.warning("请输入测试台词！");
                return;
            }

            const mood = $("#siren-mm-test-mood").val();
            const apiKey = $("#siren-mm-apikey").val().trim();
            const model = $("#siren-mm-model").val();
            const textNorm = $("#siren-mm-norm").is(":checked");

            if (!apiKey) {
                if (window.toastr)
                    window.toastr.warning("缺少 API Key，请先配置！");
                return;
            }

            // 去 DOM 里捞取选中角色对应的 VoiceID 和高级参数
            let voiceId = "";
            let advData = null;
            $("#siren-mm-char-list .siren-mm-char-item").each(function () {
                if ($(this).find(".mm-char-name").val().trim() === charName) {
                    voiceId = $(this).find(".mm-voice-id").val();
                    const dataStr = decodeURIComponent(
                        $(this).find(".mm-adv-data").val() || "%7B%7D",
                    );
                    try {
                        advData = JSON.parse(dataStr);
                    } catch (e) {}
                }
            });

            if (!voiceId) {
                if (window.toastr)
                    window.toastr.error(
                        "选中的角色没有配置 Voice ID，请检查上方列表！",
                    );
                return;
            }

            // 组装最终传给请求底层的 config 对象
            const config = {
                region: $("#siren-mm-region").val(),
                api_key: apiKey,
                model: model,
                text_norm: textNorm,
                voice_id: voiceId,
                ...(advData || getDefaultMinimaxAdvData()),
            };

            const $btn = $(this);
            const $status = $("#siren-mm-test-status");
            const $audio = $("#siren-mm-test-audio");
            const $download = $("#siren-mm-test-download");

            $btn.prop("disabled", true);
            $status.html(
                '<i class="fa-solid fa-spinner fa-spin"></i> 正在合成中...',
            );
            $audio.hide();
            $download.hide();

            try {
                // 动态导入逻辑层，并直接利用我们写好的核心生成函数！
                const { generateMinimaxAudioBlob } =
                    await import("./minimax_logic.js");
                const blob = await generateMinimaxAudioBlob(text, mood, config);

                const url = URL.createObjectURL(blob);
                $audio.attr("src", url).show();
                $download.attr("href", url).show();
                $status.html('<span style="color: #06b6d4;">生成成功！</span>');

                // 自动播放
                $audio[0]
                    .play()
                    .catch((e) => console.warn("自动播放被浏览器拦截", e));
            } catch (err) {
                console.error("[Siren Voice] 测试生成失败:", err);
                $status.html(
                    `<span style="color: #ef4444;" title="${err.message}">失败: ${err.message.substring(0, 15)}...</span>`,
                );
            } finally {
                $btn.prop("disabled", false);
            }
        });
    // ==========================================
    // 🌟 音色复刻面板交互逻辑
    // ==========================================

    let cloneFileCache = null;
    let promptFileCache = null;

    // 1. 触发隐藏的文件选择器并显示文件名
    $("#siren-mm-btn-choose-clone").on("click", () =>
        $("#siren-mm-clone-file").click(),
    );
    $("#siren-mm-btn-choose-prompt").on("click", () =>
        $("#siren-mm-prompt-file").click(),
    );

    $("#siren-mm-clone-file").on("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            cloneFileCache = file;
            $("#siren-mm-clone-filename")
                .text(
                    file.name + ` (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
                )
                .css("color", "#0ea5e9");
            $("#siren-mm-clone-id").val(""); // 重新选择后清空 ID
        }
    });

    $("#siren-mm-prompt-file").on("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            promptFileCache = file;
            $("#siren-mm-prompt-filename")
                .text(file.name + ` (${(file.size / 1024).toFixed(2)} KB)`)
                .css("color", "#0ea5e9");
            $("#siren-mm-prompt-id").val("");
        }
    });

    // 2. 抽离公用的上传逻辑
    async function handleUploadClick(fileCache, type, purpose, $btn, $idInput) {
        if (!fileCache) {
            if (window.toastr) window.toastr.warning("请先选择文件！");
            return;
        }
        const apiKey = $("#siren-mm-apikey").val().trim();
        if (!apiKey) {
            if (window.toastr) window.toastr.error("请先在上方配置 API Key！");
            return;
        }

        const originalText = $btn.html();
        $btn.html('<i class="fa-solid fa-spinner fa-spin"></i> 上传中').prop(
            "disabled",
            true,
        );

        try {
            const region = $("#siren-mm-region").val(); // 新增
            const { uploadMinimaxFile } = await import("./minimax_logic.js");
            const fileData = await uploadMinimaxFile(
                apiKey,
                fileCache,
                purpose,
                region,
            );
            $idInput.val(fileData.file_id);
            if (window.toastr) window.toastr.success(`${type} 上传成功！`);
        } catch (err) {
            console.error(`[Siren Voice] ${type} 上传失败:`, err);
            if (window.toastr) window.toastr.error(err.message);
        } finally {
            $btn.html(originalText).prop("disabled", false);
        }
    }

    $("#siren-mm-btn-up-clone").on("click", function () {
        handleUploadClick(
            cloneFileCache,
            "复刻音频",
            "voice_clone",
            $(this),
            $("#siren-mm-clone-id"),
        );
    });

    $("#siren-mm-btn-up-prompt").on("click", function () {
        handleUploadClick(
            promptFileCache,
            "示例音频",
            "prompt_audio",
            $(this),
            $("#siren-mm-prompt-id"),
        );
    });

    // 3. 立即克隆按钮
    $("#siren-mm-btn-doclone").on("click", async function () {
        const apiKey = $("#siren-mm-apikey").val().trim();
        const cloneId = $("#siren-mm-clone-id").val().trim();
        const voiceId = $("#siren-mm-clone-vid").val().trim();
        const demoText = $("#siren-mm-clone-text").val().trim();

        // 校验必填
        if (!apiKey)
            return window.toastr && window.toastr.warning("缺少 API Key");
        if (!cloneId)
            return (
                window.toastr &&
                window.toastr.warning("请先上传复刻音频并获取 File ID！")
            );
        if (!voiceId)
            return (
                window.toastr &&
                window.toastr.warning("请填写自定义的 Voice ID！")
            );
        if (!demoText)
            return window.toastr && window.toastr.warning("请填写试听文本！");

        const promptId = $("#siren-mm-prompt-id").val().trim();
        const promptText = $("#siren-mm-prompt-text").val().trim();

        // 校验联动（如果传了示例音频 ID，就必须有文本；反之亦然）
        if ((promptId && !promptText) || (!promptId && promptText)) {
            return (
                window.toastr &&
                window.toastr.warning("示例音频 ID 和示例文本必须同时填写！")
            );
        }

        const config = {
            region: $("#siren-mm-region").val(),
            file_id: cloneId,
            voice_id: voiceId,
            text: demoText,
            prompt_audio: promptId || null,
            prompt_text: promptText || null,
            model: $("#siren-mm-model").val(),
            need_noise_reduction: $("#siren-mm-clone-nr").is(":checked"),
        };

        const $btn = $(this);
        const $status = $("#siren-mm-clone-status");
        const $audio = $("#siren-mm-clone-audio");

        $btn.prop("disabled", true);
        $status
            .html(
                '<i class="fa-solid fa-spinner fa-spin"></i> 正在处理复刻与合成...',
            )
            .css("color", "#f59e0b");
        $audio.hide();

        try {
            const { cloneMinimaxVoice } = await import("./minimax_logic.js");
            const resData = await cloneMinimaxVoice(apiKey, config);

            $status.html(
                '<span style="color: #10b981;"><i class="fa-solid fa-check"></i> 复刻成功！已可同步。</span>',
            );

            // 播放试听链接
            if (resData.demo_audio) {
                $audio.attr("src", resData.demo_audio).show();
                $audio[0].play().catch((e) => console.warn("拦截", e));
            }

            // 自动触发表格刷新，让用户可以直接把新出来的 VoiceID 拉取进列表
            $("#siren-mm-fetch-voices").trigger("click");
        } catch (err) {
            console.error("[Siren Voice] 克隆失败:", err);
            $status.html(
                `<span style="color: #ef4444;" title="${err.message}">失败: ${err.message.substring(0, 20)}...</span>`,
            );
        } finally {
            $btn.prop("disabled", false);
        }
    });
}

// 绑定行内按钮事件（每次新增行时调用）
function bindRowEvents() {
    $(".mm-voice-id")
        .off("click")
        .on("click", function () {
            if (availableVoices.length === 0 && !$(this).val()) {
                if (window.toastr)
                    window.toastr.info(
                        "列表为空：请先填入 API Key 并点击上方的【同步可用音色】按钮哦！",
                    );
            }
        });
    // 删除行
    $(".mm-btn-del")
        .off("click")
        .on("click", function () {
            $(this).closest(".siren-mm-char-item").remove();
        });

    // 打开高级弹窗
    $(".mm-btn-adv")
        .off("click")
        .on("click", function () {
            const $row = $(this).closest(".siren-mm-char-item");
            currentEditingRow = $row;

            const charName =
                $row.find(".mm-char-name").val().trim() || "未命名角色";
            $("#siren-mm-adv-charname").text(charName);

            // 解析隐藏域数据
            const dataStr = decodeURIComponent(
                $row.find(".mm-adv-data").val() || "%7B%7D",
            );
            let data = getDefaultMinimaxAdvData();
            try {
                data = { ...data, ...JSON.parse(dataStr) };
            } catch (e) {
                console.error("Parse adv data failed", e);
            }

            // 回填到弹窗 UI
            $("#adv-mm-speed").val(data.speed).trigger("input");
            $("#adv-mm-vol").val(data.vol).trigger("input");
            $("#adv-mm-pitch").val(data.pitch).trigger("input");
            $("#adv-mm-mpitch").val(data.modify_pitch).trigger("input");
            $("#adv-mm-int").val(data.modify_intensity).trigger("input");
            $("#adv-mm-timbre").val(data.modify_timbre).trigger("input");
            $("#adv-mm-sfx").val(data.sound_effect || "none");

            // 展开弹窗
            $("#siren-mm-adv-modal").css("display", "flex").hide().fadeIn(150);
        });
}

// ==========================================
// ST 角色卡读写逻辑
// ==========================================

async function loadCharDataFromST() {
    const context = SillyTavern.getContext();
    const characterId = context.characterId;
    const $list = $("#siren-mm-char-list");
    $list.empty();

    if (characterId === undefined || characterId === null) {
        $list.html(
            `<div style="color: #64748b; text-align: center;">当前未选中角色，无法加载映射配置。</div>`,
        );
        return;
    }

    const currentAvatar = context.characters[characterId];
    // 读取保存在角色扩展中的数据，为了防止冲突，建立独立命名空间 siren_voice_tts_minimax
    const charExt =
        currentAvatar?.data?.extensions?.siren_voice_tts_minimax?.voices || {};

    const keys = Object.keys(charExt);
    if (keys.length === 0) {
    } else {
        // 渲染已有数据
        for (const [cName, config] of Object.entries(charExt)) {
            // 将平铺的 config 拆分出 voiceId 和 advData
            const voiceId = config.voice_id || "";
            const advData = {
                speed: config.speed ?? 1.0,
                vol: config.vol ?? 1.0,
                pitch: config.pitch ?? 0,
                modify_pitch: config.modify_pitch ?? 0,
                modify_intensity: config.modify_intensity ?? 0,
                modify_timbre: config.modify_timbre ?? 0,
                sound_effect: config.sound_effect ?? "none",
            };
            $list.append(createMinimaxCharRow(cName, voiceId, advData));
        }
    }

    bindRowEvents();
}

async function saveCharDataToST() {
    const context = SillyTavern.getContext();
    const { writeExtensionField, characterId } = context;

    if (characterId === undefined || characterId === null) {
        if (window.toastr)
            window.toastr.warning(
                "未选中角色（或在群聊中），无法保存到角色卡！",
            );
        return;
    }

    const mapData = {};
    $("#siren-mm-char-list .siren-mm-char-item").each(function () {
        const charName = $(this).find(".mm-char-name").val().trim();
        const voiceId = $(this).find(".mm-voice-id").val().trim();
        if (charName && voiceId) {
            // 组装最终写入角色卡的数据
            const advDataStr = decodeURIComponent(
                $(this).find(".mm-adv-data").val(),
            );
            let advData = getDefaultMinimaxAdvData();
            try {
                advData = { ...advData, ...JSON.parse(advDataStr) };
            } catch (e) {}

            mapData[charName] = {
                voice_id: voiceId,
                ...advData,
            };
        }
    });

    try {
        await writeExtensionField(characterId, "siren_voice_tts_minimax", {
            voices: mapData,
        });
        if (window.toastr)
            window.toastr.success("MiniMax 角色音色配置已保存！");
    } catch (err) {
        console.error("[Siren] 写入角色卡失败:", err);
        if (window.toastr) window.toastr.error("写入配置失败！");
    }
}
