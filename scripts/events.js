import { playTargetSong, setPlaylistContext } from "./music_logic.js";
import {
    compileSirenCss,
    stripParentheticalAsides,
    checkReplyIntegrity,
} from "./utils.js";
import { getSirenSettings, saveSirenSettings } from "./settings.js";
import { getEchoHistory } from "./music.js";
import {
    stopCurrentTTS,
    enqueueTTSBlob,
    dispatchTtsGeneration,
} from "./tts_logic.js";
import { findExactTtsRecord } from "./db.js";
import {
    injectScenePlayButtons,
    scanAndRefreshAllScenes,
    triggerSceneAutoPlay,
} from "./bgm_logic.js";

const INLINE_CARD_SELECTOR =
    '.siren-music-card, .siren-ext-play-inline-btn, [data-siren-song-card="1"]';

function findInlineCardFromEvent(e) {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];

    for (const node of path) {
        if (node instanceof Element && node.matches?.(INLINE_CARD_SELECTOR)) {
            return node;
        }
    }

    return e.target instanceof Element
        ? e.target.closest(INLINE_CARD_SELECTOR)
        : null;
}

function getMessageIdFromElement(element) {
    if (!element) return null;

    const mes = element.closest(
        ".mes, [mesid], [data-mesid], [data-message-id]",
    );
    if (!mes) return null;

    const rawId =
        mes.getAttribute("mesid") ||
        mes.getAttribute("data-mesid") ||
        mes.dataset?.mesid ||
        mes.getAttribute("data-message-id") ||
        mes.dataset?.messageId ||
        null;

    if (rawId === null || rawId === undefined || rawId === "") return null;

    const num = Number(rawId);
    return Number.isNaN(num) ? null : num;
}

function extractSongInfoFromCard(target) {
    const floor = getMessageIdFromElement(target);

    // ① 优先从楼层变量拿，最稳
    if (floor !== null && window.TavernHelper) {
        try {
            const vars = window.TavernHelper.getVariables({
                type: "message",
                message_id: floor,
            });

            const bgm = vars?.["siren-voice"]?.bgm;
            if (bgm?.song) {
                return {
                    title: bgm.song,
                    artist: bgm.artist || "",
                    floor,
                    from: "message_vars",
                };
            }
        } catch (err) {
            console.warn("[Siren Voice] 读取楼层变量失败，回退 DOM 提取:", err);
        }
    }

    // ② 再从 data-* 拿
    let title =
        target.getAttribute("data-siren-song-title") ||
        target.getAttribute("data-title") ||
        "";

    let artist =
        target.getAttribute("data-siren-song-artist") ||
        target.getAttribute("data-artist") ||
        "";

    // ③ 最后才从 DOM 文本拿
    if (!title) {
        const titleEl =
            target.querySelector(".siren-title") ||
            target.querySelector(".siren-inline-title") ||
            target.querySelector("span:nth-child(2)");

        title = titleEl ? titleEl.textContent.trim() : "";
    }

    if (!artist) {
        const artistEl =
            target.querySelector(".siren-artist") ||
            target.querySelector(".siren-inline-artist") ||
            target.querySelector("span:nth-child(3)");

        artist = artistEl ? artistEl.textContent.trim() : "";
        artist = artist.replace(/^-/, "").trim();
    }

    return {
        title,
        artist,
        floor,
        from: "dom",
    };
}

function injectInlineCardDataset(html) {
    if (!html) return "";

    // 给模板的第一个根标签强制注入稳定标记
    return html.replace(/<([a-zA-Z][\w:-]*)([^>]*)>/, (all, tag, attrs) => {
        const hasCard = /\bdata-siren-song-card\s*=/.test(attrs);
        const hasTitle = /\bdata-siren-song-title\s*=/.test(attrs);
        const hasArtist = /\bdata-siren-song-artist\s*=/.test(attrs);

        const extra = [
            hasCard ? "" : ` data-siren-song-card="1"`,
            hasTitle ? "" : ` data-siren-song-title="$1"`,
            hasArtist ? "" : ` data-siren-song-artist="$2"`,
        ].join("");

        return `<${tag}${attrs}${extra}>`;
    });
}

window["playSirenSongInline"] = async function (element, title, artist) {
    console.log(`[Siren Voice] 🧬 内联直连触发播放: ${title} - ${artist}`);
    const floor = getMessageIdFromElement(element);
    await handleInlineSongPlay(element, title, artist, floor);
};

let sirenCardObserver = null;

/**
 * 统一播放入口
 */
async function handleInlineSongPlay(element, title, artist = "", floor = null) {
    try {
        console.log(
            `[Siren Voice] 🎯 准备播放内联歌曲: ${title} - ${artist} @floor=${floor}`,
        );
        if (!title || title.includes("{{title}}") || title.includes("$1")) {
            console.warn("[Siren Voice] ⚠️ 标题非法，终止播放。", {
                title,
                artist,
                floor,
            });
            if (window.toastr)
                window.toastr.warning("未能提取到正确的歌曲名。");
            return;
        }
        if (element) {
            const icon =
                element.querySelector(".fa-play") ||
                element.querySelector(".siren-play-icon");
            if (icon) {
                icon.classList.remove("fa-play");
                icon.classList.add("fa-spinner", "fa-spin");
                setTimeout(() => {
                    icon.classList.remove("fa-spinner", "fa-spin");
                    icon.classList.add("fa-play");
                }, 1000);
            }
        }
        const settings = getSirenSettings();
        const source = settings?.music?.source || "netease";
        if (settings?.music?.mode !== "smart") {
            settings.music.mode = "smart";
            saveSirenSettings(true);
            const modeSelect = document.getElementById("siren-music-mode");
            if (modeSelect) modeSelect.value = "smart";
        }
        const history = getEchoHistory();
        console.log("[Siren Voice] 🌊 当前 Echo History:", history);
        const currentSong =
            floor !== null
                ? history.find(
                      (item) => Number(item.floor) === Number(floor),
                  ) || { name: title, artist }
                : { name: title, artist };
        setPlaylistContext(history, currentSong);
        if (window.toastr) window.toastr.info(`声纳重新锁定: ${title}...`);
        console.log(
            `[Siren Voice] 🚀 发起播放请求: ${title} - ${artist} via ${source}`,
        );
        await playTargetSong(title, artist, source);
    } catch (error) {
        console.error("[Siren Voice] ❌ handleInlineSongPlay 崩溃:", error);
    }
}

