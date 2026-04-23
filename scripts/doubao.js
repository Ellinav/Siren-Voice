import {
  getSirenSettings,
  saveSirenSettings,
  saveToCharacterCard,
} from "./settings.js";
import { generateDoubaoTestAudio } from "./doubao_logic.js";
import { syncTtsWorldbookEntries } from "./utils.js";

// 内置豆包 2.0 官方合成音色列表
const DOUBAO_VOICES_2_0 = [
  { id: "zh_female_vv_uranus_bigtts", name: "Vivi 2.0 (通用/多方言)" },
  { id: "zh_female_xiaohe_uranus_bigtts", name: "小何 2.0 (通用)" },
  { id: "zh_male_m191_uranus_bigtts", name: "云舟 2.0 (通用)" },
  { id: "zh_male_taocheng_uranus_bigtts", name: "小天 2.0 (通用)" },
  { id: "zh_male_liufei_uranus_bigtts", name: "刘飞 2.0 (通用)" },
  { id: "zh_male_sophie_uranus_bigtts", name: "魅力苏菲 2.0 (通用)" },
  {
    id: "zh_female_qingxinnvsheng_uranus_bigtts",
    name: "清新女声 2.0 (通用)",
  },
  { id: "zh_female_cancan_uranus_bigtts", name: "知性灿灿 2.0 (角色扮演)" },
  {
    id: "zh_female_sajiaoxuemei_uranus_bigtts",
    name: "撒娇学妹 2.0 (角色扮演)",
  },
  {
    id: "zh_female_tianmeixiaoyuan_uranus_bigtts",
    name: "甜美小源 2.0 (通用)",
  },
  { id: "zh_female_tianmeitaozi_uranus_bigtts", name: "甜美桃子 2.0 (通用)" },
  {
    id: "zh_female_shuangkuaisisi_uranus_bigtts",
    name: "爽快思思 2.0 (通用)",
  },
  { id: "zh_female_linjianvhai_uranus_bigtts", name: "邻家女孩 2.0 (通用)" },
  { id: "zh_male_shaonianzixin_uranus_bigtts", name: "少年梓辛 2.0 (通用)" },
  { id: "zh_female_meilinvyou_uranus_bigtts", name: "魅力女友 2.0 (通用)" },
  { id: "saturn_zh_female_keainvsheng_tob", name: "可爱女生 (ToB)" },
  { id: "saturn_zh_female_tiaopigongzhu_tob", name: "调皮公主 (ToB)" },
  { id: "saturn_zh_male_shuanglangshaonian_tob", name: "爽朗少年 (ToB)" },
  { id: "saturn_zh_male_tiancaitongzhuo_tob", name: "天才同桌 (ToB)" },
  { id: "saturn_zh_female_cancan_tob", name: "知性灿灿 (ToB)" },
];

