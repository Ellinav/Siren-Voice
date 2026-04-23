const MODULE_NAME = "siren_voice_settings";

// 定义默认设置，包含了未来的 tts 占位
export const defaultSettings = Object.freeze({
  bgm: {
    enabled: true,
    auto_play: true, // 🌟 新增：全局自动播放
    custom_end_tags: "", // 🌟 新增：自定义触发标签
    fade_duration: 2.0, // 平滑过渡时间（秒）
    start_tag: "<content>",
    end_tag: "</content>",
    karaoke_speed: 1.0, // 卡拉OK速度
    current_list: "default", // 当前选中的列表名
    libraries: {
      default: [
        {
          name: "小雨",
          url: "https://raw.githubusercontent.com/Ellinav/ST-Audio-Assets/main/BGM/%E4%B8%8B%E9%9B%A8/%E5%B0%8F%E9%9B%A8-1.ogg",
        },
        { name: "酒吧", url: "https://files.catbox.moe/qc7a9g.wav" },
      ],
    },
    // 🌟 新增：SFX 效果音库
    sfx_current_list: "default",
    sfx_libraries: {
      default: [
        {
          name: "门铃",
          url: "https://raw.githubusercontent.com/Ellinav/ST-Audio-Assets/main/SFX/%E9%97%A8/%E9%97%A8%E9%93%83-1.ogg",
        },
        {
          name: "敲门",
          url: "https://raw.githubusercontent.com/Ellinav/ST-Audio-Assets/main/SFX/%E9%97%A8/%E6%95%B2%E9%97%A8-1.ogg",
        },
      ],
    },
    // 🌟 新增：旁白滚动样式
    karaoke_style: {
      current: "default",
      dict: {
        default: {
          name: "蓝色",
          code: `
.siren-scene-active .mes_text { color: #64748b; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #06b6d4 var(--k-prog, 0%), #64748b var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #06b6d4 100%, #64748b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        glass: {
          name: "绿色",
          code: `
.siren-scene-active .mes_text { color: #94a3b8; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #34d399 var(--k-prog, 0%), #94a3b8 var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #34d399 100%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        vinyl: {
          name: "黄色",
          code: `
.siren-scene-active .mes_text { color: #6b7280; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #f59e0b var(--k-prog, 0%), #6b7280 var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #f59e0b 100%, #6b7280 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        cyber: {
          name: "赛博蓝",
          code: `
.siren-scene-active .mes_text { color: #334155; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #00f5d4 var(--k-prog, 0%), #334155 var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #00f5d4 100%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        nebula: {
          name: "粉色",
          code: `
.siren-scene-active .mes_text { color: #64748b; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #f472b6 var(--k-prog, 0%), #64748b var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #f472b6 100%, #64748b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        gothic: {
          name: "红色",
          code: `
.siren-scene-active .mes_text { color: #1a1a1a; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #b91c1c var(--k-prog, 0%), #1a1a1a var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #b91c1c 100%, #1a1a1a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        phantom: {
          name: "紫色",
          code: `
.siren-scene-active .mes_text { color: #2e1065; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #d287e9 var(--k-prog, 0%), #5d3d9a var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #d287e9 100%, #5d3d9a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
        simple: {
          name: "素雅灰白",
          code: `/* ⚪ 卡拉OK：灰转白 (Gray to White) */
.siren-scene-active .mes_text { color: #4b5563; transition: color 0.5s ease; }
.siren-karaoke-playing {
    background: linear-gradient(to right, #ffffff var(--k-prog, 0%), #4b5563 var(--k-prog, 0%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
.siren-karaoke-done {
    background: linear-gradient(to right, #ffffff 100%, #4b5563 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}`,
        },
      },
    },
    // 🌟 新增：背景音卡片样式
    card_style: {
      current: "default",
      dict: {
        default: {
          name: "深海",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:rgba(10,15,30,0.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(6,182,212,0.3); padding:4px 12px; border-radius:20px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.3); transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { border-color:#06b6d4; box-shadow:0 4px 15px rgba(6,182,212,0.2); transform: translateY(-1px); }
.siren-bgm-text { color:#f1f5f9; font-size:0.9em; text-shadow:0 0 5px rgba(255,255,255,0.2); }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #06b6d4 !important; font-size: 1.1em !important; filter: drop-shadow(0 0 8px rgba(6,182,212,0.8)); }`,
        },
        deepsea: {
          name: "霓虹",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg, rgba(8,47,73,0.88), rgba(15,23,42,0.92)); border:1px solid rgba(34,211,238,0.35); padding:4px 12px; border-radius:12px; cursor:pointer; box-shadow:0 0 14px rgba(6,182,212,0.18), inset 0 0 12px rgba(6,182,212,0.08); transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { border-color:rgba(34,211,238,0.8); box-shadow:0 0 20px rgba(6,182,212,0.4), inset 0 0 15px rgba(6,182,212,0.2); transform: translateY(-1px); }
.siren-bgm-text { color:#67e8f9; font-weight:700; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #22c55e !important; font-size: 1.1em !important; filter: drop-shadow(0 0 5px rgba(34,197,94,0.5)); }`,
        },
        glass: {
          name: "玻璃",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.08); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.18); padding:4px 12px; border-radius:16px; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,0.18); transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { background: rgba(255,255,255,0.12); border-color:rgba(52,211,153,0.6); box-shadow:0 12px 28px rgba(0,0,0,0.25), 0 0 15px rgba(52,211,153,0.2); transform: translateY(-1px); }
.siren-bgm-text { color:#e2e8f0; font-weight:600; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #34d399 !important; font-size: 1.1em !important; }`,
        },
        vinyl: {
          name: "黑胶唱片",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:#111827; border:1px solid #374151; padding:4px 12px; border-radius:14px; cursor:pointer; box-shadow:0 4px 18px rgba(0,0,0,0.35); transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { border-color:#f59e0b; box-shadow:0 6px 22px rgba(0,0,0,0.5), 0 0 15px rgba(245,158,11,0.15); transform: translateY(-1px); }
.siren-bgm-text { color:#f9fafb; font-weight:700; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #f59e0b !important; font-size: 1.1em !important; }`,
        },
        cyber: {
          name: "赛博终端",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:#0a0f1e; border:1px solid #00f5d4; padding:4px 12px; border-radius:6px; cursor:pointer; box-shadow:0 0 12px rgba(0,245,212,0.18), inset 0 0 10px rgba(0,245,212,0.08); font-family:monospace !important; transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { border-color:#00f5d4; box-shadow:0 0 20px rgba(0,245,212,0.4), inset 0 0 15px rgba(0,245,212,0.2); transform: translateY(-1px); }
.siren-bgm-text { color:#d1fae5; font-weight:700; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #00f5d4 !important; font-size: 1.1em !important; filter: drop-shadow(0 0 5px rgba(0,245,212,0.6)); }`,
        },
        nebula: {
          name: "梦幻星云",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg, rgba(76,29,149,0.9), rgba(30,41,59,0.92), rgba(219,39,119,0.18)); border:1px solid rgba(244,114,182,0.35); padding:4px 12px; border-radius:18px; cursor:pointer; box-shadow:0 0 18px rgba(168,85,247,0.18); transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { border-color:rgba(244,114,182,0.8); box-shadow:0 4px 25px rgba(244,114,182,0.4), 0 0 15px rgba(168,85,247,0.3); transform: translateY(-1px); }
.siren-bgm-text { color:#fce7f3; font-weight:700; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #f472b6 !important; font-size: 1.1em !important; filter: drop-shadow(0 0 5px rgba(244,114,182,0.5)); }`,
        },
        retro: {
          name: "留声机",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#3f2f23,#1f1812); border:1px solid #8b6b4a; padding:4px 12px; border-radius:10px; cursor:pointer; box-shadow:0 6px 16px rgba(0,0,0,0.28); transition:all 0.2s; margin: 4px 0; }
.siren-bgm-card:hover { border-color:#d6c1a3; box-shadow:0 8px 20px rgba(0,0,0,0.4), 0 0 12px rgba(139,107,74,0.3); transform: translateY(-1px); }
.siren-bgm-text { color:#f5deb3; font-weight:700; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #f5deb3 !important; font-size: 1.1em !important; }`,
        },
        pill: {
          name: "极简胶囊",
          icon: "fa-solid fa-headphones-simple",
          code: `
.siren-bgm-card { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(0,0,0,0.08); padding:4px 12px; border-radius:999px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); margin: 4px 0; }
.siren-bgm-card:hover { border-color:rgba(0,0,0,0.15); box-shadow:0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
.siren-bgm-text { color:#1d1d1f; font-weight:600; font-size:0.9em; }
.siren-bgm-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-bgm-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-bgm-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #1d1d1f !important; font-size: 1.1em !important; filter: drop-shadow(0 0 2px rgba(0,0,0,0.05)); }`,
        },
      },
    },
    // 🌟 新增：效果音卡片样式 (SFX)
    sfx_card_style: {
      current: "default",
      dict: {
        default: {
          name: "深海",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:rgba(10,15,30,0.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(6,182,212,0.3); padding:4px 12px; border-radius:16px 4px 16px 4px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.3); transition:all 0.2s; margin: 4px 0; }
.siren-sfx-card:hover { border-color:#06b6d4; box-shadow:0 4px 15px rgba(6,182,212,0.2); transform: translateY(-1px); }
.siren-sfx-text { color:#f1f5f9; font-size:0.9em; text-shadow:0 0 5px rgba(255,255,255,0.2); }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #06b6d4 !important; font-size: 1.1em !important; filter: drop-shadow(0 0 8px rgba(6,182,212,0.8)); }`,
        },
        deepsea: {
          name: "霓虹",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg, rgba(8,47,73,0.88), rgba(15,23,42,0.92)); border:1px solid rgba(34,211,238,0.35); padding:4px 12px; border-radius:14px 4px 14px 4px; cursor:pointer; box-shadow:0 0 14px rgba(6,182,212,0.18), inset 0 0 12px rgba(6,182,212,0.08); transition:all 0.2s; margin: 4px 0; }
.siren-sfx-card:hover { border-color:rgba(34,211,238,0.8); box-shadow:0 0 20px rgba(6,182,212,0.4), inset 0 0 15px rgba(6,182,212,0.2); transform: translateY(-1px); }
.siren-sfx-text { color:#67e8f9; font-weight:700; font-size:0.9em; }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #22c55e !important; font-size: 1.1em !important; filter: drop-shadow(0 0 5px rgba(34,197,94,0.5)); }`,
        },
        glass: {
          name: "玻璃",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.08); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.18); padding:4px 12px; border-radius:16px 4px 16px 4px; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,0.18); transition:all 0.2s; margin: 4px 0; }
.siren-sfx-card:hover { background: rgba(255,255,255,0.12); border-color:rgba(52,211,153,0.6); box-shadow:0 12px 28px rgba(0,0,0,0.25), 0 0 15px rgba(52,211,153,0.2); transform: translateY(-1px); }
.siren-sfx-text { color:#e2e8f0; font-weight:600; font-size:0.9em; }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #34d399 !important; font-size: 1.1em !important; }`,
        },
        vinyl: {
          name: "黑胶唱片",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:#111827; border:1px solid #374151; padding:4px 12px; border-radius:12px 4px 12px 4px; cursor:pointer; box-shadow:0 4px 18px rgba(0,0,0,0.35); transition:all 0.2s; margin: 4px 0; }
.siren-sfx-card:hover { border-color:#f59e0b; box-shadow:0 6px 22px rgba(0,0,0,0.5), 0 0 15px rgba(245,158,11,0.15); transform: translateY(-1px); }
.siren-sfx-text { color:#f9fafb; font-weight:700; font-size:0.9em; }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #f59e0b !important; font-size: 1.1em !important; }`,
        },
        cyber: {
          name: "赛博终端",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:#0a0f1e; border:1px solid #00f5d4; padding:4px 12px; border-radius:8px 0px 8px 0px; cursor:pointer; box-shadow:0 0 12px rgba(0,245,212,0.18), inset 0 0 10px rgba(0,245,212,0.08); font-family:monospace !important; transition:all 0.2s; margin: 4px 0; }
.siren-sfx-card:hover { border-color:#00f5d4; box-shadow:0 0 20px rgba(0,245,212,0.4), inset 0 0 15px rgba(0,245,212,0.2); transform: translateY(-1px); }
.siren-sfx-text { color:#d1fae5; font-weight:700; font-size:0.9em; }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #00f5d4 !important; font-size: 1.1em !important; filter: drop-shadow(0 0 5px rgba(0,245,212,0.6)); }`,
        },
        retro: {
          name: "留声机",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#3f2f23,#1f1812); border:1px solid #8b6b4a; padding:4px 12px; border-radius:10px 2px 10px 2px; cursor:pointer; box-shadow:0 6px 16px rgba(0,0,0,0.28); transition:all 0.2s; margin: 4px 0; }
.siren-sfx-card:hover { border-color:#d6c1a3; box-shadow:0 8px 20px rgba(0,0,0,0.4), 0 0 12px rgba(139,107,74,0.3); transform: translateY(-1px); }
.siren-sfx-text { color:#f5deb3; font-weight:700; font-size:0.9em; }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #f5deb3 !important; font-size: 1.1em !important; }`,
        },
        pill: {
          name: "极简胶囊",
          icon: "fa-solid fa-bell",
          code: `
.siren-sfx-card { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(0,0,0,0.08); padding:4px 12px; border-radius:16px 4px 16px 4px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.04); transition:all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); margin: 4px 0; }
.siren-sfx-card:hover { border-color:rgba(0,0,0,0.15); box-shadow:0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
.siren-sfx-text { color:#1d1d1f; font-weight:600; font-size:0.9em; }
.siren-sfx-card .siren-btn-wrap { display: inline-flex !important; flex-shrink: 0; width: 24px !important; height: 24px !important; align-items: center !important; justify-content: center !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
.siren-sfx-card .siren-btn-wrap:hover { transform: scale(1.15) !important; }
.siren-sfx-card i { display: flex; align-items: center; justify-content: center; transition: filter 0.3s ease !important; color: #1d1d1f !important; font-size: 1.1em !important; filter: drop-shadow(0 0 2px rgba(0,0,0,0.05)); }`,
        },
      },
    },
  },
  music: {
    enabled: true,
    floating_enabled: true,
    auto_play: true,
    source: "netease",
    mode: "smart",
    play_mode: "sequential",
    insert_pos: "at_d",
    char: "system",
    depth: 4,
    order: 100,
    prompt: "请根据当前聊天氛围，在回复末尾附带一首合适的背景音乐...",
    playlist: [],
    styles: {
      msgEnabled: false,
      playerCurrent: "default",
      msgCurrent: "default",
      playerDict: {
        default: {
          name: "深海",
          isReadonly: true,
          code: `/* 深海控制台收到大海保护，不可编辑。如需自定义，请选择新增涂装。*/`,
        },
        deepsea: {
          name: "霓虹",
          isReadonly: true,
          code: `
#siren-music-player {
    background: linear-gradient(135deg, rgba(8,47,73,0.92), rgba(15,23,42,0.95));
    border: 1px solid rgba(34,211,238,0.35);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 14px rgba(6,182,212,0.18), inset 0 0 12px rgba(6,182,212,0.08);
}
#siren-music-player .siren-ext-song-title { color: #67e8f9; }
#siren-music-player .siren-ext-song-artist { color: #94a3b8; }
#siren-music-player .siren-ext-ctrl-btn { color: #67e8f9; }
#siren-music-player #siren-play-btn { color: #22c55e !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #22c55e var(--progress, 0%), rgba(255,255,255,0.15) var(--progress, 0%)) !important;
}
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { background: #22c55e !important; box-shadow: 0 0 8px rgba(34,197,94,0.8) !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { background: #22c55e !important; box-shadow: 0 0 8px rgba(34,197,94,0.8) !important; }`,
        },
        glass: {
          name: "玻璃",
          isReadonly: true,
          code: `
#siren-music-player {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 0 12px 32px rgba(0,0,0,0.25);
}
#siren-music-player .siren-ext-player-cover { background: rgba(16,185,129,0.18); border: 1px solid rgba(16,185,129,0.35); }
#siren-music-player .siren-ext-song-title { color: #e2e8f0; }
#siren-music-player .siren-ext-song-artist { color: #cbd5e1; }
#siren-music-player .siren-ext-ctrl-btn { color: #e2e8f0; }
#siren-music-player #siren-play-btn { color: #34d399 !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #34d399 var(--progress, 0%), rgba(255,255,255,0.2) var(--progress, 0%)) !important;
}
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { background: #34d399 !important; box-shadow: 0 0 8px rgba(52,211,153,0.8) !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { background: #34d399 !important; box-shadow: 0 0 8px rgba(52,211,153,0.8) !important; }`,
        },
        vinyl: {
          name: "黑胶唱片",
          isReadonly: true,
          code: `
#siren-music-player {
    background: #111827;
    border: 1px solid #374151;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
#siren-music-player .siren-ext-player-cover {
    background: radial-gradient(circle at center, #1f2937 0 18%, #000 19% 58%, #1f2937 59% 70%, #000 71% 100%);
    border: 1px solid #4b5563;
}
#siren-music-player .siren-ext-song-title { color: #f9fafb; }
#siren-music-player .siren-ext-song-artist { color: #9ca3af; }
#siren-music-player .siren-ext-ctrl-btn { color: #d1d5db; }
#siren-music-player #siren-play-btn { color: #f59e0b !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #f59e0b var(--progress, 0%), rgba(255,255,255,0.15) var(--progress, 0%)) !important;
}
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { background: #f59e0b !important; box-shadow: 0 0 8px rgba(245,158,11,0.8) !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { background: #f59e0b !important; box-shadow: 0 0 8px rgba(245,158,11,0.8) !important; }`,
        },
        cyber: {
          name: "赛博终端",
          isReadonly: true,
          code: `
#siren-music-player {
    background: #0a0f1e;
    border: 1px solid #00f5d4;
    border-radius: 8px; /* 强制方正一点 */
    box-shadow: 0 10px 25px rgba(0,0,0,0.6), 0 0 12px rgba(0,245,212,0.18), inset 0 0 10px rgba(0,245,212,0.08);
    font-family: monospace;
}
#siren-music-player.expanded { border-radius: 8px; }
#siren-music-player .siren-ext-player-cover { border-radius: 4px; border: 1px solid #00f5d4; }
#siren-music-player .siren-ext-song-title { color: #d1fae5; font-weight: 700; text-shadow: 0 0 5px rgba(0,245,212,0.4); }
#siren-music-player .siren-ext-song-artist { color: #7dd3fc; }
#siren-music-player .siren-ext-ctrl-btn { color: #7dd3fc; }
#siren-music-player #siren-play-btn { color: #00f5d4 !important; text-shadow: 0 0 8px rgba(0,245,212,0.8); }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #00f5d4 var(--progress, 0%), rgba(255,255,255,0.15) var(--progress, 0%)) !important;
}
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { border-radius: 2px !important; background: #00f5d4 !important; box-shadow: 0 0 10px rgba(0,245,212,0.8) !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { border-radius: 2px !important; background: #00f5d4 !important; box-shadow: 0 0 10px rgba(0,245,212,0.8) !important; }`,
        },
        nebula: {
          name: "梦幻星云",
          isReadonly: true,
          code: `
#siren-music-player {
    background: linear-gradient(135deg, rgba(76,29,149,0.92), rgba(30,41,59,0.95), rgba(219,39,119,0.25));
    border: 1px solid rgba(244,114,182,0.35);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 18px rgba(168,85,247,0.18);
}
#siren-music-player .siren-ext-player-cover { background: linear-gradient(135deg, #f472b6, #a855f7); }
#siren-music-player .siren-ext-player-cover i { color: #ffffff !important; } /* 🌟 强制将音符染成白色 */
#siren-music-player .siren-ext-song-title { color: #fce7f3; }
#siren-music-player .siren-ext-song-artist { color: #ddd6fe; }
#siren-music-player .siren-ext-ctrl-btn { color: #e9d5ff; }
#siren-music-player #siren-play-btn { color: #f472b6 !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #a855f7 var(--progress, 0%), rgba(255,255,255,0.2) var(--progress, 0%)) !important;
}
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { background: #f472b6 !important; border-color: #fce7f3 !important; box-shadow: 0 0 8px rgba(244,114,182,0.8) !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { background: #f472b6 !important; border-color: #fce7f3 !important; box-shadow: 0 0 8px rgba(244,114,182,0.8) !important; }`,
        },
        retro: {
          name: "留声机",
          isReadonly: true,
          code: `
#siren-music-player {
    background: linear-gradient(135deg, #3f2f23, #1f1812);
    border: 1px solid #8b6b4a;
    box-shadow: 0 12px 28px rgba(0,0,0,0.6);
}
#siren-music-player .siren-ext-player-cover { background: #8b6b4a; border: 2px solid #5c4033; }
#siren-music-player .siren-ext-player-cover i { color: #f5deb3 !important; } /* 🌟 强制将音符染成复古黄铜色 */
#siren-music-player .siren-ext-song-title { color: #f5deb3; }
#siren-music-player .siren-ext-song-artist { color: #d6c1a3; }
#siren-music-player .siren-ext-ctrl-btn { color: #d6c1a3; }
#siren-music-player #siren-play-btn { color: #f5deb3 !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #8b6b4a var(--progress, 0%), rgba(255,255,255,0.15) var(--progress, 0%)) !important;
}
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { background: #f5deb3 !important; border-color: #8b6b4a !important; box-shadow: 0 0 8px rgba(139,107,74,0.8) !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { background: #f5deb3 !important; border-color: #8b6b4a !important; box-shadow: 0 0 8px rgba(139,107,74,0.8) !important; }`,
        },
        pill: {
          name: "极简胶囊",
          isReadonly: true,
          code: `
#siren-music-player {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 20px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
#siren-music-player .siren-ext-song-title { color: #1d1d1f; font-weight: 600; }
#siren-music-player .siren-ext-song-artist { color: #86868b; font-weight: 500; }
#siren-music-player .siren-ext-ctrl-btn { color: #86868b; transition: color 0.2s ease; }
#siren-music-player .siren-ext-ctrl-btn:hover { color: #1d1d1f; }
#siren-music-player #siren-play-btn { color: #1d1d1f !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar {
    background-image: linear-gradient(to right, #1d1d1f var(--progress, 0%), rgba(0,0,0,0.08) var(--progress, 0%)) !important;
}
/* 仿 Apple 的纯白带阴影滑块 */
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-webkit-slider-thumb { background: #ffffff !important; border: 1px solid rgba(0,0,0,0.1) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; height: 12px !important; width: 12px !important; }
#siren-music-player #siren-ext-progress.siren-ext-progress-bar::-moz-range-thumb { background: #ffffff !important; border: 1px solid rgba(0,0,0,0.1) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; height: 12px !important; width: 12px !important; }`,
        },
      },
      msgDict: {
        default: {
          name: "深海",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:12px !important; background:rgba(10,15,30,0.85) !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; border:1px solid rgba(6,182,212,0.3) !important; padding:6px 14px 6px 6px !important; border-radius:40px !important; box-shadow:0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(6,182,212,0.1) !important; cursor:pointer !important; transition:all 0.3s ease !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; box-shadow:0 6px 20px rgba(6,182,212,0.2) !important; }
.siren-music-cover-wrap { width:30px !important; height:30px !important; border-radius:50% !important; background:#1e293b !important; display:flex !important; align-items:center !important; justify-content:center !important; box-shadow:0 0 8px rgba(0,0,0,0.5) !important; flex-shrink:0 !important; }
/* 🛡️ 强制覆盖 ST 图标颜色 */
.siren-play-icon { color:#06b6d4 !important; font-size:12px !important; filter:drop-shadow(0 0 8px rgba(6,182,212,0.8)) !important; opacity: 1 !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.2 !important; min-width:0 !important; }
/* 🛡️ 强制覆盖 ST 字体颜色 */
.siren-title { color:#f1f5f9 !important; font-weight:600 !important; text-shadow:0 0 5px rgba(255,255,255,0.2) !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#94a3b8 !important; font-size:11px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        deepsea: {
          name: "霓虹",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:10px !important; background:linear-gradient(135deg, rgba(8,47,73,0.88), rgba(15,23,42,0.92)) !important; border:1px solid rgba(34,211,238,0.35) !important; padding:10px 14px !important; border-radius:12px !important; box-shadow:0 0 14px rgba(6,182,212,0.18), inset 0 0 12px rgba(6,182,212,0.08) !important; cursor:pointer !important; transition:all 0.3s ease !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; }
/* 🛡️ 霓虹底座透明化 */
.siren-music-cover-wrap { background:transparent !important; box-shadow:none !important; width:auto !important; height:auto !important; display:inline-flex !important; align-items:center !important; flex-shrink:0 !important; border-radius: 0 !important; }
.siren-play-icon { color:#22c55e !important; font-size:14px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.2 !important; min-width:0 !important; }
.siren-title { color:#67e8f9 !important; font-weight:700 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#94a3b8 !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        glass: {
          name: "玻璃",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:12px !important; background:rgba(255,255,255,0.08) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; border:1px solid rgba(255,255,255,0.18) !important; padding:10px 14px !important; border-radius:16px !important; box-shadow:0 8px 24px rgba(0,0,0,0.18) !important; cursor:pointer !important; transition:all 0.3s ease !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; }
.siren-music-cover-wrap { width:28px !important; height:28px !important; border-radius:50% !important; background:rgba(16,185,129,0.18) !important; border:1px solid rgba(16,185,129,0.35) !important; display:flex !important; align-items:center !important; justify-content:center !important; flex-shrink:0 !important; box-shadow:none !important; }
.siren-play-icon { color:#34d399 !important; font-size:12px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.2 !important; min-width:0 !important; }
.siren-title { color:#e2e8f0 !important; font-weight:600 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#cbd5e1 !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        vinyl: {
          name: "黑胶唱片",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:12px !important; background:#111827 !important; border:1px solid #374151 !important; padding:10px 14px !important; border-radius:14px !important; box-shadow:0 4px 18px rgba(0,0,0,0.35) !important; cursor:pointer !important; transition:all 0.3s ease !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; }
.siren-music-cover-wrap { width:34px !important; height:34px !important; border-radius:50% !important; background:radial-gradient(circle at center, #1f2937 0 18%, #000 19% 58%, #1f2937 59% 70%, #000 71% 100%) !important; border:1px solid #4b5563 !important; display:flex !important; align-items:center !important; justify-content:center !important; flex-shrink:0 !important; box-shadow:none !important; }
.siren-play-icon { color:#f59e0b !important; font-size:11px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.15 !important; min-width:0 !important; }
.siren-title { color:#f9fafb !important; font-weight:700 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#9ca3af !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        cyber: {
          name: "赛博终端",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:10px !important; background:#0a0f1e !important; border:1px solid #00f5d4 !important; padding:10px 14px !important; border-radius:6px !important; box-shadow:0 0 12px rgba(0,245,212,0.18), inset 0 0 10px rgba(0,245,212,0.08) !important; cursor:pointer !important; position:relative !important; transition:all 0.3s ease !important; font-family:monospace !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; box-shadow:0 0 16px rgba(0,245,212,0.3), inset 0 0 10px rgba(0,245,212,0.12) !important; }
/* 重置底座透明，适配统一的 HTML 结构 */
.siren-music-cover-wrap { background:transparent !important; box-shadow:none !important; width:auto !important; height:auto !important; display:inline-flex !important; align-items:center !important; flex-shrink:0 !important; border-radius:0 !important; }
.siren-play-icon { color:#00f5d4 !important; font-size:13px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.2 !important; min-width:0 !important; }
.siren-title { color:#d1fae5 !important; font-weight:700 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#7dd3fc !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        nebula: {
          name: "梦幻星云",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:12px !important; background:linear-gradient(135deg, rgba(76,29,149,0.9), rgba(30,41,59,0.92), rgba(219,39,119,0.18)) !important; border:1px solid rgba(244,114,182,0.35) !important; padding:10px 14px !important; border-radius:18px !important; box-shadow:0 0 18px rgba(168,85,247,0.18) !important; cursor:pointer !important; transition:all 0.3s ease !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; }
.siren-music-cover-wrap { width:30px !important; height:30px !important; border-radius:999px !important; background:linear-gradient(135deg,#f472b6,#a855f7) !important; display:flex !important; align-items:center !important; justify-content:center !important; flex-shrink:0 !important; box-shadow:none !important; }
.siren-play-icon { color:white !important; font-size:12px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.2 !important; min-width:0 !important; }
.siren-title { color:#fce7f3 !important; font-weight:700 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#ddd6fe !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        retro: {
          name: "留声机",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:12px !important; background:linear-gradient(135deg,#3f2f23,#1f1812) !important; border:1px solid #8b6b4a !important; padding:10px 14px !important; border-radius:10px !important; box-shadow:0 6px 16px rgba(0,0,0,0.28) !important; cursor:pointer !important; transition:all 0.3s ease !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; }
.siren-music-cover-wrap { width:30px !important; height:30px !important; border-radius:50% !important; background:#8b6b4a !important; display:flex !important; align-items:center !important; justify-content:center !important; flex-shrink:0 !important; box-shadow:none !important; }
.siren-play-icon { color:#f5deb3 !important; font-size:12px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:column !important; line-height:1.2 !important; min-width:0 !important; }
.siren-title { color:#f5deb3 !important; font-weight:700 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }
.siren-artist { color:#d6c1a3 !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:240px !important; }`,
        },
        pill: {
          name: "极简胶囊",
          isReadonly: false,
          code: `
.siren-music-card { display:inline-flex !important; align-items:center !important; gap:10px !important; background:rgba(255,255,255,0.95) !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; border:1px solid rgba(0,0,0,0.08) !important; padding:8px 14px !important; border-radius:999px !important; cursor:pointer !important; transition:all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important; box-shadow:0 2px 10px rgba(0,0,0,0.04) !important; }
.siren-music-card:hover { transform: translateY(-1px) !important; box-shadow:0 4px 16px rgba(0,0,0,0.08) !important; border-color:rgba(0,0,0,0.15) !important; }
.siren-music-cover-wrap { background:transparent !important; box-shadow:none !important; width:auto !important; height:auto !important; display:inline-flex !important; align-items:center !important; flex-shrink:0 !important; border-radius:0 !important; }
.siren-play-icon { color:#1d1d1f !important; font-size:13px !important; filter:none !important; }
.siren-music-info-wrap { display:flex !important; flex-direction:row !important; align-items:center !important; gap:6px !important; line-height:1 !important; min-width:0 !important; }
.siren-title { color:#1d1d1f !important; font-weight:600 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:120px !important; }
.siren-title::after { content: ' ·'; color:#86868b !important; margin-left:6px; font-weight:normal !important; }
.siren-artist { color:#86868b !important; font-size:12px !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:120px !important; }`,
        },
      },
    },
  },
  tts: {
    enabled: false,
    history_length: 30,
    clean_speak_tags_to_llm: false,
    clean_speak_tags_replacement: "“”",

    // 🌟 新增：TTS 语音条美化预设和状态机
    beautify_enabled: false,
    beautify_current: "深海",
    beautify_css: "", // 当前生效的 CSS 会被写入这里供全局应用
    beautify_list: {
      深海: `/* =========================
   ✨ 深海 (Deep Sea)
   ========================= */
.siren-speak-card { background: rgba(10,15,30,0.85) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1px solid rgba(6,182,212,0.3) !important; padding: 6px 8px !important; border-radius: 40px !important; box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(6,182,212,0.1) !important; }
.siren-speak-card:hover { transform: translateY(-1px) !important; box-shadow: 0 6px 20px rgba(6,182,212,0.2) !important; }
.siren-speak-card .siren-btn-wrap { background: #1e293b !important; border-radius: 50% !important; box-shadow: 0 0 8px rgba(0,0,0,0.5) !important; }
.siren-speak-text { color: #f1f5f9 !important; font-weight: normal !important; text-shadow: 0 0 5px rgba(255,255,255,0.2) !important; }

/* 🌟 无视 ST 剥壳，直接给 data 属性里的 i 标签上色 */
.siren-speak-card .fa-circle-play,
.siren-speak-card .siren-play-spinner-wrap .fa-spinner,
.siren-speak-card [data-siren-icon="1"] i {
    color: #06b6d4 !important; 
    filter: drop-shadow(0 0 8px rgba(6,182,212,0.8)) !important; 
}
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #10b981 !important; filter: drop-shadow(0 0 8px rgba(16,185,129,0.8)) !important; }`,

      霓虹: `/* =========================
   ✨ 霓虹 (Neon)
   ========================= */
.siren-speak-card { background: linear-gradient(135deg, rgba(8,47,73,0.88), rgba(15,23,42,0.92)) !important; border: 1px solid rgba(34,211,238,0.35) !important; box-shadow: 0 0 14px rgba(6,182,212,0.18), inset 0 0 12px rgba(6,182,212,0.08) !important; }
.siren-speak-card:hover { border-color: rgba(34, 211, 238, 0.8) !important; box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 15px rgba(6, 182, 212, 0.2) !important; }
.siren-speak-text { color: #67e8f9 !important; font-weight: normal !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #22c55e !important; filter: drop-shadow(0 0 5px rgba(34,197,94,0.5)) !important; } 
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #f59e0b !important; filter: drop-shadow(0 0 5px rgba(245,158,11,0.5)) !important; }`,

      玻璃: `/* =========================
   ✨ 玻璃 (Glass)
   ========================= */
.siren-speak-card { background: rgba(255,255,255,0.08) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(255,255,255,0.18) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.18) !important; }
.siren-speak-card:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(52, 211, 153, 0.6) !important; box-shadow: 0 12px 28px rgba(0,0,0,0.25), 0 0 15px rgba(52,211,153,0.2) !important; }
.siren-speak-text { color: #e2e8f0 !important; font-weight: normal !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #34d399 !important; }
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #34d399 !important; }`,

      黑胶唱片: `/* =========================
   ✨ 黑胶唱片 (Vinyl)
   ========================= */
.siren-speak-card { background: #111827 !important; border: 1px solid #374151 !important; box-shadow: 0 4px 18px rgba(0,0,0,0.35) !important; }
.siren-speak-card:hover { border-color: #f59e0b !important; box-shadow: 0 6px 22px rgba(0,0,0,0.5), 0 0 15px rgba(245,158,11,0.15) !important; }
.siren-speak-text { color: #f9fafb !important; font-weight: normal !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #f59e0b !important; }
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #9ca3af !important; }`,

      赛博终端: `/* =========================
   ✨ 赛博终端 (Cyber)
   ========================= */
.siren-speak-card { background: #0a0f1e !important; border: 1px solid #00f5d4 !important; border-radius: 6px !important; box-shadow: 0 0 12px rgba(0,245,212,0.18), inset 0 0 10px rgba(0,245,212,0.08) !important; }
.siren-speak-card:hover { border-color: #00f5d4 !important; box-shadow: 0 0 20px rgba(0,245,212,0.4), inset 0 0 15px rgba(0,245,212,0.2) !important; }
.siren-speak-text { color: #d1fae5 !important; font-weight: normal !important; font-family: monospace !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #00f5d4 !important; filter: drop-shadow(0 0 5px rgba(0,245,212,0.6)) !important; }
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #00f5d4 !important; }`,

      梦幻星云: `/* =========================
   ✨ 梦幻星云 (Nebula)
   ========================= */
.siren-speak-card { background: linear-gradient(135deg, rgba(76,29,149,0.9), rgba(30,41,59,0.92), rgba(219,39,119,0.18)) !important; border: 1px solid rgba(244,114,182,0.35) !important; box-shadow: 0 0 18px rgba(168,85,247,0.18) !important; }
.siren-speak-card:hover { border-color: rgba(244, 114, 182, 0.8) !important; box-shadow: 0 4px 25px rgba(244, 114, 182, 0.4), 0 0 15px rgba(168,85,247,0.3) !important; }
.siren-speak-text { color: #fce7f3 !important; font-weight: normal !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #f472b6 !important; filter: drop-shadow(0 0 5px rgba(244,114,182,0.5)) !important; }
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #f472b6 !important; }`,

      留声机: `/* =========================
   ✨ 留声机 (Retro)
   ========================= */
.siren-speak-card { background: linear-gradient(135deg,#3f2f23,#1f1812) !important; border: 1px solid #8b6b4a !important; box-shadow: 0 6px 16px rgba(0,0,0,0.28) !important; }
.siren-speak-card:hover { border-color: #d6c1a3 !important; box-shadow: 0 8px 20px rgba(0,0,0,0.4), 0 0 12px rgba(139,107,74,0.3) !important; }
.siren-speak-text { color: #f5deb3 !important; font-weight: normal !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #f5deb3 !important; }
.siren-speak-card .fa-rotate-right, .siren-speak-card .siren-regen-spinner-wrap .fa-spinner { color: #f5deb3 !important; }`,

      极简胶囊: `/* =========================
   ✨ 极简胶囊 (Pill)
   ========================= */
.siren-speak-card { background: rgba(255, 255, 255, 0.95) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1px solid rgba(0, 0, 0, 0.08) !important; padding: 8px 16px !important; border-radius: 999px !important; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04) !important; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important; }
.siren-speak-card:hover { border-color: rgba(0, 0, 0, 0.15) !important; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important; transform: translateY(-1px) !important; }
.siren-speak-text { color: #1d1d1f !important; font-weight: 500 !important; }
.siren-speak-card .fa-circle-play, .siren-speak-card .siren-play-spinner-wrap .fa-spinner, .siren-speak-card [data-siren-icon="1"] i { color: #1d1d1f !important; filter: none !important; transition: color 0.2s ease !important; }
.siren-speak-card .fa-circle-play:hover, .siren-speak-card .fa-rotate-right:hover, .siren-speak-card [data-siren-icon="1"] i:hover { color: #86868b !important; }`,
    },

    // API
    provider: "indextts",
    minimax: {
      region: "cn",
      api_key: "",
      model: "speech-2.8-hd",
      text_norm: false,
    },
    indextts: {
      api_base: "http://127.0.0.1:7880",
      auto_play: true,
      clean_text: true,
      // 采样参数
      emo_weight: 0.65,
      max_text_tokens_per_segment: 120, // 范围 20-600
      do_sample: true, // 启用采样
      emo_random: false,
      top_p: 0.8,
      top_k: 30,
      temperature: 0.8,
      length_penalty: 0.0,
      num_beams: 3, // 范围 1-10
      repetition_penalty: 10.0,
      max_mel_tokens: 1500,
      // mood 词表提示
      mood_prompt_mode: "preset_plus_custom", // preset_plus_custom / freeform
      // 全局情绪资产库
      // method: "audio" | "vector"
      emotion_presets: [
        /*
                {
                  id: "emo_xxx",
                  name: "悲伤",
                  triggers: ["悲伤"],
                  method: "audio",
                  ref_audio: "sad.wav",
                  emo_weight: 0.75, // 音频专属权重
                  emo_vec: null,
                  emo_random: false
                },
                {
                  id: "emo_yyy",
                  name: "疯狂",
                  triggers: ["疯狂"],
                  method: "vector",
                  ref_audio: null,
                  emo_weight: 0.65,
                  emo_vec: [0.1, 0.8, ...],
                  emo_random: true // 向量专属随机
                }
                */
      ],
      // 自定义 mood 输出时，是否走 detail => emo_text
      allow_detail_as_emo_text: true,
      // 如果 mood 命中预设，detail 是否继续附加到 emo_text 中
      append_detail_to_emo_text: false,
    },
    doubao: {
      app_id: "",
      access_key: "",
    },
    gptsovits: {
      api_base: "http://127.0.0.1:9880",
      api_key: "",
      text_split_method: "按标点符号切",
      fragment_interval: 0.3,
      parallel_infer: true,
      speed_factor: 1.0,
      temperature: 1.0,
      top_p: 1.0,
      top_k: 15,
      repetition_penalty: 1.35,
      seed: -1,
    },
  },
  mixer: {
    volume: {
      master: 100, // 主音量
      tts: 100, // TTS 语音
      bgm: 100, // 环境背景音
      sfx: 100, // 效果音
      music: 100, // 潮汐音乐台
    },
    spatial_mode: 0, // 0: 无, 1: 简单模式, 2: 沉浸模式
    stereo_width: 0.8, // 简单模式的声相宽度 (范围 0.0 ~ 1.0)
    spatial_radius: 2.0, // 沉浸模式的声场半径 (为了方便滑动条，存储时可保持浮点数，UI上映射)
    effects: {
      inner_voice: {
        enabled: false,
        reverb: 50, // 广度/空间感 (0-100)
        echo: 30, // 回声强度 (0-100)
      },
      telephone: {
        enabled: false,
        bandwidth: 60, // 频段压缩 (0-100)
        distortion: 40, // 失真度 (0-100)
      },
    },
  },
});

function deepMergeDefaults(target, defaults) {
  for (const key of Object.keys(defaults)) {
    const defaultValue = defaults[key];
    const targetValue = target[key];

    if (!Object.hasOwn(target, key)) {
      target[key] = structuredClone(defaultValue);
      continue;
    }

    if (
      defaultValue &&
      typeof defaultValue === "object" &&
      !Array.isArray(defaultValue)
    ) {
      if (
        !targetValue ||
        typeof targetValue !== "object" ||
        Array.isArray(targetValue)
      ) {
        target[key] = structuredClone(defaultValue);
      } else {
        deepMergeDefaults(targetValue, defaultValue);
      }
    }
  }
}

/**
 * 获取或初始化设置
 */
export function getSirenSettings() {
  const context = SillyTavern.getContext();
  if (!context || !context.extensionSettings) {
    console.warn("[Siren Voice] SillyTavern context 未就绪，使用默认设置。");
    return structuredClone(defaultSettings);
  }

  // 如果不存在，初始化
  if (!context.extensionSettings[MODULE_NAME]) {
    context.extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
  }

  const settings = context.extensionSettings[MODULE_NAME];
  deepMergeDefaults(settings, defaultSettings);
  return settings;
}

/**
 * 保存设置到本地 JSON
 * @param {boolean} silent - 是否静默保存（默认 false：弹出提示；true：不弹出提示）
 */
export function saveSirenSettings(silent = false) {
  const context = SillyTavern.getContext();
  if (context && context.saveSettingsDebounced) {
    context.saveSettingsDebounced();
    console.log("[Siren Voice] 全局设置已保存至 SillyTavern。");

    // 只有在非静默模式下，才触发 ST 原生的 toastr 提示
    if (!silent && window.toastr) {
      window.toastr.success("Siren Voice 设置已保存！");
    }
  } else {
    console.error(
      "[Siren Voice] 保存失败：未找到 saveSettingsDebounced 方法。",
    );
  }
}

/**
 * 保存数据到当前角色卡的扩展字段 (多 Provider 通用)
 * @param {string} extensionKey 扩展数据的键名 (如 'siren_voice_tts')
 * @param {object} payload 要保存的 JSON 数据
 * @param {boolean} silent 是否静默保存（默认 false：弹出提示；true：不弹出提示）
 */
export async function saveToCharacterCard(
  extensionKey,
  payload,
  silent = false,
) {
  const context = SillyTavern.getContext();
  const { writeExtensionField, characterId } = context;

  // 拦截异常状态：群聊或未选中角色
  if (characterId === undefined || characterId === null) {
    if (!silent && window.toastr)
      window.toastr.warning(
        "当前未选中任何角色（或处于群聊中），无法保存到角色卡！",
      );
    return false;
  }

  try {
    await writeExtensionField(characterId, extensionKey, payload);
    if (!silent && window.toastr)
      window.toastr.success("配置已成功写入当前角色卡！");
    console.log(`[Siren Voice] 成功写入角色卡 (${extensionKey}):`, payload);
    return true;
  } catch (err) {
    console.error("[Siren Voice] 写入角色卡失败:", err);
    if (!silent && window.toastr) window.toastr.error("写入角色卡失败！");
    return false;
  }
}