/**
 * 绑定语音条 DOM 事件 (基于隐藏节点数据源)，并动态清洗 UI 显示文本
 */
function bindInlineSpeakCards(root = document) {
    const cards = root.querySelectorAll('[data-siren-speak="1"]');
    if (!cards.length) return;

    cards.forEach((card) => {
        // 👇 🌟 核心破局点：双向兼容 ST 的 custom- 净化器前缀！
        const textSpan = card.querySelector(
            ".siren-speak-text, .custom-siren-speak-text",
        );
        const rawSpan = card.querySelector(
            ".siren-raw-text, .custom-siren-raw-text",
        );

        if (textSpan && rawSpan) {
            // 1. 从绝对安全的隐藏节点读取原汁原味的文本
            const rawText = rawSpan.textContent || "";

            // 2. 使用统一函数清洗 UI 文本（去宏变量 + 去小括号）
            let cleanDisplay = rawText.replace(/\{\{[\s\S]*?\}\}/g, "").trim();
            cleanDisplay = stripParentheticalAsides(cleanDisplay);

            // 3. 动态更新前端 UI！
            if (textSpan.textContent !== cleanDisplay) {
                textSpan.textContent = cleanDisplay;
            }
        }

        if (card.dataset.sirenBound === "1") return;
        card.dataset.sirenBound = "1";
    });
}

/**
 * 直接给卡片本体绑定事件
 * 这是最稳的一层，避免 ST 某些结构导致 document 捕获失效
 */
function bindInlineSongCards(root = document) {
    const cards = root.querySelectorAll(INLINE_CARD_SELECTOR);
    if (!cards.length) return;

    cards.forEach((card) => {
        if (card.dataset.sirenBound === "1") return;
        card.dataset.sirenBound = "1";

        // 给无障碍和可点击语义
        if (!card.getAttribute("role")) card.setAttribute("role", "button");
        if (!card.getAttribute("tabindex")) card.setAttribute("tabindex", "0");

        card.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log("[Siren Voice] 🫧 卡片直绑点击命中:", card);

            const songInfo = extractSongInfoFromCard(card);
            console.log("[Siren Voice] 🎵 直绑提取结果:", songInfo);
            await handleInlineSongPlay(
                card,
                songInfo.title,
                songInfo.artist,
                songInfo.floor,
            );
        });

        card.addEventListener("keydown", async (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;

            e.preventDefault();
            e.stopPropagation();

            console.log("[Siren Voice] ⌨️ 键盘触发卡片播放:", card);

            const songInfo = extractSongInfoFromCard(card);
            await handleInlineSongPlay(
                card,
                songInfo.title,
                songInfo.artist,
                songInfo.floor,
            );
        });
    });
}

/**
 * 监听后续消息重绘、切楼、swipe 产生的新卡片
 */
function initCardObserver() {
    if (sirenCardObserver) return;

    sirenCardObserver = new MutationObserver((mutations) => {
        const settings = getSirenSettings();
        const bStyle = settings?.bgm?.card_style;
        const sStyle = settings?.bgm?.sfx_card_style;
        const currentBgmIcon =
            bStyle?.dict?.[bStyle.current]?.icon || "fa-solid fa-music";
        const currentSfxIcon =
            sStyle?.dict?.[sStyle.current]?.icon || "fa-solid fa-bolt";

        for (const mutation of mutations) {
            if (!mutation.addedNodes || mutation.addedNodes.length === 0)
                continue;

            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;

                if (node.matches?.('[data-siren-bgm="1"]')) {
                    const icon = node.querySelector("i");
                    if (icon) icon.className = currentBgmIcon;
                } else if (node.matches?.('[data-siren-sfx="1"]')) {
                    const icon = node.querySelector("i");
                    if (icon) icon.className = currentSfxIcon;
                } else {
                    // 如果是包裹层，往里找
                    const newBgmIcons = node.querySelectorAll?.(
                        '[data-siren-bgm="1"] i',
                    );
                    if (newBgmIcons)
                        newBgmIcons.forEach(
                            (i) => (i.className = currentBgmIcon),
                        );

                    const newSfxIcons = node.querySelectorAll?.(
                        '[data-siren-sfx="1"] i',
                    );
                    if (newSfxIcons)
                        newSfxIcons.forEach(
                            (i) => (i.className = currentSfxIcon),
                        );
                }

                // 🎵 原有的歌曲卡片监听
                if (node.matches?.(INLINE_CARD_SELECTOR)) {
                    bindInlineSongCards(node.parentNode || document);
                } else {
                    const hasCard = node.querySelector?.(INLINE_CARD_SELECTOR);
                    if (hasCard) bindInlineSongCards(node);
                }

                // 🎙️ 新增：语音条卡片监听
                if (node.matches?.('[data-siren-speak="1"]')) {
                    // 🌟 修改这里
                    bindInlineSpeakCards(node.parentNode || document);
                } else {
                    const hasSpeakCard = node.querySelector?.(
                        '[data-siren-speak="1"]',
                    ); // 🌟 修改这里
                    if (hasSpeakCard) bindInlineSpeakCards(node);
                }
            });
        }
    });

    sirenCardObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log("[Siren Voice] 👁️ 卡片观察者已启动");
}

