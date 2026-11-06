export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_BIO_LENGTH = 500;

export type ProfileDetails = { displayName: string | null; bio: string | null };
export type ProfileResult = { success: true; profile: ProfileDetails } | { success: false; error: string };

// Rejects control characters (including newlines) in names; bios may contain line breaks and tabs.
const NAME_CONTROL = /[\p{Cc}\p{Cf}]/u;
const BIO_CONTROL = /[^\P{Cc}\n\r\t]/u;

export function validateProfile(input: { displayName: unknown; bio: unknown }):
  | { profile: ProfileDetails }
  | { error: string } {
  if (typeof input.displayName !== "string" || typeof input.bio !== "string") {
    return { error: "Enter a valid name and bio." };
  }
  const displayName = input.displayName.trim();
  const bio = input.bio.replace(/\r\n?/g, "\n").trim();
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `Names must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.` };
  }
  if (NAME_CONTROL.test(displayName)) return { error: "Names cannot contain line breaks or hidden characters." };
  if (bio.length > MAX_BIO_LENGTH) return { error: `Bios must be at most ${MAX_BIO_LENGTH} characters.` };
  if (BIO_CONTROL.test(bio)) return { error: "Bios cannot contain hidden control characters." };
  return { profile: { displayName: displayName || null, bio: bio || null } };
}
