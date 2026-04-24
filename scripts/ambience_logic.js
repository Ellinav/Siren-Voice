// scripts/ambience_logic.js
import { getSirenSettings } from "./settings.js";
import { parseSpeakTags, getRealVolume, checkReplyIntegrity } from "./utils.js";
import {
  fetchTtsBlobProvider,
  preloadTtsForTimeline,
  stopCurrentTTS,
} from "./tts_logic.js";
import {
  findExactTtsRecord,
  getAmbienceRecord,
  saveAmbienceRecord,
} from "./db.js";
import { initAudioEngine, routeAudioToMixer } from "./audio_engine.js";

// ====== 新增：CSSOM 隐形渲染引擎 ======
let stealthCssRule = null;

function initStealthKaraokeCss() {
  if (document.getElementById("siren-stealth-karaoke-css")) return;
  const style = document.createElement("style");
  style.id = "siren-stealth-karaoke-css";
  document.head.appendChild(style);

  const sheet = style.sheet;

  // 🌟 核心破局点：利用显卡的 calc() 自动计算每个字的进度！
  // 这样彻底抛弃了 JS 遍历 DOM 赋值的逻辑
  sheet.insertRule(
    `
        .siren-karaoke-playing {
            --k-prog: calc(max(0, min(100, (var(--siren-cursor, 0) - var(--c-off, 0)) / var(--c-len, 1) * 100)) * 1%) !important;
        }
    `,
    0,
  );

  // 建立全局游标，这就是我们唯一的“内存锁”
  sheet.insertRule(
    `
        .siren-scene-active {
            --siren-cursor: 0;
        }
    `,
    1,
  );

  stealthCssRule = sheet.cssRules[1]; // 锁定 :root 规则
}

let isAmbienceEventBound = false;

let activeSceneState = {
  floorId: null,
  isPlaying: false,
  isPaused: false,
  ambienceAudio: null,
  ttsAudio: null,
  activeSfxPool: new Set(),
  currentStepIndex: 0,
  timeline: [],
  lastNow: 0,
};

let activeKaraokeRaf = null;

// 🌟 新增：监听混音台滑块拖动，实时修改当前正在播放的音频音量
document.addEventListener("sirenVolumeChanged", (e) => {
  const channel = e.detail.channel;
  if (channel === "ambience" && activeSceneState.ambienceAudio) {
    activeSceneState.ambienceAudio.volume = getRealVolume("ambience");
  }
  // 👇 修改这里的 SFX 判断逻辑
  if (channel === "sfx" && activeSceneState.activeSfxPool.size > 0) {
    activeSceneState.activeSfxPool.forEach((audio) => {
      audio.volume = getRealVolume("sfx");
    });
  }
  if (channel === "tts" && activeSceneState.ttsAudio) {
    activeSceneState.ttsAudio.volume = getRealVolume("tts");
  }
});

// 🌟 终极修复：带 LRU（自动淘汰机制）的 LocalStorage 代理
class LocalStorageCache {
  constructor(prefix, maxLimit = 500) {
    this.prefix = prefix;
    this.maxLimit = maxLimit; // 👈 设定最大记忆楼层数，默认 500 层足够绝大多数单次游戏使用
  }

  _getFullKey(key) {
    const context =
      typeof SillyTavern !== "undefined" ? SillyTavern.getContext() : null;
    const chatId = context?.chatId || "default";
    return `${this.prefix}_${chatId}_${key}`;
  }

  get(key) {
    const fullKey = this._getFullKey(key);
    const itemStr = localStorage.getItem(fullKey);
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      // 每次读取时，刷新活跃时间戳，防止经常听的楼层被误删
      item.timestamp = Date.now();
      localStorage.setItem(fullKey, JSON.stringify(item));
      return item.value;
    } catch (e) {
      return itemStr; // 兼容万一有的旧数据是纯字符串
    }
  }

  set(key, value) {
    const fullKey = this._getFullKey(key);
    const item = {
      value: value,
      timestamp: Date.now(),
    };
    // 存入包装了时间戳的 JSON
    localStorage.setItem(fullKey, JSON.stringify(item));

    // 每次写入后，触发容量检测
    this._enforceLimit();
  }

  has(key) {
    return localStorage.getItem(this._getFullKey(key)) !== null;
  }

  delete(key) {
    localStorage.removeItem(this._getFullKey(key));
  }

  keys() {
    const context =
      typeof SillyTavern !== "undefined" ? SillyTavern.getContext() : null;
    const chatId = context?.chatId || "default";
    const searchPrefix = `${this.prefix}_${chatId}_`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(searchPrefix)) {
        keys.push(k.replace(searchPrefix, ""));
      }
    }
    return keys;
  }

  // 👇 核心清理引擎
  _enforceLimit() {
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // 只要是咱们插件前缀的数据，统统纳入统计（跨聊天也一起算，防止总容量爆炸）
      if (k && k.startsWith(this.prefix + "_")) {
        allKeys.push(k);
      }
    }

    if (allKeys.length > this.maxLimit) {
      // 提取所有记录并带上时间戳
      const records = allKeys.map((k) => {
        try {
          const item = JSON.parse(localStorage.getItem(k));
          return { key: k, timestamp: item.timestamp || 0 };
        } catch (e) {
          return { key: k, timestamp: 0 };
        }
      });

      // 按时间从小到大排序（最旧的在前面）
      records.sort((a, b) => a.timestamp - b.timestamp);

      // 计算需要删多少条
      const deleteCount = records.length - this.maxLimit;
      for (let i = 0; i < deleteCount; i++) {
        localStorage.removeItem(records[i].key);
        console.log(`[Siren Voice] 🧹 自动清理旧缓存记录: ${records[i].key}`);
      }
    }
  }
}

export const randomAmbienceCache = new LocalStorageCache("siren_ambience", 500);
export const randomSfxCache = new LocalStorageCache("siren_sfx", 500);

// 提供给重新生成时调用的清理函数
export function clearAmbienceCacheForFloor(floorId) {
  if (!floorId) return;
  for (const key of randomAmbienceCache.keys()) {
    if (key.startsWith(`${floorId}_`)) randomAmbienceCache.delete(key);
  }
  // 🌟 新增：顺便清理 SFX 缓存
  for (const key of randomSfxCache.keys()) {
    if (key.startsWith(`${floorId}_`)) randomSfxCache.delete(key);
  }
}

/**
 * 🌟 核心修复 1：安全的 DOM 扫描器 (XML 锚定防越界版)
 */
