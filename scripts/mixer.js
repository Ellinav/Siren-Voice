import { getSirenSettings, saveSirenSettings } from "./settings.js";
import { syncSpatialWorldbookEntries } from "./utils.js";

export function initMixerSettings() {
  const container = document.getElementById("tab-audio-settings");
  if (!container) return;

  const settings = getSirenSettings();

  // 兼容旧配置：初始化 volume 和 spatial 属性
  if (!settings.mixer) settings.mixer = {};
  if (!settings.mixer.volume)
    settings.mixer.volume = {
      master: 100,
      tts: 100,
      ambience: 100,
      sfx: 100,
      music: 100,
    };
  if (settings.mixer.spatial_mode === undefined)
    settings.mixer.spatial_mode = 0;
  if (settings.mixer.stereo_width === undefined)
    settings.mixer.stereo_width = 0.8;
  if (settings.mixer.spatial_radius === undefined)
    settings.mixer.spatial_radius = 2.0;
  if (!settings.mixer.effects) {
    settings.mixer.effects = {
      inner_voice: { enabled: false, reverb: 50, echo: 30 },
      telephone: { enabled: false, bandwidth: 60, distortion: 40 },
    };
  }

  const vol = settings.mixer.volume;

  // 绘制 UI
  container.innerHTML = `
        <div class="siren-ext-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #f3f4f6; font-size: 1.25rem;">调音台</h2>
            <i id="siren-mixer-save-btn" class="fa-solid fa-floppy-disk" style="cursor: pointer; color: #10b981; font-size: 1.2em; transition: color 0.2s, transform 0.2s;" title="保存调音台设置" onmouseover="this.style.color='#34d399'; this.style.transform='scale(1.1)';" onmouseout="this.style.color='#10b981'; this.style.transform='scale(1)';"></i>
        </div>

        <div class="siren-mixer-sliders" style="background: rgba(15,23,42,0.6); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px;">
            ${createSlider("tts", "TTS 语音", vol.tts, "#a855f7")}     
            ${createSlider("ambience", "环境背景音", vol.ambience, "#3b82f6")}   
            ${createSlider("sfx", "特殊效果音", vol.sfx, "#f59e0b")}   
            ${createSlider("music", "潮汐音乐台", vol.music, "#00f5d4")} 
        </div>

        <h3 style="color: #e2e8f0; margin-top: 32px; margin-bottom: 16px; font-size: 1.1rem;">空间感</h3>
        <div class="siren-mixer-spatial" style="background: rgba(15,23,42,0.6); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <div style="width: 100px; color: #cbd5e1; font-weight: 600; font-size: 0.95em;">模式选择</div>
                <select id="siren-spatial-mode" class="siren-ext-select" style="flex: 1; padding: 6px 12px; background: #1e293b; color: #f8fafc; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; outline: none; cursor: pointer;">
                    <option value="0" ${settings.mixer.spatial_mode === 0 ? "selected" : ""}>无 (默认双声道)</option>
                    <option value="1" ${settings.mixer.spatial_mode === 1 ? "selected" : ""}>简单模式 (左右立体声)</option>
                    <option value="2" ${settings.mixer.spatial_mode === 2 ? "selected" : ""}>沉浸模式 (八方全景声)</option>
                </select>
            </div>
            
            <div id="siren-spatial-controls"></div>
        </div>

        <h3 style="color: #e2e8f0; margin-top: 32px; margin-bottom: 16px; font-size: 1.1rem;">特殊效果</h3>
        <div class="siren-mixer-effects" style="background: rgba(15,23,42,0.6); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #cbd5e1; font-weight: 600; font-size: 0.95em;">心声回响</span>
                    <label class="siren-ext-switch">
                        <input type="checkbox" id="siren-fx-inner-enabled" ${settings.mixer.effects.inner_voice.enabled ? "checked" : ""}>
                        <span class="siren-ext-slider"></span>
                    </label>
                </div>
                <div id="siren-fx-inner-controls" style="margin-top: 12px; padding-left: 16px; border-left: 2px solid #38bdf8; display: ${settings.mixer.effects.inner_voice.enabled ? "block" : "none"}; transition: all 0.3s;">
                    <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 16px; line-height: 1.5;">
                        <i class="fa-solid fa-circle-info" style="color: #38bdf8;"></i> 自动对 <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; color: #7dd3fc;">&lt;inner&gt;</code> 标签内的语音进行空灵化处理。<br>
                        <div style="color: #64748b; margin-top: 6px;">
                            <span style="color: #cbd5e1;">• 混响空间：</span>模拟声音在多大体积的房间内反射，数值越大声音越空旷。<br>
                            <span style="color: #cbd5e1;">• 回声强度：</span>声音在空间中反弹回来的清晰度和音量占比。
                        </div>
                    </div>
                    ${createFxSlider("inner_reverb", "混响空间", settings.mixer.effects.inner_voice.reverb, "#38bdf8")}
                    ${createFxSlider("inner_echo", "回声强度", settings.mixer.effects.inner_voice.echo, "#38bdf8")}
                </div>
            </div>

            <hr style="border: none; border-top: 1px dashed rgba(255,255,255,0.1); margin: 24px 0;">

            <div style="margin-bottom: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #cbd5e1; font-weight: 600; font-size: 0.95em;">电话失真</span>
                    <label class="siren-ext-switch">
                        <input type="checkbox" id="siren-fx-tele-enabled" ${settings.mixer.effects.telephone.enabled ? "checked" : ""}>
                        <span class="siren-ext-slider"></span>
                    </label>
                </div>
                <div id="siren-fx-tele-controls" style="margin-top: 12px; padding-left: 16px; border-left: 2px solid #10b981; display: ${settings.mixer.effects.telephone.enabled ? "block" : "none"}; transition: all 0.3s;">
                    <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 16px; line-height: 1.5;">
                        <i class="fa-solid fa-circle-info" style="color: #10b981;"></i> 自动对 <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; color: #6ee7b7;">&lt;phone&gt;</code> 标签内的语音进行电话失真模拟。<br>
                        <div style="color: #64748b; margin-top: 6px;">
                            <span style="color: #cbd5e1;">• 频段压缩：</span>切除高频和低频，数值越大声音越显得“干瘪”和廉价。<br>
                            <span style="color: #cbd5e1;">• 失真度：</span>模拟信号受干扰产生的“电流麦”和破音撕裂感。
                        </div>
                    </div>
                    ${createFxSlider("tele_bandwidth", "频段压缩", settings.mixer.effects.telephone.bandwidth, "#10b981")}
                    ${createFxSlider("tele_distortion", "失真度", settings.mixer.effects.telephone.distortion, "#10b981")}
                </div>
            </div>
        </div>
    `;

  // 绑定音量事件
  const channels = ["master", "tts", "ambience", "sfx", "music"];
  channels.forEach((ch) => {
    const slider = document.getElementById(`siren-vol-${ch}`);
    const display = document.getElementById(`siren-vol-val-${ch}`);
    if (!slider) return;

    slider.style.setProperty("--val", slider.value + "%");
    slider.addEventListener("input", (e) => {
      const val = e.target.value;
      display.innerText = val + "%";
      slider.style.setProperty("--val", val + "%");
      settings.mixer.volume[ch] = parseInt(val, 10);

      const targetChannels =
        ch === "master" ? ["tts", "ambience", "sfx", "music"] : [ch];
      targetChannels.forEach((targetCh) => {
        document.dispatchEvent(
          new CustomEvent("sirenVolumeChanged", {
            detail: { channel: targetCh },
          }),
        );
      });
    });
  });

  // 🌟 绑定空间感下拉菜单事件
  const modeSelect = document.getElementById("siren-spatial-mode");
  modeSelect.addEventListener("change", (e) => {
    const newMode = parseInt(e.target.value, 10);
    settings.mixer.spatial_mode = newMode;

    // 重新渲染下方的控件 (声相宽度/声场半径)
    renderSpatialControls(settings);

    // 🌟 触发空间感的世界书同步
    syncSpatialWorldbookEntries(newMode);
  });

  // 初次渲染空间感控件
  renderSpatialControls(settings);

  // 绑定开关事件 (控制子面板显示/隐藏)
  const setupToggle = (id, subId, effectKey) => {
    const toggle = document.getElementById(id);
    const subPanel = document.getElementById(subId);
    if (toggle && subPanel) {
      toggle.addEventListener("change", (e) => {
        const isEnabled = e.target.checked;
        settings.mixer.effects[effectKey].enabled = isEnabled;
        subPanel.style.display = isEnabled ? "block" : "none";
      });
    }
  };

  setupToggle(
    "siren-fx-inner-enabled",
    "siren-fx-inner-controls",
    "inner_voice",
  );
  setupToggle("siren-fx-tele-enabled", "siren-fx-tele-controls", "telephone");

  // 绑定滑块事件 (保持之前的逻辑即可)
  const bindFxSlider = (id, effectKey, propKey) => {
    const slider = document.getElementById(`siren-fx-${id}`);
    const display = document.getElementById(`siren-fx-val-${id}`);
    if (!slider || !display) return;

    slider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      display.innerText = val + "%";
      slider.style.setProperty("--val", val + "%");
      settings.mixer.effects[effectKey][propKey] = val;
    });
  };

  bindFxSlider("inner_reverb", "inner_voice", "reverb");
  bindFxSlider("inner_echo", "inner_voice", "echo");
  bindFxSlider("tele_bandwidth", "telephone", "bandwidth");
  bindFxSlider("tele_distortion", "telephone", "distortion");

  // 绑定保存按钮
  const saveBtn = document.getElementById("siren-mixer-save-btn");
  saveBtn.addEventListener("click", () => {
    // 切换为加载动画类名
    saveBtn.className = "fa-solid fa-spinner fa-spin";
    saveBtn.style.color = "#0ea5e9"; // 加载时变成蓝色

    saveSirenSettings();

    // 500ms 后恢复原状
    setTimeout(() => {
      saveBtn.className = "fa-solid fa-floppy-disk";
      saveBtn.style.color = "#10b981";
    }, 500);
  });
}

