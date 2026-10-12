import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Sector = {
  key: string;
  name: string;
  subtitle: string;
  enabled: boolean;
  template?: string;
  rankUrl?: string;
  logo?: string;
};

export type AppSettings = {
  sectors: Sector[];
  template: string;
  rankUrl: string;
  discordInvite: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  sectors: [
    { key: "cid", name: "CID", subtitle: "وكالة الاستخبارات المركزية", enabled: true },
    { key: "swat", name: "SWAT", subtitle: "Special Weapons and Tactics", enabled: true },
    { key: "ps", name: "Public Security", subtitle: "الأمن العام", enabled: true },
    { key: "bg", name: "Border Guard", subtitle: "مديرية حرس الحدود", enabled: true },
    { key: "gs", name: "GS", subtitle: "المباحث العامة", enabled: true },
  ],
  template:
    "PRAVA ⚔️ [M-{militaryNo}] | {playerName} | {gameId}\n{discord}\n<@&1519090286670643250>\n<@&1519090327707979786>\n<@&1519090347529994240>\n<@&1519090401598902334> ←\n<@&1519090405986275518>",
  rankUrl: "https://discord.com/channels/1519014097432350830/1519091263088099410",
  discordInvite: "https://discord.gg/qr3hVs6tQ",
};

export const settingsQuery = queryOptions({
  queryKey: ["app-settings"],
  queryFn: async (): Promise<AppSettings> => {
    const { data } = await supabase.from("app_settings").select("data").eq("id", 1).maybeSingle();
    const saved = (data?.data ?? {}) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...saved };
  },
  staleTime: 30_000,
});

export async function checkPin(pin: string) {
  const { data, error } = await supabase.rpc("check_admin_pin", { pin });
  return !error && data === true;
}

export async function saveSettings(pin: string, s: AppSettings) {
  const { error } = await supabase.rpc("save_app_settings", { pin, new_data: s as never });
  if (error) throw error;
}

export function fillTemplate(t: string, v: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
}