function mapTimelineToDom(floorId, timeline) {
  const mesNode = document.querySelector(`.mes[mesid="${floorId}"]`);
  if (!mesNode) return;
  const mesText = mesNode.querySelector(".mes_text");
  if (!mesText) return;

  const walker = document.createTreeWalker(
    mesText,
    NodeFilter.SHOW_ALL,
    null,
    false,
  );
  const domSequence = [];
  let currentNode;
  let skipParent = null;

  while ((currentNode = walker.nextNode())) {
    if (skipParent) {
      if (skipParent.contains(currentNode)) continue;
      else skipParent = null;
    }

    if (currentNode.nodeType === 1) {
      if (currentNode.matches?.('[data-siren-speak="1"]')) {
        domSequence.push({ type: "tts", el: currentNode });
        skipParent = currentNode;
      } else if (
        currentNode.matches?.(
          '.siren-music-card, [data-siren-music-card="1"], .siren-ambience-card, [data-siren-ambience="1"]',
        ) ||
        currentNode.tagName.toLowerCase() === "ambience" ||
        currentNode.tagName.toLowerCase() === "sfx" // 🌟 1. 新增跳过 SFX
      ) {
        domSequence.push({ type: "ambience_or_sfx", el: currentNode }); // 🌟 改名合并
        skipParent = currentNode;
      }
    } else if (currentNode.nodeType === 3) {
      const txt = currentNode.textContent;
      if (txt.trim() !== "") {
        if (
          /<ambience>[\s\S]*?<\/ambience>/i.test(txt) ||
          /<sfx>[\s\S]*?<\/sfx>/i.test(txt)
        ) {
          // 🌟 2. 新增正则匹配
          domSequence.push({ type: "ambience_or_sfx", el: currentNode });
        } else {
          domSequence.push({ type: "text", el: currentNode });
        }
      }
    }
  }

  let domIndex = 0;
  for (const node of timeline) {
    node.domElements = [];
    if (node.type === "ambience" || node.type === "sfx") continue;

    if (node.type === "tts") {
      while (domIndex < domSequence.length) {
        const item = domSequence[domIndex++];
        if (item.type === "tts") {
          const textSpan = item.el.querySelector(".siren-speak-text");
          if (textSpan) node.domElements.push(textSpan);
          break;
        }
      }
    }

    if (node.type === "text") {
      // 🌟 净化剧本目标文本
      const cleanTargetText = node.text
        .replace(/[*_~`]/g, "")
        .replace(/\s+/g, "");
      let matchedChars = 0;
      const targetLength = cleanTargetText.length;

      while (domIndex < domSequence.length) {
        // 如果这段文本的字符数已经找齐了，必须立刻跳出，绝不向后多扫一个字！
        if (targetLength > 0 && matchedChars >= targetLength) {
          break;
        }

        const item = domSequence[domIndex];
        if (item.type === "tts") break;
        if (item.type === "ambience_or_sfx") {
          domIndex++;
          continue;
        }

        const textNode = item.el;
        const cleanDomText = textNode.textContent.replace(/\s+/g, "");

        if (!cleanDomText) {
          domIndex++;
          continue;
        }

        // 🌟 只对确实包含在剧本范围内的文字穿上马甲！
        if (cleanTargetText.includes(cleanDomText)) {
          matchedChars += cleanDomText.length;

          if (textNode.parentNode.classList.contains("siren-karaoke-target")) {
            // 🌟 仅保留基础靶点，移除 playing 状态，让动画引擎接管
            textNode.parentNode.className = "siren-karaoke-target";
            // textNode.parentNode.style.setProperty("--k-prog", "0%");
            node.domElements.push(textNode.parentNode);
          } else {
            const fragment = document.createDocumentFragment();
            const chars = Array.from(textNode.textContent);

            for (const char of chars) {
              if (/\s/.test(char)) {
                fragment.appendChild(document.createTextNode(char));
              } else {
                const span = document.createElement("span");
                // 🌟 仅穿上底妆，移除 playing 状态
                span.className = "siren-karaoke-target";
                // span.style.setProperty("--k-prog", "0%");
                span.textContent = char;
                fragment.appendChild(span);
                node.domElements.push(span);
              }
            }
            textNode.parentNode.replaceChild(fragment, textNode);
          }
        }
        domIndex++;
      }
    }
  }
}

/**
 * 🌟 核心修复终极极简版：依赖内存预装载的游标引擎 (加入前置空转防跳帧)
 */
function startKaraokeAnimation(
  elements,
  durationMs,
  audioObj = null,
  expectedFloorId = null,
  onReady = null,
) {
  return new Promise((resolve) => {
    if (!elements || elements.length === 0) {
      if (onReady) onReady();
      return resolve();
    }

    // 👇 🌟 修复点 1：在元素穿上马甲暴露给 CSSOM 之前，强行清零上一句残留的全局游标！
    if (stealthCssRule) {
      stealthCssRule.style.setProperty("--siren-cursor", "0");
    }

    let totalChars = 0;
    const elementData = elements.map((el) => {
      // 🌟 核心修复：正式轮到这块文字播放时，才挂上计算引擎的类名！
      el.classList.add("siren-karaoke-playing");

      const len = el.textContent.length;

      // 🌟 在内存映射建立前，仅写入一次静态偏移坐标，永不再改
      el.style.setProperty("--c-off", totalChars);
      el.style.setProperty("--c-len", len);

      const data = { el, len, startOffset: totalChars, lastProgress: 0 };
      totalChars += len;
      return data;
    });
    if (totalChars === 0) totalChars = 1;

    // 🌟 唤醒隐形渲染引擎
    initStealthKaraokeCss();

    // 🌟 直接触发音频加载，让它去后台跑
    if (onReady) onReady();

    let start = null;
    let lastNow = null;
    let activeIndex = 0; // O(1) 游标
    let lastWrittenCursor = -1;

    // 👇 新增：前置空转帧计数器
    let warmupFrames = 0;

    function step(now) {
      if (
        !activeSceneState.isPlaying ||
        (expectedFloorId && activeSceneState.floorId !== expectedFloorId)
      ) {
        return resolve();
      }

      // 空转结束后，此时的 now 才是极其精准的平稳时间戳
      if (!start) {
        start = now;
        lastNow = now;
      }

      if (activeSceneState.isPaused) {
        start += now - lastNow || 0;
        lastNow = now;
        activeKaraokeRaf = requestAnimationFrame(step);
        return;
      }

      let globalProgress = 0;
      let elapsed = now - start;

      if (audioObj) {
        if (!isNaN(audioObj.duration) && audioObj.duration > 0) {
          let actualTime = audioObj.currentTime;

          if (actualTime === 0) {
            start = now;
            globalProgress = 0;
          } else {
            let expectedTime = (now - start) / 1000;
            let drift = expectedTime - actualTime;

            // 🚀 优化点 1：极致丝滑的“指数衰减追赶”算法
            if (Math.abs(drift) > 0.05) {
              // 原先直接 start += drift * 100 可能会引起微小跳闪
              // 现在改为：每帧只吸收 10% 的误差时间 (drift * 1000ms * 0.1)
              // 像弹簧一样极其平滑地黏住音频时间，绝不卡顿！
              start += drift * 100; // 等价于 drift * 1000 * 0.1
              expectedTime = (now - start) / 1000;
            }

            globalProgress = Math.min(expectedTime / audioObj.duration, 1);
          }
        } else {
          globalProgress = 0;
        }
      } else {
        globalProgress = Math.min(elapsed / durationMs, 1);
      }

      lastNow = now;
      const currentScannedChars = globalProgress * totalChars;

      // ==========================================
      // 🚀 终极解法：纯 CSSOM 内存锁写入
      // 彻底消灭 el.style.setProperty，杜绝 MutationObserver 扫描风暴！
      // ==========================================
      if (
        stealthCssRule &&
        Math.abs(currentScannedChars - lastWrittenCursor) > 0.01
      ) {
        stealthCssRule.style.setProperty("--siren-cursor", currentScannedChars);
        lastWrittenCursor = currentScannedChars;
      }

      // 循环出口
      if (globalProgress >= 1 || (audioObj && audioObj.ended)) {
        // 播完后脱下马甲，变回静态文本，并清理坐标
        elements.forEach((el) => {
          el.className = "siren-karaoke-target siren-karaoke-done";
          // 清理我们在前置初始化时写入的静态坐标
          el.style.removeProperty("--c-off");
          el.style.removeProperty("--c-len");
        });
        resolve();
      } else {
        activeKaraokeRaf = requestAnimationFrame(step);
      }
    }

    activeKaraokeRaf = requestAnimationFrame(step);
  });
}

/**
 * 🌟 全局事件代理：同时拦截播放与重新生成
 */
async function handleGlobalSceneClick(e) {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [];
  let playBtn = null;
  let regenBtn = null;

  // 寻路找到我们的两个按钮
  for (const node of path) {
    if (node instanceof Element) {
      if (node.matches?.(".siren-scene-play-btn")) playBtn = node;
      if (node.matches?.(".siren-scene-regen-btn")) regenBtn = node;
    }
  }
  if (!playBtn && !regenBtn && e.target instanceof Element) {
    playBtn = e.target.closest(".siren-scene-play-btn");
    regenBtn = e.target.closest(".siren-scene-regen-btn");
  }

  // 1. 如果点击了重新生成
  if (regenBtn) {
    e.preventDefault();
    e.stopPropagation();
    const mesNode = regenBtn.closest(".mes");
    if (mesNode) await handleSceneRegenClick(regenBtn, mesNode);
    return;
  }

  // 2. 如果点击了播放/请求
  if (playBtn) {
    e.preventDefault();
    e.stopPropagation();
    const mesNode = playBtn.closest(".mes");
    if (mesNode) await handleSceneButtonClick(playBtn, mesNode);
    return;
  }
}

/**
 * 🌟 真正的全局注入：先扫描 DB 确定最终状态，再进行无闪烁注入
 */
export async function injectScenePlayButtons() {
  if (!isAmbienceEventBound) {
    document.addEventListener("click", handleGlobalSceneClick, true);
    isAmbienceEventBound = true;
  }

  const messageBlocks = document.querySelectorAll(".mes");
  const context = SillyTavern.getContext();
  const chatId = context?.chatId;

  // 将所有楼层的处理变成并发的 Promise 数组
  const injectPromises = Array.from(messageBlocks).map(async (mes) => {
    const mesButtons = mes.querySelector(".mes_buttons");
    // 如果这层楼已经有按钮了，直接跳过注入
    if (!mesButtons || mesButtons.querySelector(".siren-scene-btn-group"))
      return;

    const floorId = mes.getAttribute("mesid");
    if (!floorId) return;

    // --- 🔍 1. 注入前：先预扫描剧本和数据库 ---
    let finalState = "initial"; // 默认状态
    let showRegen = false; // 是否显示重生成按钮
    let parsedTimeline = []; // 👈 🌟 修复点 1：在 try 外部声明一个变量来存储剧本

    try {
      parsedTimeline = parseMessageTimeline(floorId); // 👈 🌟 修复点 2：将解析结果赋值给外部变量（去掉原先这里的 const）

      const hasAction = parsedTimeline.some((n) =>
        ["ambience", "tts", "sfx"].includes(n.type),
      );

      if (!hasAction) {
        return;
      }

      const ttsNodes = parsedTimeline.filter((n) => n.type === "tts");

      if (ttsNodes.length === 0) {
        finalState = "ready";
        showRegen = true;
      } else if (chatId) {
        // 查库逻辑保持不变...
        const { findExactTtsRecord } = await import("./db.js");
        const checks = await Promise.all(
          ttsNodes.map(async (node) => {
            const record = await findExactTtsRecord(
              chatId,
              floorId,
              node.speakObj.char,
              node.speakObj.text,
              node.speakObj.mood, // 👈 新增
              node.speakObj.detail, // 👈 新增
            );
            return !!(record && record.audioBlob);
          }),
        );

        if (checks.length > 0 && checks.every((exists) => exists === true)) {
          finalState = "ready";
          showRegen = true;
        }
      }
    } catch (err) {
      console.warn(`[Siren Voice] 预扫描楼层 ${floorId} 失败:`, err);
    }

    // 因为查库是异步的...
    if (
      !document.body.contains(mesButtons) ||
      mesButtons.querySelector(".siren-scene-btn-group")
    )
      return;

    // --- 🛠️ 2. 带着最终结论：一次性组装 DOM 并注入 ---
    const btnGroup = document.createElement("div");
    btnGroup.className = "siren-scene-btn-group";
    btnGroup.style.cssText =
      "display: flex; align-items: center; gap: 4px; margin-right: 8px; padding-right: 8px; border-right: 1px solid rgba(255, 255, 255, 0.1);";

    const playBtn = document.createElement("div");
    playBtn.className = "mes_button siren-scene-play-btn interactable";
    playBtn.title = "幻境氛围 (请求并播放)";

    // 👈 🌟 修复点 3：这里现在可以安全地拿到刚才解析的剧本并生成签名了
    playBtn.dataset.signature = generateSignatureFromTimeline(parsedTimeline);

    // 直接赋予最终图标和状态，消灭闪烁！
    if (finalState === "ready") {
      playBtn.dataset.state = "ready";
      playBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;
    } else {
      playBtn.dataset.state = "initial";
      playBtn.innerHTML = `<i class="fa-solid fa-clapperboard" style="color: #3b82f6;"></i>`;
    }

    const regenBtn = document.createElement("div");
    regenBtn.className = "mes_button siren-scene-regen-btn interactable";
    regenBtn.title = "重新请求该层语音";
    regenBtn.innerHTML = `<i class="fa-solid fa-rotate-right" style="color: #a855f7;"></i>`;
    regenBtn.style.display = showRegen ? "" : "none";

    btnGroup.appendChild(playBtn);
    btnGroup.appendChild(regenBtn);
    mesButtons.prepend(btnGroup);
  });

  // 等待这一批新楼层所有的注入动作执行完毕
  await Promise.all(injectPromises);

  // --- 📡 3. 兜底更新逻辑 ---
  // 问：既然都提前扫描了，为什么还要留着这个兜底函数？
  // 答：这是为了处理“按钮已经挂在页面上，但用户刚刚点击了单条语音触发重生成”的情况。
  // 这时不会触发上面的 inject，所以需要兜底函数去实时刷新已经存在于 DOM 中的老按钮状态。
  scanAndRefreshAllScenes();
}

/**
 * 🌟 全局静默扫描：扫视页面上所有的场记板按钮，并与 DB 同步状态
 */
export async function scanAndRefreshAllScenes() {
  const context = SillyTavern.getContext();
  const chatId = context?.chatId;
  if (!chatId) return;

  // 找出页面上目前所有的主播放按钮
  const playBtns = document.querySelectorAll(".siren-scene-play-btn");
  if (!playBtns.length) return;

  // 为了防止 ST 瞬间的大量 DOM 刷新导致查询落空，稍微给 100ms 缓冲
  await new Promise((r) => setTimeout(r, 800));

  playBtns.forEach(async (playBtn) => {
    // 如果这个按钮已经是 ready 或 playing 状态，就跳过不浪费性能了
    if (playBtn.dataset.state !== "initial") return;

    const mesNode = playBtn.closest(".mes");
    if (!mesNode) return;

    const floorId = mesNode.getAttribute("mesid");
    if (!floorId) return;

    const regenBtn = mesNode.querySelector(".siren-scene-regen-btn");

    try {
      // 解析剧本
      const timeline = parseMessageTimeline(floorId);
      const hasAction = timeline.some((n) =>
        ["ambience", "tts", "sfx"].includes(n.type),
      );
      if (!hasAction) return;

      const ttsNodes = timeline.filter((n) => n.type === "tts");

      // 如果这层楼只有 ambience，无需查库，直接绿灯
      if (ttsNodes.length === 0) {
        playBtn.dataset.state = "ready";
        playBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;
        if (regenBtn) regenBtn.style.display = "";
        return;
      }

      // 查库：并发检查这一层楼的所有语音
      const checks = await Promise.all(
        ttsNodes.map(async (node) => {
          const record = await findExactTtsRecord(
            chatId,
            floorId,
            node.speakObj.char,
            node.speakObj.text,
            node.speakObj.mood, // 👈 补齐参数
            node.speakObj.detail, // 👈 补齐参数
          );
          return !!(record && record.audioBlob);
        }),
      );

      // 🌟 只有当所有语音块都存在于 IndexedDB 时，才激活状态
      if (checks.length > 0 && checks.every((exists) => exists === true)) {
        playBtn.dataset.state = "ready";
        playBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;
        if (regenBtn) regenBtn.style.display = "";
        console.log(
          `[Siren Voice] 🔍 扫库激活：楼层 ${floorId} 的环境音与语音已就绪。`,
        );
      }
    } catch (err) {
      console.warn(`[Siren Voice] 扫库检查失败 (Floor: ${floorId})`, err);
    }
  });
}

/**
 * 🌟 静默检查函数：检查数据库并自动激活按钮 (防 ST DOM 刷新版)
 */
async function refreshSceneButtonStatus(playBtn, regenBtn, floorId, chatId) {
  if (!chatId || !floorId) return;

  // 稍微延迟一下，错开 ST 最暴力的首屏 DOM 渲染期
  await new Promise((r) => setTimeout(r, 100));

  // 🌟 核心修复 1：重新从最新的 DOM 树里捞出这两个按钮
  // 防止传入的 playBtn/regenBtn 已经被 ST 的重绘给销毁了
  const actualPlayBtn = document.querySelector(
    `.mes[mesid="${floorId}"] .siren-scene-play-btn`,
  );
  const actualRegenBtn = document.querySelector(
    `.mes[mesid="${floorId}"] .siren-scene-regen-btn`,
  );

  // 如果这层楼被删了，或者按钮还没注入，直接退出
  if (!actualPlayBtn) return;

  // 1. 解析当前楼层的剧本
  const timeline = parseMessageTimeline(floorId);

  // 检查是否有实质动作，什么都没有就保持初始状态
  const hasAction = timeline.some((n) =>
    ["ambience", "tts", "sfx"].includes(n.type),
  );
  if (!hasAction) return;

  const ttsNodes = timeline.filter((n) => n.type === "tts");

  // 🌟 核心修复 2：如果这层楼只有 ambience，不需要等 TTS，直接绿灯放行
  if (ttsNodes.length === 0) {
    actualPlayBtn.dataset.state = "ready";
    actualPlayBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;
    if (actualRegenBtn) actualRegenBtn.style.display = "";
    return;
  }

  // 2. 批量检查数据库中是否存在对应的 Blob
  try {
    const { findExactTtsRecord } = await import("./db.js");

    const checks = await Promise.all(
      ttsNodes.map(async (node) => {
        const record = await findExactTtsRecord(
          chatId,
          floorId,
          node.speakObj.char,
          node.speakObj.text,
          node.speakObj.mood, // 👈 补齐参数
          node.speakObj.detail, // 👈 补齐参数
        );
        return !!(record && record.audioBlob);
      }),
    );

    // 3. 如果所有语音都已存在，自动切换为 Ready 状态
    if (checks.length > 0 && checks.every((exists) => exists === true)) {
      actualPlayBtn.dataset.state = "ready";
      actualPlayBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;
      if (actualRegenBtn) actualRegenBtn.style.display = "";
      console.log(
        `[Siren Voice] 🔍 楼层 ${floorId} 语音完整，已自动激活播放按钮。`,
      );
    }
  } catch (err) {
    console.warn(`[Siren Voice] 静默检查楼层 ${floorId} 失败:`, err);
  }
}

/**
 * 重新生成逻辑：无条件重置状态并再次请求
 */
async function handleSceneRegenClick(regenBtn, mesNode) {
  // 找到同组里的主播放按钮
  const playBtn = regenBtn.parentElement.querySelector(".siren-scene-play-btn");
  if (!playBtn) return;

  // 👇 新增：清理这层楼的 ambience 随机缓存，让它重新掷骰子
  const floorId = mesNode.getAttribute("mesid");
  clearAmbienceCacheForFloor(floorId);

  // 1. 如果当前楼层正在播放，先强行停止
  if (activeSceneState.floorId === floorId) {
    stopScenePlayback(playBtn);
  }

  // 2. 重置 UI 状态
  regenBtn.style.display = "none";
  playBtn.dataset.state = "initial";

  // 👇 3. 核心修改：传入 true，告诉底层本次操作必须无视缓存，重新请求！
  await handleSceneButtonClick(playBtn, mesNode, true);
}

async function handleSceneButtonClick(btn, mesNode, forceRegen = false) {
  const currentState = btn.dataset.state || "initial";
  const floorId = mesNode.getAttribute("mesid");

  // 🌟 新增：获取同组的重生成按钮
  const regenBtn = btn.parentElement.querySelector(".siren-scene-regen-btn");

  // ==========================================
  // 🚀 核心修复 1：跨楼层状态隔离与清场
  // 如果当前有记忆的楼层，且不是本次点击的楼层
  // 并且本次操作是“请求(initial)”或“播放(ready)”
  // ==========================================
  if (activeSceneState.floorId && activeSceneState.floorId !== floorId) {
    if (currentState === "initial" || currentState === "ready") {
      console.log(
        `[Siren Voice] 🔄 切楼拦截: 强行停止楼层 ${activeSceneState.floorId}，准备播放楼层 ${floorId}`,
      );
      // 找出旧楼层的播放按钮，进行清理
      const oldBtn = document.querySelector(
        `.mes[mesid="${activeSceneState.floorId}"] .siren-scene-play-btn`,
      );
      stopScenePlayback(oldBtn, false);
    }
  }

  if (currentState === "initial") {
    btn.dataset.state = "loading";
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #f59e0b;"></i>`;

    try {
      const timeline = parseMessageTimeline(floorId);
      const hasAction = timeline.some((n) =>
        ["ambience", "tts", "sfx"].includes(n.type),
      );
      if (!hasAction) {
        if (window.toastr)
          window.toastr.warning("未检测到任何 Ambience 或 语音 标签。");
        btn.dataset.state = "initial";
        btn.innerHTML = `<i class="fa-solid fa-clapperboard" style="color: #3b82f6;"></i>`;
        return;
      }

      const context = SillyTavern.getContext();
      const settings = context?.extensionSettings?.siren_voice_settings;
      const provider = settings?.tts?.provider || "indextts";
      const ttsSettings = settings?.tts?.[provider] || {};
      await preloadAmbienceForTimeline(timeline, floorId);
      await preloadSfxForTimeline(timeline, floorId);

      // 并发/串行 预加载 TTS
      await preloadTtsForTimeline(
        timeline,
        floorId,
        provider,
        ttsSettings,
        forceRegen,
      );

      btn.sirenTtsBlobs = timeline
        .filter((n) => n.type === "tts")
        .map((n) => n.blob);

      btn.dataset.state = "ready";
      btn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;

      // 🌟 新增：请求成功，把重生成按钮显示出来！
      if (regenBtn) regenBtn.style.display = "";

      if (window.toastr) window.toastr.success("环境氛围准备就绪！");
    } catch (error) {
      console.error("[Siren Voice] 场景预加载失败", error);
      btn.dataset.state = "initial";
      btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;" title="请求失败，点击重试"></i>`;
    }
  } else if (currentState === "ready") {
    btn.dataset.state = "playing";
    btn.innerHTML = `<i class="fa-solid fa-pause" style="color: #3b82f6;"></i>`;

    const latestTimeline = parseMessageTimeline(floorId);
    const { findExactTtsRecord } = await import("./db.js");
    const chatId = SillyTavern.getContext().chatId;

    // 🌟 核心改进：无论内存里有没有，播放前统一去数据库捞一遍最新的
    for (const node of latestTimeline) {
      if (node.type === "tts") {
        const record = await findExactTtsRecord(
          chatId,
          floorId,
          node.speakObj.char,
          node.speakObj.text,
          node.speakObj.mood, // 👈 补齐参数
          node.speakObj.detail, // 👈 补齐参数
        );
        node.blob = record?.audioBlob || null;

        // 如果万一库里丢了（极其罕见），这里做个兜底请求
        if (!node.blob) {
          const settings =
            SillyTavern.getContext()?.extensionSettings?.siren_voice_settings;
          const provider = settings?.tts?.provider || "indextts";
          node.blob = await fetchTtsBlobProvider(
            node.speakObj,
            floorId,
            provider,
            settings?.tts?.[provider] || {},
          );
        }
      }
    }

    startScenePlayback(floorId, latestTimeline, btn);
  } else if (currentState === "paused") {
    // --- ▶️ 恢复播放 ---
    btn.dataset.state = "playing";
    btn.innerHTML = `<i class="fa-solid fa-pause" style="color: #3b82f6;"></i>`;
    resumeScenePlayback();
  } else if (currentState === "playing") {
    // --- ⏸️ 暂停播放 ---
    btn.dataset.state = "paused";
    btn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981;"></i>`;
    pauseScenePlayback();
  }
}

/**
 * 文本剧本解析器：增强版 (精准获取楼层 + 锁定 <content> 标签)
 */
function parseMessageTimeline(floorId) {
  const targetId = Number(floorId);
  let mesArr =
    typeof getChatMessages === "function"
      ? getChatMessages(targetId)
      : window.TavernHelper?.getChatMessages(targetId);

  if (!mesArr || !mesArr.length) return [];

  const rawText = mesArr[0].message;

  const settings = getSirenSettings();
  const startTag = settings.ambience?.start_tag || "<content>";
  const endTag = settings.ambience?.end_tag || "</content>";

  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const contentRegex = new RegExp(
    `${escape(startTag)}([\\s\\S]*?)${escape(endTag)}`,
    "gi",
  );

  let textToParse = rawText;
  let contentMatches = [];
  let match;
  while ((match = contentRegex.exec(rawText)) !== null) {
    contentMatches.push(match[1]);
  }

  if (contentMatches.length > 0) {
    textToParse = contentMatches.join("\n");
  }

  const timeline = [];
  // 🌟 修复 1：更具弹性的全局切分正则，允许 ambience/sfx 标签带任意属性
  const combinedRegex =
    /(<ambience\b[^>]*>[\s\S]*?<\/ambience>|<sfx\b[^>]*>[\s\S]*?<\/sfx>|<(?:speak|inner|phone)\b[^>]*>[\s\S]*?<\/(?:speak|inner|phone)>)/gi;
  const parts = textToParse.split(combinedRegex);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === undefined || part === null) continue;

    const trimmed = part.trim();
    if (trimmed === "") continue;

    if (trimmed.toLowerCase().startsWith("<ambience")) {
      // 🌟 修复 2：健壮抓取 ambience 名字
      const ambienceMatch = /<ambience\b[^>]*>([\s\S]*?)<\/ambience>/i.exec(
        part,
      );
      if (ambienceMatch) {
        timeline.push({
          type: "ambience",
          name: ambienceMatch[1].trim(),
          raw: part,
        });
      }
    } else if (trimmed.toLowerCase().startsWith("<sfx")) {
      // 🌟 修复 3：独立抓取 SFX 名字和 dir，彻底解决修改 dir 导致匹配崩溃的问题
      const sfxMatch = /<sfx\b[^>]*>([\s\S]*?)<\/sfx>/i.exec(part);
      if (sfxMatch) {
        const dirMatch = /\bdir=["']?([^"'>\s]+)["']?/i.exec(part);
        timeline.push({
          type: "sfx",
          dir: dirMatch ? dirMatch[1].toLowerCase() : "center",
          name: sfxMatch[1].trim(),
          raw: part,
        });
      }
    } else if (/^<(speak|inner|phone)\b/i.test(trimmed)) {
      // 🌟 修复 4：内置独立的 TTS 标签解析器，摆脱对 utils.js 的依赖，完美支持 inner/phone 切换
      const ttsMatch =
        /<(speak|inner|phone)\b([^>]*)>([\s\S]*?)<\/(?:speak|inner|phone)>/i.exec(
          part,
        );
      if (ttsMatch) {
        const tagType = ttsMatch[1].toLowerCase();
        const rawAttrs = ttsMatch[2];
        const rawText = ttsMatch[3];

        const attrs = {};
        // 兼容正常的双引号，以及可能被转义过的 &quot;
        const attrRegex = /(\w+)\s*=\s*(?:"|&quot;|')([^"']*)(?:"|&quot;|')/g;
        let matchAttr;
        while ((matchAttr = attrRegex.exec(rawAttrs)) !== null) {
          attrs[matchAttr[1].toLowerCase()] = matchAttr[2];
        }

        const cleanText = rawText.replace(/\{\{[\s\S]*?\}\}/g, "").trim();

        const speakObj = {
          tag: tagType,
          attrs: attrs, // 👈 补回原有的 attrs 结构，防止下游逻辑报错
          char: attrs.char || "",
          mood: attrs.mood || "",
          detail: attrs.detail || "",
          dir: attrs.dir || "center",
          text: cleanText,
          raw: part,
        };

        timeline.push({
          type: "tts",
          speakObj: speakObj,
          raw: part,
          blob: null,
        });
      }
    } else {
      timeline.push({ type: "text", text: trimmed, raw: part });
    }
  }
  return timeline;
}

/**
 * 🌟 新增：批量解析并预下载 Ambience，存入 IndexedDB
 */
async function preloadAmbienceForTimeline(timeline, floorId) {
  const settings = getSirenSettings();
  const ambienceLibs = settings?.ambience?.libraries || {};

  // 🌟 新增：记录当前预加载批次中已开始处理的 URL，彻底防并发重复下载
  const downloadingUrls = new Set();

  for (const node of timeline) {
    if (node.type === "ambience") {
      let targetUrl = null;
      let actualAmbienceName = node.name;

      // 1. 模拟查找匹配项与随机选择
      let candidates = [];
      for (const libKey in ambienceLibs) {
        for (const item of ambienceLibs[libKey]) {
          if (
            item.name === node.name ||
            item.name.startsWith(node.name + "-")
          ) {
            candidates.push(item);
          }
        }
      }

      const cacheKey = floorId ? `${floorId}_${node.name}` : null;
      if (cacheKey && randomAmbienceCache.has(cacheKey)) {
        const cachedName = randomAmbienceCache.get(cacheKey);
        const found = candidates.find((c) => c.name === cachedName);
        if (found) {
          targetUrl = found.url;
          actualAmbienceName = found.name;
        }
      }

      if (!targetUrl && candidates.length > 0) {
        const picked =
          candidates[Math.floor(Math.random() * candidates.length)];
        targetUrl = picked.url;
        actualAmbienceName = picked.name;
        if (cacheKey) randomAmbienceCache.set(cacheKey, actualAmbienceName);
      }

      if (!targetUrl) continue;

      // 🌟 新增：如果同一个预加载循环中已经派发了该任务，直接跳过
      if (downloadingUrls.has(targetUrl)) continue;
      downloadingUrls.add(targetUrl);

      // 2. 检查 IndexedDB 是否已存在
      try {
        const record = await getAmbienceRecord(targetUrl);
        if (record && record.audioBlob) {
          continue; // 已经缓存过，直接跳过下载
        }

        console.log(
          `[Siren Voice] 📥 开始后台下载并缓存 Ambience: ${actualAmbienceName}`,
        );
        const response = await fetch(targetUrl);
        if (response.ok) {
          const blob = await response.blob();
          await saveAmbienceRecord(targetUrl, blob); // 存入 DB，内部会自动触发超限清理
        } else {
          console.warn(
            `[Siren Voice] ⚠️ Ambience 下载失败，状态码: ${response.status}`,
          );
        }
      } catch (e) {
        console.error(
          `[Siren Voice] ❌ Ambience 下载缓存失败: ${actualAmbienceName}`,
          e,
        );
      }
    }
  }
}

/**
 * 🌟 新增：批量解析并预下载 SFX
 */
async function preloadSfxForTimeline(timeline, floorId) {
  const settings = getSirenSettings();
  const sfxLibs = settings?.ambience?.sfx_libraries || {};
  const downloadingUrls = new Set();

  for (const node of timeline) {
    if (node.type === "sfx") {
      let targetUrl = null;
      let candidates = [];

      for (const libKey in sfxLibs) {
        for (const item of sfxLibs[libKey]) {
          if (
            item.name === node.name ||
            item.name.startsWith(node.name + "-")
          ) {
            candidates.push(item);
          }
        }
      }

      const cacheKey = floorId ? `${floorId}_${node.name}` : null;
      if (cacheKey && randomSfxCache.has(cacheKey)) {
        const cachedName = randomSfxCache.get(cacheKey);
        const found = candidates.find((c) => c.name === cachedName);
        if (found) targetUrl = found.url;
      }

      if (!targetUrl && candidates.length > 0) {
        const picked =
          candidates[Math.floor(Math.random() * candidates.length)];
        targetUrl = picked.url;
        if (cacheKey) randomSfxCache.set(cacheKey, picked.name);
      }

      if (!targetUrl || downloadingUrls.has(targetUrl)) continue;
      downloadingUrls.add(targetUrl);

      try {
        // 🌟 复用 Ambience 的底层数据库，完美达到去重目的
        const record = await getAmbienceRecord(targetUrl);
        if (record && record.audioBlob) continue;

        console.log(`[Siren Voice] 📥 后台缓存 SFX: ${node.name}`);
        const response = await fetch(targetUrl);
        if (response.ok) {
          const blob = await response.blob();
          await saveAmbienceRecord(targetUrl, blob);
        }
      } catch (e) {
        console.error(`[Siren Voice] ❌ SFX 缓存失败: ${node.name}`, e);
      }
    }
  }
}

/**
 * 完整接入 startScenePlayback
 */
async function startScenePlayback(floorId, timeline, btnNode) {
  // 🚀 核心修复 2：全新播放前，游标必须强制归零
  activeSceneState.currentStepIndex = 0;

  activeSceneState.isPlaying = true;
  activeSceneState.isPaused = false;
  activeSceneState.floorId = floorId;

  // 🌟 1. 扫描映射 DOM，瞬间切分全部 DOM 并穿好马甲
  mapTimelineToDom(floorId, timeline);
  const mesNode = document.querySelector(`.mes[mesid="${floorId}"]`);
  if (mesNode) mesNode.classList.add("siren-scene-active");

  // ==========================================
  // 🛡️ 终极护盾：主动引爆并等待 SillyTavern 的“防抖炸弹”！
  // 强行休眠 800 毫秒，把主线程让给 ST 的 Markdown 和正则解析器。
  // 等它们把 DOM 扫完、彻底安静下来后，我们再开始播放！
  // ==========================================
  await new Promise((r) => setTimeout(r, 100));

  // 开始遍历剧本播放
  for (let i = activeSceneState.currentStepIndex; i < timeline.length; i++) {
    if (!activeSceneState.isPlaying || activeSceneState.floorId !== floorId) {
      console.log(
        `[Siren Voice] 🛑 楼层 ${floorId} 播放被打断，安全退出循环。`,
      );
      break;
    }

    activeSceneState.currentStepIndex = i;
    const node = timeline[i];

    if (node.type === "ambience") {
      playSceneAmbience(node.name, floorId, true);
    } else if (node.type === "sfx") {
      // 🚀 核心脱钩：删除了 await！让音效进入后台并行，主线程立刻去渲染后面的文字或触发其他音效！
      playSceneSfxSync(node.name, floorId, node.dir);
    } else if (node.type === "tts" && node.blob) {
      // 🚀 终极屏障：TTS 登场前，必须等待之前触发的所有 SFX 彻底播完！
      await waitForActiveSfx(floorId);

      // 如果等待期间被打断了（切楼了），及时跳出循环
      if (!activeSceneState.isPlaying || activeSceneState.floorId !== floorId)
        break;

      await checkableSleep(50, floorId);
      const { audio, promise, startAudio } = playSceneTtsSync(
        node.blob,
        node.speakObj,
      );
      startKaraokeAnimation(node.domElements, 0, audio, floorId, startAudio);
      await promise;

      // 🚀 优化 3：同上，缩短播完后的死等时间
      await checkableSleep(50, floorId);
    } else if (node.type === "text") {
      const settings =
        SillyTavern.getContext()?.extensionSettings?.siren_voice_settings;
      const speed = settings?.ambience?.karaoke_speed || 1.0;
      const waitTime = Math.max(1000, (node.text.length * 150) / speed);

      await startKaraokeAnimation(node.domElements, waitTime, null, floorId);
    }
  }

  if (
    !activeSceneState.isPaused &&
    activeSceneState.isPlaying &&
    activeSceneState.floorId === floorId
  ) {
    stopScenePlayback(btnNode, true);
  }
}

/**
 * 🌟 新增：阻塞等待所有环境音效播放完毕（TTS 登场前的清场机制）
 */
async function waitForActiveSfx(expectedFloorId) {
  while (activeSceneState.activeSfxPool.size > 0) {
    if (
      !activeSceneState.isPlaying ||
      activeSceneState.floorId !== expectedFloorId
    ) {
      return; // 期间被打断了，立刻退出
    }
    // 每 100ms 检查一次池子空了没
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * 优化 checkableSleep 以支持更细腻的中断检测与防切楼篡改
 */
async function checkableSleep(ms, expectedFloorId) {
  const step = 50;
  const totalSteps = ms / step;
  for (let i = 0; i < totalSteps; i++) {
    // 任何时刻发现 isPlaying 被关，或者全局 floorId 变了，立刻放弃休眠
    if (
      !activeSceneState.isPlaying ||
      activeSceneState.floorId !== expectedFloorId
    )
      return;

    while (activeSceneState.isPaused) {
      // 暂停期间也要防切楼
      if (activeSceneState.floorId !== expectedFloorId) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, step));
  }
}

/**
 * 暂停播放器
 */
function pauseScenePlayback() {
  activeSceneState.isPaused = true;
  if (activeSceneState.ttsAudio) activeSceneState.ttsAudio.pause();
  if (activeSceneState.ambienceAudio) activeSceneState.ambienceAudio.pause();
  activeSceneState.activeSfxPool.forEach((audio) => audio.pause());

  // 🌟 核心：取消楼层沉浸变暗，并暂存所有卡拉OK变色状态
  const activeMes = document.querySelector(
    `.mes[mesid="${activeSceneState.floorId}"]`,
  );
  if (activeMes) {
    activeMes.classList.remove("siren-scene-active");

    // 将正在播放和已经播完的文本类名，替换为“休眠(paused)”类名
    activeMes.querySelectorAll(".siren-karaoke-playing").forEach((el) => {
      el.classList.remove("siren-karaoke-playing");
      el.classList.add("siren-karaoke-paused-playing");
    });
    activeMes.querySelectorAll(".siren-karaoke-done").forEach((el) => {
      el.classList.remove("siren-karaoke-done");
      el.classList.add("siren-karaoke-paused-done");
    });
  }
}

/**
 * 恢复播放器
 */
function resumeScenePlayback() {
  activeSceneState.isPaused = false;

  // 🌟 核心：恢复沉浸模式，并把休眠的卡拉OK状态还给文本
  const activeMes = document.querySelector(
    `.mes[mesid="${activeSceneState.floorId}"]`,
  );
  if (activeMes) {
    activeMes.classList.add("siren-scene-active");

    // 将暂存的休眠状态，无缝换回激活状态
    activeMes
      .querySelectorAll(".siren-karaoke-paused-playing")
      .forEach((el) => {
        el.classList.remove("siren-karaoke-paused-playing");
        el.classList.add("siren-karaoke-playing");
      });
    activeMes.querySelectorAll(".siren-karaoke-paused-done").forEach((el) => {
      el.classList.remove("siren-karaoke-paused-done");
      el.classList.add("siren-karaoke-done");
    });
  }

  if (activeSceneState.ttsAudio && !activeSceneState.ttsAudio.ended) {
    activeSceneState.ttsAudio.play();
  }

  if (activeSceneState.ambienceAudio) {
    activeSceneState.ambienceAudio.play();
  }
  activeSceneState.activeSfxPool.forEach((audio) => {
    if (!audio.ended) audio.play();
  });
}

/**
 * 🌟 核心修复：完善停止播放时的清场逻辑，彻底超度旧楼层的 Promise
 */
export function stopScenePlayback(btnNode = null, fadeOutAmbience = false) {
  activeSceneState.isPlaying = false;
  activeSceneState.isPaused = false;
  activeSceneState.currentStepIndex = 0;

  if (activeSceneState.ttsAudio) {
    activeSceneState.ttsAudio.pause();
    activeSceneState.ttsAudio.removeAttribute("src");

    // 🌟 强行解开旧楼层异步循环的等待锁，让它安心去 break
    if (typeof activeSceneState.ttsAudio._resolve === "function") {
      activeSceneState.ttsAudio._resolve();
    }
    activeSceneState.ttsAudio = null;
  }

  if (activeSceneState.activeSfxPool.size > 0) {
    activeSceneState.activeSfxPool.forEach((audio) => {
      audio.pause();
      audio.removeAttribute("src");
      if (typeof audio._resolve === "function") {
        audio._resolve();
      }
      const src = audio.src;
      if (src && src.startsWith("blob:")) URL.revokeObjectURL(src);
    });
    activeSceneState.activeSfxPool.clear(); // 彻底清空池子
  }

  if (activeSceneState.ambienceAudio) {
    if (fadeOutAmbience) {
      const oldAmbience = activeSceneState.ambienceAudio;
      fadeAudio(oldAmbience, 0, 2.0).then(() => {
        oldAmbience.pause();
        const src = oldAmbience.src; // 👈 暂存 URL
        oldAmbience.removeAttribute("src");
        if (src && src.startsWith("blob:")) URL.revokeObjectURL(src); // 👈 释放内存
      });
    } else {
      activeSceneState.ambienceAudio.pause();
      const src = activeSceneState.ambienceAudio.src; // 👈 暂存 URL
      activeSceneState.ambienceAudio.removeAttribute("src");
      if (src && src.startsWith("blob:")) URL.revokeObjectURL(src); // 👈 释放内存
    }
    activeSceneState.ambienceAudio = null;
  }

  // 彻底清除动画痕迹
  if (activeKaraokeRaf) cancelAnimationFrame(activeKaraokeRaf);
  const activeMes = document.querySelector(".siren-scene-active");
  if (activeMes) {
    activeMes.classList.remove("siren-scene-active");
    // 👇 加上我们新增的两个 paused 类名进行全量清场
    activeMes
      .querySelectorAll(
        ".siren-karaoke-playing, .siren-karaoke-done, .siren-karaoke-paused-playing, .siren-karaoke-paused-done, .siren-karaoke-target",
      )
      .forEach((el) => {
        el.classList.remove(
          "siren-karaoke-playing",
          "siren-karaoke-done",
          "siren-karaoke-paused-playing",
          "siren-karaoke-paused-done",
        );
        el.style.removeProperty("--k-prog");
        // 🌟 新增：一并擦除静态坐标
        el.style.removeProperty("--c-off");
        el.style.removeProperty("--c-len");
      });
  }

  const targetBtn =
    btnNode ||
    document.querySelector(
      `.siren-scene-play-btn[data-state="playing"], .siren-scene-play-btn[data-state="paused"]`,
    );
  if (targetBtn) {
    targetBtn.dataset.state = "ready";
    targetBtn.innerHTML = `<i class="fa-solid fa-play" style="color: #10b981; filter: drop-shadow(0 0 5px #10b981);"></i>`;
  }

  // 👇 1. 获取最新的自定义图标
  const settings = getSirenSettings();
  const bStyle = settings?.ambience?.card_style;
  const sStyle = settings?.ambience?.sfx_card_style;
  const currentAmbienceIcon =
    bStyle?.dict?.[bStyle.current]?.icon || "fa-solid fa-music";
  const currentSfxIcon =
    sStyle?.dict?.[sStyle.current]?.icon || "fa-solid fa-bolt";

  // 👇 2. 使用数据属性选择器恢复背景音图标
  document.querySelectorAll('[data-siren-ambience="1"] i').forEach((el) => {
    if (
      el.classList.contains("fa-circle-pause") ||
      el.classList.contains("fa-spinner")
    ) {
      el.className = currentAmbienceIcon;
    }
  });

  // 👇 3. 使用数据属性选择器恢复效果音图标
  document.querySelectorAll('[data-siren-sfx="1"] i').forEach((el) => {
    if (
      el.classList.contains("fa-circle-pause") ||
      el.classList.contains("fa-spinner")
    ) {
      el.className = currentSfxIcon;
    }
  });
}

/**
 * 同步播放 TTS（阻塞后续 timeline，直到播完）
 */
function playSceneTtsSync(blob, speakObj = null) {
  // 🌟 新增 speakObj 参数
  let audio;
  let startAudio;

  const promise = new Promise((resolve) => {
    if (!blob) return resolve();

    const url = URL.createObjectURL(blob);
    audio = new Audio(url);

    // 🚨 重要：交出音量控制权给混音台，这里固定为 1.0
    audio.volume = 1.0;
    activeSceneState.ttsAudio = audio;

    // 🌟 核心接入：提取方位并唤醒引擎插线
    const dir = speakObj?.dir || speakObj?.attrs?.dir || "center";
    try {
      initAudioEngine();
      // 🌟 修复：补上第 4 个参数 tagType
      routeAudioToMixer(audio, "tts", dir, speakObj?.tag || "speak");
    } catch (e) {
      console.warn("[Siren Voice] 场景 TTS 空间路由失败，退回原生控制", e);
      audio.volume = getRealVolume("tts");
    }

    audio._resolve = () => {
      URL.revokeObjectURL(url);
      resolve();
    };

    audio.onended = () => {
      if (activeSceneState.ttsAudio === audio) activeSceneState.ttsAudio = null;
      audio._resolve();
    };

    audio.onerror = () => {
      if (activeSceneState.ttsAudio === audio) activeSceneState.ttsAudio = null;
      audio._resolve();
    };

    startAudio = () => {
      audio.play().catch((e) => {
        console.error("[Siren Voice] 播放被浏览器拦截", e);
        if (activeSceneState.ttsAudio === audio)
          activeSceneState.ttsAudio = null;
        audio._resolve();
      });
    };
  });

  return { audio, promise, startAudio };
}

export async function playSceneAmbience(
  ambienceName,
  floorId = null,
  forcePlay = false,
) {
  const settings = getSirenSettings();
  const ambienceLibs = settings?.ambience?.libraries || {};
  const fadeSec = settings?.ambience?.fade_duration ?? 2.0;

  let targetUrl = null;
  let actualAmbienceName = ambienceName;

  // 🌟 1. 收集所有符合条件的 Ambience (完全匹配，或者以 "名字_" 开头)
  let candidates = [];
  for (const libKey in ambienceLibs) {
    for (const item of ambienceLibs[libKey]) {
      if (
        item.name === ambienceName ||
        item.name.startsWith(ambienceName + "-")
      ) {
        candidates.push(item);
      }
    }
  }

  // 🌟 2. 检查该楼层是否已经为这个前缀抽取过随机音乐 (防止多次点击乱切歌)
  const cacheKey = floorId ? `${floorId}_${ambienceName}` : null;
  if (cacheKey && randomAmbienceCache.has(cacheKey)) {
    const cachedName = randomAmbienceCache.get(cacheKey);
    const found = candidates.find((c) => c.name === cachedName);
    if (found) {
      targetUrl = found.url;
      actualAmbienceName = found.name;
    }
  }

  // 🌟 3. 如果没缓存，且有候选池，则进行随机抽取并记录
  if (!targetUrl && candidates.length > 0) {
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    targetUrl = picked.url;
    actualAmbienceName = picked.name;

    if (cacheKey) {
      randomAmbienceCache.set(cacheKey, actualAmbienceName);
    }
  }

  if (!targetUrl) {
    console.warn(`[Siren Voice] ⚠️ Ambience 未找到匹配的 URL: ${ambienceName}`);
    if (window.toastr) window.toastr.warning(`未找到背景音: ${ambienceName}`);
    return "not_found";
  }

  // 🌟 核心修改：检查“实际播放的名字”是否与当前正在播放的重合，触发暂停
  if (
    activeSceneState.ambienceAudio &&
    activeSceneState.ambienceName === actualAmbienceName
  ) {
    if (activeSceneState.ambienceAudio.paused) {
      await activeSceneState.ambienceAudio.play();
      return "playing";
    } else {
      // 🌟 拦截：如果是从剧本 timeline 自动触发的，遇到同名音乐直接放行，不要暂停
      if (forcePlay) return "playing";

      activeSceneState.ambienceAudio.pause();
      return "paused";
    }
  }

  console.log(
    `[Siren Voice] 🎵 切入 Ambience: ${actualAmbienceName} -> ${targetUrl}`,
  );

  const oldAmbience = activeSceneState.ambienceAudio;

  // 🌟 核心修复 1：检查缓存与兜底强制下载
  let finalSrc = targetUrl;
  const record = await getAmbienceRecord(targetUrl);

  if (record && record.audioBlob) {
    finalSrc = URL.createObjectURL(record.audioBlob);
    console.log(`[Siren Voice] ⚡ 命中本地 Ambience 缓存！`);
  } else {
    console.log(
      `[Siren Voice] 📥 Ambience 缓存未命中，开始兜底下载: ${actualAmbienceName}`,
    );
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const blob = await response.blob();
        await saveAmbienceRecord(targetUrl, blob);
        finalSrc = URL.createObjectURL(blob);
        console.log(`[Siren Voice] ✅ 兜底下载完成并缓存入库！`);
      } else {
        console.warn(
          `[Siren Voice] ⚠️ Ambience 下载失败 (HTTP ${response.status})`,
        );
        if (window.toastr) window.toastr.error("背景音加载失败，请检查链接");
        return "error"; // 🌟 修复：明确返回 error，阻止下游生成错误的 Audio
      }
    } catch (e) {
      console.error(`[Siren Voice] ❌ Ambience 下载报错:`, e);
      if (window.toastr) window.toastr.error("背景音网络请求失败");
      return "error"; // 🌟 修复：阻断播放，让界面的转圈能够停止
    }
  }

  const newAmbience = new Audio(finalSrc);
  newAmbience.loop = true;
  newAmbience.volume = 0;

  activeSceneState.ambienceAudio = newAmbience;
  activeSceneState.ambienceName = actualAmbienceName; // 🌟 记住随机抽取的真实名字

  try {
    await newAmbience.play();
    fadeAudio(newAmbience, getRealVolume("ambience"), fadeSec);
    if (oldAmbience) {
      fadeAudio(oldAmbience, 0, fadeSec).then(() => {
        oldAmbience.pause();
        const src = oldAmbience.src; // 👈 暂存 URL
        oldAmbience.removeAttribute("src");
        if (src && src.startsWith("blob:")) URL.revokeObjectURL(src); // 👈 释放内存，防止爆显存/内存
      });
    }
    return "playing";
  } catch (e) {
    console.error("[Siren Voice] ❌ Ambience 播放失败", e);
    return "error";
  }
}

