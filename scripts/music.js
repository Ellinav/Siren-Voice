import {
    getSirenSettings,
    saveSirenSettings,
    defaultSettings,
} from "./settings.js";
import {
    searchSongList,
    playExactSong,
    setPlaylistContext,
    playTargetSong,
} from "./music_logic.js";
import { updatePlayerCustomStyle } from "./music_player.js";
import { updateSirenRegex, applyMusicBeautifyCss } from "./events.js";
import { syncMusicWorldbookEntry } from "./utils.js";

let sirenStyleDraft = null;

let currentPlaylistPage = 1;
const PLAYLIST_PAGE_SIZE = 15;

export function initMusicSettings() {
    const musicTab = document.getElementById("tab-music");
    if (!musicTab) return;

    // 1. 注入核心设置 HTML (将 Add 按钮改为 Search)
    const musicHtml = `
        <div class="siren-ext-settings-container">
            <h3 style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-compact-disc fa-fw" style="color:#06b6d4; margin-right:8px;"></i>潮汐音乐台</span>
                <i id="siren-music-save-btn" class="fa-solid fa-floppy-disk" style="cursor: pointer; color: #10b981; font-size: 1.2em;" title="保存全局设置"></i>
            </h3>
            
            <div class="siren-ext-setting-row siren-ext-flex-between" style="border-color: #06b6d4; background: rgba(6, 182, 212, 0.1);">
                <div class="siren-ext-setting-label">
                    <label for="siren-music-enable" style="color: #06b6d4; font-size: 1.1em;">唤醒潮汐</label>
                </div>
                <label class="siren-ext-switch">
                    <input type="checkbox" id="siren-music-enable">
                    <span class="siren-ext-slider"></span>
                </label>
            </div>

            <div id="siren-music-settings-wrapper">
                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label">
                        <label for="siren-music-floating-enable">显示潮汐控制台</label>
                    </div>
                    <label class="siren-ext-switch">
                        <input type="checkbox" id="siren-music-floating-enable">
                        <span class="siren-ext-slider"></span>
                    </label>
                </div>
                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label">
                        <label for="siren-music-auto-play">自动播放</label>
                    </div>
                    <label class="siren-ext-switch">
                        <input type="checkbox" id="siren-music-auto-play">
                        <span class="siren-ext-slider"></span>
                    </label>
                </div>
                <hr class="siren-ext-divider">
                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label">
                        <label>声纳探索海域</label>
                    </div>
                    <select id="siren-music-source" class="siren-ext-select">
                        <option value="netease">网易云</option>
                        <option value="tencent">QQ音乐</option>
                        <option value="tidal">Tidal</option>
                        <option value="spotify">Spotify</option>
                        <option value="apple">Apple Music</option>
                        <option value="ytmusic">YouTube Music</option>
                        <option value="qobuz">Qobuz</option>
                        <option value="joox">JOOX</option>
                        <option value="deezer">Deezer</option>
                        <option value="migu">咪咕</option>
                        <option value="kugou">酷狗</option>
                        <option value="kuwo">酷我</option>
                        <option value="ximalaya">喜马拉雅</option>
                    </select>
                </div>
                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label"><label>潮汐引导航线</label></div>
                    <select id="siren-music-mode" class="siren-ext-select">
                        <option value="smart">塞壬灵感</option>
                        <option value="playlist">深海歌单</option>
                    </select>
                </div>
                <hr class="siren-ext-divider">

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; margin-top: 15px;">
                    <h4 style="margin: 0; color: #f472b6;"><i class="fa-solid fa-palette" style="margin-right:8px;"></i>幻彩贝壳</h4>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button id="siren-style-import-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; font-size: 0.85em;" title="导入涂装"><i class="fa-solid fa-file-import"></i></button>
                        <button id="siren-style-export-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; font-size: 0.85em;" title="导出涂装"><i class="fa-solid fa-file-export"></i></button>
                        <input type="file" id="siren-style-import-file" accept=".json" style="display: none;">
                    </div>
                </div>

                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label"><label>🎨控制台涂装</label></div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select id="siren-style-player-select" class="siren-ext-select" style="max-width: 150px;"></select>
                        <button id="siren-style-player-add-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px;" title="新增自定义样式"><i class="fa-solid fa-plus"></i></button>
                        <button id="siren-style-player-del-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; color: #ef4444;" title="删除当前样式"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div id="siren-style-player-css-wrapper" style="margin-bottom: 15px;">
                    <textarea id="siren-style-player-css" class="siren-ext-textarea" rows="5" placeholder="/* 自定义 CSS */" style="font-family: monospace; font-size: 0.85em;"></textarea>
                </div>

                <div class="siren-ext-setting-row siren-ext-flex-between">
                    <div class="siren-ext-setting-label">
                        <label>深海气泡拟态</label>
                        <small style="display:block; margin-top:4px;">替换默认隐藏的 &lt;song&gt; 标签为精美卡片</small>
                    </div>
                    <label class="siren-ext-switch">
                        <input type="checkbox" id="siren-style-msg-enable">
                        <span class="siren-ext-slider"></span>
                    </label>
                </div>
                
                <div id="siren-style-msg-html-wrapper" style="display: none;">
                    <div class="siren-ext-setting-row siren-ext-flex-between" style="background: rgba(0,0,0,0.2); border-color: transparent;">
                        <div class="siren-ext-setting-label"><label>当前样式</label></div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select id="siren-style-msg-select" class="siren-ext-select" style="max-width: 150px;"></select>
                            <button id="siren-style-msg-add-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px;" title="新增自定义样式"><i class="fa-solid fa-plus"></i></button>
                            <button id="siren-style-msg-del-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; color: #ef4444;" title="删除当前样式"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <textarea id="siren-style-msg-html" class="siren-ext-textarea" rows="5" placeholder="" style="font-family: monospace; font-size: 0.85em;"></textarea>
                    </div>
                </div>

                <div class="siren-ext-style-preview-box">
                    <div style="color: #94a3b8; font-size: 0.8em; margin-bottom: 12px; display:flex; justify-content:space-between;">
                        <span><i class="fa-solid fa-eye"></i> 全息投影预览</span>
                        <span id="siren-preview-status" style="color:#10b981;">已就绪</span>
                    </div>
                    
                    <div style="position: relative; height: 80px; margin-bottom: 15px; pointer-events: none;">
                        <div id="siren-music-player-preview" class="siren-ext-player-pill" style="position: absolute; top:0; left:0; width: 280px; transform: scale(0.8); transform-origin: top left;">
                            <div class="siren-ext-player-basic">
                                <div class="siren-ext-player-cover"><i class="fa-solid fa-music" style="color: #06b6d4;"></i></div>
                                <div class="siren-ext-player-info">
                                    <div class="siren-ext-song-title">深海回响 (Preview)</div>
                                    <div class="siren-ext-song-artist">塞壬之声</div>
                                </div>
                                <div class="siren-ext-player-controls">
                                    <i class="fa-solid fa-arrow-right-arrow-left siren-ext-ctrl-btn" title="顺序播放" style="font-size: 0.9em; margin-right: 2px;"></i>
                                    <i class="fa-solid fa-backward-step siren-ext-ctrl-btn" title="上一首"></i>
                                    <i class="fa-solid fa-play siren-ext-ctrl-btn" title="播放/暂停" style="color: #10b981; font-size: 1.1em;"></i>
                                    <i class="fa-solid fa-forward-step siren-ext-ctrl-btn" title="下一首"></i>
                                    <i class="fa-solid fa-chevron-down siren-ext-ctrl-btn" title="展开歌词"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="siren-ext-chat-msg-mock">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 1.2em; border: 1px solid #06b6d4; box-shadow: 0 0 8px rgba(6, 182, 212, 0.4); flex-shrink: 0;">🧜‍♀️</div>
                        <div style="flex: 1;">
                            <div style="font-size: 0.85em; color: #94a3b8; margin-bottom: 4px;">Siren</div>
                            <div style="color: #cbd5e1; font-size: 0.9em; line-height: 1.5;">
                                深海中浮现出这段旋律~~
                                <div id="siren-preview-msg-render" style="margin-top: 8px;">
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>
                <hr class="siren-ext-divider">

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; margin-top: 15px;">
                    <h4 style="margin: 0; color: #a855f7;"><i class="fa-solid fa-ear-listen" style="margin-right:8px;"></i>拾音海螺</h4>
                    <button id="siren-echo-refresh-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; font-size: 0.85em;" title="刷新列表">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                </div>

                <div id="siren-echo-container" class="siren-ext-playlist-box" style="background: #0a0f1e; border-radius: 6px; border: 1px dashed #64748b; margin-bottom: 15px; max-height: 300px; overflow-y: auto;">
                    <div id="siren-echo-empty" style="text-align:center; padding: 20px; color: #475569;">暂无历史回响。</div>
                    <ul id="siren-echo-list" style="list-style: none; padding: 0; margin: 0;"></ul>
                </div>

                <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 15px; color: #94a3b8; font-size: 0.9em;">
                    <button id="siren-echo-prev" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 12px;"><i class="fa-solid fa-chevron-left"></i></button>
                    <span id="siren-echo-page-info" style="font-family: monospace; font-size: 1.1em; width: 60px; text-align: center;">1 / 1</span>
                    <button id="siren-echo-next" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 12px;"><i class="fa-solid fa-chevron-right"></i></button>
                </div>

                <hr class="siren-ext-divider">
            
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; margin-top: 15px;">
                    <h4 style="margin: 0;"><i class="fa-solid fa-list-ul" style="color:#10b981; margin-right:8px;"></i>深海歌单</h4>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button id="siren-music-import-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; font-size: 0.85em;" title="导入歌单"><i class="fa-solid fa-file-import"></i></button>
                        <button id="siren-music-export-btn" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 10px; font-size: 0.85em;" title="导出歌单"><i class="fa-solid fa-file-export"></i></button>
                        <input type="file" id="siren-music-import-file" accept=".json" style="display: none;">
                    </div>
                </div>
                
                <div class="siren-ext-add-song-row" style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="siren-music-search-title" class="siren-ext-input" placeholder="歌曲名 (必填)" style="flex: 2;">
                    <input type="text" id="siren-music-search-artist" class="siren-ext-input" placeholder="歌手 (选填)" style="flex: 1;">
                    <button id="siren-music-search-btn" class="siren-ext-btn siren-ext-btn-primary"><i class="fa-solid fa-magnifying-glass"></i> 搜索</button>
                </div>
                
                <div id="siren-music-playlist-container" class="siren-ext-playlist-box" style="background: #0a0f1e; border-radius: 6px; border: 1px solid #334155; margin-bottom: 15px;">
                    <div id="siren-music-empty-state" style="text-align:center; padding: 20px; color: #475569;">暂无曲目，请搜索添加。</div>
                    <ul id="siren-music-list" style="list-style: none; padding: 0; margin: 0;"></ul>
                </div>
                
                <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 15px; color: #94a3b8; font-size: 0.9em;">
                    <button id="siren-btn-page-prev" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 12px;"><i class="fa-solid fa-chevron-left"></i></button>
                    <span id="siren-playlist-page-info" style="font-family: monospace; font-size: 1.1em; width: 60px; text-align: center;">1 / 1</span>
                    <button id="siren-btn-page-next" class="siren-ext-btn siren-ext-btn-secondary" style="padding: 4px 12px;"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    `;
    musicTab.innerHTML = musicHtml;

    // 2. 注入全局搜索弹窗 HTML (如果还没有)
    if (!document.getElementById("siren-music-search-modal")) {
        const modalHtml = `
            <div id="siren-music-search-modal" class="siren-ext-hidden" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                <div style="background: #0f172a; width: 600px; max-width: 90%; max-height: 80vh; border-radius: 12px; border: 1px solid #334155; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    <div style="padding: 15px 20px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin:0; color:#06b6d4; font-size:1.1em;"><i class="fa-solid fa-satellite-dish"></i> 声纳探测结果</h3>
                        <i id="siren-close-modal-btn" class="fa-solid fa-xmark" style="cursor: pointer; color:#94a3b8; font-size: 1.2em; transition: color 0.2s;"></i>
                    </div>
                    <div id="siren-modal-results-container" style="padding: 15px; overflow-y: auto; flex: 1;">
                        </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
    }

    bindMusicSettingsEvents();
    loadSettingsToUI();
}

let currentEchoPage = 1;
const ECHO_PAGE_SIZE = 15;

/**
 * 参考 status_logic.js 里的 scanChatForStatus，逆序扫描包含 bgm 的楼层
 */
export function getEchoHistory() {
    if (!window.TavernHelper) return [];

    const allMsgs = window.TavernHelper.getChatMessages("0-{{lastMessageId}}", {
        include_swipes: false,
    });

    const history = [];
    const seenSongs = new Set(); // 🚀 用于去重的 Set

    for (let i = allMsgs.length - 1; i >= 0; i--) {
        const msg = allMsgs[i];

        // 1. 严格过滤 User 楼层
        if (
            msg.is_user ||
            msg.role === "user" ||
            msg.name === SillyTavern.getContext().userName
        )
            continue;

        const vars = window.TavernHelper.getVariables({
            type: "message",
            message_id: msg.message_id,
        });

        if (vars && vars["siren-voice"] && vars["siren-voice"].bgm) {
            const bgm = vars["siren-voice"].bgm;
            // 2. 构造唯一标识符，防止历史记录里出现连续多首一样的歌
            const uniqueKey = `${bgm.song}::${bgm.artist}`;

            if (!seenSongs.has(uniqueKey)) {
                seenSongs.add(uniqueKey);
                history.push({
                    floor: msg.message_id,
                    name: bgm.song,
                    artist: bgm.artist || "未知",
                    source: "netease",
                });
            }
        }
    }
    return history;
}

/**
 * 渲染“拾音海螺”分页列表
 */
export function renderEchoPage() {
    const history = getEchoHistory();
    const totalPages = Math.ceil(history.length / ECHO_PAGE_SIZE) || 1;

    if (currentEchoPage > totalPages) currentEchoPage = totalPages;
    if (currentEchoPage < 1) currentEchoPage = 1;

    const startIndex = (currentEchoPage - 1) * ECHO_PAGE_SIZE;
    const pageData = history.slice(startIndex, startIndex + ECHO_PAGE_SIZE);

    const listEl = $("#siren-echo-list");
    listEl.empty();

    if (history.length > 0) {
        $("#siren-echo-empty").hide();
        pageData.forEach((item) => {
            const b64Data = btoa(encodeURIComponent(JSON.stringify(item)));

            // 完美对齐深海歌单的样式: padding: 12px, 左侧播放按钮, 放大右侧添加按钮
            const liHtml = `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1;">
                    <span style="flex: 1; display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                        <i class="fa-solid fa-play siren-ext-play-echo" data-name="${item.name}" data-artist="${item.artist}" style="cursor: pointer; color: #10b981; margin-right: 12px; font-size: 1.1em;" title="再次共鸣 (盲搜播放)"></i>
                        <span style="display: inline-block; width: 45px; color: #64748b; font-family: monospace; font-size: 0.85em;">#${item.floor}</span>
                        <span class="siren-ext-song-data" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                            <strong style="color: #f1f5f9;">${item.name}</strong> 
                            <small style="color: #64748b; margin-left: 5px;">${item.artist ? `- ${item.artist}` : ""}</small>
                        </span>
                    </span>
                    <i class="fa-solid fa-folder-plus siren-ext-echo-to-playlist" data-obj="${b64Data}" style="cursor: pointer; color: #06b6d4; font-size: 1.3em; padding: 4px 8px; transition: transform 0.2s;" title="添加到深海歌单" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></i>
                </li>
            `;
            listEl.append(liHtml);
        });
    } else {
        $("#siren-echo-empty").show();
    }

    $("#siren-echo-page-info").text(`${currentEchoPage} / ${totalPages}`);
}

// 专属的歌单渲染引擎
function renderPlaylistPage() {
    const playlist = getSirenSettings().music.playlist || [];
    const totalPages = Math.ceil(playlist.length / PLAYLIST_PAGE_SIZE) || 1;

    // 边界拦截
    if (currentPlaylistPage > totalPages) currentPlaylistPage = totalPages;
    if (currentPlaylistPage < 1) currentPlaylistPage = 1;

    const startIndex = (currentPlaylistPage - 1) * PLAYLIST_PAGE_SIZE;
    const endIndex = startIndex + PLAYLIST_PAGE_SIZE;
    const pageData = playlist.slice(startIndex, endIndex);

    $("#siren-music-list").empty();
    if (playlist.length > 0) {
        $("#siren-music-empty-state").hide();
        pageData.forEach((song) => appendSongToUI(song));
    } else {
        $("#siren-music-empty-state").show();
    }

    // 更新翻页数字
    $("#siren-playlist-page-info").text(
        `${currentPlaylistPage} / ${totalPages}`,
    );
}

/**
 * 填充设置 (增强：绑定完整数据对象)
 */
function loadSettingsToUI() {
    const config = getSirenSettings().music;

    // 基础开关与设置项
    $("#siren-music-enable").prop("checked", config.enabled);
    $("#siren-music-floating-enable").prop("checked", config.floating_enabled);
    $("#siren-music-auto-play").prop("checked", config.auto_play ?? true);
    $("#siren-music-source").val(config.source);
    $("#siren-music-mode").val(config.mode);
    $("#siren-music-insert-pos").val(config.insert_pos);
    $("#siren-music-char").val(config.char);
    $("#siren-music-depth").val(config.depth);
    $("#siren-music-order").val(config.order);
    $("#siren-music-prompt").val(config.prompt);

    // ==========================================
    // 🌟 幻彩贝壳：从 utils.js 的 defaultSettings 获取基底模板
    // ==========================================
    sirenStyleDraft = JSON.parse(JSON.stringify(defaultSettings.music.styles));

    if (config.styles) {
        if (config.styles.msgEnabled !== undefined) {
            sirenStyleDraft.msgEnabled = config.styles.msgEnabled;
        }
        if (config.styles.playerCurrent) {
            sirenStyleDraft.playerCurrent = config.styles.playerCurrent;
        }
        if (config.styles.msgCurrent) {
            sirenStyleDraft.msgCurrent = config.styles.msgCurrent;
        }

        // 缝合控制台涂装：只拉取用户自定义的
        if (config.styles.playerDict) {
            for (let key in config.styles.playerDict) {
                if (!sirenStyleDraft.playerDict[key]) {
                    sirenStyleDraft.playerDict[key] =
                        config.styles.playerDict[key];
                }
            }
        }

        // 缝合气泡卡片：同样只拉取用户自定义的
        if (config.styles.msgDict) {
            for (let key in config.styles.msgDict) {
                if (!sirenStyleDraft.msgDict[key]) {
                    sirenStyleDraft.msgDict[key] = config.styles.msgDict[key];
                }
            }
        }
    }

    $("#siren-style-msg-enable").prop("checked", sirenStyleDraft.msgEnabled);
    refreshStyleDropdowns();
    updateStylePreview();
    $("#siren-style-msg-enable").trigger("change");

    renderPlaylistPage();
    $("#siren-music-enable").trigger("change");
}

/**
 * 将完整的歌曲对象渲染到列表
 */
function appendSongToUI(songObj) {
    const artistText = songObj.artist ? `- ${songObj.artist}` : "";
    // 将对象转成 base64 存入标签，方便回溯完整数据
    const b64Data = btoa(encodeURIComponent(JSON.stringify(songObj)));

    const liHtml = `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1;">
            <span style="flex: 1; display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                <i class="fa-solid fa-play siren-ext-play-song" data-obj="${b64Data}" style="cursor: pointer; color: #10b981; margin-right: 12px; font-size: 1.1em;" title="精准播放"></i>
                <span class="siren-ext-song-data" data-obj="${b64Data}">
                    <strong style="color: #f1f5f9;">${songObj.name || songObj.title}</strong> 
                    <small style="color: #64748b; margin-left: 5px;">${artistText}</small>
                    <span style="font-size: 0.7em; background: #1e293b; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${songObj.source}</span>
                </span>
            </span>
            <i class="fa-solid fa-trash siren-ext-del-song" style="cursor: pointer; color: #ef4444; padding: 5px;" title="删除"></i>
        </li>
    `;
    $("#siren-music-list").append(liHtml);
}

function bindMusicSettingsEvents() {
    $("#siren-music-enable").on("change", async function () {
        const isChecked = $(this).is(":checked");

        // 1. 处理 UI 动画伸缩
        if (isChecked) {
            $("#siren-music-settings-wrapper").slideDown(200);
            if ($("#siren-music-floating-enable").is(":checked"))
                $("#siren-music-player").fadeIn(200);
        } else {
            $("#siren-music-settings-wrapper").slideUp(200);
            $("#siren-music-player").fadeOut(200);
        }

        // 2. 即时更新内存数据并写入 settings.json
        const mSettings = getSirenSettings().music;
        mSettings.enabled = isChecked;
        saveSirenSettings(true);

        // 3. 穿透底层，静默同步 Siren-Voice 世界书中的 Music 词条
        await syncMusicWorldbookEntry(isChecked);
    });

    $("#siren-music-floating-enable").on("change", function () {
        if ($(this).is(":checked") && $("#siren-music-enable").is(":checked")) {
            $("#siren-music-player").fadeIn(200);
        } else {
            $("#siren-music-player").fadeOut(200);
        }
    });

    // 保存设置
    $("#siren-music-save-btn").on("click", function () {
        $(this).css("transform", "scale(1.2)");
        setTimeout(() => $(this).css("transform", "scale(1)"), 200);

        const oldSettings = getSirenSettings();
        const wasMsgEnabled = oldSettings.music?.styles?.msgEnabled; // 记录保存前的开关状态

        const mSettings = getSirenSettings().music;
        mSettings.enabled = $("#siren-music-enable").is(":checked");
        mSettings.floating_enabled = $("#siren-music-floating-enable").is(
            ":checked",
        );
        mSettings.auto_play = $("#siren-music-auto-play").is(":checked");
        mSettings.source = $("#siren-music-source").val();
        mSettings.mode = $("#siren-music-mode").val();

        if (typeof sirenStyleDraft !== "undefined" && sirenStyleDraft) {
            mSettings.styles = JSON.parse(JSON.stringify(sirenStyleDraft));
        }

        saveSirenSettings();

        if (typeof updatePlayerCustomStyle === "function") {
            updatePlayerCustomStyle(mSettings.styles);
        }

        // 🚀 注入 CSS，实现视觉上的“秒切”
        if (typeof applyMusicBeautifyCss === "function") {
            applyMusicBeautifyCss();
        }

        // 🛡️ 性能护城河：只有当用户“打开/关闭”深海气泡拟态时，才重写正则并导致重载
        const isMsgEnabledNow = $("#siren-style-msg-enable").is(":checked");
        if (wasMsgEnabled !== isMsgEnabledNow) {
            if (typeof updateSirenRegex === "function") {
                updateSirenRegex(mSettings.styles);
            }
        } else if (window.toastr) {
            // 如果只是换了个皮肤，给用户一个秒切成功的清爽反馈
            window.toastr.success("音乐卡片涂装已无缝切换！");
        }
    });

    // 刷新按钮
    $("#siren-echo-refresh-btn").on("click", () => {
        currentEchoPage = 1;
        renderEchoPage();
    });

    // 翻页按钮
    $("#siren-echo-prev").on("click", () => {
        currentEchoPage--;
        renderEchoPage();
    });
    $("#siren-echo-next").on("click", () => {
        currentEchoPage++;
        renderEchoPage();
    });

    // 将历史歌曲添加到“深海歌单”
    $(document)
        .off("click", ".siren-ext-echo-to-playlist")
        .on("click", ".siren-ext-echo-to-playlist", function () {
            const songObj = JSON.parse(
                decodeURIComponent(atob($(this).data("obj"))),
            );
            const mSettings = getSirenSettings().music;

            // 因为回响里没有确切的 id (盲搜机制)，我们用 name + artist 做去重检测
            const isExist = mSettings.playlist.some(
                (s) => s.name === songObj.name && s.artist === songObj.artist,
            );

            if (!isExist) {
                // 给它生成一个伪 ID，防止歌单列表的 key 冲突
                songObj.id = "echo_" + Date.now();
                mSettings.playlist.push(songObj);
                saveSirenSettings();

                // 渲染下方的深海歌单
                renderPlaylistPage();
                if (window.toastr)
                    window.toastr.success(
                        `已将《${songObj.name}》加入深海歌单！`,
                    );
            } else {
                if (window.toastr)
                    window.toastr.warning("这首歌已经在歌单里啦！");
            }
        });

    // 监听 events.js 派发的刷新事件 (AI 刚点完歌，自动刷新列表)
    window.addEventListener("siren:echo_updated", () => {
        currentEchoPage = 1;
        renderEchoPage();
    });

    $(document)
        .off("click", ".siren-ext-play-echo")
        .on("click", ".siren-ext-play-echo", function () {
            const name = $(this).data("name");
            const artist = $(this).data("artist");
            const source = $("#siren-music-source").val() || "netease";

            // UI 反馈（转圈动画）
            const icon = $(this);
            icon.removeClass("fa-play").addClass("fa-spinner fa-spin");
            setTimeout(() => {
                icon.removeClass("fa-spinner fa-spin").addClass("fa-play");
            }, 1000);

            // 🌟 【核心修复：隔离歌单上下文】
            // 1. 如果当前处于自定义歌单模式，强行切回“智能配乐”并保存设置
            if ($("#siren-music-mode").val() !== "smart") {
                $("#siren-music-mode").val("smart");
                $("#siren-music-save-btn").trigger("click");
            }

            // 2. 获取当前的整个回响列表，并灌入底层作为播放列表！
            const history = getEchoHistory();
            setPlaylistContext(history, { name: name, artist: artist });

            if (window.toastr) window.toastr.info(`正在重新打捞: ${name}...`);

            // 调用逻辑层的智能盲搜播放
            playTargetSong(name, artist, source);
        });

    // ==========================================
    // 🌟 弹窗选曲业务流
    // ==========================================
    const modal = $("#siren-music-search-modal");

    // 关闭弹窗
    $("#siren-close-modal-btn, #siren-music-search-modal").on(
        "click",
        function (e) {
            if (e.target === this) modal.addClass("siren-ext-hidden");
        },
    );

    // 点击搜索打开弹窗
    $(document)
        .off("click", "#siren-music-search-btn")
        .on("click", "#siren-music-search-btn", async () => {
            // 使用 || "" 防止 val() 未定义导致的 .trim() 崩溃
            let title = ($("#siren-music-search-title").val() || "").trim();
            let artist = ($("#siren-music-search-artist").val() || "").trim();
            if (!title) {
                alert("歌曲名是必填项哦！");
                return;
            }

            const source = $("#siren-music-source").val();
            title = title.replace(/\s+/g, " ");
            artist = artist.replace(/\s+/g, " ");
            const keyword = artist ? `${title} ${artist}` : title;

            const modal = $("#siren-music-search-modal");
            modal.removeClass("siren-ext-hidden");
            const container = $("#siren-modal-results-container");
            container.html(
                `<div style="text-align:center; padding: 40px; color:#06b6d4;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><div style="margin-top:10px;">声纳扫描中...</div></div>`,
            );

            let results = await searchSongList(keyword, source);

            if ((!results || results.length === 0) && artist) {
                console.log(
                    `[Siren] 组合搜索无结果，降级为仅搜索歌名: ${title}`,
                );
                results = await searchSongList(title, source);
            }

            if (!results || results.length === 0) {
                container.html(
                    `<div style="text-align:center; padding: 40px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><div style="margin-top:10px;">未能打捞到目标，请尝试更换关键词或在上方更换音乐源。</div></div>`,
                );
                return;
            }

            let resultHtml =
                '<ul style="list-style:none; padding:0; margin:0;">';
            results.forEach((song) => {
                const artistName = Array.isArray(song.artist)
                    ? song.artist.join("/")
                    : song.artist;
                song.source = source;
                const b64Data = btoa(encodeURIComponent(JSON.stringify(song)));
                resultHtml += `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #1e293b;">
                    <div style="flex:1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding-right: 15px;">
                        <strong style="color: #f1f5f9; font-size: 1.05em;">${song.name}</strong>
                        <div style="color: #64748b; font-size: 0.85em; margin-top: 4px;">
                            <i class="fa-solid fa-user"></i> ${artistName} &nbsp;|&nbsp; 
                            <i class="fa-solid fa-compact-disc"></i> ${song.album || "未知专辑"}
                        </div>
                    </div>
                    <button class="siren-ext-btn siren-ext-add-exact-btn" data-obj="${b64Data}" style="background: #1e293b; color: #06b6d4; border: 1px solid #06b6d4;">
                        <i class="fa-solid fa-plus"></i> 添加
                    </button>
                </li>
            `;
            });
            resultHtml += "</ul>";
            container.html(resultHtml);
        });

    // 弹窗内：点击"添加"
    $(document)
        .off("click", ".siren-ext-add-exact-btn")
        .on("click", ".siren-ext-add-exact-btn", function () {
            const songObj = JSON.parse(
                decodeURIComponent(atob($(this).data("obj"))),
            );
            const mSettings = getSirenSettings().music;

            // 数据去重：防止同一首歌被添加两次
            if (!mSettings.playlist.some((s) => s.id === songObj.id)) {
                mSettings.playlist.push(songObj);
                saveSirenSettings(); // 核心：操作完立刻存入本地
            }

            renderPlaylistPage(); // 动态重绘画布

            $("#siren-music-search-title").val("");
            $("#siren-music-search-artist").val("");
            $("#siren-music-search-modal").addClass("siren-ext-hidden");
        });

    // 列表操作：删除
    $(document)
        .off("click", ".siren-ext-del-song")
        .on("click", ".siren-ext-del-song", function () {
            const b64Data = $(this)
                .siblings("span")
                .find(".siren-ext-song-data")
                .data("obj");
            if (!b64Data) return;
            const songObj = JSON.parse(decodeURIComponent(atob(b64Data)));

            const mSettings = getSirenSettings().music;
            mSettings.playlist = mSettings.playlist.filter(
                (s) => s.id !== songObj.id,
            );
            saveSirenSettings();

            // 重新渲染（如果在最后一页删空了，引擎会自动往前翻一页）
            renderPlaylistPage();
        });

    $(document)
        .off("click", "#siren-btn-page-prev")
        .on("click", "#siren-btn-page-prev", () => {
            currentPlaylistPage--;
            renderPlaylistPage();
        });
    $(document)
        .off("click", "#siren-btn-page-next")
        .on("click", "#siren-btn-page-next", () => {
            currentPlaylistPage++;
            renderPlaylistPage();
        });

    // 列表操作：精准播放
    $("#siren-music-list").on("click", ".siren-ext-play-song", function () {
        const songObj = JSON.parse(
            decodeURIComponent(atob($(this).data("obj"))),
        );

        // 【优化】自动切换到歌单模式并保存
        if ($("#siren-music-mode").val() !== "playlist") {
            $("#siren-music-mode").val("playlist");
            $("#siren-music-save-btn").trigger("click");
        }

        // 获取最新歌单同步给底层逻辑
        const mSettings = getSirenSettings().music;
        setPlaylistContext(mSettings.playlist, songObj);

        playExactSong(songObj);
    });
    // 【新增】导出歌单逻辑
    $("#siren-music-export-btn").on("click", function () {
        const playlist = getSirenSettings().music.playlist || [];
        const blob = new Blob([JSON.stringify(playlist, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "siren_playlist.json";
        a.click();
        URL.revokeObjectURL(url);
    });

    // 【新增】导入歌单逻辑
    $("#siren-music-import-btn").on("click", () =>
        $("#siren-music-import-file").click(),
    );

    $("#siren-music-import-file").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const importedList = JSON.parse(event.target.result);
                if (Array.isArray(importedList)) {
                    const mSettings = getSirenSettings().music;
                    // 合并去重或直接追加，这里使用追加
                    mSettings.playlist =
                        mSettings.playlist.concat(importedList);
                    saveSirenSettings();
                    loadSettingsToUI();
                    if (window.toastr)
                        window.toastr.success("收纳海螺：歌单导入成功！");
                }
            } catch (err) {
                alert("解析失败，这好像不是有效的声纳数据(JSON)。");
            }
            $(this).val(""); // 允许重复选同一文件
        };
        reader.readAsText(file);
    });

    // ==========================================
    // 🌟 幻彩贝壳 (样式自定义) 业务流
    // ==========================================

    // 1. 播放器涂装下拉框切换
    $("#siren-style-player-mode").on("change", function () {
        if ($(this).val() === "custom") {
            $("#siren-style-player-css-wrapper").slideDown(200);
        } else {
            $("#siren-style-player-css-wrapper").slideUp(200);
        }
        updateStylePreview();
    });

    // 2. 楼层捕获开关切换
    $("#siren-style-msg-enable").on("change", function () {
        sirenStyleDraft.msgEnabled = $(this).is(":checked");
        if (sirenStyleDraft.msgEnabled) {
            $("#siren-style-msg-html-wrapper").slideDown(200);
        } else {
            $("#siren-style-msg-html-wrapper").slideUp(200);
        }
        updateStylePreview();
    });

    $("#siren-style-player-select").on("change", function () {
        sirenStyleDraft.playerCurrent = $(this).val();
        updateTextareasState();
        updateStylePreview();
    });

    $("#siren-style-msg-select").on("change", function () {
        sirenStyleDraft.msgCurrent = $(this).val();
        updateTextareasState();
        updateStylePreview();
    });

    // 新增：药丸涂装
    $("#siren-style-player-add-btn").on("click", function () {
        const name = prompt("为新的药丸涂装命名：", "自定义涂装");
        if (!name || !name.trim()) return;
        const id = "p_custom_" + Date.now();
        sirenStyleDraft.playerDict[id] = {
            name: name.trim(),
            code: "/* 在此输入针对 #siren-music-player 的 CSS */\n",
            isReadonly: false,
        };
        sirenStyleDraft.playerCurrent = id;
        refreshStyleDropdowns();
        updateStylePreview();
    });

    $("#siren-style-player-del-btn").on("click", function () {
        const id = sirenStyleDraft.playerCurrent;

        // 拦截只读样式（原生默认样式）
        if (sirenStyleDraft.playerDict[id].isReadonly) {
            if (window.toastr)
                window.toastr.warning("原生涂装受到深海力量保护，无法删除！");
            return;
        }

        const name = sirenStyleDraft.playerDict[id].name;
        if (
            confirm(
                `确定要移除涂装 "${name}" 吗？\n(注意：这只是从草稿中移除，点击右上角保存后正式生效)`,
            )
        ) {
            // 从草稿字典中删除
            delete sirenStyleDraft.playerDict[id];
            // 默认切回 default
            sirenStyleDraft.playerCurrent = "default";

            refreshStyleDropdowns();
            updateStylePreview();
        }
    });

    // 新增：楼层卡片
    $("#siren-style-msg-add-btn").on("click", function () {
        const name = prompt("为新的楼层卡片命名：", "自定义卡片");
        if (!name || !name.trim()) return;
        const id = "m_custom_" + Date.now();
        sirenStyleDraft.msgDict[id] = {
            name: name.trim(),
            code: "<div class='siren-msg-card-default'>\n  🎵 {{title}} - {{artist}}\n</div>",
            isReadonly: false,
        };
        sirenStyleDraft.msgCurrent = id;
        refreshStyleDropdowns();
        updateStylePreview();
    });

    $("#siren-style-msg-del-btn").on("click", function () {
        const id = sirenStyleDraft.msgCurrent;

        // 拦截只读样式
        if (sirenStyleDraft.msgDict[id].isReadonly) {
            if (window.toastr)
                window.toastr.warning("原生卡片受到深海力量保护，无法删除！");
            return;
        }

        const name = sirenStyleDraft.msgDict[id].name;
        if (
            confirm(
                `确定要移除卡片 "${name}" 吗？\n(注意：这只是从草稿中移除，点击右上角保存后正式生效)`,
            )
        ) {
            // 从草稿字典中删除
            delete sirenStyleDraft.msgDict[id];
            // 默认切回 default
            sirenStyleDraft.msgCurrent = "default";

            refreshStyleDropdowns();
            updateStylePreview();
        }
    });

    // 文本输入，只修改当前选中的草稿代码
    $("#siren-style-player-css").on("input", function () {
        const id = sirenStyleDraft.playerCurrent;
        if (!sirenStyleDraft.playerDict[id].isReadonly) {
            sirenStyleDraft.playerDict[id].code = $(this).val();
            updateStylePreview();
        }
    });

    $("#siren-style-msg-html").on("input", function () {
        const id = sirenStyleDraft.msgCurrent;
        if (!sirenStyleDraft.msgDict[id].isReadonly) {
            sirenStyleDraft.msgDict[id].code = $(this).val();
            updateStylePreview();
        }
    });

    // 导入/导出直接操作草稿，不主动保存
    $("#siren-style-export-btn").on("click", function () {
        const blob = new Blob([JSON.stringify(sirenStyleDraft, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "siren_theme_coating.json";
        a.click();
        URL.revokeObjectURL(url);
    });

    $("#siren-style-import-btn").on("click", () =>
        $("#siren-style-import-file").click(),
    );
    $("#siren-style-import-file").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const importedStyles = JSON.parse(event.target.result);
                if (importedStyles.playerDict) {
                    sirenStyleDraft = Object.assign(
                        {},
                        sirenStyleDraft,
                        importedStyles,
                    );
                    refreshStyleDropdowns();
                    updateStylePreview();
                    if (window.toastr)
                        window.toastr.success(
                            "幻彩贝壳：涂装草稿已导入！(点击保存后生效)",
                        );
                }
            } catch (err) {
                alert("解析失败。");
            }
            $(this).val("");
        };
        reader.readAsText(file);
    });
}

