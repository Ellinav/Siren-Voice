// scripts/db.js
import { getSirenSettings } from "./settings.js";

const DB_NAME = "SirenVoiceDB";
const STORE_NAME = "TTS_History";
const DB_VERSION = 2; // 👈 [修改] 将版本号改为 2，触发数据库升级
const BGM_STORE_NAME = "BGM_Cache"; // 👈 [新增] BGM 专属存储库名

/**
 * 初始化并打开数据库
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                });
                store.createIndex("timestamp", "timestamp", { unique: false });
            }

            // 👇 [新增] 创建 BGM 专属库，用 url 作为主键，完美防跨层重复！
            if (!db.objectStoreNames.contains(BGM_STORE_NAME)) {
                const bgmStore = db.createObjectStore(BGM_STORE_NAME, {
                    keyPath: "url",
                });
                bgmStore.createIndex("timestamp", "timestamp", {
                    unique: false,
                });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * 添加一条 TTS 记录到数据库
 * @param {Object} record - 包含 provider, char, text, floor, audioBlob, chatId 的对象
 */
export async function addTtsRecord(record) {
    try {
        const db = await openDB();
        const settings = getSirenSettings();
        const maxLimit = settings?.tts?.history_length ?? 30;

        const newRecord = {
            id:
                Date.now().toString() +
                Math.random().toString(36).substring(2, 6),
            timestamp: Date.now(),
            isFavorite: false,
            chatId: record.chatId || "default", // 👈 [新增] 存储当前聊天窗口 ID
            ...record,
        };

        // 插入逻辑不变...
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        await new Promise((resolve, reject) => {
            const addReq = store.add(newRecord);
            addReq.onsuccess = () => resolve();
            addReq.onerror = (e) => reject(e.target.error);
        });

        if (maxLimit > 0) {
            await enforceHistoryLimit(db, maxLimit);
        }
    } catch (err) {
        console.error("[Siren Voice] 💾 写入 IndexedDB 失败:", err);
    }
}

/**
 * 获取特定聊天窗口的 TTS 历史记录
 * @param {string} chatId - 聊天窗口 ID
 */
export async function getTtsHistory(chatId) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // 👈 [修改] 增加过滤逻辑：只显示匹配当前 chatId 的记录
                const results = request.result
                    .filter((r) => r.chatId === chatId)
                    .sort((a, b) => b.timestamp - a.timestamp);
                resolve(results);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        return [];
    }
}

/**
 * 维持数据库数量不超过设定限制（🚨 核心修改：忽略收藏项）
 */
async function enforceHistoryLimit(db, maxLimit) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // 获取所有记录来过滤
        const request = store.getAll();

        request.onsuccess = () => {
            const records = request.result;
            // 👇 过滤出【未收藏】的记录，并按时间从小到大（最旧在前）排序
            const unFavRecords = records
                .filter((r) => !r.isFavorite)
                .sort((a, b) => a.timestamp - b.timestamp);

            // 如果未收藏的记录超过了限制
            if (unFavRecords.length > maxLimit) {
                const deleteCount = unFavRecords.length - maxLimit;
                for (let i = 0; i < deleteCount; i++) {
                    store.delete(unFavRecords[i].id);
                }
            }
            resolve();
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * 👇 [新增] 删除单条记录
 */
export async function deleteTtsRecord(id) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.error("[Siren Voice] 💾 删除记录失败:", err);
    }
}

/**
 * 👇 [新增] 切换收藏状态
 */
export async function toggleFavoriteTtsRecord(id, isFavorite) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const data = getReq.result;
                if (data) {
                    data.isFavorite = isFavorite; // 更新字段
                    const putReq = store.put(data);
                    putReq.onsuccess = () => resolve();
                    putReq.onerror = (e) => reject(e.target.error);
                } else {
                    resolve();
                }
            };
            getReq.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.error("[Siren Voice] 💾 切换收藏状态失败:", err);
    }
}

/**
 * 清空历史记录 (这里也修改一下，保留被收藏的)
 */
export async function clearTtsHistory() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;
                records.forEach((r) => {
                    if (!r.isFavorite) store.delete(r.id);
                });
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.error("[Siren Voice] 💾 清空 IndexedDB 失败:", err);
    }
}

/**
 * 查找特定条件的最新的 TTS 缓存记录 (用于点击直接播放)
 * @param {string} chatId - 当前聊天窗口 ID
 * @param {string|number} floor - 消息楼层 ID
 * @param {string} char - 角色名
 * @param {string} text - 语音文本
 * @param {string} mood - 情绪 (新增)
 * @param {string} detail - 情绪细节 (新增)
 */
export async function findExactTtsRecord(
    chatId,
    floor,
    char,
    text,
    mood = "",
    detail = "",
) {
    try {
        const history = await getTtsHistory(chatId);
        // getTtsHistory 已经按时间从新到旧排序 (b.timestamp - a.timestamp)
        // 找到的第一个匹配项就是最新生成的版本
        return history.find(
            (r) =>
                String(r.floor) === String(floor) &&
                r.char === char &&
                r.text === text &&
                (r.mood || "") === mood && // 👈 新增：严格匹配情绪
                (r.detail || "") === detail, // 👈 新增：严格匹配细节
        );
    } catch (err) {
        console.error("[Siren Voice] 💾 查找精确 TTS 缓存失败:", err);
        return null;
    }
}

/**
 * 👇 [新增] 获取 BGM 缓存
 * 在 bgm_logic.js 播放前调用，命中则直接用 Blob，并顺手更新一下活跃时间戳
 */
export async function getBgmRecord(url) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(BGM_STORE_NAME, "readwrite"); // 使用 readwrite 以便顺手更新时间
            const store = transaction.objectStore(BGM_STORE_NAME);
            const request = store.get(url);

            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    // 如果被读取了，就更新时间戳，防止被 LRU 误杀
                    record.timestamp = Date.now();
                    store.put(record);
                }
                resolve(record);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.error("[Siren Voice] 💾 读取 BGM 缓存失败:", err);
        return null;
    }
}

/**
 * 👇 [新增] 保存 BGM 缓存，并自动触发 LRU 清理
 */
export async function saveBgmRecord(url, audioBlob) {
    try {
        const db = await openDB();
        const MAX_BGM_CACHE = 20; // 👈 设定最大缓存数量，超过则淘汰最旧的

        const record = {
            url: url,
            audioBlob: audioBlob,
            timestamp: Date.now(), // 存入时打上时间戳
        };

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
            const store = transaction.objectStore(BGM_STORE_NAME);
            // 使用 put：如果存在同样的 url，会自动覆盖并更新 Blob 和 timestamp
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });

        // 保存完毕后，触发容量检测
        await enforceBgmLimit(db, MAX_BGM_CACHE);
    } catch (err) {
        console.error("[Siren Voice] 💾 写入 BGM 缓存失败:", err);
    }
}

/**
 * 👇 [新增] BGM 容量限制清理逻辑
 */
async function enforceBgmLimit(db, maxLimit) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
        const store = transaction.objectStore(BGM_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const records = request.result;

            // 如果数量超标，则按时间从小到大排序 (旧 -> 新)
            if (records.length > maxLimit) {
                records.sort((a, b) => a.timestamp - b.timestamp);

                const deleteCount = records.length - maxLimit;
                for (let i = 0; i < deleteCount; i++) {
                    store.delete(records[i].url);
                    console.log(
                        `[Siren Voice] 🗑️ BGM 缓存超过 ${maxLimit} 首，已自动清理最旧音频`,
                    );
                }
            }
            resolve();
        };
        request.onerror = (e) => reject(e.target.error);
    });
}
