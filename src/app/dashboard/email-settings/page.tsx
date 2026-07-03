import { getEmailPreferences } from "@/lib/actions/email";
import { EmailSettingsClient } from "./email-settings-client";

export default async function EmailSettingsPage() {
  const preferences = await getEmailPreferences();
  return <EmailSettingsClient initialPreferences={preferences} />;
}
