/**
 * DPI domain listeleri — ISP/DPI engeline takılan iyi bilinen siteler.
 * Bloklama motorundan bağımsızdır: bypass karar desteği ve UI'da ayrı liste
 * grubu olarak gösterilir.
 *
 * - Çekirdek liste (free): yaygın engellenen sitelerin temel kümesi.
 * - Pro listesi: oyun platformları + sosyal medya dahil genişletilmiş küme
 *   (yalnızca aboneler; free kullanıcı kilitli görür).
 */

export const CORE_DPI_DOMAINS: string[] = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'googlevideo.com',
  'youtube-nocookie.com',
  'twitter.com',
  'x.com',
  't.co',
  'instagram.com',
  'cdninstagram.com',
  'facebook.com',
  'fbcdn.net',
  'whatsapp.com',
  'whatsapp.net',
  'tiktok.com',
  'tiktokcdn.com',
  'spotify.com',
  'scdn.co',
  'soundcloud.com',
  'twitch.tv',
  'jtvnw.net',
  'discord.com',
  'discord.gg',
  'discordapp.com',
  'telegram.org',
  'wikipedia.org',
  'wikimedia.org',
  'archive.org',
  'blogspot.com',
  'blogger.com',
  'medium.com',
  'bitchute.com',
  'rumble.com',
  'odysee.com',
  'vimeo.com',
  'dailymotion.com',
  'reddit.com',
  'redd.it',
  'pinterest.com',
  'quora.com',
  'gstatic.com',
  'googleusercontent.com',
  'ggpht.com',
];

/** Pro'ya özel DPI listesi — oyun platformları + genişletilmiş sosyal medya. */
export const PRO_DPI_DOMAINS: string[] = [
  // Oyun platformları
  'roblox.com',
  'rbxcdn.com',
  'roblox.qq.com',
  'discord.media',
  'discordapp.net',
  'gateway.discord.gg',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'steamcommunity.com',
  'steampowered.com',
  'steamstatic.com',
  'steamcdn-a.akamaihd.net',
  'steam-chat.com',
  'epicgames.com',
  'unrealengine.com',
  'easy.ac',
  'epicgames.dev',
  'ol.epicgames.com',
  'riotgames.com',
  'rgpub.io',
  'leagueoflegends.com',
  'valorant.com',
  'playvalorant.com',
  'pvp.net',
  'chat.riotgames.com',
  'pubg.com',
  'pubgmobile.com',
  'igamecj.com',
  'proximabeta.com',
  'gcloudcs.com',
  'activision.com',
  'callofduty.com',
  'battle.net',
  'blizzard.com',
  'ea.com',
  'origin.com',
  'playstation.com',
  'xbox.com',
  'minecraft.net',
  'mojang.com',
  'hypixel.net',
  'facepunch.com',
  'garrysmod.com',
  // Sosyal medya (genişletilmiş)
  'twimg.com',
  'api.twitter.com',
  'abs.twimg.com',
  'facebook.net',
  'wa.me',
  't.me',
  'telegram.me',
  'core.telegram.org',
  'tiktokv.com',
  'musical.ly',
  'byteoversea.com',
  'ibytedtos.com',
  'ytimg.com',
  'redditmedia.com',
  'redditstatic.com',
  'snapchat.com',
  'sc-cdn.net',
  'linkedin.com',
  'licdn.com',
];

export type DpiPlan = 'free' | 'pro';

/** Plan'a göre tam DPI domain kümesi (pro = çekirdek + pro listesi, dedupe). */
export function getDpiDomains(plan: DpiPlan = 'free'): string[] {
  if (plan !== 'pro') return CORE_DPI_DOMAINS;
  return [...new Set([...CORE_DPI_DOMAINS, ...PRO_DPI_DOMAINS])];
}

export function dpiDomainCount(plan: DpiPlan = 'free'): number {
  return getDpiDomains(plan).length;
}

/** Pro'ya özel ek domain sayısı (free'de olmayanlar). */
export function proDpiExtraCount(): number {
  const core = new Set(CORE_DPI_DOMAINS);
  return PRO_DPI_DOMAINS.filter((d) => !core.has(d)).length;
}