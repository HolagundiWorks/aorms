import { briefSentence, getHubData } from "../../../lib/pulse/hub-data";

/** Today's brief, in one line, under the Pulse title — live counts, not boilerplate. */
export async function PulseBrief() {
  const data = await getHubData();
  return <>{briefSentence(data)}</>;
}
