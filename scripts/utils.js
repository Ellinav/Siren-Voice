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
 * 剔除字符串首尾的冗余标点符号（如中英文引号、星号、反引号）
 * 🌟 修复：兼容 HTML（保留首尾的 <br> 和空格，防止换行符被吞噬）
 */
export function stripWrappingPunctuation(textOrHtml) {
  if (!textOrHtml || typeof textOrHtml !== "string") return "";

  let trimmed = textOrHtml.trim();

  // 匹配开头和结尾的标点。$1 捕获前置/后置的 <br> 或空格。
  // 增加对多种可能出现的空白符号和 br 写法的兼容
  const startRegex = /^((?:\s|<br\s*\/?>|&nbsp;)*)["'“”‘’*`]+/;
  const endRegex = /["'“”‘’*`]+((?:\s|<br\s*\/?>|&nbsp;)*)$/;

  // 循环替换，直到首尾没有这些标点为止（应对多重包裹如 *"文本"*）
  let previous;
  do {
    previous = trimmed;
    trimmed = trimmed.replace(startRegex, "$1").replace(endRegex, "$1");
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
 * 根据 TTS 总开关和选中的 Provider，动态同步世界书条目并注入宏数据
 * @param {string} selectedProvider - 当前选中的 provider 标识 (如 "indextts")
 * @param {boolean} isTtsEnabled - TTS 总开关 (siren-tts-enable) 是否开启
 */
export async function syncTtsWorldbookEntries(selectedProvider, isTtsEnabled) {
  if (
    !window.TavernHelper ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  ) {
    console.warn("[Siren Voice] TavernHelper 不可用，跳过世界书同步。");
    return;
  }

  // 1. 获取要注入的音色和情绪数组
  const { voices, moods } = getTtsVoiceAndMoodLists(selectedProvider);

  // 🌟 新增：复用 AMBIENCE 逻辑，提取基础名称以剥离变体后缀 (如 "愤怒_歇斯底里-1" -> "愤怒_歇斯底里")
  const getBaseName = (name) => {
    return name.replace(/-\d+$/, "").trim();
  };

  // 🌟 新增：对情绪列表进行过滤、去后缀并去重
  const uniqueMoods = [
    ...new Set(
      moods.filter((name) => name && name.trim() !== "").map(getBaseName),
    ),
  ];

  // 格式化为字符串
  const voiceStr = voices.length > 0 ? `[${voices.join(", ")}]` : "[]";
  const moodStr = uniqueMoods.length > 0 ? `[${uniqueMoods.join(", ")}]` : "[]";

  const providerToEntrySuffix = {
    indextts: "indexTTS",
    gptsovits: "GPT-SoVITS",
    doubao: "豆包",
    minimax: "minimax",
  };

  const targetEntryName = isTtsEnabled
    ? `TTS-${providerToEntrySuffix[selectedProvider]}`
    : null;

  try {
    await window.TavernHelper.updateWorldbookWith(
      "Siren-Voice",
      (worldbook) => {
        worldbook.forEach((entry) => {
          if (entry.name && entry.name.startsWith("TTS-")) {
            // 更新开关状态
            entry.enabled = isTtsEnabled
              ? entry.name === targetEntryName
              : false;

            // 2. 宏替换逻辑：仅对被激活的条目进行替换
            if (entry.enabled) {
              if (!entry.extra) entry.extra = {};

              // 首次处理时，将包含 {{VOICE_LIST}} 的原始文本备份到 extra 字段
              if (typeof entry.extra.siren_original_content !== "string") {
                entry.extra.siren_original_content = entry.content;
              }

              // 永远基于备份的原始模板进行替换，保证操作幂等（不丢失宏）
              let updatedContent = entry.extra.siren_original_content;
              updatedContent = updatedContent.replace(
                /\{\{VOICE_LIST\}\}/g,
                voiceStr,
              );
              updatedContent = updatedContent.replace(
                /\{\{MOOD_LIST\}\}/g,
                moodStr,
              );

              entry.content = updatedContent;
            }
          }
        });
        return worldbook;
      },
      { render: "debounced" },
    );

    console.log(
      `[Siren Voice] 世界书同步完成。激活条目: ${targetEntryName || "无"}\n注入音色: ${voiceStr}\n注入情绪: ${moodStr}`,
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
  if (
    !window.TavernHelper ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  ) {
    console.warn("[Siren Voice] TavernHelper 不可用，跳过空间感世界书同步。");
    return;
  }

  try {
    await window.TavernHelper.updateWorldbookWith(
      "Siren-Voice",
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
  if (
    !window.TavernHelper ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  ) {
    console.warn("[Siren Voice] TavernHelper 不可用，跳过世界书同步。");
    return;
  }

  // 获取当前的 AMBIENCE 和 SFX 列表
  const settings = getSirenSettings();
  const ambienceState = settings.ambience || {};

  // 🌟 核心修改 1：定义一个辅助函数，正则匹配结尾的连字符或下划线加数字 (如 -1, _2) 并剔除
  const getBaseName = (name) => {
    // 匹配末尾的 "-数字" 并替换为空。例如 "乡村_雨声-1" -> "乡村_雨声"
    return name.replace(/-\d+$/, "").trim();
  };

  // 🌟 核心修改 2：提取 AMBIENCE 名称 -> 过滤空值 -> 提取基础名 -> 使用 Set 去重
  const ambienceLib =
    ambienceState.libraries?.[ambienceState.current_list] || [];
  const uniqueAmbienceNames = [
    ...new Set(
      ambienceLib
        .map((item) => item.name)
        .filter((name) => name.trim() !== "")
        .map(getBaseName),
    ),
  ];
  const ambienceStr =
    uniqueAmbienceNames.length > 0
      ? `[${uniqueAmbienceNames.join(", ")}]`
      : "[]";

  // 🌟 核心修改 3：对 SFX 执行相同的提取和去重逻辑
  const sfxLib =
    ambienceState.sfx_libraries?.[ambienceState.sfx_current_list] || [];
  const uniqueSfxNames = [
    ...new Set(
      sfxLib
        .map((item) => item.name)
        .filter((name) => name.trim() !== "")
        .map(getBaseName),
    ),
  ];
  const sfxStr =
    uniqueSfxNames.length > 0 ? `[${uniqueSfxNames.join(", ")}]` : "[]";

  try {
    await window.TavernHelper.updateWorldbookWith(
      "Siren-Voice",
      (worldbook) => {
        worldbook.forEach((entry) => {
          // 核心逻辑：精准匹配名称为 "AMBIENCE" 或 "SFX" 的条目
          if (entry.name === "AMBIENCE" || entry.name === "SFX") {
            entry.enabled = isAmbienceEnabled;

            // 宏替换逻辑
            if (entry.enabled) {
              if (!entry.extra) entry.extra = {};

              // 首次处理时，将包含宏占位符的原始文本备份到 extra 字段
              if (typeof entry.extra.siren_original_content !== "string") {
                entry.extra.siren_original_content = entry.content;
              }

              // 永远基于备份的原始模板进行替换，保证操作幂等（不丢失宏）
              let updatedContent = entry.extra.siren_original_content;

              if (entry.name === "AMBIENCE") {
                updatedContent = updatedContent.replace(
                  /\{\{AMBIENCE_LIST\}\}/g,
                  ambienceStr,
                );
              } else if (entry.name === "SFX") {
                updatedContent = updatedContent.replace(
                  /\{\{SFX_LIST\}\}/g,
                  sfxStr,
                );
              }

              entry.content = updatedContent;
            }
          }
        });
        return worldbook;
      },
      { render: "debounced" },
    );

    console.log(
      `[Siren Voice] AMBIENCE世界书同步完成。幻境总开关状态: ${isAmbienceEnabled}\n注入AMBIENCE: ${ambienceStr}\n注入SFX: ${sfxStr}`,
    );
  } catch (error) {
    console.error("[Siren Voice] 同步AMBIENCE世界书失败:", error);
  }
}

/**
 * 独立同步 Music 世界书条目状态
 */
export async function syncMusicWorldbookEntry(isMusicEnabled) {
  if (
    !window.TavernHelper ||
    typeof window.TavernHelper.updateWorldbookWith !== "function"
  ) {
    console.warn("[Siren Voice] TavernHelper 不可用，跳过 Music 世界书同步。");
    return;
  }

  try {
    await window.TavernHelper.updateWorldbookWith(
      "Siren-Voice",
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
