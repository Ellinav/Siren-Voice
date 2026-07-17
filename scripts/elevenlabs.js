import {
  getSirenSettings,
  saveToCharacterCard,
  saveSirenSettings,
} from "./settings.js";
import { fetchElevenLabsVoices } from "./elevenlabs_logic.js";
import { bindSirenSliders, syncTtsWorldbookEntries } from "./utils.js";

let currentEditingRow = null;
let availableVoices = [];

function getDefaultElevenLabsAdvData() {
  return {
    speed: 1.0,
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true,
  };
}

export function getElevenLabsHtml() {
  return `
    <div id="siren-elevenlabs-wrapper">
        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px; display: flex; flex-direction: column; gap: 12px;">
            <h4 style="color: #06b6d4; font-size: 1.1em; margin: 0;">
                <i class="fa-solid fa-server" style="margin-right: 5px;"></i> ElevenLabs API 配置
            </h4>

            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                <div class="siren-ext-setting-label" style="white-space: nowrap; font-size: 0.95em; color: #cbd5e1;">API 区域</div>
                <select id="siren-el-region" class="siren-ext-select" style="flex: 1; min-width: 200px;">
                    <option value="global">全球 (api.elevenlabs.io)</option>
                    <option value="us">美国 (api.us.elevenlabs.io)</option>
                    <option value="eu">欧盟 (api.eu.residency.elevenlabs.io)</option>
                    <option value="in">印度 (api.in.residency.elevenlabs.io)</option>
                    <option value="sg">新加坡 (api.sg.residency.elevenlabs.io)</option>
                </select>
            </div>
    
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                <div class="siren-ext-setting-label" style="white-space: nowrap; font-size: 0.95em; color: #cbd5e1;">API Key</div>
                <input type="password" id="siren-el-apikey" class="siren-ext-input" style="flex: 1; min-width: 200px;" placeholder="输入 ElevenLabs API Key">
            </div>
    
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                <div class="siren-ext-setting-label" style="white-space: nowrap; font-size: 0.95em; color: #cbd5e1;">合成模型</div>
                <select id="siren-el-model" class="siren-ext-select" style="flex: 1; min-width: 200px;">
                    <option value="eleven_multilingual_v2">eleven_multilingual_v2</option>
                    <option value="eleven_turbo_v2_5">eleven_turbo_v2_5</option>
                    <option value="eleven_v3">eleven_v3</option>
                </select>
            </div>
    
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
                <div class="siren-ext-setting-label">
                    <label style="color:#cbd5e1; font-size: 0.95em;">文本智能规范化</label>
                    <small style="display:block; color:#64748b; font-size: 0.85em; margin-top: 2px;">优化数字、日期的朗读，但会略微增加延迟</small>
                </div>
                <label class="siren-ext-switch" style="flex-shrink: 0;">
                    <input type="checkbox" id="siren-el-norm">
                    <span class="siren-ext-slider"></span>
                </label>
            </div>
        </div>

        <h4 style="color: #a78bfa; font-size: 1.1em; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid rgba(168, 85, 247, 0.3); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid fa-users-viewfinder" style="margin-right: 5px;"></i> 角色音色配置</span>
            <div>
                <button id="siren-el-fetch-voices" class="siren-ext-btn siren-ext-btn-primary" style="padding: 4px 10px; font-size: 0.9em; margin-right: 8px; background: #f59e0b; border-color: #d97706; color: #ffffff; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">
                    <i class="fa-solid fa-cloud-arrow-down"></i> 同步音色
                </button>
            </div>
        </h4>
        
        <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid #334155;">
            <div id="siren-el-char-list" style="display: flex; flex-direction: column; gap: 4px;">
            </div>
            
            <div style="margin-top: 10px; text-align: center;">
                <button id="siren-el-char-add" class="siren-ext-btn siren-ext-btn-secondary" style="width: 100%; border: 1px dashed #64748b; color: #94a3b8; background: transparent;">
                    <i class="fa-solid fa-plus"></i> 新增角色音色映射
                </button>
            </div>
            <div style="margin-top: 15px;">
                <button id="siren-el-save-all" class="siren-ext-btn siren-ext-btn-primary" style="width: 100%; padding: 12px 0; justify-content: center; font-size: 1.05em; margin-top: 10px; background: #0284c7; border-color: #0284c7; color: #fff;">
                    <i class="fa-solid fa-floppy-disk"></i> 保存全部设置
                </button>
            </div>
        </div>

        <h4 style="color: #10b981; margin-bottom: 10px; font-size: 1.1em; margin-top: 25px;"><i class="fa-solid fa-vial" style="margin-right: 5px;"></i> ElevenLabs 发音测试</h4>
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 10px;">
            
            <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 12px; line-height: 1.5;">
                <i class="fa-solid fa-circle-info" style="margin-right: 4px; color: #10b981;"></i> ElevenLabs 不支持情绪参数，下方情绪选项仅保留 UI 一致性，不会发送到 API。
            </div>

<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
    <select id="siren-el-test-char" class="siren-ext-select" style="flex: 1; min-width: 160px;">
        <option value="">(点击选择已配置的角色)</option>
    </select>
    <select id="siren-el-test-mood" class="siren-ext-select" style="flex: 1; min-width: 160px;">
        <option value="">自动匹配情绪 (不生效)</option>
        <option value="happy">高兴（happy）</option>
        <option value="sad">悲伤（sad）</option>
        <option value="angry">愤怒（angry）</option>
        <option value="fearful">害怕（fearful）</option>
        <option value="disgusted">厌恶（disgusted）</option>
        <option value="surprised">惊讶（surprised）</option>
        <option value="calm">冷静（calm）</option>
    </select>
</div>

            <textarea id="siren-el-test-text" class="siren-ext-textarea" rows="2" placeholder="输入一句台词测试效果，支持穿插语气词。例如：今天真的很开心！(laughs) 我们走吧。"></textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <button id="siren-el-test-generate" class="siren-ext-btn siren-ext-btn-primary" style="background: #10b981; border: 1px solid #059669; color: #ffffff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); font-weight: bold;">
                    <i class="fa-solid fa-bolt"></i> 生成测试
                </button>
                
                <div id="siren-el-test-preview" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                    <audio id="siren-el-test-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                    
                    <a id="siren-el-test-download" class="siren-ext-btn siren-ext-btn-secondary" style="display: none; padding: 4px 10px; text-decoration: none; color: #cbd5e1;" download="elevenlabs_test.mp3" title="下载音频">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    
                    <span id="siren-el-test-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;">等待生成...</span>
                </div>
            </div>
        </div>

        <datalist id="siren-el-voice-datalist"></datalist>

    </div> <div id="siren-el-adv-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(6, 11, 23, 0.85); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;">
        <div style="background: #0f172a; border: 1px solid #06b6d4; border-radius: 12px; width: 90%; max-width: 480px; padding: 20px; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            <h3 style="margin: 0 0 15px 0; color: #06b6d4; border-bottom: 1px solid #1e293b; padding-bottom: 10px; display: flex; align-items: center;">
                <i class="fa-solid fa-sliders" style="margin-right:8px;"></i> 高级声音参数
                <span id="siren-el-adv-charname" style="margin-left: auto; font-size: 0.8em; color: #64748b; background: #1e293b; padding: 2px 8px; border-radius: 4px;">未命名</span>
            </h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>语速 (0.5~2.0)</span><span id="val-el-speed" style="color:#0ea5e9;">1.0</span>
                    </div>
                    <input type="range" id="adv-el-speed" min="0.5" max="2.0" step="0.1" value="1.0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>稳定性 (0~1)</span><span id="val-el-stability" style="color:#0ea5e9;">0.5</span>
                    </div>
                    <input type="range" id="adv-el-stability" min="0" max="1" step="0.05" value="0.5" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>相似度增强 (0~1)</span><span id="val-el-similarity" style="color:#0ea5e9;">0.75</span>
                    </div>
                    <input type="range" id="adv-el-similarity" min="0" max="1" step="0.05" value="0.75" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.9em;">
                        <span>风格 exaggeration (0~1)</span><span id="val-el-style" style="color:#0ea5e9;">0</span>
                    </div>
                    <input type="range" id="adv-el-style" min="0" max="1" step="0.05" value="0" class="siren-ext-slider-input" style="--theme-color: #06b6d4;">
                </div>
            </div>

            <div class="siren-ext-setting-row siren-ext-flex-between" style="border: none; padding: 0; background: transparent; margin-bottom: 25px;">
                <div class="siren-ext-setting-label"><label>说话人增强 (Speaker Boost)</label></div>
                <label class="siren-ext-switch">
                    <input type="checkbox" id="adv-el-speaker-boost" checked>
                    <span class="siren-ext-slider"></span>
                </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button id="siren-el-adv-cancel" class="siren-ext-btn siren-ext-btn-secondary">取消</button>
                <button id="siren-el-adv-save" class="siren-ext-btn siren-ext-btn-primary" style="background: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; color: #06b6d4; box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);">
                    <i class="fa-solid fa-check"></i> 确认
                </button>
            </div>
        </div>
    </div>
    `;
}

