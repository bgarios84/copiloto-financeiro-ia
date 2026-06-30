import { getFireData } from "@/services/fire";
import { FireClient }  from "./FireClient";

export const dynamic = "force-dynamic";

export default async function FirePage() {
  const result = await getFireData();
  return (
    <FireClient
      data={result.data}
      error={result.error}
    />
  );
}
