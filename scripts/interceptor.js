import { stripParentheticalAsides } from "./utils.js";

/**
 * 初始化并挂载 Prompt 拦截器
 */
export function initInterceptor() {
    // 挂载到全局供 SillyTavern 官方框架调用
    globalThis.sirenVoicePromptInterceptor = async function (
        chat,
        contextSize,
        abort,
        type,
    ) {
        try {
            const context = SillyTavern.getContext();
            const settings = context?.extensionSettings?.siren_voice_settings;

            // 1. 检查开关：如果未开启，直接放行
            if (!settings?.tts?.clean_speak_tags_to_llm) {
                return;
            }

            // 2. 遍历发给 LLM 的聊天上下文数组
            for (let i = 0; i < chat.length; i++) {
                const msg = chat[i];
                if (!msg.mes || typeof msg.mes !== "string") continue;

                // 判断语句中，增加 phone 和 inner 的匹配
                if (/<(speak|phone|inner)[^>]*>/i.test(msg.mes)) {
                    // 🚨 核心安全操作：必须使用 structuredClone 进行深拷贝
                    chat[i] = structuredClone(msg);

                    // 替换逻辑中，使用分组和反向引用 \1
                    chat[i].mes = chat[i].mes.replace(
                        /<(speak|phone|inner)[^>]*>([\s\S]*?)<\/\1>/gi,
                        (match, tagName, innerText) => {
                            // 动态获取对应标签的替换符号
                            const tagLower = tagName.toLowerCase();
                            let replacement = "“”";

                            if (tagLower === "speak") {
                                replacement =
                                    settings.tts.clean_speak_tags_replacement ||
                                    "“”";
                            } else if (tagLower === "phone") {
                                replacement =
                                    settings.tts.clean_phone_tags_replacement ||
                                    "“”";
                            } else if (tagLower === "inner") {
                                replacement =
                                    settings.tts.clean_inner_tags_replacement ||
                                    "**";
                            }

                            // 拆分前缀和后缀 (支持长度为2的对称符号，或单个符号)
                            let prefix =
                                replacement.length === 2
                                    ? replacement[0]
                                    : replacement;
                            let suffix =
                                replacement.length === 2
                                    ? replacement[1]
                                    : replacement;

                            // 核心清洗器：剔除中英文语气词及方括号
                            const cleanText =
                                stripParentheticalAsides(innerText);

                            return `${prefix}${cleanText}${suffix}`;
                        },
                    );
                }
            }
        } catch (err) {
            console.error("[Siren Voice][Interceptor] 拦截器执行失败:", err);
        }
    };

    console.log("[Siren Voice] 拦截器 sirenVoicePromptInterceptor 已成功挂载");
}