// 1. 🌟 修改 applyKaraokeCss，变更为读取全局配置的动态注入
export function applyBgmAndKaraokeCss() {
    const settings = getSirenSettings();

    // 获取 卡拉OK CSS
    const kStyle = settings?.bgm?.karaoke_style;
    const kCss = kStyle?.dict?.[kStyle.current]?.code || "";
    let kStyleTag = document.getElementById("siren-karaoke-style");
    if (!kStyleTag) {
        kStyleTag = document.createElement("style");
        kStyleTag.id = "siren-karaoke-style";
        document.head.appendChild(kStyleTag);
    }
    // 👈 核心修复：注入前编译！
    kStyleTag.textContent = compileSirenCss(kCss);

    // 获取 BGM 卡片 CSS
    const bStyle = settings?.bgm?.card_style;
    const bCss = bStyle?.dict?.[bStyle.current]?.code || "";
    let bStyleTag = document.getElementById("siren-bgm-card-style");
    if (!bStyleTag) {
        bStyleTag = document.createElement("style");
        bStyleTag.id = "siren-bgm-card-style";
        document.head.appendChild(bStyleTag);
    }
    // 👈 核心修复：注入前编译！
    bStyleTag.textContent = compileSirenCss(bCss);

    // 👇 🌟 新增：获取 SFX 卡片 CSS
    const sStyle = settings?.bgm?.sfx_card_style;
    const sCss = sStyle?.dict?.[sStyle.current]?.code || "";
    let sStyleTag = document.getElementById("siren-sfx-card-style");
    if (!sStyleTag) {
        sStyleTag = document.createElement("style");
        sStyleTag.id = "siren-sfx-card-style";
        document.head.appendChild(sStyleTag);
    }
    sStyleTag.textContent = compileSirenCss(sCss);
}

// 2. 🌟 新增 BGM 卡片的正则生成器
function buildBgmRegexes(bgmIcon = "fa-solid fa-music") {
    return [
        {
            id: "siren-voice-scene-bgm",
            script_name: "Siren-Voice-Auto-Scene-BGM",
            enabled: true,
            run_on_edit: true,
            scope: "global",
            find_regex: "/<bgm>\\s*([\\s\\S]*?)\\s*<\\/bgm>/gi",
            replace_string:
                `<span class="siren-bgm-card" data-siren-bgm="1" data-bgm-name="$1" tabindex="0">
    <span class="siren-btn-wrap" data-siren-action="play_bgm" title="播放背景音">
        <i class="${bgmIcon}"></i>
    </span>
    <span class="siren-bgm-text">$1</span>
</span>`.replace(/\n\s+/g, " "),
            source: {
                user_input: true,
                ai_output: true,
                slash_command: true,
                world_info: false,
            },
            destination: { display: true, prompt: false },
            min_depth: null,
            max_depth: null,
        },
    ];
}

// 👈 修改点 5 (events.js)：升级效果音卡片正则
function buildSfxRegexes(sfxIcon = "fa-solid fa-bolt") {
    return [
        {
            id: "siren-voice-scene-sfx",
            script_name: "Siren-Voice-Auto-Scene-SFX",
            enabled: true,
            run_on_edit: true,
            scope: "global",
            // 🌟 升级正则：兼容提取 dir 属性
            find_regex:
                "/<sfx(?:\\s+dir=[\"']?([^\"'>\\s]+)[\"']?)?>\\s*([\\s\\S]*?)\\s*<\\/sfx>/gi",
            replace_string:
                `<span class="siren-sfx-card" data-siren-sfx="1" data-sfx-name="$2" data-dir="$1" tabindex="0">
    <span class="siren-btn-wrap" data-siren-action="play_sfx" title="播放效果音">
        <i class="${sfxIcon}"></i>
    </span>
    <span class="siren-sfx-text">$2</span>
</span>`.replace(/\n\s+/g, " "),
            source: {
                user_input: true,
                ai_output: true,
                slash_command: true,
                world_info: false,
            },
            destination: { display: true, prompt: false },
            min_depth: null,
            max_depth: null,
        },
    ];
}