/**
 * 🌟 新增：独立点击播放 SFX 的异步引擎 (支持切换/暂停，允许多轨并行)
 * 返回播放状态给前端 UI
 */
export async function playSceneSfx(
  sfxName,
  floorId = null,
  forcePlay = false,
  dir = "center",
) {
  const settings = getSirenSettings();
  const sfxLibs = settings?.ambience?.sfx_libraries || {};

  let targetUrl = null;
  let actualSfxName = sfxName;

  // 1. 收集所有符合条件的 SFX (完全匹配，或者以 "名字_" 开头)
  let candidates = [];
  for (const libKey in sfxLibs) {
    for (const item of sfxLibs[libKey]) {
      if (item.name === sfxName || item.name.startsWith(sfxName + "-")) {
        candidates.push(item);
      }
    }
  }

  // 2. 检查该楼层是否已经抽取过 (保证同一楼层点击多次，听到的还是同一个雷声)
  const cacheKey = floorId ? `${floorId}_${sfxName}` : null;
  if (cacheKey && randomSfxCache.has(cacheKey)) {
    const cachedName = randomSfxCache.get(cacheKey);
    const found = candidates.find((c) => c.name === cachedName);
    if (found) {
      targetUrl = found.url;
      actualSfxName = found.name;
    }
  }

  // 3. 随机抽取
  if (!targetUrl && candidates.length > 0) {
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    targetUrl = picked.url;
    actualSfxName = picked.name;
    if (cacheKey) randomSfxCache.set(cacheKey, actualSfxName);
  }

  if (!targetUrl) {
    console.warn(`[Siren Voice] ⚠️ SFX 未找到匹配的 URL: ${sfxName}`);
    if (window.toastr) window.toastr.warning(`未找到效果音: ${sfxName}`);
    return "not_found";
  }

  // 4. 🌟 核心改造：在音频池中查重与控制暂停/播放
  let existingSfx = null;
  for (const audio of activeSceneState.activeSfxPool) {
    if (audio._sirenName === actualSfxName) {
      existingSfx = audio;
      break; // 找到了同名的音效，跳出循环
    }
  }

  if (existingSfx) {
    if (existingSfx.paused) {
      await existingSfx.play();
      return "playing";
    } else {
      if (forcePlay) {
        existingSfx.currentTime = 0; // 强制从头播
        return "playing";
      }
      existingSfx.pause();
      return "paused";
    }
  }

  console.log(
    `[Siren Voice] ⚡ 独立触发并行 SFX: ${actualSfxName} -> ${targetUrl}`,
  );

  // 💡 注意：这里去掉了旧版“切歌前，清理正在播放的其他 SFX”的代码，现在允许叠加播放！

  // 5. 命中缓存或兜底下载
  let finalSrc = targetUrl;
  const record = await getAmbienceRecord(targetUrl);

  if (record && record.audioBlob) {
    finalSrc = URL.createObjectURL(record.audioBlob);
  } else {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        const blob = await response.blob();
        await saveAmbienceRecord(targetUrl, blob);
        finalSrc = URL.createObjectURL(blob);
      } else {
        console.warn(`[Siren Voice] ⚠️ SFX 下载失败 (HTTP ${response.status})`);
        if (window.toastr) window.toastr.error("效果音加载失败，请检查链接");
        return "error"; // 🌟 修复：阻断执行
      }
    } catch (e) {
      console.error(`[Siren Voice] ❌ SFX 下载报错:`, e);
      if (window.toastr) window.toastr.error("效果音网络请求失败");
      return "error"; // 🌟 修复：阻断执行
    }
  }

  const newSfx = new Audio(finalSrc);
  newSfx.loop = false; // 💡 SFX 绝大多数情况不循环播放
  newSfx.volume = 1.0;

  // 🌟 核心改造：给新生成的实例打上名字标签，并加入池子
  newSfx._sirenName = actualSfxName;
  activeSceneState.activeSfxPool.add(newSfx);

  try {
    initAudioEngine();
    routeAudioToMixer(newSfx, "sfx", dir, "sfx");
  } catch (e) {
    console.warn("[Siren Voice] SFX 空间路由失败，退回原生控制", e);
    newSfx.volume = getRealVolume("sfx");
  }

  try {
    // 🌟 核心改造：播完后，把自己从池子里删掉，并释放内存
    newSfx.onended = () => {
      activeSceneState.activeSfxPool.delete(newSfx);
      const src = newSfx.src;
      if (src && src.startsWith("blob:")) URL.revokeObjectURL(src);
    };

    await newSfx.play();
    return "playing";
  } catch (e) {
    console.error("[Siren Voice] ❌ SFX 播放失败", e);
    // 如果播放被拦截或出错，也要确保把它从池子里清理掉，防止占坑
    activeSceneState.activeSfxPool.delete(newSfx);
    return "error";
  }
}