// 重新渲染下拉菜单
function refreshStyleDropdowns() {
    const pSelect = $("#siren-style-player-select").empty();
    const mSelect = $("#siren-style-msg-select").empty();

    Object.entries(sirenStyleDraft.playerDict).forEach(([key, obj]) => {
        pSelect.append(new Option(obj.name, key));
    });
    Object.entries(sirenStyleDraft.msgDict).forEach(([key, obj]) => {
        mSelect.append(new Option(obj.name, key));
    });

    pSelect.val(sirenStyleDraft.playerCurrent);
    mSelect.val(sirenStyleDraft.msgCurrent);

    updateTextareasState();
}

// 控制文本框的内容和是否被锁死
function updateTextareasState() {
    const pObj = sirenStyleDraft.playerDict[sirenStyleDraft.playerCurrent];
    if (pObj) {
        $("#siren-style-player-css")
            .val(pObj.code)
            .prop("disabled", !!pObj.isReadonly);
    }

    const mObj = sirenStyleDraft.msgDict[sirenStyleDraft.msgCurrent];
    if (mObj) {
        $("#siren-style-msg-html")
            .val(mObj.code)
            .prop("disabled", !!mObj.isReadonly);
    }
}

// 预览渲染引擎
function updateStylePreview() {
    if (!sirenStyleDraft) return;

    // 处理 CSS 预览
    const pKey = sirenStyleDraft.playerCurrent;
    let cssText = sirenStyleDraft.playerDict[pKey]?.code || "";
    // 不管是什么状态，预览区永远尝试渲染代码
    cssText = cssText.replace(
        /#siren-music-player/g,
        "#siren-music-player-preview",
    );

    let styleTag = document.getElementById("siren-preview-dynamic-style");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "siren-preview-dynamic-style";
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = cssText;

    // 处理 HTML 消息美化预览
    const msgEnabled = sirenStyleDraft.msgEnabled;
    const renderBox = $("#siren-preview-msg-render").css(
        "pointer-events",
        "none",
    );

    if (msgEnabled) {
        // 1. 注入与正则里完全一致的静态 HTML 骨架
        const htmlTpl = `
        <div class="siren-music-card" tabindex="0">
            <div class="siren-music-cover-wrap">
                <i class="fa-solid fa-play siren-play-icon"></i>
            </div>
            <div class="siren-music-info-wrap">
                <span class="siren-title">Song of Siren</span>
                <span class="siren-artist">Siren</span>
            </div>
        </div>`;
        renderBox.html(htmlTpl).show();

        // 2. 将 CSS 注入，并加上 ID 权重，强制让预览区所见即所得！
        const mKey = sirenStyleDraft.msgCurrent;
        const msgCss = sirenStyleDraft.msgDict[mKey]?.code || "";
        if (msgCss) {
            // 🌟 核心修复：给所有 class 加上 #siren-preview-msg-render 前缀，暴力提升权重
            const scopedCss = msgCss.replace(
                /\.siren-([a-zA-Z0-9_-]+)/g,
                "#siren-preview-msg-render :is(.siren-$1, .custom-siren-$1)",
            );
            styleTag.innerHTML += "\n" + scopedCss;
        }
    } else {
        renderBox.hide().empty();
    }
}
