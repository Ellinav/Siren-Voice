import {
  getSirenSettings,
  saveSirenSettings,
  saveToCharacterCard,
} from "./settings.js";
import { generateDoubaoTestAudio } from "./doubao_logic.js";
import { syncTtsWorldbookEntries } from "./utils.js";

// 内置豆包 2.0 官方合成音色列表
const DOUBAO_VOICES_2_0 = [
  { id: "zh_female_vv_uranus_bigtts", name: "Vivi 2.0" },
  { id: "zh_female_xiaohe_uranus_bigtts", name: "小何 2.0" },
  { id: "zh_male_m191_uranus_bigtts", name: "云舟 2.0" },
  { id: "zh_male_taocheng_uranus_bigtts", name: "小天 2.0" },
  { id: "zh_male_liufei_uranus_bigtts", name: "刘飞 2.0" },
  { id: "zh_female_sophie_uranus_bigtts", name: "魅力苏菲 2.0" },
  { id: "zh_female_qingxinnvsheng_uranus_bigtts", name: "清新女声 2.0" },
  { id: "zh_female_cancan_uranus_bigtts", name: "知性灿灿 2.0" },
  { id: "zh_female_sajiaoxuemei_uranus_bigtts", name: "撒娇学妹 2.0" },
  { id: "zh_female_tianmeixiaoyuan_uranus_bigtts", name: "甜美小源 2.0" },
  { id: "zh_female_tianmeitaozi_uranus_bigtts", name: "甜美桃子 2.0" },
  { id: "zh_female_shuangkuaisisi_uranus_bigtts", name: "爽快思思 2.0" },
  { id: "zh_female_peiqi_uranus_bigtts", name: "佩奇猪 2.0" },
  { id: "zh_female_linjianvhai_uranus_bigtts", name: "邻家女孩 2.0" },
  { id: "zh_male_shaonianzixin_uranus_bigtts", name: "少年梓辛/Brayan 2.0" },
  { id: "zh_male_sunwukong_uranus_bigtts", name: "猴哥 2.0" },
  { id: "zh_female_yingyujiaoxue_uranus_bigtts", name: "Tina老师 2.0" },
  { id: "zh_female_kefunvsheng_uranus_bigtts", name: "暖阳女声 2.0" },
  { id: "zh_female_xiaoxue_uranus_bigtts", name: "儿童绘本 2.0" },
  { id: "zh_male_dayi_uranus_bigtts", name: "大壹 2.0" },
  { id: "zh_female_mizai_uranus_bigtts", name: "黑猫侦探社咪仔 2.0" },
  { id: "zh_female_jitangnv_uranus_bigtts", name: "鸡汤女 2.0" },
  { id: "zh_female_meilinvyou_uranus_bigtts", name: "魅力女友 2.0" },
  { id: "zh_female_liuchangnv_uranus_bigtts", name: "流畅女声 2.0" },
  { id: "zh_male_ruyayichen_uranus_bigtts", name: "儒雅逸辰 2.0" },
  { id: "en_male_tim_uranus_bigtts", name: "Tim" },
  { id: "en_female_dacey_uranus_bigtts", name: "Dacey" },
  { id: "en_female_stokie_uranus_bigtts", name: "Stokie" },
  { id: "zh_female_wenroumama_uranus_bigtts", name: "温柔妈妈 2.0" },
  { id: "zh_male_jieshuoxiaoming_uranus_bigtts", name: "解说小明 2.0" },
  { id: "zh_female_tvbnv_uranus_bigtts", name: "TVB女声 2.0" },
  { id: "zh_male_yizhipiannan_uranus_bigtts", name: "译制片男 2.0" },
  { id: "zh_female_qiaopinv_uranus_bigtts", name: "俏皮女声 2.0" },
  { id: "zh_female_zhishuaiyingzi_uranus_bigtts", name: "直率英子 2.0" },
  { id: "zh_male_linjiananhai_uranus_bigtts", name: "邻家男孩 2.0" },
  { id: "zh_male_silang_uranus_bigtts", name: "四郎 2.0" },
  { id: "zh_male_ruyaqingnian_uranus_bigtts", name: "儒雅青年 2.0" },
  { id: "zh_male_qingcang_uranus_bigtts", name: "擎苍 2.0" },
  { id: "zh_male_xionger_uranus_bigtts", name: "熊二 2.0" },
  { id: "zh_female_yingtaowanzi_uranus_bigtts", name: "樱桃丸子 2.0" },
  { id: "zh_male_wennuanahu_uranus_bigtts", name: "温暖阿虎/Alvin 2.0" },
  { id: "zh_male_naiqimengwa_uranus_bigtts", name: "奶气萌娃 2.0" },
  { id: "zh_female_popo_uranus_bigtts", name: "婆婆 2.0" },
  { id: "zh_female_gaolengyujie_uranus_bigtts", name: "高冷御姐 2.0" },
  { id: "zh_male_aojiaobazong_uranus_bigtts", name: "傲娇霸总 2.0" },
  { id: "zh_male_lanyinmianbao_uranus_bigtts", name: "懒音绵宝 2.0" },
  { id: "zh_male_fanjuanqingnian_uranus_bigtts", name: "反卷青年 2.0" },
  { id: "zh_female_wenroushunv_uranus_bigtts", name: "温柔淑女 2.0" },
  { id: "zh_female_gufengshaoyu_uranus_bigtts", name: "古风少御 2.0" },
  { id: "zh_male_huolixiaoge_uranus_bigtts", name: "活力小哥 2.0" },
  { id: "zh_male_baqiqingshu_uranus_bigtts", name: "霸气青叔 2.0" },
  { id: "zh_male_xuanyijieshuo_uranus_bigtts", name: "悬疑解说 2.0" },
  { id: "zh_female_mengyatou_uranus_bigtts", name: "萌丫头/Cutey 2.0" },
  { id: "zh_female_tiexinnvsheng_uranus_bigtts", name: "贴心女声/Candy 2.0" },
  { id: "zh_female_jitangmei_uranus_bigtts", name: "鸡汤妹妹/Hope 2.0" },
  {
    id: "zh_male_cixingjieshuonan_uranus_bigtts",
    name: "磁性解说男声/Morgan 2.0",
  },
  { id: "zh_male_liangsangmengzai_uranus_bigtts", name: "亮嗓萌仔 2.0" },
  { id: "zh_female_kailangjiejie_uranus_bigtts", name: "开朗姐姐 2.0" },
  { id: "zh_male_gaolengchenwen_uranus_bigtts", name: "高冷沉稳 2.0" },
  { id: "zh_male_shenyeboke_uranus_bigtts", name: "深夜播客 2.0" },
  { id: "zh_male_lubanqihao_uranus_bigtts", name: "鲁班七号 2.0" },
  { id: "zh_female_jiaochuannv_uranus_bigtts", name: "娇喘女声 2.0" },
  { id: "zh_female_linxiao_uranus_bigtts", name: "林潇 2.0" },
  { id: "zh_female_lingling_uranus_bigtts", name: "玲玲姐姐 2.0" },
  { id: "zh_female_chunribu_uranus_bigtts", name: "春日部姐姐 2.0" },
  { id: "zh_male_tangseng_uranus_bigtts", name: "唐僧 2.0" },
  { id: "zh_male_zhuangzhou_uranus_bigtts", name: "庄周 2.0" },
  { id: "zh_male_kailangdidi_uranus_bigtts", name: "开朗弟弟 2.0" },
  { id: "zh_male_zhubajie_uranus_bigtts", name: "猪八戒 2.0" },
  { id: "zh_female_ganmaodianyin_uranus_bigtts", name: "感冒电音姐姐 2.0" },
  { id: "zh_female_chanmeinv_uranus_bigtts", name: "谄媚女声 2.0" },
  { id: "zh_female_nvleishen_uranus_bigtts", name: "女雷神 2.0" },
  { id: "zh_female_qinqienv_uranus_bigtts", name: "亲切女声 2.0" },
  { id: "zh_male_kuailexiaodong_uranus_bigtts", name: "快乐小东 2.0" },
  { id: "zh_male_kailangxuezhang_uranus_bigtts", name: "开朗学长 2.0" },
  { id: "zh_male_youyoujunzi_uranus_bigtts", name: "悠悠君子 2.0" },
  { id: "zh_female_wenjingmaomao_uranus_bigtts", name: "文静毛毛 2.0" },
  { id: "zh_female_zhixingnv_uranus_bigtts", name: "知性女声 2.0" },
  { id: "zh_male_qingshuangnanda_uranus_bigtts", name: "清爽男大 2.0" },
  { id: "zh_male_yuanboxiaoshu_uranus_bigtts", name: "渊博小叔 2.0" },
  { id: "zh_male_yangguangqingnian_uranus_bigtts", name: "阳光青年 2.0" },
  { id: "zh_female_qingchezizi_uranus_bigtts", name: "清澈梓梓 2.0" },
  { id: "zh_female_tianmeiyueyue_uranus_bigtts", name: "甜美悦悦 2.0" },
  { id: "zh_female_xinlingjitang_uranus_bigtts", name: "心灵鸡汤 2.0" },
  { id: "zh_male_wenrouxiaoge_uranus_bigtts", name: "温柔小哥 2.0" },
  { id: "zh_female_roumeinvyou_uranus_bigtts", name: "柔美女友 2.0" },
  { id: "zh_male_dongfanghaoran_uranus_bigtts", name: "东方浩然 2.0" },
  { id: "zh_female_wenrouxiaoya_uranus_bigtts", name: "温柔小雅 2.0" },
  { id: "zh_male_tiancaitongsheng_uranus_bigtts", name: "天才童声 2.0" },
  { id: "zh_female_wuzetian_uranus_bigtts", name: "武则天 2.0" },
  { id: "zh_female_gujie_uranus_bigtts", name: "顾姐 2.0" },
  { id: "zh_male_guanggaojieshuo_uranus_bigtts", name: "广告解说 2.0" },
  { id: "zh_female_shaoergushi_uranus_bigtts", name: "少儿故事 2.0" },
  { id: "saturn_zh_female_tiaopigongzhu_tob", name: "调皮公主" },
  { id: "saturn_zh_female_keainvsheng_tob", name: "可爱女生" },
  { id: "saturn_zh_male_shuanglangshaonian_tob", name: "爽朗少年" },
  { id: "saturn_zh_male_tiancaitongzhuo_tob", name: "天才同桌" },
  { id: "saturn_zh_female_cancan_tob", name: "知性灿灿" },
  { id: "saturn_zh_female_qingyingduoduo_cs_tob", name: "轻盈朵朵 2.0" },
  { id: "saturn_zh_female_wenwanshanshan_cs_tob", name: "温婉珊珊 2.0" },
  { id: "saturn_zh_female_reqingaina_cs_tob", name: "热情艾娜 2.0" },
  { id: "saturn_zh_male_qingxinmumu_cs_tob", name: "清新沐沐 2.0" },
];