/**
 * 🌟 新增：SFX 同步阻塞播放引擎
 * 返回 Promise，直到音效播放完毕才 resolve。
 */
function playSceneSfxSync(sfxName, floorId = null, dir = "center") {
  return new Promise(async (resolve) => {
    if (!activeSceneState.isPlaying || activeSceneState.floorId !== floorId)
      return resolve();

    const settings = getSirenSettings();
    const sfxLibs = settings?.ambience?.sfx_libraries || {};
    let targetUrl = null;
    let candidates = [];

    for (const libKey in sfxLibs) {
      for (const item of sfxLibs[libKey]) {
        if (item.name === sfxName || item.name.startsWith(sfxName + "-")) {
          candidates.push(item);
        }
      }
    }

    const cacheKey = floorId ? `${floorId}_${sfxName}` : null;
    if (cacheKey && randomSfxCache.has(cacheKey)) {
      const cachedName = randomSfxCache.get(cacheKey);
      const found = candidates.find((c) => c.name === cachedName);
      if (found) targetUrl = found.url;
    }

    if (!targetUrl && candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      targetUrl = picked.url;
      if (cacheKey) randomSfxCache.set(cacheKey, picked.name);
    }

    if (!targetUrl) {
      console.warn(`[Siren Voice] ⚠️ SFX 未找到: ${sfxName}`);
      return resolve(); // 找不到直接跳过，不阻塞剧本
    }

    // 尝试命中本地缓存
    let finalSrc = targetUrl;
    const record = await getAmbienceRecord(targetUrl);
    if (record && record.audioBlob) {
      finalSrc = URL.createObjectURL(record.audioBlob);
    } else {
      try {
        const response = await fetch(targetUrl);
        if (response.ok) {
          const blob = await response.blob();
          await saveAmbienceRecord(targetUrl, blob);
          finalSrc = URL.createObjectURL(blob);
        } else {
          console.warn(
            `[Siren Voice] ⚠️ SFX 下载失败 (HTTP ${response.status})`,
          );
          return resolve(); // 🌟 核心修复：必须调用 resolve，否则会卡死整个剧本进度！
        }
      } catch (e) {
        console.warn(`[Siren Voice] ❌ SFX 下载报错:`, e);
        return resolve(); // 🌟 核心修复：遇到网络错误也必须放行
      }
    }

    const audio = new Audio(finalSrc);
    audio.volume = 1.0;

    audio._sirenName = sfxName;
    activeSceneState.activeSfxPool.add(audio);

    try {
      initAudioEngine();
      routeAudioToMixer(audio, "sfx", dir, "sfx");
    } catch (e) {
      console.warn("[Siren Voice] SFX 空间路由失败，退回原生控制", e);
      audio.volume = getRealVolume("sfx");
    }

    audio._resolve = () => {
      if (finalSrc.startsWith("blob:")) URL.revokeObjectURL(finalSrc);
      resolve();
    };

    audio.onended = () => {
      activeSceneState.activeSfxPool.delete(audio); // 🌟 移出池子
      audio._resolve();
    };
    audio.onerror = () => {
      activeSceneState.activeSfxPool.delete(audio); // 🌟 移出池子
      audio._resolve();
    };

    audio.play().catch((e) => {
      console.warn("[Siren Voice] ⚠️ SFX 播放被浏览器拦截", e);
      audio._resolve();
    });
  });
}

