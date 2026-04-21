// 获取不同版本的 Base URL
function getBaseUrl(region) {
    return region === "global"
        ? "https://api.minimax.io"
        : "https://api.minimaxi.com";
}

/**
 * 将 Hex 编码的字符串转换为 Blob
 */
function hexToBlob(hexString, mimeType = "audio/mpeg") {
    if (!hexString) return null;
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
    }
    return new Blob([bytes], { type: mimeType });
}

/**
 * 请求 MiniMax 拉取当前账号所有可用音色
 * 返回格式: [{ id: "voice_123", name: "清冷少年" }, ...]
 */
export async function fetchMinimaxVoices(apiKey, region = "cn") {
    const url = `${getBaseUrl(region)}/v1/get_voice`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ voice_type: "all" }),
    });

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    const resData = await response.json();
    if (resData.base_resp && resData.base_resp.status_code !== 0) {
        throw new Error(resData.base_resp.status_msg || "API Error");
    }

    let voices = [];

    // 系统音色
    if (resData.system_voice) {
        resData.system_voice.forEach((v) => {
            voices.push({
                id: v.voice_id,
                name: `[系统] ${v.voice_name || v.voice_id}`,
            });
        });
    }
    // 文生音色 / 复刻音色
    if (resData.voice_generation) {
        resData.voice_generation.forEach((v) => {
            voices.push({ id: v.voice_id, name: `[生成] ${v.voice_id}` });
        });
    }
    if (resData.voice_cloning) {
        resData.voice_cloning.forEach((v) => {
            voices.push({ id: v.voice_id, name: `[复刻] ${v.voice_id}` });
        });
    }

    return voices;
}

/**
 * 核心请求：发送文本到 MiniMax 生成语音 Blob
 * @param {string} text 要朗读的纯文本 (允许带 (laughs) 等动作标签)
 * @param {string} mood 解析出来的 ST 情绪标签 (happy, sad, etc.)
 * @param {object} config ST 全局/角色设置组合好的配置
 */
export async function generateMinimaxAudioBlob(text, mood, config) {
    const url = `${getBaseUrl(config.region || "cn")}/v1/t2a_v2`;

    // 映射从 ST 传来的基础参数和高级效果器参数
    const requestBody = {
        model: config.model || "speech-2.8-hd",
        text: text,
        stream: false,
        output_format: "hex", // 非流式直接要 hex
        language_boost: "auto",
        voice_setting: {
            voice_id: config.voice_id,
            speed: parseFloat(config.speed) || 1.0,
            vol: parseFloat(config.vol) || 1.0,
            pitch: parseInt(config.pitch) || 0,
            text_normalization: config.text_norm === true,
        },
        audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: "mp3",
            channel: 1,
        },
    };

    // 如果 ST 解析出了情绪，且模型是支持情绪的 2.8 或 2.6 系列，则注入
    const validEmotions = [
        "happy",
        "sad",
        "angry",
        "fearful",
        "disgusted",
        "surprised",
        "calm",
        "fluent",
        "whisper",
    ];
    if (mood && validEmotions.includes(mood)) {
        requestBody.voice_setting.emotion = mood;
    }

    // 注入高级效果器 (如果有且不为 0)
    let hasModify = false;
    const modifyData = {};
    if (config.modify_pitch !== 0) {
        modifyData.pitch = parseInt(config.modify_pitch);
        hasModify = true;
    }
    if (config.modify_intensity !== 0) {
        modifyData.intensity = parseInt(config.modify_intensity);
        hasModify = true;
    }
    if (config.modify_timbre !== 0) {
        modifyData.timbre = parseInt(config.modify_timbre);
        hasModify = true;
    }
    if (config.sound_effect && config.sound_effect !== "none") {
        modifyData.sound_effects = config.sound_effect;
        hasModify = true;
    }

    if (hasModify) {
        requestBody.voice_modify = modifyData;
    }

    console.log(
        `[Siren Voice] 🚀 发送给 MiniMax 的请求参数 (角色: ${config.char || "未知"}):`,
        JSON.stringify(requestBody, null, 2),
    );

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.api_key}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`MiniMax 请求失败: HTTP ${response.status}`);
    }

    const resData = await response.json();

    // 校验 API 返回码
    if (resData.base_resp && resData.base_resp.status_code !== 0) {
        throw new Error(
            `MiniMax API 报错 [${resData.base_resp.status_code}]: ${resData.base_resp.status_msg}`,
        );
    }

    if (!resData.data || !resData.data.audio) {
        throw new Error("MiniMax 返回数据中缺失音频 (Hex) 字段");
    }

    // 将 Hex 字符串转为 Blob (mp3 格式)
    const blob = hexToBlob(resData.data.audio, "audio/mpeg");
    return blob;
}

// 在 minimax_logic.js 文件末尾追加以下代码

/**
 * 请求 MiniMax 上传文件 (用于复刻音频或示例音频)
 * @param {string} apiKey
 * @param {File} file 文件对象
 * @param {string} purpose "voice_clone" 或 "prompt_audio"
 */
export async function uploadMinimaxFile(apiKey, file, purpose, region = "cn") {
    const url = `${getBaseUrl(region)}/v1/files/upload`;

    // 使用 FormData 构建 multipart/form-data 请求
    const formData = new FormData();
    formData.append("purpose", purpose);
    formData.append("file", file);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            // 注意：不要手动设置 Content-Type，浏览器会自动设置包含 boundary 的 multipart/form-data
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`文件上传失败: HTTP ${response.status}`);
    }

    const resData = await response.json();
    if (resData.base_resp && resData.base_resp.status_code !== 0) {
        throw new Error(
            `上传报错 [${resData.base_resp.status_code}]: ${resData.base_resp.status_msg}`,
        );
    }

    return resData.file; // 返回 { file_id, filename, ... }
}

/**
 * 请求 MiniMax 进行音色快速复刻
 * @param {string} apiKey
 * @param {object} cloneConfig 克隆参数组合
 */
export async function cloneMinimaxVoice(apiKey, cloneConfig) {
    const url = `${getBaseUrl(cloneConfig.region || "cn")}/v1/voice_clone`;

    const requestBody = {
        file_id: parseInt(cloneConfig.file_id),
        voice_id: cloneConfig.voice_id,
        text: cloneConfig.text,
        model: cloneConfig.model || "speech-2.8-hd",
        language_boost: "auto",
        need_noise_reduction: cloneConfig.need_noise_reduction === true,
        need_volume_normalization: true, // 按照要求默认 true
        aigc_watermark: false, // 按照要求默认 false
    };

    // 如果提供了示例音频，则装载 clone_prompt
    if (cloneConfig.prompt_audio && cloneConfig.prompt_text) {
        requestBody.clone_prompt = {
            prompt_audio: parseInt(cloneConfig.prompt_audio),
            prompt_text: cloneConfig.prompt_text,
        };
    }

    console.log(
        `[Siren Voice] 🚀 发送音色克隆请求:`,
        JSON.stringify(requestBody, null, 2),
    );

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`克隆请求失败: HTTP ${response.status}`);
    }

    const resData = await response.json();

    if (resData.base_resp && resData.base_resp.status_code !== 0) {
        throw new Error(
            `克隆报错 [${resData.base_resp.status_code}]: ${resData.base_resp.status_msg}`,
        );
    }

    return resData; // 成功会返回包含 demo_audio (试听链接) 等字段
}
