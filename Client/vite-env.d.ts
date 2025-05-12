/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_API_URL: string;
    readonly VITE_APP_SPEECH_API_SUBSCRIPTION_KEY: string;
    readonly VITE_APP_SPEECH_API_SERVICE_REGION: string;
  
    readonly TRANSLATER_SERVICE_ENDPOINT: string;
    readonly TRANSLATER_SERVICE_KEY: string;
    readonly TRANSLATOR_REGION: string;
  
    readonly LANGUAGE_ENDPOINT: string;
    readonly VITE_APP_LANGUAGE_ENDPOINT: string;
    readonly LANGUAGE_KEY: string;
    readonly VITE_APP_LANGUAGE_KEY: string;
  
    readonly AZURE_OPENAI_ENDPOINT: string;
    readonly AZURE_OPENAI_API_KEY: string;
  
    readonly VITE_APP_GOOGLE_CLIENT_ID: string;
    readonly JWT_SECRET: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  