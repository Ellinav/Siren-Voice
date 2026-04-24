import { requestIndexTtsGeneration } from "./indextts_logic.js";
import { generateMinimaxAudioBlob } from "./minimax_logic.js";
import { generateDoubaoProductionAudioBlob } from "./doubao_logic.js";
import { generateGptSovitsAudio } from "./gptsovits_logic.js";
import {
  parseSpeakTags,
  stripParentheticalAsides,
  checkReplyIntegrity,
  getRealVolume,
  stripInlineMarkdown,
  stripWrappingPunctuation,
} from "./utils.js";
import { addTtsRecord } from "./db.js";
import {
  setBusVolume,
  routeAudioToMixer,
  initAudioEngine,
} from "./audio_engine.js";

document.addEventListener("sirenVolumeChanged", (e) => {
  const { channel } = e.detail;
  const volumeValue = getRealVolume(channel);
  setBusVolume(channel, volumeValue);
});
/**
 * 助手函数：从角色卡提取 MiniMax 的专属设置并组合最终请求参数
 */
function getMinimaxCharConfig(charName, ttsSettings) {
  const context = SillyTavern.getContext();
  const charId = context.characterId;
  // 去扩展字段拿当前角色的音色映射表
  const charData =
    context.characters[charId]?.data?.extensions?.siren_voice_tts_minimax
      ?.voices || {};
  const charConfig = charData[charName];

  if (!charConfig || !charConfig.voice_id) {
    if (window.toastr)
      window.toastr.warning(`未配置 [${charName}] 的 MiniMax 音色映射！`);
    return null;
  }

  // 将全局的 API Key、模型，和角色独有的音色参数合并
  return {
    region: ttsSettings.region || "cn", // 👈 关键修复：把 region 透传给底层逻辑！
    api_key: ttsSettings.api_key,
    model: ttsSettings.model,
    text_norm: ttsSettings.text_norm,
    ...charConfig,
  };
}

function getDoubaoCharConfig(charName, ttsSettings) {
  const context = SillyTavern.getContext();
  const charId = context.characterId;
  // 去扩展字段拿当前角色的音色映射表
  const charData =
    context.characters[charId]?.data?.extensions?.siren_voice_tts_doubao
      ?.voices || {};
  const charConfig = charData[charName];

  // 🌟 修复 1：检查的字段从 voice_id 改为 speaker
  if (!charConfig || !charConfig.speaker) {
    if (window.toastr)
      window.toastr.warning(`未配置 [${charName}] 的豆包音色映射！`);
    return null;
  }

  return {
    app_id: ttsSettings.appId || ttsSettings.app_id,
    access_key: ttsSettings.accessKey || ttsSettings.access_key,
    // 🌟 修复 2：优先使用角色卡里保存的专属模型（支持合成与复刻混用）
    model: charConfig.model || ttsSettings.model,
    // 🌟 修复 3：将 speaker 赋值给 voice_id 供底层请求使用
    voice_id: charConfig.speaker,
  };
}

/**
 * 统一的 TTS 路由分发器 (用于单个语音条的点击/重生成)
 */
export async function dispatchTtsGeneration(
  speakObj,
  floorId,
  provider,
  ttsSettings,
  forceRegen = false,
) {
  try {
    // 🌟 核心修改：把 forceRegen 直接传给底层的 fetchTtsBlobProvider
    // 底层函数自带了 if (!forceRegen && currentChatId) 的判断，会自动绕过缓存！
    const blob = await fetchTtsBlobProvider(
      speakObj,
      floorId,
      provider,
      ttsSettings,
      forceRegen,
    );

    if (blob) {
      // 生成成功后，推入播放队列
      enqueueTTSBlob(blob, speakObj);
    }
  } catch (error) {
    console.error(`[Siren Voice][Router] ❌ ${provider} 分发失败:`, error);
  }
}

let currentTtsAudio = null;
let currentTtsObjectUrl = null;
let audioQueue = []; // 播放队列
let isPlaying = false; // 播放状态锁

/**
 * 1. 将新的音频 Blob 加入队列（新增 speakObj 参数以传递 dir）
 */
export async function enqueueTTSBlob(blob, speakObj = null) {
  // 队列里现在存的是对象：{ blob, speakObj }
  audioQueue.push({ blob, speakObj });
  if (!isPlaying) {
    playNextInQueue();
  }
}