export function initEvents() {
    const context = SillyTavern.getContext();
    const eventSource = context.eventSource;
    const event_types = context.event_types;

    const messageEvent = event_types.MESSAGE_RECEIVED || "message_received";
    eventSource.on(messageEvent, async () => await handleNewMessage());

    const messageEditedEvent = event_types.MESSAGE_EDITED || "message_edited";
    const messageUpdatedEvent =
        event_types.MESSAGE_UPDATED || "message_updated";

    const handleEdit = async (msgId) => {
        if (msgId !== undefined && msgId !== null) {
            const { handleMessageEditRevert } = await import("./bgm_logic.js");
            handleMessageEditRevert(msgId);

            // 顺便重新绑定一下可能会被 ST 重绘清理掉的内联卡片事件
            setTimeout(() => {
                bindInlineSongCards(document);
                bindInlineSpeakCards(document);
            }, 200);
        }
    };

    eventSource.on(messageEditedEvent, handleEdit);
    eventSource.on(messageUpdatedEvent, handleEdit);

    const swipeEvent = event_types.MESSAGE_SWIPED || "message_swiped";
    eventSource.on(swipeEvent, async (...args) => {
        // 尝试获取原生 Swipe 事件带来的消息 ID
        let msgId = typeof args[0] === "number" ? args[0] : null;
        if (!msgId && window.TavernHelper) {
            const msgs = window.TavernHelper.getChatMessages(-1);
            if (msgs && msgs.length > 0) msgId = msgs[0].message_id;
        }

        // 侧滑时清空该楼层的 BGM 随机缓存
        if (msgId) {
            const { clearBgmCacheForFloor } = await import("./bgm_logic.js");
            clearBgmCacheForFloor(msgId);
        }
        await handleNewMessage();
    });

    eventSource.on("generation_ended", async () => {
        console.log("[Siren Voice] 🏁 检测到 AI 生成完毕，正在打捞深海潜流...");
        await handleNewMessage();

        // 🌟 1. 首先：确保最新楼层的按钮被注入到页面上
        await injectScenePlayButtons();

        // 🌟 2. 核心：触发场景自动播报连招 (Auto Play)
        await triggerSceneAutoPlay();

        // 🌟 3. 兜底更新：刷新页面上其他所有旧按钮的状态
        setTimeout(() => {
            bindInlineSongCards(document);
            bindInlineSpeakCards(document);
            scanAndRefreshAllScenes();
        }, 500);
    });

    eventSource.on("chat_id_changed", () => {
        window.dispatchEvent(new CustomEvent("siren:echo_updated"));

        // 👇 🌟 新增：向全局广播“聊天/角色已切换”事件
        window.dispatchEvent(new CustomEvent("siren:character_changed"));

        setTimeout(() => {
            bindInlineSongCards(document);
            bindInlineSpeakCards(document);
            injectScenePlayButtons();
        }, 200);
    });

    eventSource.on("message_received", () => {
        setTimeout(() => injectScenePlayButtons(), 200);
    });

    if (typeof initSecuritySweeper === "function") {
        initSecuritySweeper();
    }

    window.addEventListener("siren:bgm_settings_updated", () => {
        applyBgmAndKaraokeCss();

        const settings = getSirenSettings();
        const bStyle = settings?.bgm?.card_style;
        const sStyle = settings?.bgm?.sfx_card_style;
        const currentBgmIcon =
            bStyle?.dict?.[bStyle.current]?.icon || "fa-solid fa-music";
        const currentSfxIcon =
            sStyle?.dict?.[sStyle.current]?.icon || "fa-solid fa-bolt";

        // 👇 核心修复：使用 data-siren-bgm="1" 绕过 custom- 前缀陷阱
        document.querySelectorAll('[data-siren-bgm="1"] i').forEach((el) => {
            if (
                !el.classList.contains("fa-circle-pause") &&
                !el.classList.contains("fa-spinner")
            ) {
                el.className = currentBgmIcon;
            }
        });

        // 👇 核心修复：使用 data-siren-sfx="1"
        document.querySelectorAll('[data-siren-sfx="1"] i').forEach((el) => {
            if (
                !el.classList.contains("fa-circle-pause") &&
                !el.classList.contains("fa-spinner")
            ) {
                el.className = currentSfxIcon;
            }
        });
    });

    setTimeout(() => {
        const settings = getSirenSettings();
        // 修改为：就算没有 music.styles 也要执行，保证 speak 正则能刷新
        updateSirenRegex(settings?.music?.styles || {});
        applyMusicBeautifyCss();
        applyBgmAndKaraokeCss();
    }, 1000);

    console.log("[Siren Voice] 🟢 鹰眼捕获级监听器已就绪！");

    if (!window.sirenGlobalClickBound) {
        window.sirenGlobalClickBound = true;
        // 第一层：全局捕获监听
        document.addEventListener(
            "click",
            async function (e) {
                // 获取统一的事件穿透路径，供后续判定使用
                const path =
                    typeof e.composedPath === "function"
                        ? e.composedPath()
                        : [];

                // 🎵 1. 先检查是不是直连音乐卡片
                const songTarget = findInlineCardFromEvent(e);
                if (songTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(
                        "[Siren Voice] 🦅 捕获阶段拦截成功 (音乐)！",
                        songTarget,
                    );
                    const songInfo = extractSongInfoFromCard(songTarget);
                    await handleInlineSongPlay(
                        songTarget,
                        songInfo.title,
                        songInfo.artist,
                        songInfo.floor,
                    );
                    return; // 匹配成功，直接终结本次点击事件的处理
                }

                // 🎙️ 2. 再检查是不是语音条卡片
                let speakTarget = null;
                for (const node of path) {
                    if (
                        node instanceof Element &&
                        node.matches?.('[data-siren-speak="1"]')
                    ) {
                        speakTarget = node;
                        break;
                    }
                }
                if (!speakTarget && e.target instanceof Element) {
                    speakTarget = e.target.closest('[data-siren-speak="1"]');
                }

                if (speakTarget) {
                    let action = null;
                    // 安全寻路：只认我们自己的 data 属性
                    for (const node of path) {
                        if (node instanceof Element) {
                            action = node.getAttribute("data-siren-action");
                            if (action) break;
                        }
                    }

                    // 如果点中了特定按钮，才执行播放/重生成
                    if (action) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                            `[Siren Voice] 🦅 捕获阶段拦截成功 (语音-${action})！`,
                        );

                        const rawAttrs =
                            speakTarget.getAttribute("data-raw-attrs") || "";

                        // 1. 常规 DOM 获取尝试
                        let rawText = "";
                        const hiddenSpan =
                            speakTarget.querySelector(".siren-raw-text");
                        const visibleSpan =
                            speakTarget.querySelector(".siren-speak-text");

                        if (hiddenSpan && hiddenSpan.textContent) {
                            rawText = hiddenSpan.textContent;
                        } else if (visibleSpan && visibleSpan.textContent) {
                            rawText = visibleSpan.textContent;
                        } else {
                            rawText =
                                speakTarget.getAttribute("data-raw-text") || "";
                        }

                        // 💥 2. 【终极核武器：绕过 DOM 幽灵，直接从 ST 聊天记录底层打捞】💥
                        if (!rawText || !rawText.trim()) {
                            console.warn(
                                "[Siren Voice] ⚠️ 发现 DOM 文本被 ST 吞噬，启动深海底层打捞协议...",
                            );
                            const floor = getMessageIdFromElement(speakTarget);

                            if (floor !== null) {
                                let originalMarkdown = "";

                                // 👇 修复点：抛弃限制最新楼层的 -1，直接根据楼层 ID 从 ST 核心上下文中精准定位！
                                const context = SillyTavern.getContext();
                                if (
                                    context &&
                                    context.chat &&
                                    context.chat[floor]
                                ) {
                                    // chat 数组的索引就是楼层号，.mes 就是未经渲染的原始文本
                                    originalMarkdown = context.chat[floor].mes;
                                } else if (window.TavernHelper) {
                                    // 备用方案：去掉 -1，拿到完整记录再查
                                    const msgs =
                                        window.TavernHelper.getChatMessages();
                                    const msgObj =
                                        msgs &&
                                        msgs.find(
                                            (m) =>
                                                Number(m.message_id) ===
                                                Number(floor),
                                        );
                                    if (msgObj)
                                        originalMarkdown = msgObj.message;
                                }

                                if (originalMarkdown) {
                                    // 🌟 更新打捞正则，支持三种标签
                                    const regex =
                                        /<(speak|inner|phone)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
                                    let match;
                                    while (
                                        (match =
                                            regex.exec(originalMarkdown)) !==
                                        null
                                    ) {
                                        // match[1] 是标签名, match[2] 是属性, match[3] 是文本
                                        const currentAttrs = (
                                            match[2] || ""
                                        ).trim();
                                        if (
                                            !rawText ||
                                            currentAttrs === rawAttrs.trim()
                                        ) {
                                            rawText = match[3] || "";
                                        }
                                    }
                                    console.log(
                                        `[Siren Voice] 🎯 底层打捞成功！找到楼层 ${floor} 的真实文本:`,
                                        rawText,
                                    );
                                }
                            }
                        }

                        // 极致防崩溃兜底
                        rawText = rawText || "";

                        console.log(
                            "【Siren Voice 调试 1】最终确定的原始文本:",
                            rawText,
                        );

                        const attrs = parseRawSpeakAttrs(rawAttrs);
                        const cleanText = rawText
                            .replace(/\{\{[\s\S]*?\}\}/g, "")
                            .trim();
                        // 🌟 从 DOM 读取具体的标签类型，默认为 speak
                        const tagType =
                            speakTarget.getAttribute("data-tag") || "speak";

                        console.log(
                            "【Siren Voice 调试 2】组装进 speakObj 的文本:",
                            cleanText,
                        );

                        const speakObj = {
                            tag: tagType, // 👈 新增标签类型向下传递
                            char: attrs.char || "",
                            mood: attrs.mood || "",
                            detail: attrs.detail || "",
                            dir: attrs.dir || "center",
                            text: cleanText,
                            raw: `<${tagType} ${rawAttrs}>${rawText}</${tagType}>`,
                        };

                        await handleInlineSpeakPlay(
                            speakObj,
                            speakTarget,
                            action,
                        );
                    }
                    return; // 只要点击落在语音卡片内，一律 return 退出，不让它再去匹配 BGM
                }

                // 🎵 3. 最后检查是不是 BGM 环境音卡片
                let bgmTarget = null;
                for (const node of path) {
                    if (
                        node instanceof Element &&
                        node.matches?.('[data-siren-bgm="1"]')
                    ) {
                        bgmTarget = node;
                        break;
                    }
                }
                if (!bgmTarget && e.target instanceof Element) {
                    bgmTarget = e.target.closest('[data-siren-bgm="1"]');
                }

                if (bgmTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    const bgmName = bgmTarget.getAttribute("data-bgm-name");
                    const floor = getMessageIdFromElement(bgmTarget);
                    if (bgmName) {
                        console.log(
                            `[Siren Voice] 🎵 单独点击环境音: ${bgmName}`,
                        );

                        // 🌟 1. UI 立即响应：切为转圈 loading
                        const icon = bgmTarget.querySelector("i");
                        if (icon) {
                            // 把其他所有卡片的图标恢复成默认音符
                            document
                                .querySelectorAll(".siren-bgm-card i")
                                .forEach((el) => {
                                    if (el !== icon)
                                        el.className = "fa-solid fa-music";
                                });
                            // 当前点击的卡片开始转圈
                            icon.className = "fa-solid fa-spinner fa-spin";
                        }

                        // 🌟 2. 调起播放引擎
                        const { playSceneBgm } = await import("./bgm_logic.js");
                        const state = await playSceneBgm(bgmName, floor);

                        // 🌟 3. 根据引擎返回状态更新 UI
                        if (icon) {
                            if (state === "playing") {
                                icon.className = "fa-solid fa-circle-pause";
                            } else {
                                // 👇 动态获取并设置还原图标
                                const bStyle =
                                    getSirenSettings()?.bgm?.card_style;
                                icon.className =
                                    bStyle?.dict?.[bStyle.current]?.icon ||
                                    "fa-solid fa-music";
                            }
                        }
                    }
                    return;
                }

                // ⚡ 4. 检查是不是 SFX 效果音卡片
                let sfxTarget = null;
                for (const node of path) {
                    if (
                        node instanceof Element &&
                        node.matches?.('[data-siren-sfx="1"]')
                    ) {
                        sfxTarget = node;
                        break;
                    }
                }
                if (!sfxTarget && e.target instanceof Element) {
                    sfxTarget = e.target.closest('[data-siren-sfx="1"]');
                }

                if (sfxTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    const sfxName = sfxTarget.getAttribute("data-sfx-name");
                    const sfxDir =
                        sfxTarget.getAttribute("data-dir") || "center";
                    const floor = getMessageIdFromElement(sfxTarget);
                    if (sfxName) {
                        console.log(
                            `[Siren Voice] ⚡ 单独点击效果音: ${sfxName}`,
                        );

                        // 🌟 1. UI 立即响应：切为转圈 loading
                        const icon = sfxTarget.querySelector("i");
                        if (icon) {
                            // 把其他的 SFX 卡片图标恢复成默认闪电
                            document
                                .querySelectorAll(".siren-sfx-card i")
                                .forEach((el) => {
                                    if (el !== icon)
                                        el.className = "fa-solid fa-bolt";
                                });
                            icon.className = "fa-solid fa-spinner fa-spin";
                        }

                        // 🌟 2. 调起播放引擎 (同时引入刚才新建的获取音频方法)
                        const { playSceneSfx, getActiveSfxAudio } =
                            await import("./bgm_logic.js");

                        if (typeof playSceneSfx === "function") {
                            const state = await playSceneSfx(
                                sfxName,
                                floor,
                                false,
                                sfxDir,
                            );

                            // 🌟 3. 根据引擎返回状态更新 UI
                            if (icon) {
                                if (state === "playing") {
                                    icon.className = "fa-solid fa-circle-pause";

                                    const currentAudio = getActiveSfxAudio();
                                    if (currentAudio) {
                                        const resetIcon = () => {
                                            // 👇 动态获取并设置还原图标
                                            const sStyle =
                                                getSirenSettings()?.bgm
                                                    ?.sfx_card_style;
                                            icon.className =
                                                sStyle?.dict?.[sStyle.current]
                                                    ?.icon ||
                                                "fa-solid fa-bolt";
                                        };
                                        currentAudio.addEventListener(
                                            "ended",
                                            resetIcon,
                                            { once: true },
                                        );
                                        currentAudio.addEventListener(
                                            "pause",
                                            resetIcon,
                                            { once: true },
                                        );
                                    }
                                } else {
                                    // 👇 动态获取并设置还原图标
                                    const sStyle =
                                        getSirenSettings()?.bgm?.sfx_card_style;
                                    icon.className =
                                        sStyle?.dict?.[sStyle.current]?.icon ||
                                        "fa-solid fa-bolt";
                                }
                            }
                        } else {
                            console.warn(
                                "[Siren Voice] 尚未在 bgm_logic.js 中实现 playSceneSfx 方法！",
                            );
                            if (icon) icon.className = "fa-solid fa-bolt";
                        }
                    }
                    return;
                }
            },
            true, // <- true 代表捕获阶段，永远比 ST 原生逻辑先执行
        );
    }

    // 第二层：初始化时直接扫一遍页面上的卡片并直绑
    bindInlineSongCards(document);
    bindInlineSpeakCards(document);

    // 第三层：监听后续 DOM 注入
    initCardObserver();
}