export function getDoubaoHtml() {
  let optionsHtml = DOUBAO_VOICES_2_0.map(
    (v) => `<option value="${v.id}">${v.name}</option>`,
  ).join("");

  return `
    <div id="siren-doubao-settings" style="display: flex; flex-direction: column; gap: 15px;">
        
        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
            <h4 style="color: #94a3b8; margin-top: 0; margin-bottom: 15px;">
                <i class="fa-solid fa-key" style="margin-right: 5px;"></i> 全局认证配置
            </h4>
            <div class="siren-ext-setting-row siren-ext-flex-between" style="margin-bottom: 10px;">
                <div class="siren-ext-setting-label">App ID</div>
                <input type="text" id="siren-db-appid" class="siren-ext-input" style="max-width: 60%;" placeholder="火山引擎控制台获取">
            </div>
            <div class="siren-ext-setting-row siren-ext-flex-between">
                <div class="siren-ext-setting-label">Access Key</div>
                <input type="password" id="siren-db-ak" class="siren-ext-input" style="max-width: 60%;" placeholder="输入 Access Key (Token)">
            </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #334155; border-radius: 6px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="color: #06b6d4; margin: 0;">
                    <i class="fa-solid fa-users" style="margin-right: 5px;"></i> 角色音色映射
                </h4>
            </div>

            <div id="siren-db-char-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
                </div>

            <button id="siren-db-char-add" class="siren-ext-btn siren-ext-btn-secondary" style="width: 100%; border-style: dashed;">
                <i class="fa-solid fa-plus" style="margin-right: 5px;"></i> 新增角色映射
            </button>
        </div>

        <div style="display: flex; justify-content: center;">
            <button id="siren-db-char-save" class="siren-ext-btn siren-ext-btn-primary" style="width: 100%; padding: 12px 0; justify-content: center; font-size: 1.05em; background: #10b981; border-color: #10b981;">
                <i class="fa-solid fa-floppy-disk" style="margin-right: 8px;"></i>保存配置
            </button>
        </div>

        <div style="margin-top: 10px; border-top: 1px dashed #475569; padding-top: 20px;">
            <h4 style="color: #3b82f6; margin-bottom: 10px; font-size: 1.1em;">
                <i class="fa-solid fa-vial" style="margin-right: 5px;"></i> 豆包发音测试
            </h4>
            
            <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 15px;">
                
                <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 12px; line-height: 1.5;">
                    <i class="fa-solid fa-circle-info" style="margin-right: 4px; color: #3b82f6;"></i> 
                    <b>合成 2.0</b> 支持自然语言情绪提示；<b>复刻 2.0</b> 支持 CoT 标签控制。
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                    <select id="siren-db-test-char" class="siren-ext-select" style="height: 32px; box-sizing: border-box; padding: 0 8px; flex: 1; min-width: 160px;">
                        <option value="">(请先配置并保存上方角色)</option>
                    </select>
                    <input type="text" id="siren-db-test-emotion" class="siren-ext-input" style="height: 32px; box-sizing: border-box; padding: 0 8px; flex: 1; min-width: 160px;" placeholder="情绪提示词 (如: 用开心的语气)">
                </div>

                <textarea id="siren-db-test-text" class="siren-ext-textarea" rows="2" placeholder="输入一句台词测试效果。复刻2.0可直接在此输入 <cot text=哭腔> 等标签。" style="margin-bottom: 10px;"></textarea>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <button id="siren-db-test-generate" class="siren-ext-btn siren-ext-btn-primary" style="background: #3b82f6; border-color: #3b82f6; color: #ffffff;">
                        <i class="fa-solid fa-bolt"></i> 生成
                    </button>
                    
                    <div id="siren-db-test-preview" style="flex: 1; margin-left: 15px; display: flex; align-items: center; gap: 10px;">
                        <audio id="siren-db-test-audio" controls style="height: 32px; flex: 1; display: none;"></audio>
                        
                        <a id="siren-db-test-download" class="siren-ext-btn siren-ext-btn-secondary" style="display: none; padding: 4px 10px; text-decoration: none; color: #cbd5e1;" download="doubao_test.mp3" title="下载音频">
                            <i class="fa-solid fa-download"></i>
                        </a>
                        
                        <span id="siren-db-test-status" style="color: #64748b; font-size: 0.85em; white-space: nowrap;">等待生成...</span>
                    </div>
                </div>
            </div>
        </div>
        
        <template id="siren-db-voice-options">${optionsHtml}</template>
    </div>
    `;
}

