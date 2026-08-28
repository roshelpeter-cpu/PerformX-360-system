import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { useAuthStore } from "@/store/authStore";
import { MeetingDetailCard, meetingDetailPath } from "../components/MeetingDetailCard";
import { usePlanningMeeting } from "../hooks/useMeetings";

export default function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const role = useAuthStore((state) => state.user?.role) ?? "EMPLOYEE";
  const query = usePlanningMeeting(meetingId);
  const meeting = query.data?.meeting;
  const listPath = meetingDetailPath(role, "list", meeting?.type).replace(/\/list$/, "");

  return (
    <DashboardLayout>
      <Link to={listPath} className="text-sm text-stone-500 hover:underline">
        ← Back to meetings
      </Link>
      {query.isLoading ? (
        <p className="mt-6 text-sm text-stone-500">Loading meeting…</p>
      ) : null}
      {query.isError ? (
        <p className="mt-6 text-sm text-red-600">This meeting could not be loaded.</p>
      ) : null}
      {meeting ? (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <MeetingDetailCard meeting={meeting} role={role} />
        </div>
      ) : null}
    </DashboardLayout>
  );
}
