function getBaseUrl(region) {
  switch (region) {
    case "us":
      return "https://api.us.elevenlabs.io";
    case "eu":
      return "https://api.eu.residency.elevenlabs.io";
    case "in":
      return "https://api.in.residency.elevenlabs.io";
    case "sg":
      return "https://api.sg.residency.elevenlabs.io";
    default:
      return "https://api.elevenlabs.io";
  }
}

function getVoiceCategoryPrefix(voice) {
  const category = voice?.category || voice?.labels?.category || "";
  if (category === "cloned" || category === "generated") return "[复刻]";
  if (category === "premade") return "[系统]";
  if (voice?.sharing?.status === "shared") return "[共享]";
  return "[自定义]";
}

/**
 * 请求 ElevenLabs 拉取当前账号所有可用音色
 * 返回格式: [{ id: "voice_id", name: "[复刻] Voice Name" }, ...]
 */
export async function fetchElevenLabsVoices(apiKey, region = "global") {
  const url = `${getBaseUrl(region)}/v1/voices?show_legacy=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    let errMsg = `HTTP Error: ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.detail?.message) errMsg = errData.detail.message;
      else if (typeof errData?.detail === "string") errMsg = errData.detail;
    } catch (e) {}
    throw new Error(errMsg);
  }

  const resData = await response.json();
  const voices = [];

  if (Array.isArray(resData.voices)) {
    resData.voices.forEach((v) => {
      const prefix = getVoiceCategoryPrefix(v);
      voices.push({
        id: v.voice_id,
        name: `${prefix} ${v.name || v.voice_id}`,
      });
    });
  }

  return voices;
}

function buildVoiceSettings(config) {
  const numberOrDefault = (value, fallback) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    stability: numberOrDefault(config.stability, 0.5),
    similarity_boost: numberOrDefault(config.similarity_boost, 0.75),
    style: numberOrDefault(config.style, 0),
    speed: numberOrDefault(config.speed, 1.0),
    use_speaker_boost: config.use_speaker_boost !== false,
  };
}

function getTextNormalization(config) {
  if (config.text_norm === true) return "on";
  if (config.text_norm === false) return "off";
  return "auto";
}

/**
 * 核心请求：发送文本到 ElevenLabs 生成语音 Blob
 * @param {string} text 要朗读的纯文本 (允许带 (laughs) 等动作标签)
 * @param {string} mood 解析出来的 ST 情绪标签 (ElevenLabs 不支持，忽略)
 * @param {object} config ST 全局/角色设置组合好的配置
 */
export async function generateElevenLabsAudioBlob(text, mood, config) {
  const baseUrl = getBaseUrl(config.region || "global");
  const voiceId = encodeURIComponent(config.voice_id);
  const url = `${baseUrl}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const requestBody = {
    text: text,
    model_id: config.model || "eleven_multilingual_v2",
    apply_text_normalization: getTextNormalization(config),
    voice_settings: buildVoiceSettings(config),
  };

  console.log(
    `[Siren Voice] 🚀 发送给 ElevenLabs 的请求参数 (角色: ${config.char || "未知"}):`,
    JSON.stringify(requestBody, null, 2),
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": config.api_key,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errMsg = `ElevenLabs 请求失败: HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (Array.isArray(errData?.detail)) {
        errMsg = errData.detail.map((d) => d.msg).join("; ");
      } else if (errData?.detail?.message) {
        errMsg = errData.detail.message;
      } else if (typeof errData?.detail === "string") {
        errMsg = errData.detail;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error("ElevenLabs 返回数据中缺失音频内容");
  }

  return blob;
}
