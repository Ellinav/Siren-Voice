import { safeStr } from "./utils.js";

const MODULE_NAME = "siren_voice_settings";
const CHARACTER_TTS_KEY = "siren_voice_tts";

let currentTtsAudio = null;
let currentTtsObjectUrl = null;
let lastHandledMessageId = null;

function isIndexTtsEnabled() {
  const context = SillyTavern.getContext();
  const settings = context?.extensionSettings?.[MODULE_NAME];
  return (
    settings?.tts?.enabled === true && settings?.tts?.provider === "indextts"
  );
}

/**
 * 获取全局 TTS 设置
 */
function getTtsSettings() {
  const context = SillyTavern.getContext();
  const settings = context?.extensionSettings?.[MODULE_NAME];
  return settings?.tts?.indextts || {};
}

/**
 * 从角色名查找角色索引
 * 优先精确匹配，再别名匹配
 */
export function findCharacterIdByName(charName) {
  const context = SillyTavern.getContext();
  const characters = context?.characters || [];
  if (!charName) return undefined;

  const normalized = charName.trim().toLowerCase();

  // 1. 精确 name 匹配
  let index = characters.findIndex((c) => {
    const name = c?.name || c?.data?.name || "";
    return name.trim().toLowerCase() === normalized;
  });
  if (index !== -1) return index;

  // 2. 角色卡扩展别名匹配
  index = characters.findIndex((c) => {
    const ext = c?.data?.extensions?.[CHARACTER_TTS_KEY];
    const aliases = Array.isArray(ext?.aliases) ? ext.aliases : [];
    return aliases.some(
      (alias) => String(alias).trim().toLowerCase() === normalized,
    );
  });
  if (index !== -1) return index;

  return undefined;
}

/**
 * 读取角色卡 TTS 配置
 */
export function getCharacterTtsConfig(characterId) {
  const context = SillyTavern.getContext();
  if (characterId === undefined || characterId === null) return null;

  const character = context?.characters?.[characterId];
  return character?.data?.extensions?.[CHARACTER_TTS_KEY] || null;
}

/**
 * 保存当前角色的 TTS 配置
 */
export async function saveCurrentCharacterTtsConfig(config) {
  const context = SillyTavern.getContext();
  const { writeExtensionField, characterId } = context || {};

  if (characterId === undefined || characterId === null) {
    throw new Error(
      "当前未选中角色，或当前处于群聊场景，无法保存角色音色配置。",
    );
  }

  if (typeof writeExtensionField !== "function") {
    throw new Error("writeExtensionField 不可用。");
  }

  const payload = {
    ...(config || {}),
    updated_at: Date.now(),
  };

  await writeExtensionField(characterId, CHARACTER_TTS_KEY, payload);
  if (context.saveSettingsDebounced) context.saveSettingsDebounced();

  return payload;
}

