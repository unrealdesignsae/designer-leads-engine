import LeadTable from "@/components/LeadTable";
import { Lead } from "@/lib/types";

// Demo data — in production this comes from Supabase / API
const DEMO_LEADS: Lead[] = [
  {
    id: 1,
    name: "Gabriel Raphael Chetty",
    title: "Talent Acquisition Executive",
    company: "Kingston Stanley",
    role_seeking: "Senior 3D Designer – Exhibitions & Events",
    location: "Abu Dhabi, UAE",
    post_url: "https://www.linkedin.com/posts/gabriel-raphael-chetty_senior-3d-designer-exhibitions-events-activity-7470097886966558720-OqSj",
    post_date: "2026-06-14",
    salary: "AED 17,000 – 20,000",
    source: "linkedin",
    contact_email: null,
    contact_phone: null,
    contact_linkedin: "https://ae.linkedin.com/in/gabriel-raphael-chetty",
    channels_available: ["linkedin"],
    status: "new",
    notes: "Direct recruiter. Salary shown. Freelance option available.",
    discovered_at: "2026-06-17",
    contacted_at: null,
    replied_at: null,
  },
  {
    id: 2,
    name: "Mishel Tobin",
    title: "Founder & Talent Partner",
    company: "Neon People",
    role_seeking: "Freelance Senior 3D Designer",
    location: "Dubai, UAE",
    post_url: "https://www.linkedin.com/posts/misheltobin_thanks-for-getting-in-touch-due-to-an-activity-7462549449395892224-PNi1",
    post_date: "2026-06-08",
    salary: null,
    source: "linkedin",
    contact_email: null,
    contact_phone: null,
    contact_linkedin: "https://uk.linkedin.com/in/misheltobin",
    channels_available: ["linkedin"],
    status: "new",
    notes: "3 freelance roles: Snr 3D Designer + Creative Lead + 2D Graphic. Live events agency.",
    discovered_at: "2026-06-17",
    contacted_at: null,
    replied_at: null,
  },
  {
    id: 3,
    name: "Andre Matarazzo",
    title: "3D Artist / Motion Designer",
    company: "DDB Dubai",
    role_seeking: "Designer (3D/Motion)",
    location: "Dubai, UAE",
    post_url: "https://www.linkedin.com/posts/andrematarazzo_need-a-great-designer-to-join-the-team-if-activity-7469651564996063232-zymr",
    post_date: "2026-06-15",
    salary: null,
    source: "linkedin",
    contact_email: null,
    contact_phone: null,
    contact_linkedin: null,
    channels_available: ["linkedin"],
    status: "contacted",
    notes: "Personal post. Vague on role but super recent. DDB is major agency.",
    discovered_at: "2026-06-17",
    contacted_at: "2026-06-17T14:00:00Z",
    replied_at: null,
  },
];

export default function Home() {
  const handleSelect = async (ids: number[]) => {
    // In production: POST to API
    console.log("Select leads:", ids);
  };

  const handleDispatch = async (ids: number[]) => {
    // In production: POST to API, triggers DM dispatch
    console.log("Dispatch DMs for:", ids);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Designer Leads Engine
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Daily automated lead scanner for unreal.ae · Last scan: June 17, 2026
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="https://aries-black-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              Portfolio ↗
            </a>
            <a
              href="https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
            >
              CV PDF ↗
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "New Leads", value: "3", color: "text-blue-600" },
            { label: "Selected", value: "0", color: "text-yellow-600" },
            { label: "Contacted", value: "1", color: "text-purple-600" },
            { label: "Interested", value: "0", color: "text-green-600" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border rounded-lg p-4 text-center"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-lg p-3 mb-4 flex gap-2">
          {["all", "new", "selected", "contacted", "replied", "interested"].map(
            (filter) => (
              <button
                key={filter}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${
                  filter === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter}
              </button>
            )
          )}
        </div>

        {/* Lead Table */}
        <LeadTable
          leads={DEMO_LEADS}
          onSelect={handleSelect}
          onDispatch={handleDispatch}
          loading={false}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Designer Leads Engine v0.1 ·{" "}
          <a
            href="https://github.com/unrealdesignsae/designer-leads-engine"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            GitHub
          </a>
          {" · "}
          Built for unreal.ae
        </div>
      </div>
    </main>
  );
}