/**
 * 2. 播放队列中的下一个音频
 */
async function playNextInQueue() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  // 取出结构化的数据
  const item = audioQueue.shift();
  await playSingleBlob(item.blob, item.speakObj);
}

/**
 * 3. 播放单个音频的核心逻辑（接入空间混音版）
 */
async function playSingleBlob(blob, speakObj = null) {
  cleanupCurrentTTS();

  currentTtsObjectUrl = URL.createObjectURL(blob);
  currentTtsAudio = new Audio(currentTtsObjectUrl);
  currentTtsAudio.volume = 1.0;
  currentTtsAudio.preload = "auto";

  // 🌟 提取标签类型
  const tagType = speakObj?.tag || "speak";

  // 🌟 物理规律覆盖：心声和电话永远贴脸居中，不受标签属性干扰
  const dir =
    tagType === "inner" || tagType === "phone"
      ? "center"
      : speakObj?.dir || speakObj?.attrs?.dir || "center";

  try {
    initAudioEngine();
    // 🌟 新增第四个参数 tagType 传给混音器
    routeAudioToMixer(currentTtsAudio, "tts", dir, tagType);
    console.log(
      `[Siren Voice] TTS 物理路由成功: 通道=tts, 方位=${dir}, 特效=${tagType}`,
    );
  } catch (e) {
    console.warn("[Siren Voice] TTS 空间/特效路由失败，尝试回退原生控制", e);
    currentTtsAudio.volume = getRealVolume("tts") / 100;
  }

  // 稍微给浏览器一点缓冲时间
  await new Promise((resolve) => setTimeout(resolve, 100));

  currentTtsAudio.onended = () => {
    cleanupCurrentTTS();
    playNextInQueue();
  };

  currentTtsAudio.onerror = () => {
    console.error("[Siren Voice][TTS] 单段音频播放失败");
    cleanupCurrentTTS();
    playNextInQueue();
  };

  try {
    await currentTtsAudio.play();
  } catch (err) {
    console.error("[Siren Voice][TTS] 播放异常:", err);
    cleanupCurrentTTS();
    playNextInQueue();
  }
}

/**
 * 立即打断并清空当前所有的 TTS 播放
 */
export function stopCurrentTTS() {
  audioQueue = [];
  isPlaying = false;

  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause();
      currentTtsAudio.currentTime = 0;
    } catch {}
  }
  cleanupCurrentTTS();
}

/**
 * 清理内存泄漏
 */
function cleanupCurrentTTS() {
  if (currentTtsAudio) {
    currentTtsAudio.onended = null;
    currentTtsAudio.onerror = null;
    currentTtsAudio = null;
  }

  if (currentTtsObjectUrl) {
    URL.revokeObjectURL(currentTtsObjectUrl);
    currentTtsObjectUrl = null;
  }
}

/**
 * 专门用于场景预加载/并发拉取的 TTS 后台通道
 */