export function bindDoubaoEvents() {
  const settings = getSirenSettings();
  const context = SillyTavern.getContext();

  // 1. 还原全局设置
  if (settings.tts.doubao) {
    $("#siren-db-appid").val(settings.tts.doubao.app_id || "");
    $("#siren-db-ak").val(settings.tts.doubao.access_key || "");
  }

  // 2. 加载当前角色的映射列表
  loadCharacterDoubaoSettings();

  // 3. 事件：全局保存
  $("#siren-db-char-save")
    .off("click")
    .on("click", async function (e, isSilent = false) {
      settings.tts.doubao.app_id = $("#siren-db-appid").val().trim();
      settings.tts.doubao.access_key = $("#siren-db-ak").val().trim();
      saveSirenSettings(true);

      // 收集角色列表数据
      const voiceMap = {};
      $("#siren-db-char-list .siren-db-char-row").each(function () {
        const charName = $(this).find(".siren-db-char-name").val().trim();
        const speakerVal =
          $(this).find(".siren-db-speaker-input").val()?.trim() || "";
        const modelVal = $(this).find(".siren-db-model-select").val();

        if (charName && speakerVal) {
          voiceMap[charName] = {
            speaker: speakerVal,
            model: modelVal,
          };
        }
      });

      const success = await saveToCharacterCard(
        "siren_voice_tts_doubao",
        {
          voices: voiceMap,
        },
        true,
      );

      if (success) {
        // 如果不是全局按钮调用的，才自己弹窗
        if (!isSilent && window.toastr) {
          window.toastr.success("Doubao: 配置已保存，已自动切换并同步世界书！");
        }
        refreshTestCharacterSelect(voiceMap);

        // 👇 修改这里：强制将全局 TTS 引擎设为豆包，并确保总开关开启
        const currentSettings = getSirenSettings();
        currentSettings.tts.provider = "doubao";
        currentSettings.tts.enabled = true;
        saveSirenSettings(true); // 保存全局状态的更改

        // 强制调用世界书同步，传入 true (isTtsEnabled) 意味着：
        // 1. 找到并开启 `TTS-豆包` 条目
        // 2. 关闭世界书中其他所有以 `TTS-` 开头的条目
        // 3. 读取最新的角色卡音色信息并注入到 `TTS-豆包` 的 {{VOICE_LIST}} 中
        await syncTtsWorldbookEntries("doubao", true);
      }
    });

  // 4. 事件：添加角色行 (现在名字默认留白)
  $("#siren-db-char-add")
    .off("click")
    .on("click", function () {
      addCharRow("", "seed-tts-2.0", "zh_female_vv_uranus_bigtts");
    });

  // 5. 发音测试按钮点击事件
  $("#siren-db-test-generate")
    .off("click")
    .on("click", async function () {
      const charName = $("#siren-db-test-char").val();
      const emotionPrompt = $("#siren-db-test-emotion").val().trim();
      const text = $("#siren-db-test-text").val().trim();

      if (!charName)
        return (
          window.toastr &&
          window.toastr.warning("请先在上方配置角色映射并点击保存！")
        );
      if (!text)
        return window.toastr && window.toastr.warning("测试文本不能为空");

      // 去角色卡里抓取当前选中角色的具体模型和音色ID
      const context = SillyTavern.getContext();
      const charExt =
        context.characters?.[context.characterId]?.data?.extensions
          ?.siren_voice_tts_doubao || {};
      const config = charExt.voices?.[charName];

      if (!config)
        return (
          window.toastr && window.toastr.error("未能读取到该角色的音色配置")
        );

      // 抓取全局秘钥
      const settings = getSirenSettings();
      const appId = settings.tts.doubao?.app_id;
      const accessKey = settings.tts.doubao?.access_key;

      if (!appId || !accessKey)
        return (
          window.toastr &&
          window.toastr.error("请先配置并保存 App ID 和 Access Key！")
        );

      // UI 状态更新：等待中
      $("#siren-db-test-status")
        .text("正在向豆包发起请求...")
        .css("color", "#3b82f6");
      $("#siren-db-test-audio").hide();
      $("#siren-db-test-download").hide();
      $(this).prop("disabled", true).css("opacity", "0.6");

      try {
        // 发起请求！
        const blobUrl = await generateDoubaoTestAudio({
          appId,
          accessKey,
          model: config.model,
          speaker: config.speaker,
          emotionPrompt,
          text,
        });

        // 成功后渲染播放器和下载按钮
        const $audio = $("#siren-db-test-audio");
        $audio.attr("src", blobUrl);
        $audio.show();
        $audio[0].play(); // 自动播放

        const $download = $("#siren-db-test-download");
        $download.attr("href", blobUrl);
        $download.attr("download", `Doubao_Test_${charName}.mp3`);
        $download.show().css("display", "flex");

        $("#siren-db-test-status").text("生成成功！").css("color", "#10b981");
      } catch (err) {
        $("#siren-db-test-status")
          .text("生成失败 (详见控制台)")
          .css("color", "#ef4444");
        if (window.toastr) window.toastr.error(err.message || "请求失败");
      } finally {
        // 解除按钮锁定
        $(this).prop("disabled", false).css("opacity", "1");
      }
    });

  // 6. 监听角色切换
  context.eventSource.on("chat_id_changed", loadCharacterDoubaoSettings);
}

