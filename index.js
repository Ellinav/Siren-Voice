import { initMusicSettings } from "./scripts/music.js";
import { initFloatingPlayer } from "./scripts/music_player.js";
import { initEvents } from "./scripts/events.js";
import { initTtsSettings, applyTtsBeautifyCss } from "./scripts/tts.js";
import { initAmbienceSettings } from "./scripts/ambience.js";
import { initMixerSettings } from "./scripts/mixer.js";
import { initInterceptor } from "./scripts/interceptor.js";

(function () {
  // 1. 定义基础外壳 - 优化了标题和 ID，保持一致性
  const shellHtml = `
      <div id="siren-ext-overlay" class="siren-ext-hidden">
          <div class="siren-ext-header-bar">
              <div class="siren-ext-brand" style="display: flex; align-items: center;">
                  <div id="siren-ext-toggle-sidebar" style="cursor: pointer;"><i class="fa-solid fa-bars"></i></div>
                  
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: linear-gradient(135deg, rgba(50, 206, 234, 0.66), rgba(181, 117, 241, 0.77)); border-radius: 50%; margin-left: 12px; margin-right: 8px; border: 1px solid rgba(168, 85, 247, 0.5); box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);">
                      <span style="font-size: 1.5rem; line-height: 1; filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6));">🧜‍♀️</span>
                  </span>
                  <span style="font-weight: bold; letter-spacing: 1px; color: #f3f4f6;">Siren Voice</span>

                  <span id="siren-wb-warning-badge" style="display: none; margin-left: 12px; font-size: 0.75rem; color: #f59e0b; background: rgba(245, 158, 11, 0.15); padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.5); font-weight: normal; white-space: nowrap;">
                      <i class="fa-solid fa-triangle-exclamation"></i> 未绑定 Siren-Voice 全局世界书
                  </span>
              </div>
              <div id="siren-ext-close-btn" title="关闭"><i class="fa-solid fa-xmark interactable"></i></div>
          </div>
          
          <div class="siren-ext-main-layout">
              <div class="siren-ext-sidebar collapsed" id="siren-ext-sidebar">
              
                  <div class="siren-ext-nav-item active" data-tab="tab-tts">
                      <i class="fa-solid fa-microphone-lines fa-fw" style="color: #a855f7;"></i> <span>TTS 设置</span>
                  </div>
                  <div class="siren-ext-nav-item" data-tab="tab-ambience">
                      <i class="fa-solid fa-wand-magic-sparkles fa-fw" style="color: #3b82f6;"></i> <span>幻境氛围</span>
                  </div>
                  <div class="siren-ext-nav-item" data-tab="tab-music">
                      <i class="fa-solid fa-compact-disc fa-fw" style="color: #06b6d4;"></i> <span>潮汐音乐台</span>
                  </div>
                  <div class="siren-ext-nav-item" data-tab="tab-audio-settings">
                      <i class="fa-solid fa-sliders fa-fw" style="color: #f59e0b;"></i> <span>混音与配置</span>
                  </div>
              </div>
              
              <div class="siren-ext-content-area">
                  <div id="tab-tts" class="siren-ext-tab-content active"></div>
                  <div id="tab-music" class="siren-ext-tab-content"></div>
                  <div id="tab-audio-settings" class="siren-ext-tab-content"></div>
                  <div id="tab-ambience" class="siren-ext-tab-content"></div>
              </div>
          </div>
      </div>
      `;

  // 2. 注入 HTML 并初始化各模块 (ID 进行了替换 siren-)
  function initPlugin() {
    if (document.getElementById("siren-ext-overlay")) return;
    document.body.insertAdjacentHTML("beforeend", shellHtml);

    bindGlobalEvents();
    checkMobileState();

    initFloatingPlayer();
    initMusicSettings();

    // 初始化 TTS 界面和全局绑定事件
    initTtsSettings();

    // 👇 新增这一行：初始化时立马把深海霓虹 CSS 注入到页面里
    applyTtsBeautifyCss();
    initAmbienceSettings();
    initMixerSettings();

    // 【新增】初始化时绑定 ST 监听事件
    bindSTEvents();

    // 【新增】保底检查：防止插件挂载时 APP_READY 已经发射过了
    checkWorldbookStatus();
    initInterceptor();

    console.log("[Siren Voice] Plugin UI initialized successfully.");
  }

  // 3. 全局事件绑定 (ID 进行了替换 siren-)
  // 3. 全局事件绑定 (ID 进行了替换 siren-)
  function bindGlobalEvents() {
    // 🌟 修复: 使用事件代理 (Event Delegation) 结合解绑机制，防止焦点丢失或重复绑定

    // 关闭面板
    $(document)
      .off("click", "#siren-ext-close-btn")
      .on("click", "#siren-ext-close-btn", function (e) {
        e.stopPropagation(); // 阻止事件冒泡到 ST 底层
        e.preventDefault();
        $("#siren-ext-overlay").addClass("siren-ext-hidden");
      });

    // 折叠侧边栏
    $(document)
      .off("click", "#siren-ext-toggle-sidebar")
      .on("click", "#siren-ext-toggle-sidebar", function (e) {
        e.stopPropagation();
        $("#siren-ext-sidebar").toggleClass("collapsed");
      });

    // Tab 切换逻辑
    $(document)
      .off("click", ".siren-ext-nav-item")
      .on("click", ".siren-ext-nav-item", function () {
        $(".siren-ext-nav-item").removeClass("active");
        $(".siren-ext-tab-content").removeClass("active");

        $(this).addClass("active");
        const tabId = $(this).data("tab");
        $(`#${tabId}`).addClass("active");

        // 移动端点击后自动收起侧边栏
        if (window.innerWidth <= 768) {
          $("#siren-ext-sidebar").addClass("collapsed");
        }
      });
  }

  /**
   * 检查全局世界书 Siren-Voice 及 Siren-Musics 条目是否存在
   */
  function checkWorldbookStatus() {
    if (!window.TavernHelper) return;

    let isMissing = true;
    try {
      const globalWbs = window.TavernHelper.getGlobalWorldbookNames();
      // 只要全局世界书列表中有任何一个名字包含 "Siren-Voice"，就认为已绑定
      if (globalWbs.some((name) => name.includes("Siren-Voice"))) {
        isMissing = false;
      }
    } catch (error) {
      console.warn("[Siren Voice] 读取全局世界书状态失败:", error);
    }

    const badge = document.getElementById("siren-wb-warning-badge");
    if (badge) {
      badge.style.display = isMissing ? "inline-block" : "none";
    }

    // 删掉下面这一行，播放器的样式就不会再被影响了
    // setPlayerWarningState(isMissing);
  }

  /**
   * 绑定 SillyTavern 核心事件
   */
  function bindSTEvents() {
    try {
      const { eventSource, event_types } = SillyTavern.getContext();

      if (event_types.APP_READY) {
        eventSource.on(event_types.APP_READY, () => {
          console.log("[Siren Voice] ST 准备就绪，检查世界书...");
          checkWorldbookStatus();
        });
      }

      // 1. 监听世界书变动
      const worldInfoEvent =
        event_types.WORLDINFO_SETTINGS_UPDATED || "worldinfo_settings_updated";
      eventSource.on(worldInfoEvent, () => {
        console.log(
          "[Siren Voice] 检测到 worldinfo 变动，延迟 300ms 后检查...",
        );
        // 【核心修复】：延迟执行，等待 ST 内部数据更新完毕
        setTimeout(() => {
          checkWorldbookStatus();
        }, 300);
      });

      // 2. 监听全局设置变动 (双保险)
      const settingsEvent = event_types.SETTINGS_UPDATED || "settings_updated";
      eventSource.on(settingsEvent, () => {
        console.log("[Siren Voice] 检测到 settings 变动，延迟 300ms 后检查...");
        setTimeout(() => {
          checkWorldbookStatus();
        }, 300);
      });
      initEvents();
    } catch (error) {
      console.warn("[Siren Voice] 绑定 ST 事件源失败:", error);
    }
  }

  // 4. 手机端状态检查
  function checkMobileState() {
    if (window.innerWidth <= 768) {
      $("#siren-ext-sidebar").addClass("collapsed");
    }
  }

  // 5. 添加入口按钮 - 图标改为高音谱号 (fa-clef)，颜色改为青绿色
  function addExtensionButton() {
    const menuId = "extensionsMenu";
    const menu = document.getElementById(menuId);

    if (!menu) {
      setTimeout(addExtensionButton, 500);
      return;
    }
    if (document.getElementById("siren-ext-wand-btn")) return;

    const container = document.createElement("div");
    container.className = "extension_container interactable";
    container.innerHTML = `
              <div id="siren-ext-wand-btn" class="list-group-item flex-container flexGap5 interactable" title="Siren Voice 音乐与语音系统">
                  <div class="fa-fw fa-solid fa-music extensionsMenuExtensionButton" style="color: #06b6d4;"></div>
                  <span>Siren Voice</span>
              </div>
          `;

    // 🌟 修复: 加入 e 参数和阻止冒泡
    container.addEventListener("click", (e) => {
      // 1. 移除 e.stopPropagation()，让事件正常冒泡，ST 会自动收起菜单

      // 2. 显式隐藏（可选保底）：如果你发现光靠冒泡还不够，可以直接用 ST 的逻辑隐藏菜单
      const extensionsMenu = document.getElementById("extensionsMenu");
      if (extensionsMenu) {
        extensionsMenu.style.display = "none"; // 或者使用 ST 的 UI 切换逻辑
      }

      $("#siren-ext-overlay").removeClass("siren-ext-hidden");
      // 每次打开面板时，重新检测世界书状态
      checkWorldbookStatus();
    });

    menu.appendChild(container);
  }

  /**
   * 轮询检测 TavernHelper 是否就绪
   */
  function waitForTavernHelper(retryCount = 0) {
    const MAX_RETRIES = 30;
    if (typeof window.TavernHelper !== "undefined") {
      console.log("[Siren Voice] TavernHelper 检测通过，启动插件。");
      initPlugin();
      addExtensionButton();
    } else {
      if (retryCount >= MAX_RETRIES) {
        console.error("[Siren Voice] 启动失败：等待 酒馆助手 超时。");
        return;
      }
      setTimeout(() => waitForTavernHelper(retryCount + 1), 500);
    }
  }

  // 启动入口
  $(document).ready(function () {
    waitForTavernHelper();
  });
})();