async function handleNewMessage() {
    if (!window.TavernHelper) return;

    const messages = window.TavernHelper.getChatMessages(-1);
    if (!messages || messages.length === 0) return;

    const lastMsg = messages[0];
    if (lastMsg.role === "user" || lastMsg.is_user) {
        cleanGhostVariables(lastMsg.message_id);
        return;
    }

    const originalText = lastMsg.message;
    const songRegex = /<song>([\s\S]*?)<\/song>/i;
    const match = originalText.match(songRegex);

    if (!match) return;

    const innerText = match[1].trim();
    let songName = innerText;
    let artistName = "";

    if (innerText.includes("-")) {
        const parts = innerText.split("-");
        songName = parts[0].trim();
        artistName = parts.slice(1).join("-").trim();
    }

    if (!songName) return;

    try {
        await window.TavernHelper.updateVariablesWith(
            (vars) => {
                if (!vars["siren-voice"]) vars["siren-voice"] = {};
                vars["siren-voice"].bgm = {
                    song: songName,
                    artist: artistName,
                };
                return vars;
            },
            { type: "message", message_id: lastMsg.message_id },
        );
    } catch (e) {
        console.error("[Siren Voice] ❌ 变量写入失败", e);
    }

    const settings = getSirenSettings();
    if (settings?.music?.enabled && settings?.music?.mode === "smart") {
        const source = settings.music.source || "netease";
        const history = getEchoHistory();
        const isExist = history.some(
            (s) => s.name === songName && s.artist === artistName,
        );
        if (!isExist) {
            history.unshift({
                floor: lastMsg.message_id,
                name: songName,
                artist: artistName,
                source: source,
            });
        }
        setPlaylistContext(history, { name: songName, artist: artistName });

        const isAutoPlay = settings.music.auto_play ?? true;
        // 如果你的设置里有开放自定义符号（比如 tts.stop_chars），可以取出来，否则传空字符串走默认规则
        const customStopRaw = settings.tts?.stop_chars || "";

        if (isAutoPlay) {
            // 调用你写好的检测器，传入包含完整标签的 originalText
            const isComplete = checkReplyIntegrity(originalText, customStopRaw);

            if (isComplete) {
                console.log(
                    `[Siren Voice] 🟢 消息完整，允许自动请求歌曲 API: ${songName}`,
                );
                await playTargetSong(songName, artistName, source);
            } else {
                console.log(
                    `[Siren Voice] ⚠️ 回复不完整 (可能被截断/流式输出中)，终止自动音乐请求。`,
                );
            }
        } else {
            console.log(
                `[Siren Voice] ⏸️ 自动播放已关闭。已捕获 [${songName}] 但不主动发起请求。`,
            );
        }
    }

    setTimeout(() => {
        window.dispatchEvent(new CustomEvent("siren:echo_updated"));
        bindInlineSongCards(document);
    }, 200);
}