function updateVoiceDatalist() {
  const $datalist = $("#siren-el-voice-datalist");
  $datalist.empty();
  availableVoices.forEach((v) => {
    $datalist.append(`<option value="${v.id}">${v.name}</option>`);
  });
}

function createElevenLabsCharRow(charName = "", voiceId = "", advData = null) {
  if (!advData) advData = getDefaultElevenLabsAdvData();
  const dataStr = encodeURIComponent(JSON.stringify(advData));

  return `
        <div class="siren-ext-setting-row siren-el-char-item" style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
            <input type="text" class="siren-ext-input el-char-name" placeholder="角色名" value="${charName}" style="flex: 1 1 100%; width: 100%; box-sizing: border-box; height: 32px;">
            
            <div style="display: flex; gap: 6px; width: 100%; align-items: center;">
                <input type="text" list="siren-el-voice-datalist" class="siren-ext-input el-voice-id" placeholder="双击选择或粘贴ID" value="${voiceId}" style="flex: 1; min-width: 0; height: 32px; box-sizing: border-box;">
                
                <button class="siren-ext-btn el-btn-adv" style="background: none; border: none; color: #06b6d4; width: 30px; height: 32px; padding: 0 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;" title="高级声音配置"><i class="fa-solid fa-sliders"></i></button>
                <button class="siren-ext-btn el-btn-del" style="background: none; border: none; color: #ef4444; width: 30px; height: 32px; padding: 0 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;" title="删除"><i class="fa-solid fa-trash"></i></button>
            </div>
            <input type="hidden" class="el-adv-data" value="${dataStr}">
        </div>
    `;
}

