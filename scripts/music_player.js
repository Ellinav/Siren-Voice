import { togglePlayPause, playNext, playPrev } from "./music_logic.js";
import { getSirenSettings, saveSirenSettings } from "./settings.js";

// ==========================================
// 悬浮长药丸播放器 (UI与交互层)
// ==========================================
let stealthRule = null;

const uiCache = {
  curText: null,
  totText: null,
  prevLyric: null,
  currLyric: null,
  nextLyric: null,
  duration: 0,
};

export function initFloatingPlayer() {
  if (document.getElementById("siren-music-player")) return;

  // 🌟 新增：注入 CSSOM 隐形引擎，绕过 Bitwarden 的 DOM 监控
  if (!document.getElementById("siren-stealth-engine")) {
    const style = document.createElement("style");
    style.id = "siren-stealth-engine";
    document.head.appendChild(style);

    // 1. 核心变量池扩容：加入时间和歌词文本变量
    style.sheet.insertRule(
      `#siren-music-player { 
                --progress: 0%; 
                --lyric-progress: 0%;
                --time-cur: "00:00";
                --time-tot: "00:00";
                --lyric-prev: "";
                --lyric-cur: "准备潜入深海...";
                --lyric-next: "";
            }`,
      0,
    );
    stealthRule = style.sheet.cssRules[0];

    // 2. 将文本渲染权彻底移交给 CSS 引擎，剥夺 DOM 的权利
    const rules = [
      `.siren-ext-time-current::after { content: var(--time-cur); }`,
      `.siren-ext-time-total::after { content: var(--time-tot); }`,
      `.siren-ext-lyric-prev::after { content: var(--lyric-prev); }`,
      `.siren-ext-lyric-next::after { content: var(--lyric-next); }`,
      // 当前歌词特殊处理：继承你在 style.css 写的渐变色和裁切属性
      `.siren-ext-lyric-current::after { 
                content: var(--lyric-cur); 
                background-image: inherit;
                background-size: inherit;
                background-position: inherit;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
            }`,
    ];
    rules.forEach((rule, i) => style.sheet.insertRule(rule, i + 1));
  }

  // 🌟 1. 读取历史保存的坐标（如果没有则为 0）
  const settings = getSirenSettings();
  const savedPos = settings?.music?.player_pos || { x: 0, y: 0 };

  // 🌟 2. 在 style 里加入新的默认基准位置 (top: 55px) 和历史 transform 偏移量
  const playerHtml = `
        <div id="siren-music-player" class="siren-ext-player-pill" style="display: none; top: 55px; left: calc(100vw - 320px); transform: translate(${savedPos.x}px, ${savedPos.y}px);">
            <div class="siren-ext-player-basic">
                <div class="siren-ext-player-drag-handle" title="拖拽移动"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="siren-ext-player-cover">
                    <i class="fa-solid fa-music" style="color: #06b6d4;"></i>
                </div>
                <div class="siren-ext-player-info">
                    <div class="siren-ext-music-title">等待共鸣</div>
                    <div class="siren-ext-music-artist">塞壬之声</div>
                </div>
                <div class="siren-ext-player-controls">
                    <i class="fa-solid fa-arrow-right-arrow-left siren-ext-ctrl-btn" id="siren-btn-mode-pill" title="顺序播放" style="font-size: 0.9em; margin-right: 2px;"></i>
                    
                    <i class="fa-solid fa-backward-step siren-ext-ctrl-btn" id="siren-btn-prev" title="上一首"></i>
                    <i class="fa-solid fa-play siren-ext-ctrl-btn" id="siren-btn-play" title="播放/暂停"></i>
                    <i class="fa-solid fa-forward-step siren-ext-ctrl-btn" id="siren-btn-next" title="下一首"></i>
                    <i class="fa-solid fa-chevron-down siren-ext-ctrl-btn" id="siren-btn-expand" title="展开歌词"></i>
                </div>
            </div>
            <div class="siren-ext-player-expanded-panel">
                <div class="siren-ext-progress-container">
                    <span class="siren-ext-time-current"></span>
                    <div id="siren-ext-progress" class="siren-ext-progress-bar">
                        <div class="siren-ext-progress-thumb"></div>
                    </div>
                    <span class="siren-ext-time-total"></span>
                </div>

                <div class="siren-ext-lyrics-wrapper" style="position: relative; width: 100%;">
                    <div id="siren-btn-lyric-toggle" class="siren-ext-lyric-toggle" style="display: none;">原</div>
                    
                    <div class="siren-ext-player-lyrics">
                        <div class="siren-ext-lyric-line siren-ext-lyric-prev"></div>
                        <div class="siren-ext-lyric-line siren-ext-lyric-current"></div>
                        <div class="siren-ext-lyric-line siren-ext-lyric-next"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", playerHtml);
  bindPlayerEvents();
  updatePlayerCustomStyle();
}

function bindPlayerEvents() {
  const player = document.getElementById("siren-music-player");
  const dragHandle = player.querySelector(".siren-ext-player-drag-handle");
  const expandBtn = document.getElementById("siren-btn-expand");

  // ================= 展开/收起 =================
  expandBtn.addEventListener("click", () => {
    player.classList.toggle("expanded");
    if (player.classList.contains("expanded")) {
      expandBtn.classList.replace("fa-chevron-down", "fa-chevron-up");
    } else {
      expandBtn.classList.replace("fa-chevron-up", "fa-chevron-down");
    }
  });

  // ================= 拖拽核心 (兼容双端) =================
  const settings = getSirenSettings();
  const savedPos = settings?.music?.player_pos || { x: 0, y: 0 };

  let isDragging = false;
  let xOffset = savedPos.x;
  let yOffset = savedPos.y;
  let currentX = xOffset;
  let currentY = yOffset;
  let initialX;
  let initialY;
  let baseRect = null;

  // 【修复 1】增加对移动端 touch 事件的监听， passive: false 允许阻止屏幕滚动
  dragHandle.addEventListener("mousedown", dragStart);
  dragHandle.addEventListener("touchstart", dragStart, { passive: false });
  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: false });
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("touchend", dragEnd);

  // 统一获取坐标的辅助函数
  function getClientPos(e) {
    return {
      x: e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0,
      y: e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0,
    };
  }

  function dragStart(e) {
    const pos = getClientPos(e);
    initialX = pos.x - xOffset;
    initialY = pos.y - yOffset;

    // 移动端的 target 可能会指向子元素(比如 icon)
    if (e.target === dragHandle || dragHandle.contains(e.target)) {
      isDragging = true;
      const rect = player.getBoundingClientRect();
      baseRect = {
        left: rect.left - xOffset,
        top: rect.top - yOffset,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  function drag(e) {
    if (isDragging) {
      // 移动端拖拽时阻止默认行为，防止页面跟着滚动
      if (e.type === "touchmove") {
        e.preventDefault();
      }

      const pos = getClientPos(e);
      let nextX = pos.x - initialX;
      let nextY = pos.y - initialY;

      if (baseRect) {
        const minX = -baseRect.left;
        const maxX = window.innerWidth - baseRect.left - baseRect.width;
        const minY = -baseRect.top;
        const maxY = window.innerHeight - baseRect.top - baseRect.height;

        nextX = Math.max(minX, Math.min(nextX, maxX));
        nextY = Math.max(minY, Math.min(nextY, maxY));
      }

      currentX = nextX;
      currentY = nextY;
      xOffset = currentX;
      yOffset = currentY;
      player.style.transform = `translate(${currentX}px, ${currentY}px)`;
      player.style.transition = "none";
    }
  }

  function dragEnd(e) {
    if (!isDragging) return;
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    player.style.transition = "border-radius 0.3s ease, height 0.3s ease";

    const mSettings = getSirenSettings().music;
    mSettings.player_pos = { x: currentX, y: currentY };
    saveSirenSettings(true);
  }

  // ================= 按钮事件 =================
  document
    .getElementById("siren-btn-play")
    .addEventListener("click", () => togglePlayPause());
  const prevBtn = document.getElementById("siren-btn-prev");
  if (prevBtn) prevBtn.addEventListener("click", () => playPrev());
  const nextBtn = document.getElementById("siren-btn-next");
  if (nextBtn) nextBtn.addEventListener("click", () => playNext());

  const modeBtnPill = document.getElementById("siren-btn-mode-pill");
  if (modeBtnPill) {
    const modeMap = {
      sequential: {
        icon: "fa-arrow-right-arrow-left",
        title: "顺序播放",
        next: "random",
      },
      random: { icon: "fa-shuffle", title: "随机播放", next: "single" },
      single: { icon: "fa-repeat", title: "单曲循环", next: "sequential" },
    };

    const initialMode = getSirenSettings().music.play_mode || "sequential";
    modeBtnPill.className = `fa-solid ${modeMap[initialMode].icon} siren-ext-ctrl-btn`;
    modeBtnPill.title = modeMap[initialMode].title;

    modeBtnPill.addEventListener("click", function () {
      const currentMode = getSirenSettings().music.play_mode || "sequential";
      const nextMode = modeMap[currentMode].next;

      const mSettings = getSirenSettings().music;
      mSettings.play_mode = nextMode;
      saveSirenSettings(true);

      this.className = `fa-solid ${modeMap[nextMode].icon} siren-ext-ctrl-btn`;
      this.title = modeMap[nextMode].title;

      const panelIcon = document.getElementById("siren-music-play-mode-icon");
      if (panelIcon) {
        panelIcon.className = `fa-solid ${modeMap[nextMode].icon}`;
        panelIcon.title = modeMap[nextMode].title;
      }
    });
  }

  const toggleBtn = document.getElementById("siren-btn-lyric-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("[Siren UI] 歌词切换按钮被点击");
      if (onLyricToggleCallback) onLyricToggleCallback();
    });
  }

  // ================= 边界动态修正 =================
  // 【修复 2】将原本独立的边界修正提取为函数，并绑定到 resize 事件上
  function checkAndFixBoundaries() {
    const rect = player.getBoundingClientRect();
    let isOut = false;
    let nextX = xOffset;
    let nextY = yOffset;

    if (rect.left < 0) {
      nextX -= rect.left;
      isOut = true;
    }
    if (rect.right > window.innerWidth) {
      nextX -= rect.right - window.innerWidth;
      isOut = true;
    }
    if (rect.top < 0) {
      nextY -= rect.top;
      isOut = true;
    }
    if (rect.bottom > window.innerHeight) {
      nextY -= rect.bottom - window.innerHeight;
      isOut = true;
    }

    if (isOut) {
      xOffset = nextX;
      yOffset = nextY;
      currentX = nextX;
      currentY = nextY;
      player.style.transform = `translate(${nextX}px, ${nextY}px)`;
      // 超出边界被拉回来时给个平滑过渡，视觉效果更好
      player.style.transition =
        "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)";

      const mSettings = getSirenSettings().music;
      if (mSettings) {
        mSettings.player_pos = { x: nextX, y: nextY };
        saveSirenSettings(true);
      }
    }
  }

  // 初始化时延时检查一次
  setTimeout(checkAndFixBoundaries, 150);

  // 监听窗口大小变化（解决电脑切换手机模式、手机横竖屏切换时播放器消失的问题）
  window.addEventListener("resize", checkAndFixBoundaries);
}

/**
 * 暴露给逻辑层的方法：统一更新 UI
 */
export function updatePlayerUI(title, artist, picUrl, isLoading = false) {
  // 🌟 核心修复：先拿到真实的药丸容器！
  const player = document.getElementById("siren-music-player");
  if (!player) return;

  // 🌟 限定只在真药丸内部查找，完美避开设置面板里的预览假药丸
  const titleEl = player.querySelector(".siren-ext-music-title");
  const artistEl = player.querySelector(".siren-ext-music-artist");
  const coverEl = player.querySelector(".siren-ext-player-cover");

  if (titleEl) titleEl.textContent = title;
  if (artistEl) artistEl.textContent = artist;

  if (coverEl) {
    if (isLoading) {
      coverEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #06b6d4;"></i>`;
    } else if (picUrl) {
      // 优化图片加载，防止因网络慢导致破图
      coverEl.innerHTML = `<img src="${picUrl}" alt="cover" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid fa-music\\' style=\\'color: #06b6d4;\\'></i>';">`;
    } else {
      coverEl.innerHTML = `<i class="fa-solid fa-music" style="color: #06b6d4;"></i>`;
    }
  }
}