export function getDoubaoHtml() {
  let optionsHtml = DOUBAO_VOICES_2_0.map(
    (v) => `<option value="${v.id}">${v.name}</option>`,
  ).join("");

  return `
    <div id="siren-doubao-settings" style="display: flex; flex-direction: column; gap: 15px;">
        
        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
            <h4 style="color: #94a3b8; margin-top: 0; margin-bottom: 15px;">
                <i class="fa-solid fa-key" style="margin-right: 5px;"></i> 全局认证配置
            </h4>
            <div class="siren-ext-setting-row siren-ext-flex-between" style="margin-bottom: 10px;">
                <div class="siren-ext-setting-label">App ID</div>
                <input type="text" id="siren-db-appid" class="siren-ext-input" style="max-width: 60%;" placeholder="火山引擎控制台获取">
            </div>
            <div class="siren-ext-setting-row siren-ext-flex-between">
                <div class="siren-ext-setting-label">Access Key</div>
                <input type="password" id="siren-db-ak" class="siren-ext-input" style="max-width: 60%;" placeholder="输入 Access Key (Token)">
            </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="color: #06b6d4; margin: 0;">
                    <i class="fa-solid fa-users" style="margin-right: 5px;"></i> 角色音色映射
                </h4>
            </div>

            <div id="siren-db-char-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
                </div>

            <button id="siren-db-char-add" class="siren-ext-btn siren-ext-btn-secondary" style="width: 100%; border-style: dashed;">
                <i class="fa-solid fa-plus" style="margin-right: 5px;"></i> 新增角色映射
            </button>
        </div>

        <div style="display: flex; justify-content: center;">
            <button id="siren-db-char-save" class="siren-ext-btn siren-ext-btn-primary" style="width: 100%; padding: 12px 0; justify-content: center; font-size: 1.05em; background: #10b981; border-color: #10b981;">
                <i class="fa-solid fa-floppy-disk" style="margin-right: 8px;"></i>保存配置
            </button>
        </div>

        <div style="margin-top: 10px; border-top: 1px dashed #475569; padding-top: 20px;">
            <h4 style="color: #3b82f6; margin-bottom: 10px; font-size: 1.1em;">
                <i class="fa-solid fa-vial" style="margin-right: 5px;"></i> 豆包 (Doubao) 发音测试
            </h4>
            
            <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 15px;">
                
                <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 12px; line-height: 1.5;">
                    <i class="fa-solid fa-circle-info" style="margin-right: 4px; color: #3b82f6;"></i> 
                    <b>合成 2.0</b> 支持自然语言情绪提示；<b>复刻 2.0</b> 支持 CoT 标签控制。
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select id="siren-db-test-char" class="siren-ext-select" style="height: 32px; box-sizing: border-box; padding: 0 8px; flex: 1;">
                        <option value="">(请先配置并保存上方角色)</option>
                    </select>
                    <input type="text" id="siren-db-test-emotion" class="siren-ext-input" style="height: 32px; box-sizing: border-box; padding: 0 8px; flex: 1;" placeholder="情绪提示词 (如: 用开心的语气)">
                </div>

                <textarea id="siren-db-test-text" class="siren-ext-textarea" rows="2" placeholder="输入一句台词测试效果。复刻2.0可直接在此输入 <cot text=哭腔> 等标签。" style="margin-bottom: 10px;"></textarea>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <button id="siren-db-test-generate" class="siren-ext-btn siren-ext-btn-primary" style="background: #3b82f6; border-color: #3b82f6; color: #ffffff;">
                        <i class="fa-solid fa-bolt"></i> 生成
                    </button>
                    
                    <div id="siren-db-test-preview" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                        <audio id="siren-db-test-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                        
                        <a id="siren-db-test-download" class="siren-ext-btn siren-ext-btn-secondary" style="display: none; padding: 4px 10px; text-decoration: none; color: #cbd5e1;" download="doubao_test.mp3" title="下载音频">
                            <i class="fa-solid fa-download"></i>
                        </a>
                        
                        <span id="siren-db-test-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;">等待生成...</span>
                    </div>
                </div>
            </div>
        </div>
        
        <template id="siren-db-voice-options">${optionsHtml}</template>
    </div>
    `;
}

