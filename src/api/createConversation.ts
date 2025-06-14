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
  console.log('Greeting value:', settings.greeting);
  console.log('Context value:', settings.context);
  console.log('Persona ID:', settings.persona);
  console.log('Replica ID:', settings.replica);
  
  // Build the context string - use ONLY the transcript as conversational context
  const contextString = settings.context || "";
  
  const payload = {
    // Use the correct Persona ID as specified
    persona_id: settings.persona || "pcce34deac2a",
    // Use the correct Replica ID as specified
    replica_id: settings.replica || "rb17cf590e15",
    custom_greeting: settings.greeting !== undefined && settings.greeting !== null 
      ? settings.greeting 
      : "Hey there! I'm your technical co-pilot! Let's get get started building with Tavus.",
    // Send ONLY the presentation transcript as conversational context
    conversational_context: contextString
  };
  
  console.log('Sending payload to API:', payload);
  
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
    console.error('API Error Response:', errorText);
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const data = await response.json();
  console.log('API Response:', data);
  return data;
};