export async function fetchIndexTtsVoices() {
  const settings = getTtsSettings();
  const apiBase = String(settings.api_base || "http://127.0.0.1:7880").replace(
    /\/+$/,
    "",
  );
  const apiKey = settings.api_key || ""; // 读取 API Key
  const url = `${apiBase}/api/v1/voices`;

  const headers = {};
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`; // 塞入 Header

  const response = await fetch(url, { headers }); // 发送 Header
  if (!response.ok) {
    throw new Error(`获取参考音频列表失败: ${response.status}`);
  }
  return await response.json();
}

/**
 * 根据 speak.char 获取对应角色音色
 * 寻路逻辑：
 * 1. 优先从当前聊天角色卡的 voices 字典中精准匹配
 * 2. 去全局寻找同名角色卡，看它是否自带配置
 * 3. 实在找不到，拿当前聊天角色卡的第一个配置作为兜底
 */
export function resolveVoiceRefBySpeakChar(speakChar) {
  const context = SillyTavern.getContext();
  const currentId = context?.characterId;
  const safeSpeakChar = (speakChar || "").trim().toLowerCase();

  // === 策略 1：优先在【当前角色卡】的字典里找 ===
  // （因为 UI 面板是把多个角色列表保存在当前角色卡里的）
  if (currentId !== undefined && currentId !== null) {
    const currentCfg = getCharacterTtsConfig(currentId);
    if (currentCfg && currentCfg.voices) {
      // 不区分大小写匹配键名
      const matchKey = Object.keys(currentCfg.voices).find(
        (k) => k.trim().toLowerCase() === safeSpeakChar,
      );
      if (matchKey && currentCfg.voices[matchKey]) {
        return {
          voice_ref: currentCfg.voices[matchKey],
          characterId: currentId,
          source: "current_char_voices_map",
          config: currentCfg,
        };
      }
    }
  }

  // === 策略 2：在【全局同名角色卡】里找 ===
  if (safeSpeakChar) {
    const cid = findCharacterIdByName(speakChar);
    if (cid !== undefined) {
      const cfg = getCharacterTtsConfig(cid);
      if (cfg && cfg.voices) {
        const matchKey = Object.keys(cfg.voices).find(
          (k) => k.trim().toLowerCase() === safeSpeakChar,
        );
        if (matchKey && cfg.voices[matchKey]) {
          return {
            voice_ref: cfg.voices[matchKey],
            characterId: cid,
            source: "global_char_match",
            config: cfg,
          };
        }
      } else if (cfg && cfg.voice_ref) {
        // 兼容旧版本可能的单一字段遗留
        return {
          voice_ref: cfg.voice_ref,
          characterId: cid,
          source: "global_char_legacy",
          config: cfg,
        };
      }
    }
  }

  // === 策略 3：终极兜底 ===
  // 如果全都没匹配上，提取当前角色卡字典里的【第一个音色】强行发声
  if (currentId !== undefined && currentId !== null) {
    const currentCfg = getCharacterTtsConfig(currentId);
    if (currentCfg && currentCfg.voices) {
      const firstVoice = Object.values(currentCfg.voices)[0];
      if (firstVoice) {
        return {
          voice_ref: firstVoice,
          characterId: currentId,
          source: "fallback_to_first_voice",
          config: currentCfg,
        };
      }
    }
  }

  // 如果连兜底都没有，那只能判定失败了
  return {
    voice_ref: "",
    characterId: undefined,
    source: "none",
    config: null,
  };
}

/**
 * 根据 mood 找全局情绪预设
 * 支持精确匹配和情绪随机池（如 mood="咆哮"，自动匹配 "咆哮_1", "咆哮_2" 并随机抽取）
 */
export function matchEmotionPreset(mood, settings = null) {
  const tts = settings || getTtsSettings();
  const presets = Array.isArray(tts?.emotion_presets)
    ? tts.emotion_presets
    : [];
  if (!mood) return null;

  const normalizedMood = mood.trim().toLowerCase();
  const matchedPresets = []; // 用于收集所有匹配的预设候选池

  for (const preset of presets) {
    // 直接读取 name 进行处理，剥离 triggers 逻辑
    const normalizedName = String(preset?.name || "")
      .trim()
      .toLowerCase();
    if (!normalizedName) continue;

    // 规则 1：精准匹配 (例如预设叫 "开心"，LLM 输出 "开心")
    // 规则 2：随机池前缀匹配 (例如预设叫 "愤怒-1"，LLM 输出 "愤怒")
    if (
      normalizedName === normalizedMood ||
      normalizedName.startsWith(normalizedMood + "-")
    ) {
      matchedPresets.push(preset);
    }
  }

  // 如果没有任何匹配项，直接返回 null
  if (matchedPresets.length === 0) {
    return null;
  }

  // 从候选池中随机抽取一个
  const randomIndex = Math.floor(Math.random() * matchedPresets.length);
  const selectedPreset = matchedPresets[randomIndex];

  if (matchedPresets.length > 1) {
    console.log(
      `🌊 [Siren Voice][TTS] 🎯 情绪池命中: mood="${mood}", 匹配到 ${matchedPresets.length} 个候选，随机选中了: ${selectedPreset.name}`,
    );
  }

  return selectedPreset;
}

export function buildIndexTtsPayload(speakObj, voiceRef, ttsSettings = null) {
  const settings = ttsSettings || getTtsSettings();
  const text = safeStr(speakObj?.text);
  const mood = safeStr(speakObj?.mood);
  const detail = safeStr(speakObj?.detail);

  // 【策略 3 & 4】：基础 Payload 默认直接使用全局的 Weight 和 Random 作为兜底
  const payload = {
    text,
    prompt_audio: voiceRef || "",
    clean_text: settings.clean_text !== false,

    emo_control_method: 0,
    emo_ref_path: null,
    emo_text: null,
    emo_vec: null,

    // 全局兜底参数
    emo_weight: Number(settings.emo_weight ?? 0.65),
    emo_random: Boolean(settings.emo_random),

    // 高级采样参数
    do_sample: Boolean(settings.do_sample ?? true),
    max_text_tokens_per_segment: Number(
      settings.max_text_tokens_per_segment ?? 120,
    ),
    top_p: Number(settings.top_p ?? 0.8),
    top_k: Number(settings.top_k ?? 30),
    temperature: Number(settings.temperature ?? 0.8),
    length_penalty: Number(settings.length_penalty ?? 0.0),
    num_beams: Number(settings.num_beams ?? 3),
    repetition_penalty: Number(settings.repetition_penalty ?? 10.0),
    max_mel_tokens: Number(settings.max_mel_tokens ?? 1500),
  };

  // 无 mood/detail，走【策略 4】：音色参考音频兜底 (默认 emo_control_method = 0)
  if (!mood && !detail) {
    return payload;
  }

  // 命中情绪列表
  const preset = matchEmotionPreset(mood, settings);
  if (preset) {
    // 【策略 2】：情感参考音频
    if (preset.method === "audio" && preset.ref_audio) {
      payload.emo_control_method = 1;
      payload.emo_ref_path = preset.ref_audio;
      // 覆盖专属权重
      if (preset.emo_weight !== undefined && preset.emo_weight !== null) {
        payload.emo_weight = Number(preset.emo_weight);
      }
      return payload;
    }

    // 【策略 1】：情感向量
    if (
      preset.method === "vector" &&
      Array.isArray(preset.emo_vec) &&
      preset.emo_vec.length > 0
    ) {
      payload.emo_control_method = 2;
      payload.emo_vec = preset.emo_vec;

      // 覆盖专属随机采样和权重
      payload.emo_random = Boolean(preset.emo_random);
      if (preset.emo_weight !== undefined && preset.emo_weight !== null) {
        payload.emo_weight = Number(preset.emo_weight);
      }
      return payload;
    }
  }

  // 未命中情绪列表，走【策略 3】：自然文本控制 (降级到 detail)
  const allowDetailAsText = settings.allow_detail_as_emo_text !== false;
  const appendDetail = Boolean(settings.append_detail_to_emo_text);

  if (allowDetailAsText) {
    payload.emo_control_method = 3;

    if (mood && detail) {
      payload.emo_text = appendDetail ? `${mood}。${detail}` : detail;
    } else if (detail) {
      payload.emo_text = detail;
    } else if (mood) {
      payload.emo_text = mood;
    } else {
      // 解析失败退回策略 4
      payload.emo_control_method = 0;
    }

    // (注：策略 3 的 weight 和 random 已经在前面被全局参数填充了，无需再管)
  }

  return payload;
}

/**
 * 调用 IndexTTS API
 */
export async function requestIndexTTS(payload) {
  const settings = getTtsSettings();
  const apiBase = String(settings.api_base || "http://127.0.0.1:7880").replace(
    /\/+$/,
    "",
  );
  const apiKey = settings.api_key || ""; // 读取 API Key
  const url = `${apiBase}/api/v1/tts/tasks`;

  const headers = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`; // 塞入 Header
  }

  const response = await fetch(url, {
    method: "POST",
    headers: headers, // 发送 Header
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`IndexTTS 请求失败: ${response.status} ${errorText}`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error("IndexTTS 返回了空音频。");
  }

  return blob;
}

