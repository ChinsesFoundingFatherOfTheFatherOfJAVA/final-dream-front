import defaultTrainerImg from '@/assets/default-trainer.jpg'
import { resolveAssetUrl } from '@/api/request'

/**
 * 陪练者形象的唯一定位入口：项目配置的形象图（virtual_trainer.avatar_image）→ 内置默认形象。
 *
 * 训练页左栏形象卡、对话区气泡头像、报告页对话记录三处都经它取值。此前这三处各写一套
 * （一张配置图 + 两张颜色不同的内置 SVG），同一会话在两页会出现两张不同的脸。
 */
export const trainerFace = (avatar?: string | null): string => resolveAssetUrl(avatar) || defaultTrainerImg