// 辅助函数：渲染角色卡配置
function loadCharacterDoubaoSettings() {
  const context = SillyTavern.getContext();
  const $list = $("#siren-db-char-list");
  $list.empty();

  if (!context.characterId) {
    $list.html(
      `<div style="color:#64748b; font-size:0.9em; text-align:center; padding: 10px;">当前未选中角色，请在对话内设置。</div>`,
    );
    refreshTestCharacterSelect({}); // 清空测试列表
    return;
  }

  const charExt =
    context.characters?.[context.characterId]?.data?.extensions
      ?.siren_voice_tts_doubao || {};
  const voices = charExt.voices || {};

  if (Object.keys(voices).length === 0) {
    // 列表为空时，新增一行空记录（要求不自动填入名字）
    addCharRow("", "seed-tts-2.0", "zh_female_vv_uranus_bigtts");
  } else {
    for (const [charName, config] of Object.entries(voices)) {
      addCharRow(charName, config.model, config.speaker);
    }
  }

  // 初始化时也刷新一下发音测试的下拉框
  refreshTestCharacterSelect(voices);
}

// 🌟 辅助函数：刷新测试区域的角色下拉框
function refreshTestCharacterSelect(voiceMap) {
  const $select = $("#siren-db-test-char");
  $select.empty();

  const charNames = Object.keys(voiceMap);
  if (charNames.length === 0) {
    $select.append('<option value="">(请先配置并保存上方角色)</option>');
    return;
  }

  charNames.forEach((name) => {
    $select.append(`<option value="${name}">${name}</option>`);
  });
}