/**
 * 可选：把解析结果写入楼层变量
 */
export async function writeSpeakToMessageVars(
  messageId,
  speakObj,
  resolvedVoice,
  payload,
) {
  if (!window.TavernHelper || !messageId) return;

  await window.TavernHelper.updateVariablesWith(
    (vars) => {
      if (!vars["siren-voice"]) vars["siren-voice"] = {};
      vars["siren-voice"].tts = {
        char: speakObj?.char || "",
        mood: speakObj?.mood || "",
        detail: speakObj?.detail || "",
        text: speakObj?.text || "",
        voice_ref: resolvedVoice?.voice_ref || "",
        emo_control_method: payload?.emo_control_method ?? 0,
        emo_ref_path: payload?.emo_ref_path || null,
        emo_text: payload?.emo_text || null,
        updated_at: Date.now(),
      };
      return vars;
    },
    { type: "message", message_id: messageId },
  );
}

export async function requestIndexTtsGeneration(speakObj, settings) {
  const resolvedVoice = resolveVoiceRefBySpeakChar(speakObj.char);
  if (!resolvedVoice.voice_ref)
    throw new Error(`未找到角色 ${speakObj.char} 的音色参考`);

  const payload = buildIndexTtsPayload(
    speakObj,
    resolvedVoice.voice_ref,
    settings,
  );

  // 👇 补上这行日志输出，深拷贝以防止打印出的对象被后续流程意外修改
  console.log(
    `🌊 [Siren Voice][IndexTTS] 🚀 准备发送请求，Payload:`,
    JSON.parse(JSON.stringify(payload)),
  );

  return await requestIndexTTS(payload);
}

/**
 * 构建给世界书/提示词使用的 mood 指引文本
 */
export function buildMoodPromptText() {
  const settings = getTtsSettings();
  const presets = Array.isArray(settings.emotion_presets)
    ? settings.emotion_presets
    : [];

  if (settings.mood_prompt_mode === "freeform") {
    return `你可以自由输出 mood，并使用 detail 补充更细致的情绪描述。`;
  }

  const moodList = presets
    .map((p) => p?.name)
    .filter(Boolean)
    .join("、");

  return [
    `当你需要输出语音标签时，请使用：<speak char="角色名" mood="情绪" detail="补充描述">台词</speak>`,
    `mood 尽量从以下词中选择：${moodList || "平静、开心、悲伤、愤怒"}。`,
    `如果都不合适，请输出 mood="自定义"并在 detail 中写清楚更细致的情绪状态。`,
  ].join("\n");
}