/**
 * 音量平滑过渡工具函数
 */
function fadeAudio(audioObj, targetVolume, durationSec) {
  return new Promise((resolve) => {
    if (!audioObj || durationSec <= 0) {
      if (audioObj) audioObj.volume = targetVolume;
      return resolve();
    }

    const startVol = audioObj.volume;
    const diff = targetVolume - startVol;
    const steps = 20;
    const stepTime = (durationSec * 1000) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      let newVol = startVol + diff * (currentStep / steps);
      if (newVol < 0) newVol = 0;
      if (newVol > 1) newVol = 1;

      try {
        audioObj.volume = newVol;
      } catch (e) {}

      if (currentStep >= steps) {
        clearInterval(timer);
        resolve();
      }
    }, stepTime);
  });
}

export function getActiveSfxAudio() {
  // 兼容之前的逻辑：如果有并行音效，返回第一个
  if (activeSceneState.activeSfxPool.size > 0) {
    return Array.from(activeSceneState.activeSfxPool)[0];
  }
  return null;
}

/**
 * 🌟 核心功能：根据 Timeline 生成实质性内容签名
 * 逻辑：包含 Ambience/SFX 的名字，TTS 的角色、情绪、描写、文本。排除所有 dir 属性和标签类型的干扰。
 */
export function generateSignatureFromTimeline(timeline) {
  return timeline
    .filter((n) => ["ambience", "tts", "sfx"].includes(n.type))
    .map((n) => {
      if (n.type === "ambience") return `ambience:${n.name}`;
      if (n.type === "sfx") return `sfx:${n.name}`; // 仅对比名字，不含 dir
      if (n.type === "tts") {
        const s = n.speakObj || {};
        // 🌟 核心加固：统一格式化参数，无视前后空格，防 undefined，剔除宏变量干扰
        const char = (s.char || "").trim();
        const mood = (s.mood || "").trim();
        const detail = (s.detail || "").trim();
        const text = (s.text || "").replace(/\{\{[\s\S]*?\}\}/g, "").trim();

        // 仅对比 char, mood, detail 和文本内容，彻底无视 dir 和 tag (speak/inner/phone)
        return `tts:${char}|${mood}|${detail}|${text}`;
      }
      return "";
    })
    .join("||");
}

