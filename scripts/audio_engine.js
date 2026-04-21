import { getSirenSettings } from "./settings.js";

let audioCtx = null;

// 🌟 实体调音台总线 (Mixing Buses)
const buses = {
    master: null,
    tts: null,
    bgm: null,
    sfx: null,
    music: null,
};

// 缓存 Audio 源，防止重复接入报错
const sourceCache = new WeakMap();

/**
 * 1. 初始化全局音频引擎与混音台结构
 */
export function initAudioEngine() {
    if (audioCtx) return audioCtx;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    buses.master = audioCtx.createGain();
    buses.master.connect(audioCtx.destination);

    ["tts", "bgm", "sfx", "music"].forEach((ch) => {
        buses[ch] = audioCtx.createGain();
        buses[ch].connect(buses.master);
    });

    syncAllVolumesFromSettings();

    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    console.log(
        "[Siren Voice] 🎛️ 硬件级空间混音台 (Web Audio Mixer) 初始化完成！",
    );
    return audioCtx;
}

export function setBusVolume(channel, value) {
    if (!audioCtx || !buses[channel]) return;
    buses[channel].gain.value = value / 100;
}

export function syncAllVolumesFromSettings() {
    if (!audioCtx) return;
    const settings = getSirenSettings();
    const vol = settings?.mixer?.volume || {
        master: 100,
        tts: 100,
        bgm: 100,
        sfx: 100,
        music: 100,
    };
    setBusVolume("master", vol.master);
    setBusVolume("tts", vol.tts);
    setBusVolume("bgm", vol.bgm);
    setBusVolume("sfx", vol.sfx);
    setBusVolume("music", vol.music);
}

/**
 * 3. 核心：将原生 Audio 贴上效果器和空间化，插入调音台
 * 流程：Audio -> 效果器链 (FX) -> 空间节点(Spatial) -> 调音台对应通道(Bus)
 */