function buildSongRegexes(styles) {
    const isEnabled = styles?.msgEnabled;
    const regexes = [];

    if (isEnabled) {
        // 🚀 核心优化 1：统一且干净的静态 HTML 骨架，彻底抛弃内联样式！
        let displayReplace = `<br><br>
<div class="siren-music-card" data-siren-song-card="1" data-siren-song-title="$1" data-siren-song-artist="$2" tabindex="0">
    <div class="siren-music-cover-wrap">
        <i class="fa-solid fa-play siren-play-icon"></i>
    </div>
    <div class="siren-music-info-wrap">
        <span class="siren-title">$1</span>
        <span class="siren-artist">$2</span>
    </div>
</div><br>`;
        displayReplace = displayReplace.replace(/\r?\n|\r/g, " "); // 压缩成一行防换行打断

        regexes.push({
            id: "siren-voice-song-display-html",
            script_name: "Siren-Voice-Auto-Song-HTML",
            enabled: true,
            run_on_edit: true,
            scope: "global",
            find_regex:
                "/<song>\\s*([^-<]+?)(?:\\s*-\\s*([^<]+?))?\\s*<\\/song>/gi",
            replace_string: displayReplace,
            source: {
                user_input: true,
                ai_output: true,
                slash_command: true,
                world_info: false,
            },
            destination: { display: true, prompt: false },
            min_depth: null,
            max_depth: null,
        });
    } else {
        // ... (保留你原有的 text-full 和 text-single 兜底正则不变)
        regexes.push({
            id: "siren-voice-song-display-text-full",
            script_name: "Siren-Voice-Auto-Song-Text-Full",
            enabled: true,
            run_on_edit: true,
            scope: "global",
            find_regex: "/<song>\\s*(.+?)\\s*-\\s*(.+?)\\s*<\\/song>/gi",
            replace_string:
                "<br><br><span style='color: #10b981;'>[🎵 正在打捞: $1 - $2]</span><br>",
            source: {
                user_input: true,
                ai_output: true,
                slash_command: true,
                world_info: false,
            },
            destination: { display: true, prompt: false },
            min_depth: null,
            max_depth: null,
        });
        regexes.push({
            id: "siren-voice-song-display-text-single",
            script_name: "Siren-Voice-Auto-Song-Text-Single",
            enabled: true,
            run_on_edit: true,
            scope: "global",
            find_regex: "/<song>\\s*([^-<]+?)\\s*<\\/song>/gi",
            replace_string:
                "<br><br><span style='color: #10b981;'>[🎵 正在打捞: $1]</span><br>",
            source: {
                user_input: true,
                ai_output: true,
                slash_command: true,
                world_info: false,
            },
            destination: { display: true, prompt: false },
            min_depth: null,
            max_depth: null,
        });
    }

    return regexes;
}

