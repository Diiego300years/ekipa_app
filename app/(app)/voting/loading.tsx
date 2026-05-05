import { RouteLoading } from "@/app/route-loading";

export default function VotingLoading() {
  return (
    <RouteLoading
      description="Odświeżamy ranking pomysłów."
      title="Wczytywanie głosowania..."
    />
  );
}