/**
 * 暴露给逻辑层的方法：更新歌词文本与进度
 */
export function updateLyricUI(current, prev = "", next = "", progress = 0) {
  const player = document.getElementById("siren-music-player");
  if (!player) return;

  // 🌟 处理文本里的双引号，防止破坏 CSS 的 content 语法
  const safeText = (t) => `"${(t || "").replace(/"/g, '\\"')}"`;

  if (uiCache.prevLyric !== prev) {
    uiCache.prevLyric = prev;
    if (stealthRule)
      stealthRule.style.setProperty("--lyric-prev", safeText(prev));
  }
  if (uiCache.nextLyric !== next) {
    uiCache.nextLyric = next;
    if (stealthRule)
      stealthRule.style.setProperty("--lyric-next", safeText(next));
  }

  if (uiCache.currLyric !== current) {
    uiCache.currLyric = current;
    if (stealthRule)
      stealthRule.style.setProperty("--lyric-cur", safeText(current));
  }

  if (stealthRule) {
    stealthRule.style.setProperty("--lyric-progress", `${progress}%`);
  }
}

/**
 * 暴露给逻辑层的方法：切换播放按钮状态
 */
export function setPlayButtonState(isPlaying) {
  const playBtn = document.getElementById("siren-btn-play");
  if (!playBtn) return;
  if (isPlaying) {
    playBtn.classList.replace("fa-play", "fa-pause");
    playBtn.style.color = "#ef4444";
  } else {
    playBtn.classList.replace("fa-pause", "fa-play");
    playBtn.style.color = "#10b981";
  }
}