// 🚀 核心优化 2：新增 Music 的 CSS 动态注入魔法
export function applyMusicBeautifyCss() {
    const settings = getSirenSettings();
    const enabled = settings?.music?.styles?.msgEnabled ?? false;
    const currentStyle = settings?.music?.styles?.msgCurrent || "default";
    const customCss =
        settings?.music?.styles?.msgDict?.[currentStyle]?.code || "";

    let styleTag = document.getElementById("siren-music-msg-style");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "siren-music-msg-style";
        document.head.appendChild(styleTag);
    }

    if (enabled && customCss) {
        // 自动兼容 ST 的 custom- 前缀
        styleTag.textContent = customCss.replace(
            /\.siren-([a-zA-Z0-9_-]+)/g,
            ":is(.siren-$1, .custom-siren-$1)",
        );
    } else {
        styleTag.textContent = "";
    }
}

// ==========================================
// 🌟 正则构建器：语音系统 (Speak)
// ==========================================
// ==========================================
// 🌟 正则构建器：语音系统 (Speak / Inner / Phone)
// ==========================================
function buildSpeakRegexes() {
    const settings = getSirenSettings();
    const isBeautifyEnabled = settings?.tts?.beautify_enabled ?? true;

    if (!isBeautifyEnabled) return [];

    // 💡 核心优化：提取公共生成逻辑，为不同标签定制不同的正则表达式和 HTML 骨架
    const createRegexConfig = (tag, iconHtml) => {
        // 首字母大写，用于 ST 里的规范命名 (例如 Siren-Voice-Auto-Inner)
        const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);

        return {
            id: `siren-voice-${tag}-display`,
            script_name: `Siren-Voice-Auto-${capitalizedTag}`,
            enabled: true,
            run_on_edit: true,
            scope: "global",
            // 🌟 拆分后的专属正则。$1 捕获属性 (attrs)，$2 捕获内部文本
            find_regex: `/<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>/gi`,
            replace_string:
                `<span class="siren-speak-card" data-siren-speak="1" data-tag="${tag}" data-raw-attrs='$1' tabindex="0">
    <span class="siren-btn-wrap siren-play-wrap" data-siren-action="play" title="播放">
        <i class="fa-solid fa-circle-play"></i>
    </span>
    <span class="siren-btn-wrap siren-play-spinner-wrap" style="display: none;">
        <i class="fa-solid fa-spinner fa-spin"></i>
    </span>
    ${iconHtml}
    <span class="siren-speak-text">$2</span>
    <span class="siren-raw-text" style="display: none;">$2</span> <span class="siren-btn-wrap siren-regen-wrap" data-siren-action="regenerate" title="重新生成">
        <i class="fa-solid fa-rotate-right"></i>
    </span>
    <span class="siren-btn-wrap siren-regen-spinner-wrap" style="display: none;">
        <i class="fa-solid fa-spinner fa-spin"></i>
    </span>
</span>`.replace(/\n\s+/g, ""),
            source: {
                user_input: true,
                ai_output: true,
                slash_command: true,
                world_info: false,
            },
            destination: { display: true, prompt: false },
            min_depth: null,
            max_depth: null,
        };
    };

    // 🌟 终极护城河：抛弃 Class 幻想，直接使用 ST 无法触碰的 data-* 属性作为绝对锚点
    const getIndicatorHtml = (faClass) =>
        `<span class="siren-tag-icon" data-siren-icon="1" style="pointer-events: none; opacity: 0.85; margin-right: 6px;">
            <i class="${faClass}"></i>
        </span>`;

    return [
        createRegexConfig("speak", ""),
        createRegexConfig("inner", getIndicatorHtml("fa-solid fa-comment")),
        createRegexConfig("phone", getIndicatorHtml("fa-solid fa-phone")),
    ];
}

