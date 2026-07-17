import { getSirenSettings } from "./settings.js";
// 计算滑块百分比并更新 CSS 变量
export function updateSirenSliderUI(slider) {
  const min = parseFloat(slider.min || 0);
  const max = parseFloat(slider.max || 100);
  const val = parseFloat(slider.value);
  // 防御性除以零检查
  const percent = max > min ? ((val - min) / (max - min)) * 100 : 0;
  slider.style.setProperty("--val", `${percent}%`);
}

// 批量绑定滑块事件
export function bindSirenSliders(sliderIds) {
  sliderIds.forEach((id) => {
    const slider = document.getElementById(id);
    if (!slider) return;

    // 1. 初始化页面时立刻渲染一次背景
    updateSirenSliderUI(slider);

    // 2. 拖动时实时更新
    slider.addEventListener("input", (e) => {
      updateSirenSliderUI(e.target);
    });
  });
}

export function compileSirenCss(rawCss) {
  if (!rawCss) return "";

  let safeCss = rawCss.replace(
    /\.siren-scene-active\s+\.mes_text/gi,
    ".siren-scene-active .siren-karaoke-target",
  );

  // 🚀 因为有了游标法，我们可以安全地启用最高级的 GPU 加速：background-position 移动。
  // 将耗费 CPU 的线性渐变重绘，转化为纯 GPU 的图层平移，彻底告别掉帧。
  safeCss = safeCss.replace(
    /background:\s*linear-gradient\(to right,\s*(.*?)\s+var\(--k-prog,\s*0%\),\s*(.*?)\s+var\(--k-prog,\s*0%\)\);/g,
    "background: linear-gradient(to right, $1 50%, $2 50%); background-size: 200% 100%; background-position: calc(100% - var(--k-prog, 0%)) 0;",
  );

  return safeCss.replace(
    /\.siren-([a-zA-Z0-9_-]+)/g,
    ":is(.siren-$1, .custom-siren-$1)",
  );
}

/**
 * 简单安全的字符串清理
 */