/**
 * 🌟 核心功能：响应楼层编辑，决定是否回退按钮
 */
export async function handleMessageEditRevert(floorId) {
  const mesNode = document.querySelector(`.mes[mesid="${floorId}"]`);
  if (!mesNode) return;

  const playBtn = mesNode.querySelector(".siren-scene-play-btn");
  const regenBtn = mesNode.querySelector(".siren-scene-regen-btn");

  // 如果该楼层本来就没有按钮，尝试注入一次
  if (!playBtn) {
    await injectScenePlayButtons();
    return;
  }

  const timeline = parseMessageTimeline(floorId);
  const newSignature = generateSignatureFromTimeline(timeline);
  const oldSignature = playBtn.dataset.signature || "";

  // 只有当实质性内容（签名）改变时，才执行回退
  if (newSignature !== oldSignature) {
    console.log(
      `[Siren Voice] 检测到楼层 ${floorId} 内容变更，回退至生成按钮。`,
    );

    // 如果正在播放该楼层，强制停止
    if (
      activeSceneState.floorId === String(floorId) &&
      activeSceneState.isPlaying
    ) {
      stopScenePlayback(playBtn);
    }

    // 回退 UI 状态
    playBtn.dataset.state = "initial";
    playBtn.dataset.signature = newSignature; // 更新签名
    playBtn.innerHTML = `<i class="fa-solid fa-clapperboard" style="color: #3b82f6;"></i>`;

    if (regenBtn) regenBtn.style.display = "none";
  } else {
    console.log(
      `[Siren Voice] 楼层 ${floorId} 仅修改了 dir 或无关内容，保持当前状态。`,
    );
  }
}