/**
 * 暴露给逻辑层：更新进度条时间和滑块位置
 */
export function updateProgressUI(currentTime, duration) {
  const player = document.getElementById("siren-music-player");
  if (!player) return;

  const progressEl = document.getElementById("siren-ext-progress");
  const currentEl = player.querySelector(".siren-ext-time-current");
  const totalEl = player.querySelector(".siren-ext-time-total");

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const m = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const curText = formatTime(currentTime);
  const totText = formatTime(duration);

  // 🌟 核心修复 1：纯内存对比，绝不读取 DOM 的 textContent
  if (currentEl && uiCache.curText !== curText) {
    uiCache.curText = curText;
    if (stealthRule)
      stealthRule.style.setProperty("--time-cur", `"${curText}"`);
  }
  if (totalEl && uiCache.totText !== totText) {
    uiCache.totText = totText;
    if (stealthRule)
      stealthRule.style.setProperty("--time-tot", `"${totText}"`);
  }

  if (progressEl && !window.isDraggingProgress) {
    // 🌟 核心修复 2：彻底把 duration 存进内存，不再向 DOM 写入任何 dataset
    uiCache.duration = duration;
    const percent = duration ? (currentTime / duration) * 100 : 0;

    if (stealthRule) stealthRule.style.setProperty("--progress", `${percent}%`);
  }
}