// 🌟 核心：动态添加一行，应用类 GSV 的半透明暗箱包围结构
// 🌟 核心：动态添加一行，应用类 GSV 的半透明暗箱包围结构
function addCharRow(name, model, speaker) {
  const rowId = "db-row-" + Date.now() + Math.floor(Math.random() * 1000);

  // 统一样式，匹配 GSV 的 background: rgba(0,0,0,0.25)
  const rowHtml = `
        <div id="${rowId}" class="siren-ext-setting-row siren-db-char-row" style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 4px;">
            
            <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                <input type="text" class="siren-ext-input siren-db-char-name" placeholder="角色名" value="${name}" style="flex: 1; min-width: 0; height: 32px; box-sizing: border-box; margin: 0;">
                
                <select class="siren-ext-select siren-db-model-select" style="flex: 1.5; min-width: 0; height: 32px; box-sizing: border-box; margin: 0;">
                    <option value="seed-tts-2.0">官方合成 2.0</option>
                    <option value="seed-icl-2.0">声音复刻 2.0</option>
                    <option value="seed-icl-1.0">声音复刻 1.0</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                <div class="siren-db-speaker-container" style="flex: 1; min-width: 0; display: flex; align-items: center; height: 32px;">
                    </div>
                
                <button class="siren-ext-btn siren-db-btn-del" style="background:none; border:none; width: 30px; height: 32px; padding: 0 5px; box-sizing: border-box; margin: 0; color: #ef4444; flex-shrink: 0; display: flex; align-items: center; justify-content: center;" title="删除">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;

  const $row = $(rowHtml);
  const $modelSelect = $row.find(".siren-db-model-select");
  const $speakerContainer = $row.find(".siren-db-speaker-container");

  $modelSelect.val(model || "seed-tts-2.0");

  // 内部函数：根据选中的模型，重新渲染右侧的音色控件
  function renderSpeakerField(currentModel, currentValue) {
    if (currentModel === "seed-tts-2.0") {
      // 1. 获取当前选中的音色名称（用于回显展示）
      let initialName = "";
      if (currentValue) {
        const found = DOUBAO_VOICES_2_0.find((v) => v.id === currentValue);
        if (found) initialName = found.name;
      }

      // 2. 预先构建所有列表项的 HTML
      let listHtml = DOUBAO_VOICES_2_0.map(
        (v) =>
          `<div class="siren-db-voice-item" data-id="${v.id}" data-name="${v.name}" style="padding: 6px 10px; cursor: pointer; color: #cbd5e1; font-size: 0.9em; border-bottom: 1px solid rgba(255,255,255,0.05);">${v.name}</div>`,
      ).join("");

      // 3. 构建带搜索的下拉组件
      const html = `
        <div class="siren-db-searchable-select" style="position: relative; width: 100%; height: 32px;">
            <input type="hidden" class="siren-db-speaker-input" value="${currentValue || ""}">
            
            <input type="text" class="siren-ext-input siren-db-speaker-search" placeholder="搜索或选择音色..." value="${initialName}" style="width: 100%; height: 32px; box-sizing: border-box; margin: 0; padding-right: 25px;">
            <i class="fa-solid fa-chevron-down" style="position: absolute; right: 10px; top: 10px; color: #64748b; font-size: 0.8em; pointer-events: none;"></i>
            
            <div class="siren-db-speaker-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid #475569; border-radius: 4px; z-index: 9999; margin-top: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
                ${listHtml}
            </div>
        </div>
      `;
      $speakerContainer.html(html);

      // 4. 绑定组件的交互事件
      const $search = $speakerContainer.find(".siren-db-speaker-search");
      const $hidden = $speakerContainer.find(".siren-db-speaker-input");
      const $dropdown = $speakerContainer.find(".siren-db-speaker-dropdown");
      const $items = $speakerContainer.find(".siren-db-voice-item");

      // 点击或聚焦时展开列表，并全选文字方便重新输入
      $search.on("focus click", function () {
        $dropdown.show();
        $(this).select();
      });

      // 输入时实时过滤列表
      $search.on("input", function () {
        const keyword = $(this).val().toLowerCase();
        $dropdown.show();
        $items.each(function () {
          const text = $(this).data("name").toLowerCase();
          if (text.includes(keyword)) {
            $(this).show();
          } else {
            $(this).hide();
          }
        });
      });

      // 失去焦点时隐藏下拉框，并做防呆校验
      $search.on("blur", function () {
        // 延迟隐藏，确保点击列表项的事件能先触发
        setTimeout(() => {
          $dropdown.hide();
          // 校验：如果用户乱输且没选中，恢复成之前保存的音色名；如果清空了，则清空 ID
          const currentId = $hidden.val();
          const found = DOUBAO_VOICES_2_0.find((v) => v.id === currentId);

          if ($search.val().trim() === "") {
            $hidden.val("");
          } else if (found) {
            $search.val(found.name);
          } else {
            $search.val("");
            $hidden.val("");
          }
        }, 150);
      });

      // 列表项的悬浮变色
      $items.on("mouseenter", function () {
        $(this).css("background", "rgba(59, 130, 246, 0.5)");
      });
      $items.on("mouseleave", function () {
        $(this).css("background", "transparent");
      });

      // 点击选中具体的音色
      $items.on("click", function () {
        const id = $(this).data("id");
        const name = $(this).data("name");

        $hidden.val(id); // 更新真实待保存的 ID
        $search.val(name); // 更新框内显示的名称
        $dropdown.hide();
        $items.show(); // 重置过滤状态以备下次点开
      });
    } else {
      $speakerContainer.html(`
                <input type="text" class="siren-ext-input siren-db-speaker-input" placeholder="输入复刻音色ID" style="width: 100%; height: 32px; box-sizing: border-box; margin: 0;">
            `);
      if (
        currentValue &&
        !DOUBAO_VOICES_2_0.some((v) => v.id === currentValue)
      ) {
        $speakerContainer.find("input").val(currentValue);
      }
    }
  }

  renderSpeakerField($modelSelect.val(), speaker);

  $modelSelect.on("change", function () {
    const newModel = $(this).val();
    const currentSpeaker = $speakerContainer
      .find(".siren-db-speaker-input")
      .val();
    renderSpeakerField(newModel, currentSpeaker);
  });

  $row.find(".siren-db-btn-del").on("click", function () {
    $row.slideUp(150, () => $row.remove());
  });

  $("#siren-db-char-list").append($row);
}