export function routeAudioToMixer(
    audioElement,
    channel = "tts",
    dir = "center",
    tagType = "speak",
) {
    const ctx = initAudioEngine();
    const settings = getSirenSettings();
    const mode = settings?.mixer?.spatial_mode || 0;
    const fxConfig = settings?.mixer?.effects;

    // 1. 获取音源
    let source = sourceCache.get(audioElement);
    if (!source) {
        source = ctx.createMediaElementSource(audioElement);
        sourceCache.set(audioElement, source);
    }

    // 每次重新路由前断开旧连接，防止音量翻倍或内存泄漏
    source.disconnect();

    // ==========================================
    // 🌟 特殊效果器串联 (FX Chain)
    // ==========================================
    // 我们创建一个 fxOut 节点，用来收集处理后的声音
    const fxOut = ctx.createGain();

    if (tagType === "phone" && fxConfig?.telephone?.enabled) {
        const bw = fxConfig.telephone.bandwidth; // 0-100
        const dist = fxConfig.telephone.distortion; // 0-100

        console.log(
            `[Siren Voice] 📞 激活电话失真处理: 频段压缩=${bw}%, 失真度=${dist}%`,
        );

        // 1. 高通滤波 (切掉低频轰鸣，越压缩切得越多)
        const hpf = ctx.createBiquadFilter();
        hpf.type = "highpass";
        hpf.frequency.value = 300 + bw * 7; // 300Hz -> 1000Hz

        // 2. 低通滤波 (切掉高频细节，让声音发闷)
        const lpf = ctx.createBiquadFilter();
        lpf.type = "lowpass";
        lpf.frequency.value = 4000 - bw * 20; // 4000Hz -> 2000Hz

        // 3. 破音失真 (波形塑形器)
        const waveShaper = ctx.createWaveShaper();
        waveShaper.curve = makeDistortionCurve(dist * 1.5); // 放大失真系数
        waveShaper.oversample = "4x";

        // 连线: Source -> HPF -> LPF -> WaveShaper -> FxOut
        source.connect(hpf);
        hpf.connect(lpf);
        lpf.connect(waveShaper);
        waveShaper.connect(fxOut);
    } else if (tagType === "inner" && fxConfig?.inner_voice?.enabled) {
        const revVal = fxConfig.inner_voice.reverb; // 0-100
        const echoVal = fxConfig.inner_voice.echo; // 0-100

        console.log(
            `[Siren Voice] 💭 激活心声回响处理: 空间广度=${revVal}%, 回声强度=${echoVal}%`,
        );

        // 干声 (原本的声音) 直接输出，防止混响让声音变糊
        source.connect(fxOut);

        // 1. 混响器 (Convolver)
        if (revVal > 0) {
            const convolver = ctx.createConvolver();
            // 根据广度计算残响时间 (1秒到4秒)
            const duration = 1.0 + (revVal / 100) * 3.0;
            convolver.buffer = createImpulseResponse(ctx, duration, 2.0);

            const reverbGain = ctx.createGain();
            reverbGain.gain.value = (revVal / 100) * 0.8; // 控制混响湿声音量

            source.connect(convolver);
            convolver.connect(reverbGain);
            reverbGain.connect(fxOut);
        }

        // 2. 回声延迟 (Delay)
        if (echoVal > 0) {
            const delay = ctx.createDelay();
            delay.delayTime.value = 0.3; // 延迟 0.3 秒

            const delayGain = ctx.createGain();
            delayGain.gain.value = (echoVal / 100) * 0.5; // 控制回声音量

            source.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(fxOut);
        }
    } else {
        // 无特效，直接穿透
        source.connect(fxOut);
    }

    // ==========================================
    // 🌟 空间化路由 (Spatial Routing)
    // ==========================================
    const targetBus = buses[channel] || buses.master;

    // 心声和电话强行居中，忽略环境声场
    const effectiveDir =
        tagType === "inner" || tagType === "phone" ? "center" : dir;
    const effectiveMode = tagType === "inner" || tagType === "phone" ? 0 : mode;

    const modeNames = ["0 (中心点)", "1 (简单立体声)", "2 (沉浸全景声)"];
    console.log(
        `[Siren Voice] 🎧 最终物理分配 | 通道:[${channel}] | 标签:<${tagType}> | 场域: ${modeNames[effectiveMode]} | 方位: ${effectiveDir}`,
    );

    if (effectiveMode === 0 || effectiveDir === "center") {
        // 将经过特效处理的 fxOut 直接连到调音台
        fxOut.connect(targetBus);
        return;
    }

    if (effectiveMode === 1) {
        const width = settings.mixer?.stereo_width ?? 0.8;
        const panner = ctx.createStereoPanner();
        let panValue = 0;
        if (effectiveDir === "left") panValue = -width;
        else if (effectiveDir === "right") panValue = width;
        else if (effectiveDir === "far_left") panValue = -1.0;
        else if (effectiveDir === "far_right") panValue = 1.0;

        panner.pan.value = panValue;
        fxOut.connect(panner);
        panner.connect(targetBus);
        return;
    }

    if (effectiveMode === 2) {
        const R = settings.mixer?.spatial_radius ?? 2.0;
        const X_WIDER = R * 0.866;
        const Z_CLOSER = R * 0.5;

        const panner = ctx.createPanner();
        panner.panningModel = "HRTF";
        panner.distanceModel = "inverse";

        const posMap = {
            front: [0, 0, -R],
            back: [0, 0, R],
            left: [-R, 0, 0],
            right: [R, 0, 0],
            front_left: [-X_WIDER, 0, -Z_CLOSER],
            front_right: [X_WIDER, 0, -Z_CLOSER],
            back_left: [-X_WIDER, 0, Z_CLOSER],
            back_right: [X_WIDER, 0, Z_CLOSER],
        };

        const targetPos = posMap[effectiveDir] || [0, 0, -R];
        panner.positionX.value = targetPos[0];
        panner.positionY.value = targetPos[1];
        panner.positionZ.value = targetPos[2];

        fxOut.connect(panner);
        panner.connect(targetBus);
        return;
    }
}

// ==========================================
// 💡 Web Audio 数学算法辅助函数
// ==========================================

/**
 * 生成“失真曲线” (用于电话音破音)
 * 算法原理：非线性 S 型映射，把平滑的正弦波压成带有毛刺的方波
 */
function makeDistortionCurve(amount) {
    const k = typeof amount === "number" ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        // 核心非线性方程
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

/**
 * 纯数学生成“脉冲响应” (用于心声的空旷混响)
 * 算法原理：生成一段白噪音，并乘以指数衰减曲线，模拟声音在墙壁间的无数次回弹衰减。
 */
function createImpulseResponse(ctx, duration, decay) {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        // 随时间递减的乘数 (1 -> 0)
        const multiplier = Math.pow(1 - i / length, decay);
        // 生成包含随机毛刺的立体声反射波
        left[i] = (Math.random() * 2 - 1) * multiplier;
        right[i] = (Math.random() * 2 - 1) * multiplier;
    }
    return impulse;
}