/**
 * 暴露给逻辑层：绑定进度条拖拽事件
 */
export function bindProgressDragEvent(onSeekCallback) {
  const progressEl = document.getElementById("siren-ext-progress");
  if (!progressEl) return;

  // 计算点击/拖拽落在轨道的百分比
  const calculateTime = (e) => {
    const rect = progressEl.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));

    const percent = x / rect.width;
    // 🌟 核心修复：从内存缓存读取总时长，不碰 DOM
    const duration = uiCache.duration || 0;
    return percent * duration;
  };

  const handlePointerDown = (e) => {
    window.isDraggingProgress = true;
    updateUI(e); // 点下的瞬间也跳转视觉
    document.addEventListener("mousemove", handlePointerMove);
    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchmove", handlePointerMove, {
      passive: false,
    });
    document.addEventListener("touchend", handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!window.isDraggingProgress) return;
    e.preventDefault(); // 防止拖拽时选中文字
    updateUI(e);
  };

  const handlePointerUp = (e) => {
    if (!window.isDraggingProgress) return;
    window.isDraggingProgress = false;

    document.removeEventListener("mousemove", handlePointerMove);
    document.removeEventListener("mouseup", handlePointerUp);
    document.removeEventListener("touchmove", handlePointerMove);
    document.removeEventListener("touchend", handlePointerUp);

    const newTime = calculateTime(e);
    if (onSeekCallback) onSeekCallback(newTime); // 触发跳转
  };

  const updateUI = (e) => {
    const newTime = calculateTime(e);

    // 🌟 核心修复 1：从我们建立的纯内存缓存里读取总时长，不再去 DOM 上找
    const duration = uiCache.duration || 100;
    const percent = duration ? (newTime / duration) * 100 : 0;

    // 🌟 核心修复 2：将拖拽的实时进度写入 CSS 隐形内存，驱动滑块移动
    if (stealthRule) {
      stealthRule.style.setProperty("--progress", `${percent}%`);
    }

    // 🌟 核心修复 3：拖拽时的实时时间文本，也必须走 CSSOM 投影，防止拖拽时卡顿
    const m = Math.floor(newTime / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(newTime % 60)
      .toString()
      .padStart(2, "0");
    const curText = `${m}:${s}`;

    if (uiCache.curText !== curText) {
      uiCache.curText = curText;
      if (stealthRule)
        stealthRule.style.setProperty("--time-cur", `"${curText}"`);
    }
  };

  progressEl.addEventListener("mousedown", handlePointerDown);
  progressEl.addEventListener("touchstart", handlePointerDown, {
    passive: false,
  });
}

