import { EventImpl } from "@fullcalendar/core/internal";

interface EventDetailsProps {
  event?: EventImpl | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetails(data: EventDetailsProps) {
  const { event, isOpen, onClose } = data;

  if (!isOpen || !event) return null;

  const start = event?.start ? event.start.toLocaleString() : "";
  const end = event?.end ? event.end.toLocaleString() : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-gray-900 text-white shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="text-gray-400">Start:</span> {start}
          </p>
          <p>
            <span className="text-gray-400">End:</span> {end}
          </p>

          {event.extendedProps?.description && (
            <p>
              <span className="text-gray-400">Description:</span>{" "}
              {event.extendedProps.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
