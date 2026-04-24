import {
  updatePlayerUI,
  updateLyricUI,
  setPlayButtonState,
  updateProgressUI,
  bindProgressDragEvent,
  bindLyricToggleEvent,
  updateLyricToggleUI,
} from "./music_player.js";
import { getSirenSettings, saveSirenSettings } from "./settings.js";
import { getRealVolume } from "./utils.js";

let animationFrameId = null;
let currentAudio = null;

let currentLyrics = []; // 当前正在渲染的歌词数组
let originalLyrics = []; // 备份的原版歌词
let translatedLyrics = []; // 备份的翻译歌词
let currentLyricMode = "tlyric"; // 默认偏好: tlyric (译文) 或 lyric (原文)
let hasTranslation = false; // 当前歌曲是否有译文

let lyricUpdateHandler = null;

let currentPlaylist = [];
let currentMusicIndex = -1;
let currentPlayingTrack = null;

document.addEventListener("sirenVolumeChanged", (e) => {
  if (e.detail.channel === "music" && currentAudio) {
    currentAudio.volume = getRealVolume("music");
  }
});

async function fetchGDAPI(params) {
  const baseUrl = "https://music-api.gdstudio.xyz/api.php";
  const queryString = new URLSearchParams(params).toString();
  try {
    const response = await fetch(`${baseUrl}?${queryString}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("[Siren Voice API] 请求失败:", error);
    return null;
  }
}

/**
 * 🌟 新增：获取搜索结果列表 (用于弹窗展示)
 */
export async function searchMusicList(
  keyword,
  source = "netease",
  count = 15,
  maxRetries = 1,
) {
  console.log(`[Siren Voice API] 发起列表搜索: "${keyword}" (源: ${source})`);

  // 循环尝试，最多尝试 maxRetries + 1 次
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const data = await fetchGDAPI({
      types: "search",
      source: source,
      name: keyword,
      count: count,
    });

    // 解析返回层级
    let results = data;
    if (data && data.data) results = data.data;
    else if (data && data.result) results = data.result;

    const finalResults = Array.isArray(results) ? results : [];

    // 如果成功拿到数据，直接返回
    if (finalResults.length > 0) {
      if (attempt > 0)
        console.log(
          `[Siren Voice API] 第 ${attempt + 1} 次重试成功打捞到数据！`,
        );
      return finalResults;
    }

    // 如果拿到空数组，且还没超出重试次数限制，等待 500ms 后再试
    if (attempt < maxRetries) {
      console.warn(
        `[Siren Voice API] 接口返回空数据(可能触发限流或节点波动)，500ms 后自动重试...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 如果所有重试都失败了，才真正宣告失败
  console.log(`[Siren Voice API] 搜索彻底无果原始数据:`, []);
  return [];
}

/**
 * 智能点歌的单曲搜索 (复用列表搜索)
 */
export async function searchMusic(keyword, source = "netease") {
  const results = await searchMusicList(keyword, source, 5);
  return results.length > 0 ? results[0] : null;
}

export async function getTrackUrl(id, source = "netease") {
  const data = await fetchGDAPI({
    types: "url",
    source: source,
    id: id,
    br: 320,
  });
  console.log(`[Siren Voice API] 获取 URL 返回 (ID:${id}):`, data);
  return data && data.url ? data.url : null;
}

export async function getAlbumPic(pic_id, source = "netease") {
  if (!pic_id) return null;
  const data = await fetchGDAPI({
    types: "pic",
    source: source,
    id: pic_id,
    size: 300,
  });
  console.log(`[Siren Voice API] 获取封面返回 (pic_id:${pic_id}):`, data);
  return data && data.url ? data.url : null;
}

export async function getLyric(id, source = "netease") {
  return await fetchGDAPI({ types: "lyric", source: source, id: id });
}

function parseLRC(lrcText) {
  const lines = lrcText.split("\n");
  const result = [];
  const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  for (let line of lines) {
    const match = timeReg.exec(line);
    if (match) {
      const timeInSeconds =
        parseInt(match[1]) * 60 +
        parseInt(match[2]) +
        parseInt(match[3].length === 2 ? match[3] * 10 : match[3]) / 1000;
      const text = line.replace(timeReg, "").trim();
      if (text) result.push({ time: timeInSeconds, text: text });
    }
  }
  return result;
}

/**
 * 智能配乐入口：只给名字去盲搜
 */
export async function playTargetMusic(title, artist, source = "netease") {
  // 🌟 新增：防重复打断检测（针对智能配乐的盲搜）
  // 条件：存在音频实例 + 音频未自然结束 + 当前有登记的播放元数据
  if (currentAudio && !currentAudio.ended && currentPlayingTrack) {
    const isTitleMatch = currentPlayingTrack.title === title;
    // 如果没有提供 artist（模糊匹配），或者当前播放的歌手包含提供的 artist，都视为一致
    const isArtistMatch =
      !artist ||
      (currentPlayingTrack.artist &&
        currentPlayingTrack.artist.includes(artist));

    if (isTitleMatch && isArtistMatch) {
      console.log(
        `[Siren Voice] 🎵 智能配乐拦截: 检测到 [${title}] 正在播放，保持潜流...`,
      );
      return; // 直接 return，不打断当前播放，也不刷新 UI
    }
  }

  const keyword = artist ? `${title} ${artist}` : title;
  updatePlayerUI(title, artist || "搜索中...", null, true);
  updateLyricUI("正在打捞潜流...");

  let trackInfo = await searchMusic(keyword, source);
  if (!trackInfo && artist) trackInfo = await searchMusic(title, source);

  if (!trackInfo) {
    updatePlayerUI("未找到歌曲", "请尝试更换音乐源", null, false);
    updateLyricUI("搜索失败，沉入海底...");
    return;
  }

  // 搜到了，转交给精准播放核心
  await playExactMusic(trackInfo);
}

/**
 * 🌟 新增：精准播放核心 (传入带有 ID 的对象，拒绝重复盲搜)
 */
export async function playExactMusic(trackInfo) {
  // 🌟 新增：防重复打断检测（针对精确 ID）
  if (
    currentAudio &&
    !currentAudio.ended &&
    currentPlayingTrack &&
    currentPlayingTrack.id === trackInfo.id
  ) {
    console.log(
      `[Siren Voice] 🎵 精确播放拦截: 检测到目标 ID [${trackInfo.id}] 正在播放，跳过打断。`,
    );
    return;
  }

  console.log("[Siren Voice API] 锁定播放目标，准备拉取资源:", trackInfo);

  const artistName = Array.isArray(trackInfo.artist)
    ? trackInfo.artist.join("/")
    : trackInfo.artist;

  // 🌟 新增：向系统登记当前准备播放的歌曲元数据
  currentPlayingTrack = {
    id: trackInfo.id,
    title: trackInfo.name,
    artist: artistName,
  };

  updatePlayerUI(trackInfo.name, artistName, null, true);

  let directPicUrl =
    trackInfo.pic || trackInfo.cover || trackInfo.pic_url || trackInfo.picUrl;

  const [audioUrl, fetchedPicUrl, lyricData] = await Promise.all([
    getTrackUrl(trackInfo.id, trackInfo.source),
    directPicUrl
      ? Promise.resolve(null)
      : getAlbumPic(trackInfo.pic_id, trackInfo.source),
    getLyric(trackInfo.id, trackInfo.source),
  ]);

  const finalPicUrl = directPicUrl || fetchedPicUrl;

  if (!audioUrl) {
    updatePlayerUI("获取链接失败", "版权受限或VIP专属", null, false);
    updateLyricUI("音频链接获取失败");
    return;
  }

  // 🌟 全新的双轨歌词解析逻辑
  hasTranslation = !!(lyricData && lyricData.tlyric);

  if (lyricData && lyricData.lyric) {
    originalLyrics = parseLRC(lyricData.lyric);
    translatedLyrics = hasTranslation ? parseLRC(lyricData.tlyric) : [];

    // 根据是否有翻译以及当前的偏好模式，决定上膛哪一份歌词
    if (hasTranslation && currentLyricMode === "tlyric") {
      currentLyrics = translatedLyrics;
    } else {
      currentLyrics = originalLyrics;
    }

    // 更新按钮 UI (显示/隐藏，以及文字)
    updateLyricToggleUI(
      hasTranslation,
      hasTranslation ? currentLyricMode : "lyric",
    );
    updateLyricUI("歌词解析完毕，等待共鸣...");
  } else {
    originalLyrics = [];
    translatedLyrics = [];
    currentLyrics = [];
    hasTranslation = false;
    updateLyricToggleUI(false, "lyric");
    updateLyricUI("纯音乐 / 无歌词数据");
  }

  executePlay(audioUrl, trackInfo.name, artistName, finalPicUrl);
}

bindLyricToggleEvent(() => {
  if (!hasTranslation) return;

  // 切换模式
  currentLyricMode = currentLyricMode === "tlyric" ? "lyric" : "tlyric";

  // 切换当前渲染的歌词源
  currentLyrics =
    currentLyricMode === "tlyric" ? translatedLyrics : originalLyrics;

  // 更新按钮 UI
  updateLyricToggleUI(hasTranslation, currentLyricMode);

  // 强制清理当前显示，抓取新语言歌词
  updateLyricUI("歌词共鸣切换中...", "", "", 0);

  // 🌟 【新增】持久化保存到 SillyTavern 的 extensionSettings
  const mSettings = getSirenSettings().music;
  mSettings.lyric_mode = currentLyricMode;
  saveSirenSettings(true);
});

function executePlay(url, title, artist, picUrl) {
  if (currentAudio) {
    currentAudio.pause();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    currentAudio.src = "";
  }

  currentAudio = new Audio(url);
  currentAudio.volume = getRealVolume("music");

  // 👇 🌟 完美的“航迹推算”插值引擎变量
  let lastRealTime = 0;
  let lastSysTime = 0;
  let smoothTime = 0;
  let diagnosticCounter = 0;

  currentAudio.addEventListener("play", () => {
    setPlayButtonState(true);
    // 播放瞬间锚定时间戳
    lastRealTime = currentAudio.currentTime;
    lastSysTime = performance.now();
    smoothTime = lastRealTime;

    // 🌟 修复：强制打断前一个可能还在运行的幽灵循环
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(renderLoop);
  });

  currentAudio.addEventListener("pause", () => {
    setPlayButtonState(false);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });

  currentAudio.addEventListener("loadedmetadata", () => {
    updateProgressUI(0, currentAudio.duration);
  });

  currentAudio.addEventListener("ended", () => {
    setPlayButtonState(false);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (currentPlaylist.length > 0) playNext();
  });

  bindProgressDragEvent((newTime) => {
    if (currentAudio) {
      currentAudio.currentTime = newTime;
      // 拖拽时立即强行同步推算器，防止乱跳
      lastRealTime = newTime;
      smoothTime = newTime;
      lastSysTime = performance.now();
    }
  });

  const renderLoop = (sysTime) => {
    if (!currentAudio || currentAudio.paused) return;

    const realTime = currentAudio.currentTime;
    const deltaMs = sysTime - lastSysTime; // 获取帧间隔(毫秒)
    const deltaSec = deltaMs / 1000;

    // 🌟 1. 时间推算
    if (realTime !== lastRealTime) {
      smoothTime = realTime;
      lastRealTime = realTime;
      lastSysTime = sysTime;
    } else {
      smoothTime = realTime + (sysTime - lastSysTime) / 1000;
    }

    // 🌟 2. 帧率健康度检测 (正常的 60FPS，间隔应该是 16.6ms 左右)
    let fpsStatus = "✅ 丝滑 (60FPS)";
    if (deltaMs > 35) fpsStatus = `⚠️ 掉帧 (间隔:${deltaMs.toFixed(1)}ms)`;
    if (deltaMs > 100) fpsStatus = `❌ 严重卡死 (间隔:${deltaMs.toFixed(1)}ms)`;

    const currentTime = smoothTime;
    const duration = currentAudio.duration;

    updateProgressUI(currentTime, duration);

    let currentProgress = 0; // 用于日志记录的当前进度

    // 🌟 3. 歌词运算
    if (currentLyrics.length > 0) {
      let currentIndex = -1;
      for (let i = 0; i < currentLyrics.length; i++) {
        if (currentTime >= currentLyrics[i].time) currentIndex = i;
        else break;
      }

      if (currentIndex !== -1) {
        const currentLine = currentLyrics[currentIndex];
        const prevLine =
          currentIndex > 0 ? currentLyrics[currentIndex - 1].text : "";
        const nextLineObj =
          currentIndex < currentLyrics.length - 1
            ? currentLyrics[currentIndex + 1]
            : null;
        const nextLine = nextLineObj ? nextLineObj.text : "";

        if (nextLineObj) {
          const durationOfLine = nextLineObj.time - currentLine.time;
          const elapsed = currentTime - currentLine.time;
          if (durationOfLine > 0.1) {
            currentProgress = (elapsed / durationOfLine) * 100;
          } else {
            currentProgress = 100;
          }
        } else {
          currentProgress = 100;
        }

        currentProgress = Math.min(100, Math.max(0, currentProgress));
        updateLyricUI(currentLine.text, prevLine, nextLine, currentProgress);
      }
    }

    // 🌟 4. 数据打印雷达 (每 15 帧打印一次，约 250ms)
    diagnosticCounter++;
    if (diagnosticCounter >= 15) {
      // 获取真实写进 DOM 的 CSS 变量值
      const playerEl = document.querySelector(".siren-ext-lyric-current");
      const actualCssVar = playerEl
        ? playerEl.style.getPropertyValue("--lyric-progress")
        : "未找到";

      /* console.log(
        `[Siren 雷达] ${fpsStatus} | 原生Time: ${realTime.toFixed(3)}s | 补帧Time: ${currentTime.toFixed(3)}s | 计算进度: ${currentProgress.toFixed(2)}% | DOM变量: ${actualCssVar}`,
      ); */
      diagnosticCounter = 0;
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  };

  currentAudio.play().catch((e) => console.error("[Siren Voice] 播放失败:", e));
  updatePlayerUI(title, artist, picUrl, false);
}

export function togglePlayPause() {
  if (!currentAudio) return;
  if (currentAudio.paused) currentAudio.play();
  else currentAudio.pause();
}

/**
 * 注入当前歌单上下文，兼容深海歌单(有ID)与潜流回响(无ID)
 */
export function setPlaylistContext(playlist, targetMusicObj) {
  currentPlaylist = playlist;
  currentMusicIndex = playlist.findIndex((s) => {
    // 如果是从深海歌单来的，比对 ID
    if (s.id && targetMusicObj.id) return s.id === targetMusicObj.id;
    // 如果是从潜流回响来的，比对歌名和歌手
    return s.name === targetMusicObj.name && s.artist === targetMusicObj.artist;
  });
  // 防止找不到时变 -1 导致报错
  if (currentMusicIndex === -1) currentMusicIndex = 0;
}

/**
 * 播放下一首 (受控于播放模式)
 */
export async function playNext() {
  if (currentPlaylist.length === 0) return;
  const mode = getSirenSettings().music.play_mode || "sequential";

  if (mode === "random") {
    currentMusicIndex = Math.floor(Math.random() * currentPlaylist.length);
  } else if (mode === "single") {
    if (currentAudio) {
      currentAudio.currentTime = 0;
      currentAudio.play();
      return;
    }
  } else {
    currentMusicIndex = (currentMusicIndex + 1) % currentPlaylist.length;
  }

  // 🌊 核心修改：判断该歌曲是否有源数据 ID
  const nextMusic = currentPlaylist[currentMusicIndex];
  if (nextMusic.id && !String(nextMusic.id).startsWith("echo_")) {
    await playExactMusic(nextMusic); // 有 ID，精准拉取
  } else {
    const defaultSource = getSirenSettings().music.source || "netease";
    await playTargetMusic(
      nextMusic.name,
      nextMusic.artist,
      nextMusic.source || defaultSource,
    ); // 无 ID，重新盲搜
  }
}

/**
 * 播放上一首 (受控于播放模式)
 */
export async function playPrev() {
  if (currentPlaylist.length === 0) return;
  const mode = getSirenSettings().music.play_mode || "sequential";

  if (mode === "random") {
    currentMusicIndex = Math.floor(Math.random() * currentPlaylist.length);
  } else if (mode === "single") {
    if (currentAudio) {
      currentAudio.currentTime = 0;
      currentAudio.play();
      return;
    }
  } else {
    currentMusicIndex =
      (currentMusicIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
  }

  // 🌊 同理：判断是否有源数据 ID
  const prevMusic = currentPlaylist[currentMusicIndex];
  if (prevMusic.id && !String(prevMusic.id).startsWith("echo_")) {
    await playExactMusic(prevMusic);
  } else {
    const defaultSource = getSirenSettings().music.source || "netease";
    await playTargetMusic(
      prevMusic.name,
      prevMusic.artist,
      prevMusic.source || defaultSource,
    );
  }
}

/**
 * 暴露给逻辑层：设置播放器世界书警告状态（改变边框/阴影颜色）
 * @param {boolean} isWarning - 是否缺失世界书
 */
export function setPlayerWarningState(isWarning) {
  const player = document.getElementById("siren-music-player");
  const coverIcon = document.querySelector(
    ".siren-ext-player-cover i.fa-music",
  );

  if (!player) return;

  if (isWarning) {
    // 添加警告样式类
    player.classList.add("siren-wb-warning");
    // 也可以顺便把默认的音符图标变成橙色
    if (coverIcon && !coverIcon.parentElement.querySelector("img")) {
      coverIcon.style.color = "#f59e0b";
    }
  } else {
    // 移除警告样式类
    player.classList.remove("siren-wb-warning");
    // 恢复深海蓝
    if (coverIcon && !coverIcon.parentElement.querySelector("img")) {
      coverIcon.style.color = "#06b6d4";
    }
  }
}