let onLyricToggleCallback = null;
/**
 * 暴露给逻辑层：绑定歌词切换按钮事件
 */
export function bindLyricToggleEvent(callback) {
  onLyricToggleCallback = callback;
}

/**
 * 暴露给逻辑层：更新切换按钮的显示状态和文字
 */
export function updateLyricToggleUI(hasTranslation, currentMode) {
  const toggleBtn = document.getElementById("siren-btn-lyric-toggle");
  if (!toggleBtn) return;

  if (!hasTranslation) {
    toggleBtn.style.display = "none";
  } else {
    toggleBtn.style.display = "block";
    // 如果当前是 tlyric 显示"译"，如果是 lyric 显示"原"
    toggleBtn.textContent = currentMode === "tlyric" ? "译" : "原";
    toggleBtn.title = currentMode === "tlyric" ? "切换至原文" : "切换至译文";
  }
}

/**
 * 暴露给逻辑层：设置播放器世界书警告状态
 */
export function setPlayerWarningState(isWarning) {
  const player = document.getElementById("siren-music-player");
  if (!player) return;

  // 🌟 同样限定在真药丸内部查找封面图标
  const coverIcon = player.querySelector(".siren-ext-player-cover i.fa-music");

  if (isWarning) {
    player.classList.add("siren-wb-warning");
    if (coverIcon && !coverIcon.parentElement.querySelector("img")) {
      coverIcon.style.color = "#f59e0b";
    }
  } else {
    player.classList.remove("siren-wb-warning");
    if (coverIcon && !coverIcon.parentElement.querySelector("img")) {
      coverIcon.style.color = "#06b6d4";
    }
  }
}

/**
 * 暴露给外部：动态更新播放器的自定义涂装 (CSS)
 * @param {Object} forceStyles - 强制传入的最新样式对象（可选）
 */
export function updatePlayerCustomStyle(forceStyles = null) {
  const styles = forceStyles || getSirenSettings().music.styles || {};
  let styleTag = document.getElementById("siren-custom-player-style");

  let cssText = "";
  if (styles.playerDict && styles.playerCurrent) {
    const currentStyle = styles.playerDict[styles.playerCurrent];

    // 🌟 关键修复：移除 !currentStyle.isReadonly 限制！
    // isReadonly 是为了防止用户在 UI 上编辑内置代码，但渲染时必须全部放行
    if (currentStyle && currentStyle.code) {
      cssText = currentStyle.code;
    }
  }

  if (cssText) {
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "siren-custom-player-style";
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = cssText;
  } else {
    if (styleTag) styleTag.remove();
  }
}