/**
 * 🌟 新增：场景自动化播报引擎
 * 模拟人类操作：检查完整性 -> 找到按钮 -> 触发请求(initial) -> 触发播放(ready)
 */
export async function triggerSceneAutoPlay() {
  const context = SillyTavern.getContext();
  const settings = context?.extensionSettings?.siren_voice_settings;

  // 1. 检查全局场控和自动播放开关
  if (!settings?.ambience?.enabled || !settings?.ambience?.auto_play) return;

  if (!window.TavernHelper) return;
  const messages = window.TavernHelper.getChatMessages(-1);
  if (!messages || messages.length === 0) return;

  // 2. 锁定最新一条回复 (仅处理 AI 的回复)
  const lastMsg = messages[0];
  if (!lastMsg || lastMsg.role === "user" || lastMsg.is_user) return;

  const floorId = lastMsg.message_id;

  // 3. 检查回复的完整性 (防止半截断的句子被读出来)
  const isComplete = checkReplyIntegrity(
    lastMsg.message,
    settings.ambience.custom_end_tags,
  );
  if (!isComplete) {
    console.warn(
      "[Siren Voice] ⚠️ 回复不完整或触发报错截断，已取消场景自动播报。",
    );
    return;
  }

  // 4. 从页面上揪出刚刚注入的播放按钮
  const mesNode = document.querySelector(`.mes[mesid="${floorId}"]`);
  if (!mesNode) return;

  const playBtn = mesNode.querySelector(".siren-scene-play-btn");
  if (!playBtn) {
    console.log(`[Siren Voice] 楼层 ${floorId} 没有场控按钮，跳过自动播放。`);
    return;
  }

  // 5. 🌟 自动打断逻辑
  if (
    activeSceneState.isPlaying &&
    activeSceneState.floorId !== String(floorId)
  ) {
    console.log("[Siren Voice] 🛑 触发跨楼层自动打断...");
    const oldBtn = document.querySelector(
      `.mes[mesid="${activeSceneState.floorId}"] .siren-scene-play-btn`,
    );
    if (oldBtn) stopScenePlayback(oldBtn, false);
  }
  // 顺手把独立的 TTS 队列也清空，确保发声通道干净
  stopCurrentTTS();

  console.log(`[Siren Voice] 🎬 触发自动场控模拟连招！(Floor: ${floorId})`);

  // 6. 🚀 发动模拟连招：请求 -> 等待 -> 播放
  if (playBtn.dataset.state === "initial") {
    console.log("[Siren Voice] ⏳ 连招 1/2：触发后台请求...");
    await handleSceneButtonClick(playBtn, mesNode);
  }

  if (playBtn.dataset.state === "ready") {
    console.log("[Siren Voice] ▶️ 连招 2/2：请求就绪，触发实机播放！");
    await handleSceneButtonClick(playBtn, mesNode);
  }
}
