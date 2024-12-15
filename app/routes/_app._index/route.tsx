import {useCreateRoom} from "~/routes/_app._index/_hooks/useCreateRoom";
import {getWebsocketUrl} from "~/utils/getWebsocketUrl.server";
import type {Route} from "./+types/route";

export function meta() {
  return [{ title: "New React Router App" }, { name: "description", content: "Welcome to React Router!" }];
}

export function loader({ context }: Route.LoaderArgs) {
  const websocketUrl = getWebsocketUrl();
  return { message: context.VALUE_FROM_EXPRESS, websocketUrl };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { createJapaneseRoom, createEnglishRoom } = useCreateRoom(loaderData.websocketUrl);

  return (
    <div className="flex flex-col justify-center items-center">
      <button type="button" className="border rounded-2xl m-4 p-4" onClick={createJapaneseRoom}>
        日本語で話す部屋を作る
      </button>
      <button type="button" className="border rounded-2xl m-4 p-4" onClick={createEnglishRoom}>
        英語で話す部屋を作る
      </button>
    </div>
  );
}
