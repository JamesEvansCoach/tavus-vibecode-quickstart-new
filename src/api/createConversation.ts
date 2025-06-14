import { IConversation } from "@/types";
import { settingsAtom } from "@/store/settings";
import { getDefaultStore } from "jotai";

export const createConversation = async (
  token: string,
): Promise<IConversation> => {
  // Get settings from Jotai store
  const settings = getDefaultStore().get(settingsAtom);
  
  // Add debug logs
  console.log('Creating conversation with settings:', settings);
  console.log('Transcript context value:', settings.context);
  console.log('Persona ID:', settings.persona);
  console.log('Replica ID:', settings.replica);
  
  // Build the payload according to Tavus API documentation
  const payload = {
    // Use the correct Persona ID as specified
    persona_id: settings.persona || "pcce34deac2a",
    // Use the correct Replica ID as specified
    replica_id: settings.replica || "rb17cf590e15",
    // Custom greeting for Charlie
    custom_greeting: settings.greeting || "Hi! I just listened to your presentation and I'm curious to learn more about it. I have some questions I'd love to ask you about what you shared.",
    // Send the presentation transcript as conversational context
    conversational_context: settings.context || ""
  };
  
  console.log('Sending payload to Tavus API:', payload);
  console.log('Transcript being sent (length):', payload.conversational_context.length);
  console.log('Transcript preview:', payload.conversational_context.substring(0, 200) + '...');
  
  const response = await fetch("https://tavusapi.com/v2/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token ?? "",
    },
    body: JSON.stringify(payload),
  });

  if (!response?.ok) {
    const errorText = await response.text();
    console.error('Tavus API Error Response:', errorText);
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const data = await response.json();
  console.log('Tavus API Response:', data);
  return data;
};