export function bindElevenLabsEvents() {
  const settings = getSirenSettings();
  if (!settings.tts.elevenlabs) {
    settings.tts.elevenlabs = {
      region: "global",
      api_key: "",
      model: "eleven_multilingual_v2",
      text_norm: false,
    };
  }

  const elConfig = settings.tts.elevenlabs;
  $("#siren-el-region").val(elConfig.region || "global");
  $("#siren-el-apikey").val(elConfig.api_key || "");
  $("#siren-el-model").val(elConfig.model || "eleven_multilingual_v2");
  $("#siren-el-norm").prop("checked", elConfig.text_norm || false);

  loadCharDataFromST();

  $("#siren-el-fetch-voices")
    .off("click")
    .on("click", async function () {
      const apiKey = $("#siren-el-apikey").val().trim();
      if (!apiKey) {
        if (window.toastr) window.toastr.warning("请先输入 API Key！");
        return;
      }

      const $btn = $(this);
      const originalHtml = $btn.html();
      $btn
        .html('<i class="fa-solid fa-spinner fa-spin"></i> 同步中...')
        .prop("disabled", true);

      try {
        const region = $("#siren-el-region").val();
        availableVoices = await fetchElevenLabsVoices(apiKey, region);
        if (window.toastr)
          window.toastr.success(`成功拉取 ${availableVoices.length} 个音色！`);
        updateVoiceDatalist();
      } catch (e) {
        if (window.toastr) window.toastr.error("拉取音色失败：" + e.message);
      } finally {
        $btn.html(originalHtml).prop("disabled", false);
      }
    });

  $("#siren-el-char-add")
    .off("click")
    .on("click", function () {
      $("#siren-el-char-list").append(createElevenLabsCharRow());
      bindRowEvents();
    });

  $("#siren-el-region, #siren-el-apikey, #siren-el-model, #siren-el-norm").on(
    "change input",
    function () {
      const settings = getSirenSettings();
      settings.tts.elevenlabs.region = $("#siren-el-region").val();
      settings.tts.elevenlabs.api_key = $("#siren-el-apikey").val().trim();
      settings.tts.elevenlabs.model = $("#siren-el-model").val();
      settings.tts.elevenlabs.text_norm = $("#siren-el-norm").is(":checked");
    },
  );

  const sliders = [
    { id: "#adv-el-speed", valId: "#val-el-speed" },
    { id: "#adv-el-stability", valId: "#val-el-stability" },
    { id: "#adv-el-similarity", valId: "#val-el-similarity" },
    { id: "#adv-el-style", valId: "#val-el-style" },
  ];
  sliders.forEach((s) => {
    $(s.id).on("input", function () {
      $(s.valId).text($(this).val());
    });
  });

  bindSirenSliders([
    "adv-el-speed",
    "adv-el-stability",
    "adv-el-similarity",
    "adv-el-style",
  ]);

  $("#siren-el-adv-cancel")
    .off("click")
    .on("click", function () {
      $("#siren-el-adv-modal").css("display", "none");
      currentEditingRow = null;
    });

  $("#siren-el-adv-save")
    .off("click")
    .on("click", function () {
      if (!currentEditingRow) return;

      const newData = {
        speed: parseFloat($("#adv-el-speed").val()),
        stability: parseFloat($("#adv-el-stability").val()),
        similarity_boost: parseFloat($("#adv-el-similarity").val()),
        style: parseFloat($("#adv-el-style").val()),
        use_speaker_boost: $("#adv-el-speaker-boost").is(":checked"),
      };

      currentEditingRow
        .find(".el-adv-data")
        .val(encodeURIComponent(JSON.stringify(newData)));

      currentEditingRow.find(".el-btn-adv").css({
        background: "rgba(16, 185, 129, 0.2)",
        "border-color": "#10b981",
        color: "#10b981",
      });

      $("#siren-el-adv-modal").css("display", "none");
      currentEditingRow = null;
    });

  $("#siren-el-save-all")
    .off("click")
    .on("click", async function (e, isSilent = false) {
      const settings = getSirenSettings();
      settings.tts.elevenlabs.region = $("#siren-el-region").val();
      settings.tts.elevenlabs.api_key = $("#siren-el-apikey").val().trim();
      settings.tts.elevenlabs.model = $("#siren-el-model").val();
      settings.tts.elevenlabs.text_norm = $("#siren-el-norm").is(":checked");

      saveSirenSettings(true);

      const mapData = {};
      $("#siren-el-char-list .siren-el-char-item").each(function () {
        const charName = $(this).find(".el-char-name").val().trim();
        const voiceId = $(this).find(".el-voice-id").val();
        if (charName && voiceId) {
          const advDataStr = decodeURIComponent(
            $(this).find(".el-adv-data").val(),
          );
          let advData = getDefaultElevenLabsAdvData();
          try {
            advData = { ...advData, ...JSON.parse(advDataStr) };
          } catch (e) {}
          mapData[charName] = { voice_id: voiceId, ...advData };
        }
      });

      await saveToCharacterCard(
        "siren_voice_tts_elevenlabs",
        { voices: mapData },
        true,
      );

      if (!isSilent && window.toastr) {
        window.toastr.success(
          "ElevenLabs: 配置已保存，已自动切换并同步世界书！",
        );
      }

      const currentSettings = getSirenSettings();
      currentSettings.tts.provider = "elevenlabs";
      currentSettings.tts.enabled = true;
      saveSirenSettings(true);
      await syncTtsWorldbookEntries("elevenlabs", true);
    });

  window.addEventListener("siren:character_changed", () => {
    if ($("#siren-el-char-list").length > 0) {
      console.log(
        "[Siren Voice] 🔄 检测到聊天切换，正在刷新 ElevenLabs 音色映射...",
      );
      loadCharDataFromST();
    }
  });

  $("#siren-el-test-char")
    .off("focus")
    .on("focus", function () {
      const $select = $(this);
      const currentVal = $select.val();
      $select
        .empty()
        .append('<option value="">(点击选择已配置的角色)</option>');

      $("#siren-el-char-list .siren-el-char-item").each(function () {
        const charName = $(this).find(".el-char-name").val().trim();
        if (charName) {
          $select.append(`<option value="${charName}">${charName}</option>`);
        }
      });

      if ($select.find(`option[value="${currentVal}"]`).length > 0) {
        $select.val(currentVal);
      }
    });

  $("#siren-el-test-generate")
    .off("click")
    .on("click", async function () {
      const charName = $("#siren-el-test-char").val();
      if (!charName) {
        if (window.toastr)
          window.toastr.warning("请先在左侧下拉框选择要测试的角色！");
        return;
      }

      const text = $("#siren-el-test-text").val().trim();
      if (!text) {
        if (window.toastr) window.toastr.warning("请输入测试台词！");
        return;
      }

      const apiKey = $("#siren-el-apikey").val().trim();
      const model = $("#siren-el-model").val();
      const textNorm = $("#siren-el-norm").is(":checked");

      if (!apiKey) {
        if (window.toastr) window.toastr.warning("缺少 API Key，请先配置！");
        return;
      }

      let voiceId = "";
      let advData = null;
      $("#siren-el-char-list .siren-el-char-item").each(function () {
        if ($(this).find(".el-char-name").val().trim() === charName) {
          voiceId = $(this).find(".el-voice-id").val();
          const dataStr = decodeURIComponent(
            $(this).find(".el-adv-data").val() || "%7B%7D",
          );
          try {
            advData = JSON.parse(dataStr);
          } catch (e) {}
        }
      });

      if (!voiceId) {
        if (window.toastr)
          window.toastr.error("选中的角色没有配置 Voice ID，请检查上方列表！");
        return;
      }

      const config = {
        region: $("#siren-el-region").val(),
        api_key: apiKey,
        model: model,
        text_norm: textNorm,
        voice_id: voiceId,
        ...(advData || getDefaultElevenLabsAdvData()),
      };

      const $btn = $(this);
      const $status = $("#siren-el-test-status");
      const $audio = $("#siren-el-test-audio");
      const $download = $("#siren-el-test-download");

      $btn.prop("disabled", true);
      $status.html('<i class="fa-solid fa-spinner fa-spin"></i> 正在合成中...');
      $audio.hide();
      $download.hide();

      try {
        const { generateElevenLabsAudioBlob } = await import(
          "./elevenlabs_logic.js"
        );
        const blob = await generateElevenLabsAudioBlob(text, "", config);

        const url = URL.createObjectURL(blob);
        $audio.attr("src", url).show();
        $download.attr("href", url).show();
        $status.html('<span style="color: #06b6d4;">生成成功！</span>');

        $audio[0].play().catch((e) => console.warn("自动播放被浏览器拦截", e));
      } catch (err) {
        console.error("[Siren Voice] ElevenLabs 测试失败:", err);
        $status.html(
          `<span style="color: #ef4444;" title="${err.message}">失败: ${err.message}</span>`,
        );
      } finally {
        $btn.prop("disabled", false);
      }
    });
}