// ==========================================
// 🚀 核心调度：全量更新 ST 正则
// ==========================================
export async function updateSirenRegex(styles) {
    if (
        !window.TavernHelper ||
        typeof window.TavernHelper.updateTavernRegexesWith !== "function"
    )
        return;

    // 👇 获取全局设置中的自定义图标
    const settings = getSirenSettings();
    const bStyle = settings?.bgm?.card_style;
    const sStyle = settings?.bgm?.sfx_card_style;
    const bgmIcon = bStyle?.dict?.[bStyle.current]?.icon || "fa-solid fa-music";
    const sfxIcon = sStyle?.dict?.[sStyle.current]?.icon || "fa-solid fa-bolt";

    const songRegexes = buildSongRegexes(styles);
    const speakRegexes = buildSpeakRegexes();
    const bgmRegexes = buildBgmRegexes(bgmIcon); // 👈 传入图标
    const sfxRegexes = buildSfxRegexes(sfxIcon); // 👈 🌟 拿到效果音正则

    // 👈 🌟 把它展开合并进总数组
    const allSirenRegexes = [
        ...speakRegexes,
        ...songRegexes,
        ...bgmRegexes,
        ...sfxRegexes,
    ];

    await window.TavernHelper.updateTavernRegexesWith((regexes) => {
        let newRegexes = regexes.filter(
            (r) => !r.script_name.startsWith("Siren-Voice-Auto-"),
        );
        newRegexes.unshift(...allSirenRegexes);
        return newRegexes;
    });

    setTimeout(() => {
        bindInlineSongCards(document);
        bindInlineSpeakCards(document);
    }, 200);
}

export function initSecuritySweeper() {
    const context = SillyTavern.getContext();
    const eventSource = context.eventSource;

    eventSource.on("user_message_rendered", async (messageId) => {
        cleanGhostVariables(messageId);
    });

    eventSource.on("generation_started", async () => {
        const msgs = window.TavernHelper.getChatMessages(-1);
        if (msgs && msgs.length > 0) {
            const lastMsg = msgs[0];
            if (lastMsg.role === "user" || lastMsg.is_user) {
                cleanGhostVariables(lastMsg.message_id);
            }
        }
    });
}

async function cleanGhostVariables(msgId) {
    if (!msgId || !window.TavernHelper) return;
    try {
        const vars = window.TavernHelper.getVariables({
            type: "message",
            message_id: msgId,
        });
        if (vars && vars["siren-voice"] && vars["siren-voice"].bgm) {
            const cleanVars = { ...vars };
            delete cleanVars["siren-voice"].bgm;
            if (
                cleanVars["siren-voice"] &&
                Object.keys(cleanVars["siren-voice"]).length === 0
            ) {
                delete cleanVars["siren-voice"];
            }
            await window.TavernHelper.replaceVariables(cleanVars, {
                type: "message",
                message_id: msgId,
            });
        }
    } catch (e) {
        console.warn("[Siren Voice] cleanGhostVariables 忽略异常:", e);
    }
}

/**
 * 提取并解析语音条的原始属性 (增强版，防 ST 转义)
 */
function parseRawSpeakAttrs(rawAttrs) {
    const attrs = {};
    // 兼容正常的双引号，以及被 ST 转义过的 &quot;
    const attrRegex = /(\w+)\s*=\s*(?:"|&quot;|')([^"']*)(?:"|&quot;|')/g;
    let match;
    while ((match = attrRegex.exec(rawAttrs)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

/**
 * TTS 点击路由分发器
 */
async function handleInlineSpeakPlay(speakObj, cardElement, action = "play") {
    const context = SillyTavern.getContext();
    const currentChatId = context.chatId;
    const settings = getSirenSettings();
    const provider = settings?.tts?.provider || "indextts";
    const ttsSettings = settings?.tts?.[provider] || {};
    const floor = getMessageIdFromElement(cardElement);

    stopCurrentTTS();

    const loadingClass =
        action === "regenerate" ? "is-loading-regen" : "is-loading-play";

    if (cardElement.classList.contains(loadingClass)) return;

    cardElement.classList.add(loadingClass);
    // 强制给浏览器一帧的时间把 loading 状态画出来
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
        if (action === "play") {
            const cachedRecord = await findExactTtsRecord(
                currentChatId,
                floor,
                speakObj.char,
                speakObj.text,
                speakObj.mood, // 👈 新增情绪参数
                speakObj.detail, // 👈 新增情绪细节参数
            );
            if (cachedRecord && cachedRecord.audioBlob) {
                console.log(
                    `[Siren Voice] 命中本地缓存，直接播放: ${speakObj.text}`,
                );
                enqueueTTSBlob(cachedRecord.audioBlob, speakObj);
                return;
            } else {
                console.log(
                    `[Siren Voice] 未命中缓存(或文本已修改)，转入实时生成: ${speakObj.text}`,
                );
            }
        }

        const isRegen = action === "regenerate";
        await dispatchTtsGeneration(
            speakObj,
            floor,
            provider,
            ttsSettings,
            isRegen,
        );
    } finally {
        cardElement.classList.remove(loadingClass);
    }
}