// 🌟 动态渲染空间感下方控件
function renderSpatialControls(settings) {
  const container = document.getElementById("siren-spatial-controls");
  const mode = settings.mixer.spatial_mode;

  if (mode === 0) {
    container.innerHTML = "";
    return;
  }

  if (mode === 1) {
    // UI 用 0-100 代表 0.0-1.0
    const initVal = Math.round(settings.mixer.stereo_width * 100);
    container.innerHTML = `
            <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 12px; padding-left: 100px;">
                <i class="fa-solid fa-circle-info"></i> 提示：简单模式只支持左右双声道。数值越大，左右声相越分离。
            </div>
            ${createSpatialSlider("stereo_width", "声相宽度", initVal, "#f472b6", 0, 100, "%")}
        `;
  } else if (mode === 2) {
    // UI 用 5-50 代表 0.5m-5.0m
    const initVal = Math.round(settings.mixer.spatial_radius * 10);
    container.innerHTML = `
            <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 12px; padding-left: 100px;">
                <i class="fa-solid fa-circle-info"></i> 提示：沉浸模式支持八个方向。半径越大，距离感越远。
            </div>
            ${createSpatialSlider("spatial_radius", "声场半径", initVal, "#a855f7", 5, 50, "m")}
        `;
  }

  // 绑定动态生成的滑动条事件
  const sliderId = mode === 1 ? "stereo_width" : "spatial_radius";
  const slider = document.getElementById(`siren-spatial-${sliderId}`);
  const display = document.getElementById(`siren-spatial-val-${sliderId}`);

  if (slider) {
    // 初始化进度条背景 --val
    const updateValProp = (val) => {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.setProperty("--val", pct + "%");
    };

    updateValProp(slider.value);

    slider.addEventListener("input", (e) => {
      const rawVal = parseFloat(e.target.value);
      updateValProp(rawVal);

      if (mode === 1) {
        settings.mixer.stereo_width = rawVal / 100;
        display.innerText = rawVal + "%";
      } else if (mode === 2) {
        settings.mixer.spatial_radius = rawVal / 10;
        display.innerText = (rawVal / 10).toFixed(1) + "m";
      }
    });
  }
}