export function safeStr(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 核心清洗器：精准剥离中英双语方括号及内部语气词
 */
export function stripParentheticalAsides(text) {
  return String(text || "")
    .replace(/\[[^[\]]*\]/g, "") // 👈 精确剔除英文方括号 [sigh], [laugh]
    .replace(/【[^【】]*】/g, "") // 👈 精确剔除中文方括号 【叹气】
    .replace(/[ \t]+/g, " ") // 折叠多出来的空格
    .trim();
}

/**
 * 专门用于清理发送给 TTS 的纯文本，剥离 Markdown 符号
 * ⚠️ 注意：这里特意保留了单波浪号 ~ ，因为在中文语境下它常用来表示尾音拉长（如 "啊~"），对 TTS 的停顿有正面作用。
 */
export function stripInlineMarkdown(text) {
  if (!text || typeof text !== "string") return "";
  // 全局移除 星号(*)、下划线(_)、反引号(`) 和成对的删除线(~~)
  return text.replace(/[*_`]/g, "").replace(/~~/g, "").trim();
}

/**
 * 剔除字符串首尾的冗余成对标点符号（如中英文引号、星号、反引号）
 * 修复：严格判断成对闭合，只有头尾匹配相同的符号对时才剥离，避免误伤内部引用
 */
export function stripWrappingPunctuation(textOrHtml) {
  if (!textOrHtml || typeof textOrHtml !== "string") return "";

  let trimmed = textOrHtml.trim();

  // 辅助函数：匹配并移除开头和结尾的空白字符、<br> 标签、&nbsp;
  const trimEdges = (str) =>
    str.replace(/^(?:\s|<br\s*\/?>|&nbsp;)+|(?:\s|<br\s*\/?>|&nbsp;)+$/gi, "");

  // 定义支持剥离的成对包裹符号（支持多次嵌套，如 *"文本"*）
  const pairedPunctuation = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
    ["「", "」"],
    ["『", "』"],
    ["《", "》"],
    ["〈", "〉"],
    ["*", "*"],
    ["`", "`"],
  ];

  let previous;
  do {
    previous = trimmed;

    // 先清理外层包裹的空白和换行
    trimmed = trimEdges(trimmed);

    // 检查头尾是否是成对的符号
    for (const [open, close] of pairedPunctuation) {
      // 确保文本长度足够，且头尾刚好匹配当前的符号对
      if (
        trimmed.startsWith(open) &&
        trimmed.endsWith(close) &&
        trimmed.length >= open.length + close.length
      ) {
        // 如果成对匹配，各裁掉头尾的一层符号
        trimmed = trimmed.slice(open.length, -close.length);
        // 跳出 for 循环，重新走一遍 do-while（因为剥离后可能暴露出新的换行符或下一层成对符号）
        break;
      }
    }
  } while (trimmed !== previous);

  return trimmed.trim();
}

/**
 * 解析 <speak>, <inner>, <phone> 标签
 */
export function parseSpeakTags(text) {
  if (!text || typeof text !== "string") return [];

  // 🌟 升级正则：使用 (speak|inner|phone) 捕获标签名，\1 反向引用闭合
  const regex = /<(speak|inner|phone)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const results = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    const tagName = (match[1] || "speak").toLowerCase(); // 🌟 获取具体的标签类型
    const rawAttrs = match[2] || "";

    const innerText = safeStr(match[3] || "")
      .replace(/\{\{[\s\S]*?\}\}/g, "")
      .trim();

    // 调用核心清洗器，生成一份纯净文本
    let cleanText = stripParentheticalAsides(innerText);
    cleanText = stripWrappingPunctuation(cleanText);

    const attrs = {};
    // 兼容双引号、单引号，以及 ST 可能转义的 &quot;
    const attrRegex = /(\w+)\s*=\s*(?:"|&quot;|')([^"']*)(?:"|&quot;|')/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    results.push({
      raw: match[0],
      tag: tagName, // 🌟 新增：将标签类型传给底层
      text: innerText, // 保留：带 (sigh) 的原文本
      cleanText: cleanText, // 干净的文本
      char: safeStr(attrs.char),
      mood: safeStr(attrs.mood),
      detail: safeStr(attrs.detail),
      dir: safeStr(attrs.dir) || "center",
      attrs,
    });
  }

  return results;
}

/**
 * 辅助函数：根据 provider 获取对应的音色和情绪数组
 */
export function getTtsVoiceAndMoodLists(provider) {
  const context = SillyTavern.getContext();
  const charId = context.characterId;
  let voices = [];
  let moods = [];

  // 防御性获取当前角色卡的 extensions 数据
  const charExts =
    charId !== undefined &&
    charId !== null &&
    context.characters &&
    context.characters[charId]
      ? context.characters[charId].data?.extensions || {}
      : {};

  switch (provider) {
    case "indextts":
      // 音色：位于角色卡 siren_voice_tts
      const idxVoiceMap = charExts.siren_voice_tts?.voices || {};
      voices = Object.keys(idxVoiceMap);
      // 情绪：位于全局设置
      const settings = getSirenSettings();
      moods = (settings.tts?.indextts?.emotion_presets || []).map(
        (e) => e.name,
      );
      break;

    case "minimax":
      // 音色：位于角色卡 siren_voice_tts_minimax
      const mmVoiceMap = charExts.siren_voice_tts_minimax?.voices || {};
      voices = Object.keys(mmVoiceMap);
      // 无情绪设置
      break;

    case "elevenlabs":
      const elVoiceMap = charExts.siren_voice_tts_elevenlabs?.voices || {};
      voices = Object.keys(elVoiceMap);
      break;

    case "doubao":
      // 音色：位于角色卡 siren_voice_tts_doubao
      const dbVoiceMap = charExts.siren_voice_tts_doubao?.voices || {};
      voices = Object.keys(dbVoiceMap);
      // 无情绪设置
      break;

    case "gptsovits":
      // 音色与情绪：均位于角色卡 siren_voice_gptsovits
      const gptData = charExts.siren_voice_gptsovits || {};
      voices = (gptData.characters || []).map((c) => c.charName);
      moods = (gptData.emotions || []).map((e) => e.emotion);
      break;
  }

  return { voices, moods };
}

/**
 * 获取当前绑定的 Siren-Voice 世界书的实际名称（支持模糊匹配版本号前缀等）
 * 如果未绑定或环境未就绪，返回 null
 */
export function getActiveSirenWorldbookName() {
  if (
    !window.TavernHelper ||
    typeof window.TavernHelper.getGlobalWorldbookNames !== "function"
  ) {
    return null;
  }
  try {
    const globalWbs = window.TavernHelper.getGlobalWorldbookNames();
    // 返回第一个包含 "Siren-Voice" 的世界书全名
    return globalWbs.find((name) => name.includes("Siren-Voice")) || null;
  } catch (error) {
    console.warn("[Siren Voice] 获取世界书名称失败:", error);
    return null;
  }
}

/**
 * 根据 TTS 总开关和选中的 Provider，动态同步世界书条目并注入宏数据
 * @param {string} selectedProvider - 当前选中的 provider 标识 (如 "indextts")
 * @param {boolean} isTtsEnabled - TTS 总开关 (siren-tts-enable) 是否开启
 */
export async function syncTtsWorldbookEntries(selectedProvider, isTtsEnabled) {
  if (
    !window.TavernHelper ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  )
    return;

  const targetWbName = getActiveSirenWorldbookName();
  if (!targetWbName) return;

  const providerToEntrySuffix = {
    indextts: "indexTTS",
    gptsovits: "GPT-SoVITS",
    doubao: "豆包",
    minimax: "minimax",
    elevenlabs: "ElevenLabs",
    voxcpm: "VoxCPM", // <--- 🌟 新增这一行：将 voxcpm 映射到世界书条目 TTS-VoxCPM
  };
  const targetEntryName = isTtsEnabled
    ? `TTS-${providerToEntrySuffix[selectedProvider]}`
    : null;

  try {
    await window.TavernHelper.updateWorldbookWith(
      targetWbName,
      (worldbook) => {
        worldbook.forEach((entry) => {
          if (entry.name && entry.name.startsWith("TTS-")) {
            // 纯粹的状态切换，不再修改 extra 和 content
            entry.enabled = isTtsEnabled
              ? entry.name === targetEntryName
              : false;
          }
        });
        return worldbook;
      },
      { render: "debounced" },
    );
    console.log(
      `[Siren Voice] TTS世界书条目开关同步完成。激活条目: ${targetEntryName || "无"}`,
    );
  } catch (error) {
    console.error("[Siren Voice] 同步世界书失败:", error);
  }
}

/**
 * 🌟 独立同步空间感模式世界书条目状态
 * @param {number} spatialMode - 0: 无, 1: 简单模式, 2: 沉浸模式
 */
export async function syncSpatialWorldbookEntries(spatialMode) {
  const targetWbName = getActiveSirenWorldbookName();
  if (
    !targetWbName ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  ) {
    console.warn(
      "[Siren Voice] 未找到包含 'Siren-Voice' 的世界书或环境不可用，跳过空间感世界书同步。",
    );
    return;
  }

  try {
    await window.TavernHelper.updateWorldbookWith(
      targetWbName,
      (worldbook) => {
        worldbook.forEach((entry) => {
          // 简单模式 (1) 开启 Direction-Simple
          if (entry.name === "Direction-Simple") {
            entry.enabled = spatialMode === 1;
          }
          // 沉浸模式 (2) 开启 Direction-Immersive
          if (entry.name === "Direction-Immersive") {
            entry.enabled = spatialMode === 2;
          }
        });
        return worldbook;
      },
      { render: "debounced" },
    );

    console.log(`[Siren Voice] 空间感世界书同步完成。当前模式: ${spatialMode}`);
  } catch (error) {
    console.error("[Siren Voice] 同步空间感世界书失败:", error);
  }
}

export async function syncAmbienceWorldbookEntries(isAmbienceEnabled) {
  const targetWbName = getActiveSirenWorldbookName();
  if (
    !targetWbName ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  )
    return;

  try {
    await window.TavernHelper.updateWorldbookWith(
      targetWbName,
      (worldbook) => {
        worldbook.forEach((entry) => {
          // 纯粹的状态切换，不再修改 extra 和 content
          if (entry.name === "AMBIENCE" || entry.name === "SFX") {
            entry.enabled = isAmbienceEnabled;
          }
        });
        return worldbook;
      },
      { render: "debounced" },
    );
    console.log(
      `[Siren Voice] AMBIENCE/SFX世界书条目开关同步完成。状态: ${isAmbienceEnabled}`,
    );
  } catch (error) {
    console.error("[Siren Voice] 同步AMBIENCE世界书失败:", error);
  }
}

/**
 * 独立同步 Music 世界书条目状态
 */
export async function syncMusicWorldbookEntry(isMusicEnabled) {
  const targetWbName = getActiveSirenWorldbookName();
  if (
    !targetWbName ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  ) {
    console.warn(
      "[Siren Voice] 未找到包含 'Siren-Voice' 的世界书或环境不可用，跳过 Music 世界书同步。",
    );
    return;
  }

  try {
    await window.TavernHelper.updateWorldbookWith(
      targetWbName,
      (worldbook) => {
        worldbook.forEach((entry) => {
          // 核心逻辑：精准匹配名称为 "Music" 的条目
          if (entry.name === "Music") {
            entry.enabled = isMusicEnabled;
          }
        });
        return worldbook;
      },
      { render: "debounced" },
    );

    console.log(
      `[Siren Voice] Music世界书同步完成。潮汐音乐台状态: ${isMusicEnabled}`,
    );
  } catch (error) {
    console.error("[Siren Voice] 同步Music世界书失败:", error);
  }
}

/**
 * 检测 LLM 回复的完整性
 */
export function checkReplyIntegrity(content, customStopRaw) {
  // 1. 基础防空检查
  if (!content || content.trim().length < 1) {
    console.warn("[Siren Voice] ⛔ 拦截：回复内容为空");
    return false;
  }

  const trimmedContent = content.trim();

  // 2. 自定义多符号检测规则 (覆盖默认规则)
  if (customStopRaw && customStopRaw.trim().length > 0) {
    const customList = customStopRaw.split(/[,，]/);
    for (const item of customList) {
      const symbol = item.trim();
      if (!symbol) continue;
      // 如果是以自定义符号结尾，立即放行
      if (trimmedContent.endsWith(symbol)) {
        return true;
      }
    }
    const lastChar = trimmedContent.slice(-1);
    console.warn(
      `[Siren Voice] ⛔ 拦截：回复被截断。结尾字符: [${lastChar}] (未匹配自定义规则: ${customStopRaw})`,
    );
    return false;
  }

  // 3. 默认检测规则 (中英文标点及常见闭合符号)
  const defaultPunctuation = /[.!?。！？"”'’…—\-~>）)\]\}】》〉」』*＊`_；;]$/;
  if (defaultPunctuation.test(trimmedContent)) {
    return true;
  }

  // 4. 均未通过 -> 拦截
  const lastChar = trimmedContent.slice(-1);
  console.warn(
    `[Siren Voice] ⛔ 拦截：回复被截断。结尾字符: [${lastChar}] (未匹配默认规则)`,
  );
  return false;
}

// 新增这个辅助函数，用于获取乘上 Master(主音量) 后的最终 0.0~1.0 的音量值
export function getRealVolume(channel) {
  const settings = getSirenSettings();
  if (!settings || !settings.mixer) return 1.0;

  const master = (settings.mixer.volume.master ?? 100) / 100;
  const chVol = (settings.mixer.volume[channel] ?? 100) / 100;

  return Math.max(0, Math.min(1, master * chVol));
}