export function bindDoubaoEvents() {
  const settings = getSirenSettings();
  const context = SillyTavern.getContext();

  // 1. 还原全局设置
  if (settings.tts.doubao) {
    $("#siren-db-appid").val(settings.tts.doubao.app_id || "");
    $("#siren-db-ak").val(settings.tts.doubao.access_key || "");
  }

  // 2. 加载当前角色的映射列表
  loadCharacterDoubaoSettings();

  // 3. 事件：全局保存
  $("#siren-db-char-save")
    .off("click")
    .on("click", async function () {
      // 保存全局设置
      settings.tts.doubao.app_id = $("#siren-db-appid").val().trim();
      settings.tts.doubao.access_key = $("#siren-db-ak").val().trim();
      saveSirenSettings(true);

      // 收集角色列表数据
      const voiceMap = {};
      $("#siren-db-char-list .siren-db-char-row").each(function () {
        const charName = $(this).find(".siren-db-char-name").val().trim();
        const speakerVal =
          $(this).find(".siren-db-speaker-input").val()?.trim() || "";
        const modelVal = $(this).find(".siren-db-model-select").val();

        if (charName && speakerVal) {
          voiceMap[charName] = {
            speaker: speakerVal,
            model: modelVal,
          };
        }
      });

      const success = await saveToCharacterCard("siren_voice_tts_doubao", {
        voices: voiceMap,
      });
      if (success) {
        // 保存成功后，刷新发音测试的下拉列表
        refreshTestCharacterSelect(voiceMap);

        // 👇 【新增代码】同步世界书宏变量
        const currentSettings = getSirenSettings();
        if (currentSettings.tts.provider === "doubao") {
          await syncTtsWorldbookEntries("doubao", currentSettings.tts.enabled);
        }
      }
    });

  // 4. 事件：添加角色行 (现在名字默认留白)
  $("#siren-db-char-add")
    .off("click")
    .on("click", function () {
      addCharRow("", "seed-tts-2.0", "zh_female_vv_uranus_bigtts");
    });

  // 5. 发音测试按钮点击事件
  $("#siren-db-test-generate")
    .off("click")
    .on("click", async function () {
      const charName = $("#siren-db-test-char").val();
      const emotionPrompt = $("#siren-db-test-emotion").val().trim();
      const text = $("#siren-db-test-text").val().trim();

      if (!charName)
        return (
          window.toastr &&
          window.toastr.warning("请先在上方配置角色映射并点击保存！")
        );
      if (!text)
        return window.toastr && window.toastr.warning("测试文本不能为空");

      // 去角色卡里抓取当前选中角色的具体模型和音色ID
      const context = SillyTavern.getContext();
      const charExt =
        context.characters?.[context.characterId]?.data?.extensions
          ?.siren_voice_tts_doubao || {};
      const config = charExt.voices?.[charName];

      if (!config)
        return (
          window.toastr && window.toastr.error("未能读取到该角色的音色配置")
        );

      // 抓取全局秘钥
      const settings = getSirenSettings();
      const appId = settings.tts.doubao?.app_id;
      const accessKey = settings.tts.doubao?.access_key;

      if (!appId || !accessKey)
        return (
          window.toastr &&
          window.toastr.error("请先配置并保存 App ID 和 Access Key！")
        );

      // UI 状态更新：等待中
      $("#siren-db-test-status")
        .text("正在向豆包发起请求...")
        .css("color", "#3b82f6");
      $("#siren-db-test-audio").hide();
      $("#siren-db-test-download").hide();
      $(this).prop("disabled", true).css("opacity", "0.6");

      try {
        // 发起请求！
        const blobUrl = await generateDoubaoTestAudio({
          appId,
          accessKey,
          model: config.model,
          speaker: config.speaker,
          emotionPrompt,
          text,
        });

        // 成功后渲染播放器和下载按钮
        const $audio = $("#siren-db-test-audio");
        $audio.attr("src", blobUrl);
        $audio.show();
        $audio[0].play(); // 自动播放

        const $download = $("#siren-db-test-download");
        $download.attr("href", blobUrl);
        $download.attr("download", `Doubao_Test_${charName}.mp3`);
        $download.show().css("display", "flex");

        $("#siren-db-test-status").text("生成成功！").css("color", "#10b981");
      } catch (err) {
        $("#siren-db-test-status")
          .text("生成失败 (详见控制台)")
          .css("color", "#ef4444");
        if (window.toastr) window.toastr.error(err.message || "请求失败");
      } finally {
        // 解除按钮锁定
        $(this).prop("disabled", false).css("opacity", "1");
      }
    });

  // 6. 监听角色切换
  context.eventSource.on("chat_id_changed", loadCharacterDoubaoSettings);
}

// 辅助函数：渲染角色卡配置
function loadCharacterDoubaoSettings() {
  const context = SillyTavern.getContext();
  const $list = $("#siren-db-char-list");
  $list.empty();

  if (!context.characterId) {
    $list.html(
      `<div style="color:#64748b; font-size:0.9em; text-align:center; padding: 10px;">当前未选中角色，请在对话内设置。</div>`,
    );
    refreshTestCharacterSelect({}); // 清空测试列表
    return;
  }

  const charExt =
    context.characters?.[context.characterId]?.data?.extensions
      ?.siren_voice_tts_doubao || {};
  const voices = charExt.voices || {};

  if (Object.keys(voices).length === 0) {
    // 列表为空时，新增一行空记录（要求不自动填入名字）
    addCharRow("", "seed-tts-2.0", "zh_female_vv_uranus_bigtts");
  } else {
    for (const [charName, config] of Object.entries(voices)) {
      addCharRow(charName, config.model, config.speaker);
    }
  }

  // 初始化时也刷新一下发音测试的下拉框
  refreshTestCharacterSelect(voices);
}