function bindRowEvents() {
  $(".el-voice-id")
    .off("click")
    .on("click", function () {
      if (availableVoices.length === 0 && !$(this).val()) {
        if (window.toastr)
          window.toastr.info(
            "列表为空：请先填入 API Key 并点击上方的【同步音色】按钮哦！",
          );
      }
    });

  $(".el-btn-del")
    .off("click")
    .on("click", function () {
      $(this).closest(".siren-el-char-item").remove();
    });

  $(".el-btn-adv")
    .off("click")
    .on("click", function () {
      const $row = $(this).closest(".siren-el-char-item");
      currentEditingRow = $row;

      const charName = $row.find(".el-char-name").val().trim() || "未命名角色";
      $("#siren-el-adv-charname").text(charName);

      const dataStr = decodeURIComponent(
        $row.find(".el-adv-data").val() || "%7B%7D",
      );
      let data = getDefaultElevenLabsAdvData();
      try {
        data = { ...data, ...JSON.parse(dataStr) };
      } catch (e) {
        console.error("Parse adv data failed", e);
      }

      $("#adv-el-speed").val(data.speed).trigger("input");
      $("#adv-el-stability").val(data.stability).trigger("input");
      $("#adv-el-similarity").val(data.similarity_boost).trigger("input");
      $("#adv-el-style").val(data.style).trigger("input");
      $("#adv-el-speaker-boost").prop("checked", data.use_speaker_boost !== false);

      $("#siren-el-adv-modal").css("display", "flex").hide().fadeIn(150);
    });
}

async function loadCharDataFromST() {
  const context = SillyTavern.getContext();
  const characterId = context.characterId;
  const $list = $("#siren-el-char-list");
  $list.empty();

  if (characterId === undefined || characterId === null) {
    $list.html(
      `<div style="color: #64748b; text-align: center;">当前未选中角色，无法加载映射配置。</div>`,
    );
    return;
  }

  const currentAvatar = context.characters[characterId];
  const charExt =
    currentAvatar?.data?.extensions?.siren_voice_tts_elevenlabs?.voices || {};

  const keys = Object.keys(charExt);
  if (keys.length === 0) {
  } else {
    for (const [cName, config] of Object.entries(charExt)) {
      const voiceId = config.voice_id || "";
      const advData = {
        speed: config.speed ?? 1.0,
        stability: config.stability ?? 0.5,
        similarity_boost: config.similarity_boost ?? 0.75,
        style: config.style ?? 0,
        use_speaker_boost: config.use_speaker_boost !== false,
      };
      $list.append(createElevenLabsCharRow(cName, voiceId, advData));
    }
  }

  bindRowEvents();
}
