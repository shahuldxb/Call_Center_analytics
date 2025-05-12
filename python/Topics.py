import time
import os
import json
import re
import sys
import io
from openai import AzureOpenAI
from dotenv import load_dotenv
load_dotenv()  

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# Initialize Azure OpenAI client
client = AzureOpenAI(
    azure_endpoint='https://calcenteropenai.openai.azure.com/',
    api_key=os.getenv('API_KEY'),
    api_version="2024-05-01-preview"
)
# Create the assistant with clearer instructions for JSON output
assistant = client.beta.assistants.create(
    model="gpt-4o",
    instructions = (
    "You are an expert in topic modeling and text analysis. Analyze the following texts, one by one, and identify the main topics for each. "
    "For each text, provide a single topic with a brief description. "
    "Respond in JSON format like this: [{\"topic\": \"Topic Name\", \"description\": \"Brief description of the topic\"}]. "
    "Ensure that each document's topic is clearly identified and properly formatted as valid JSON."
    "You are an expert in multilingual topic modeling. Analyze the given text in its original language and extract the most relevant topics. Maintain the language of the input text. Provide 1-3 concise topics per text, separated by commas."
),
    temperature=1,
    top_p=1
)
def process_topic_modeling(text_documents):
    results = []
    batch_size = 3
    max_retries = 3
    max_length = 500  # Prevent long transcriptions from exceeding token limits

    print("📥 Received Text Documents:", text_documents)

    for i in range(0, len(text_documents), batch_size):
        batch = text_documents[i:i + batch_size]

        for doc in batch:
            if "transcription" in doc:
                doc["transcription"] = doc["transcription"][:max_length]

        attempt = 0
        success = False

        while attempt < max_retries and not success:
            try:
                print(f"🔍 Processing {len(batch)} documents (Attempt {attempt + 1})")

                thread = client.beta.threads.create()
                client.beta.threads.messages.create(
                    thread_id=thread.id,
                    role="user",
                    content=json.dumps({"textDocuments": [doc.get('transcription', '') for doc in batch]})
                )

                run = client.beta.threads.runs.create(thread_id=thread.id, assistant_id=assistant.id)

                while run.status in ["queued", "in_progress"]:
                    time.sleep(2)
                    run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

                if run.status == "completed":
                    messages = client.beta.threads.messages.list(thread_id=thread.id)
                    assistant_response = next(
                        (message.content[0].text.value for message in messages.data if message.role == "assistant"), None
                    )

                    print("📝 Assistant Response:", assistant_response)

                    if assistant_response:
                        json_match = re.search(r'\[.*\]', assistant_response, re.DOTALL)
                        if json_match:
                            json_str = json_match.group(0)
                            topics_data = json.loads(json_str)

                            for j, doc in enumerate(batch):
                                results.append({
                                    "fileName": doc.get("fileName", f"Document {i+j+1}"),
                                    "topic": topics_data[j].get("topic", "Unknown"),
                                    "description": topics_data[j].get("description", "")
                                })

                            success = True
                        else:
                            raise Exception("Could not parse topics from response")

                else:
                    print(f"⚠️ Run failed with status: {run.status}")
                    attempt += 1

            except Exception as e:
                print(f"❌ Error on attempt {attempt + 1}: {str(e)}")
                attempt += 1
                time.sleep(2)

    return results