// 辅助函数：生成标准 0-100 的音量滑块
function createSlider(id, label, value, color) {
  return `
        <div class="siren-vol-row" style="display: flex; align-items: center; margin: 16px 0;">
            <div style="width: 100px; color: #cbd5e1; font-weight: 600; font-size: 0.95em;">${label}</div>
            <div style="flex: 1; padding: 0 20px;">
                <input type="range" id="siren-vol-${id}" class="siren-ext-slider-input" min="0" max="100" value="${value}"
                    style="--theme-color: ${color};">
            </div>
            <div id="siren-vol-val-${id}" style="width: 45px; text-align: right; color: ${color}; font-family: monospace; font-weight: bold; font-size: 1.1em; text-shadow: 0 0 5px ${color}80;">
                ${value}%
            </div>
        </div>
    `;
}

// 🌟 辅助函数：生成特殊效果的百分比滑块
function createFxSlider(id, label, value, color) {
  return `
        <div class="siren-fx-row" style="display: flex; align-items: center; margin: 12px 0;">
            <div style="width: 80px; color: #94a3b8; font-size: 0.85em;">${label}</div>
            <div style="flex: 1; padding: 0 16px;">
                <input type="range" id="siren-fx-${id}" class="siren-ext-slider-input" min="0" max="100" value="${value}"
                    style="--theme-color: ${color}; --val: ${value}%;">
            </div>
            <div id="siren-fx-val-${id}" style="width: 40px; text-align: right; color: ${color}; font-family: monospace; font-weight: bold; font-size: 1em; text-shadow: 0 0 5px ${color}80;">
                ${value}%
            </div>
        </div>
    `;
}

// 🌟 辅助函数：生成支持自定义范围和单位的空间参数滑块
function createSpatialSlider(id, label, value, color, min, max, unit) {
  const displayStr =
    unit === "m" ? (value / 10).toFixed(1) + unit : value + unit;
  return `
        <div class="siren-spatial-row" style="display: flex; align-items: center; margin: 16px 0;">
            <div style="width: 100px; color: #cbd5e1; font-weight: 600; font-size: 0.95em;">${label}</div>
            <div style="flex: 1; padding: 0 20px;">
                <input type="range" id="siren-spatial-${id}" class="siren-ext-slider-input" min="${min}" max="${max}" value="${value}"
                    style="--theme-color: ${color};">
            </div>
            <div id="siren-spatial-val-${id}" style="width: 45px; text-align: right; color: ${color}; font-family: monospace; font-weight: bold; font-size: 1.1em; text-shadow: 0 0 5px ${color}80;">
                ${displayStr}
            </div>
        </div>
    `;
}
