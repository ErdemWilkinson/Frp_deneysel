import { ABILITIES, DAMAGE_TYPES, SKILL_KEYS } from '@masa/shared';

/** Kullanıcıya gösterilebilecek okuma hatası. */
export class SheetReadError extends Error {}

export type SheetReader = (data: Uint8Array, mime: string) => Promise<unknown>;

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-flash';
const TIMEOUT_MS = 90_000;

const PROMPT = `This image is a Dungeons & Dragons 5th edition character sheet (it may be in English or Turkish, printed or handwritten).
Read it and reply with one JSON object in exactly this shape:
{
  "name": string,
  "level": integer (total character level),
  "ac": integer (armor class),
  "maxHp": integer (hit point maximum),
  "hp": integer (current hit points; use maxHp if blank),
  "tempHp": integer (0 if blank),
  "speed": integer (walking speed in feet),
  "proficiency": integer (proficiency bonus),
  "abilities": { ${ABILITIES.map((a) => `"${a}": integer`).join(', ')} } (the ability SCORES, not the modifiers),
  "saveProficiencies": array of ability keys whose saving throw is marked proficient,
  "attacks": [ { "name": string, "bonus": integer (attack bonus), "damage": string (dice only, like "1d8+3"),
                 "type": one of ${DAMAGE_TYPES.map((t) => `"${t}"`).join(', ')},
                 "range": integer feet (5 for melee, 10 for reach, the normal range for ranged weapons) } ],
  "profile": {
    "className": string (class, e.g. "Barbarian"), "background": string, "playerName": string, "race": string,
    "alignment": string, "experience": integer (experience points), "inspiration": integer, "hitDice": string (like "3d12"),
    "skills": object whose keys are among ${SKILL_KEYS.map((k) => `"${k}"`).join(', ')} and whose values are "proficient" or "expertise"
              (only the skills marked proficient; the filled circle or checkbox beside the skill),
    "personality": string (personality traits), "ideals": string, "bonds": string, "flaws": string,
    "equipment": string (the equipment list, one item per line), "features": string (features and traits),
    "languages": string (other proficiencies and languages)
  }
}
Leave out any field you cannot read with confidence. Do not guess numbers. Reply with the JSON object only.`;

/** Karakter sayfası resmini DeepSeek'e okutur; modelin döndürdüğü ham nesneyi verir. Doğrulamayı çağıran yapar. */
export function createSheetReader(apiKey: string, fetchImpl: typeof fetch = fetch): SheetReader {
  return async (data, mime) => {
    const body = JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${Buffer.from(data).toString('base64')}` } },
        ],
      }],
    });
    let res: Response;
    try {
      res = await fetchImpl(ENDPOINT, {
        method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      });
    } catch (error) {
      console.error('Sayfa okuma: servise ulaşılamadı:', error);
      throw new SheetReadError('Sayfa okuma servisine ulaşılamadı; biraz sonra yeniden dene');
    }
    if (res.status === 401 || res.status === 403) throw new SheetReadError('Sayfa okuma servisi anahtarı reddetti; DEEPSEEK_API_KEY değerini kontrol et');
    if (res.status === 402) throw new SheetReadError('Sayfa okuma servisinde bakiye kalmamış');
    if (!res.ok) {
      console.error(`Sayfa okuma: servis ${res.status} döndürdü:`, (await res.text().catch(() => '')).slice(0, 500));
      throw new SheetReadError(`Sayfa okuma servisi hata verdi (${res.status}); biraz sonra yeniden dene`);
    }
    let content = '';
    try {
      const reply = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      content = reply.choices?.[0]?.message?.content ?? '';
      // Model bazen nesneyi açıklama ya da kod çiti içinde verir; ilk süslü parantezden sonuncusuna kadar alınır.
      const parsed: unknown = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('nesne değil');
      return parsed;
    } catch {
      console.error('Sayfa okuma: yanıt çözülemedi:', content.slice(0, 500));
      throw new SheetReadError('Sayfa okunamadı; daha net bir resimle yeniden dene');
    }
  };
}