export async function fetchTtsBlobProvider(
  speakObj,
  floor,
  provider,
  ttsSettings,
  forceRegen = false,
) {
  try {
    const context = SillyTavern.getContext();
    const currentChatId = context?.chatId;
    const { findExactTtsRecord } = await import("./db.js");

    // 1. 查找缓存时，必须使用带有语气词和Markdown的原始 speakObj.text，保证 Cache Hit
    if (!forceRegen && currentChatId) {
      const cachedRecord = await findExactTtsRecord(
        currentChatId,
        floor,
        speakObj.char,
        speakObj.text,
        speakObj.mood || "",
        speakObj.detail || "",
      );
      if (cachedRecord && cachedRecord.audioBlob) {
        return cachedRecord.audioBlob;
      }
    }

    // ==========================================
    // 💡 核心清洗区 开始
    // ==========================================
    let apiPayloadText = speakObj.text;

    // 第一步：全局剔除 Markdown 符号（覆盖所有四个引擎）
    apiPayloadText = stripInlineMarkdown(apiPayloadText);
    apiPayloadText = stripWrappingPunctuation(apiPayloadText);

    // 第二步：剔除中英文方括号语气词（仅限不支持的三个引擎）
    if (
      provider === "indextts" ||
      provider === "doubao" ||
      provider === "gptsovits"
    ) {
      apiPayloadText = stripParentheticalAsides(apiPayloadText);
    }
    // ==========================================
    // 💡 核心清洗区 结束
    // ==========================================

    // 3. 👉 🚨 核心防崩溃补丁：如果去完括号和Markdown什么都不剩了，直接跳过！
    if (!apiPayloadText.trim()) {
      console.log(
        `[Siren Voice][预加载] ⚠️ 文本清洗后为空，跳过 TTS。原文本: ${speakObj.text}`,
      );
      return null;
    }

    let blob = null;
    switch (provider) {
      case "indextts":
        // ✅ 此时传入的 apiPayloadText：无 Markdown，无 语气词
        blob = await requestIndexTtsGeneration(
          { ...speakObj, text: apiPayloadText },
          ttsSettings,
        );
        break;

      case "minimax":
        const preloadMmConfig = getMinimaxCharConfig(
          speakObj.char,
          ttsSettings,
        );
        if (!preloadMmConfig) return null;

        // ✅ 此时传入的 apiPayloadText：无 Markdown，【保留】语气词。
        // 将中英文方括号替换为 Minimax 支持的小括号
        const preloadMmText = apiPayloadText
          .replace(/\[([^\]]+)\]/g, "($1)")
          .replace(/【([^】]+)】/g, "($1)");

        blob = await generateMinimaxAudioBlob(
          preloadMmText,
          speakObj.mood,
          preloadMmConfig,
        );
        break;

      case "doubao":
        const dbConfig = getDoubaoCharConfig(speakObj.char, ttsSettings);
        if (!dbConfig) return null;
        // ✅ 此时传入的 apiPayloadText：无 Markdown，无 语气词
        blob = await generateDoubaoProductionAudioBlob(
          { ...speakObj, text: apiPayloadText },
          dbConfig,
        );
        break;

      case "gptsovits":
        // ✅ 此时传入的 apiPayloadText：无 Markdown，无 语气词
        blob = await generateGptSovitsAudio(
          apiPayloadText,
          speakObj.char,
          speakObj.mood,
        );
        break;

      default:
        console.warn(`[Siren Voice][预加载] 暂不支持该引擎: ${provider}`);
        return null;
    }

    // 4. 将成功生成的音频存入数据库
    if (blob && currentChatId) {
      addTtsRecord({
        provider,
        char: speakObj.char,
        text: speakObj.text, // 数据库仍保存带有**和[]的完整原文
        mood: speakObj.mood || "",
        detail: speakObj.detail || "",
        floor,
        chatId: currentChatId,
        audioBlob: blob,
      });
      console.log(
        `[Siren Voice][预加载] 💾 成功生成音频并写入缓存库，可供语音条复用 (Floor: ${floor})`,
      );
    }

    return blob;
  } catch (err) {
    console.error(`[Siren Voice][预加载] ❌ ${provider} 请求失败:`, err);
    return null;
  }
}

/**
 * 时间轴批量预加载路由
 */
export async function preloadTtsForTimeline(
  timeline,
  floorId,
  provider,
  ttsSettings,
  forceRegen = false,
) {
  // 🌟 修复 2：在函数最开头获取一次 chatId
  const context = SillyTavern.getContext();
  const chatId = context?.chatId;
  try {
    switch (provider) {
      case "indextts":
        // 串行生成
        for (let i = 0; i < timeline.length; i++) {
          const node = timeline[i];
          if (node.type === "tts") {
            node.blob = await fetchTtsBlobProvider(
              node.speakObj,
              floorId,
              provider,
              ttsSettings,
              forceRegen,
            );
          }
        }
        break;

      case "minimax":
      case "gptsovits":
        // 🚀 云端 API 并发生成：修改 timeline 的原地状态，不需要关心顺序（因为播放时有专用的时序控制系统）
        const promises = timeline.map(async (node) => {
          if (node.type === "tts") {
            node.blob = await fetchTtsBlobProvider(
              node.speakObj,
              floorId,
              provider,
              ttsSettings,
              forceRegen,
            );
          }
        });
        await Promise.all(promises);
        break;

      default:
        for (let i = 0; i < timeline.length; i++) {
          const node = timeline[i];
          if (node.type === "tts") {
            node.blob = await fetchTtsBlobProvider(
              node.speakObj,
              floorId,
              provider,
              ttsSettings,
              forceRegen,
            );
          }
        }
        break;
    }
  } catch (err) {
    console.error(`[Siren Voice][预加载] 批量处理时间轴时崩溃:`, err);
  }
}
