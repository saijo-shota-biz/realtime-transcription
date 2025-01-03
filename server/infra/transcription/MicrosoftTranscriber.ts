import type { ITranscriber } from "@/server/domain/models/transcriber/ITranscriber";
import type { Language } from "@/types/Language";
import type { Message } from "@/types/Websocket";
import {
  AudioConfig,
  AudioInputStream,
  CancellationReason,
  type PushAudioInputStream,
  ResultReason,
  SpeechTranslationConfig,
  TranslationRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";

export class MicrosoftTranscriber implements ITranscriber {
  private recognizer: TranslationRecognizer;
  private pushStream: PushAudioInputStream;
  private _transcribing = false;
  constructor(
    language: Language,
    callbacks: {
      onRecognized: (message: Message) => void;
    },
  ) {
    if (!process.env.MICROSOFT_SPEECH_API_KEY || !process.env.MICROSOFT_SPEECH_API_REGION) {
      throw new Error("Please set MICROSOFT_SPEECH_API_KEY and MICROSOFT_SPEECH_API_REGION.");
    }
    const speechConfig = SpeechTranslationConfig.fromSubscription(
      process.env.MICROSOFT_SPEECH_API_KEY,
      process.env.MICROSOFT_SPEECH_API_REGION,
    );
    if (language === "ja") {
      speechConfig.speechRecognitionLanguage = "ja-JP";
      speechConfig.addTargetLanguage("en");
    } else if (language === "en") {
      speechConfig.speechRecognitionLanguage = "en-US";
      speechConfig.addTargetLanguage("ja");
    }

    const pushStream = AudioInputStream.createPushStream();
    const audioConfig = AudioConfig.fromStreamInput(pushStream);
    const recognizer = new TranslationRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (_, e) => {
      console.log(`RECOGNIZING: Text=${e.result.text}`);
    };

    recognizer.recognized = (_, e) => {
      if (e.result.reason === ResultReason.TranslatedSpeech) {
        const messageJa = language === "ja" ? e.result.text : e.result.translations.get("ja");
        const messageEn = language === "en" ? e.result.text : e.result.translations.get("en");
        console.log("RECOGNIZED: Text=", { ja: messageJa, en: messageEn });
        callbacks.onRecognized({
          messageJa,
          messageEn,
          datetime: new Date().toISOString(),
        });
      } else if (e.result.reason === ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
      }
    };

    recognizer.canceled = (_, e) => {
      console.log(`CANCELED: Reason=${e.reason}`);
      if (e.reason === CancellationReason.Error) {
        console.log(`CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
      }
    };

    recognizer.sessionStopped = () => {
      console.log("Session stopped event.");
      this.stop();
    };

    this.recognizer = recognizer;
    this.pushStream = pushStream;
  }

  start() {
    console.log("------- Transcribe start --------");
    this.recognizer.startContinuousRecognitionAsync(() => {
      this._transcribing = true;
    });
  }

  stop() {
    console.log("------- Transcribe stop --------");
    this.recognizer.stopContinuousRecognitionAsync(() => {
      this._transcribing = false;
    });
  }

  get transcribing() {
    return this._transcribing;
  }

  transcribe(arrayBuffer: ArrayBuffer) {
    if (!arrayBuffer) {
      console.error("transcribe() called with an invalid arrayBuffer");
      return;
    }

    try {
      this.pushStream.write(arrayBuffer);
    } catch (error) {
      console.error("Error writing to PushAudioInputStream:", error);
    }
  }
}