// 🌟 辅助函数：刷新测试区域的角色下拉框
function refreshTestCharacterSelect(voiceMap) {
  const $select = $("#siren-db-test-char");
  $select.empty();

  const charNames = Object.keys(voiceMap);
  if (charNames.length === 0) {
    $select.append('<option value="">(请先配置并保存上方角色)</option>');
    return;
  }

  charNames.forEach((name) => {
    $select.append(`<option value="${name}">${name}</option>`);
  });
}

// 🌟 核心：动态添加一行，应用类 GSV 的半透明暗箱包围结构
function addCharRow(name, model, speaker) {
  const rowId = "db-row-" + Date.now() + Math.floor(Math.random() * 1000);

  // 统一样式，匹配 GSV 的 background: rgba(0,0,0,0.25)
  const rowHtml = `
        <div id="${rowId}" class="siren-ext-setting-row siren-db-char-row" style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 4px;">
            
            <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                <input type="text" class="siren-ext-input siren-db-char-name" placeholder="角色名" value="${name}" style="flex: 1; min-width: 0; height: 32px; box-sizing: border-box; margin: 0;">
                
                <select class="siren-ext-select siren-db-model-select" style="flex: 1.5; min-width: 0; height: 32px; box-sizing: border-box; margin: 0;">
                    <option value="seed-tts-2.0">官方合成 2.0</option>
                    <option value="seed-icl-2.0">声音复刻 2.0</option>
                    <option value="seed-icl-1.0">声音复刻 1.0</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                <div class="siren-db-speaker-container" style="flex: 1; min-width: 0; display: flex; align-items: center; height: 32px;">
                    </div>
                
                <button class="siren-ext-btn siren-ext-btn-secondary siren-db-btn-del" style="width: 32px; height: 32px; padding: 0; box-sizing: border-box; margin: 0; color: #ef4444; flex-shrink: 0; display: flex; align-items: center; justify-content: center;" title="删除">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;

  const $row = $(rowHtml);
  const $modelSelect = $row.find(".siren-db-model-select");
  const $speakerContainer = $row.find(".siren-db-speaker-container");

  $modelSelect.val(model || "seed-tts-2.0");

  // 内部函数：根据选中的模型，重新渲染右侧的音色控件 (同样统一下降到 32px)
  function renderSpeakerField(currentModel, currentValue) {
    if (currentModel === "seed-tts-2.0") {
      const options = $("#siren-db-voice-options").html();
      $speakerContainer.html(`
                <select class="siren-ext-select siren-db-speaker-input" style="width: 100%; height: 32px; box-sizing: border-box; margin: 0;">
                    ${options}
                </select>
            `);
      if (currentValue) $speakerContainer.find("select").val(currentValue);
    } else {
      $speakerContainer.html(`
                <input type="text" class="siren-ext-input siren-db-speaker-input" placeholder="输入复刻音色ID" style="width: 100%; height: 32px; box-sizing: border-box; margin: 0;">
            `);
      if (
        currentValue &&
        !DOUBAO_VOICES_2_0.some((v) => v.id === currentValue)
      ) {
        $speakerContainer.find("input").val(currentValue);
      }
    }
  }

  renderSpeakerField($modelSelect.val(), speaker);

  $modelSelect.on("change", function () {
    const newModel = $(this).val();
    const currentSpeaker = $speakerContainer
      .find(".siren-db-speaker-input")
      .val();
    renderSpeakerField(newModel, currentSpeaker);
  });

  $row.find(".siren-db-btn-del").on("click", function () {
    $row.slideUp(150, () => $row.remove());
  });

  $("#siren-db-char-list").append($row);
}
