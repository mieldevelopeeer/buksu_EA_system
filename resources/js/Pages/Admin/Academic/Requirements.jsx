import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { X, MagnifyingGlass, FileText } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Requirements() {
  const { requirements = [], requiredForOptions = [] } = usePage().props;

  const [viewModal, setViewModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('');

  const openViewModal = (requirement) => {
    setSelectedRequirement(requirement);
    setViewModal(true);
  };

  const groupedRequirements = useMemo(() => {
    const query = searchTerm.toLowerCase();
    const filtered = requirements.filter((requirement) =>
      `${requirement.name ?? ''} ${requirement.description ?? ''} ${requirement.required_for ?? ''}`
        .toLowerCase()
        .includes(query)
    );

    return filtered.reduce((acc, requirement) => {
      const category = requirement.required_for ?? 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(requirement);
      return acc;
    }, {});
  }, [requirements, searchTerm]);

  const categories = Object.keys(groupedRequirements);

  useEffect(() => {
    if (!activeTab && categories.length > 0) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-slate-700 space-y-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <FileText size={22} className="text-blue-500" />
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Enrollment Requirements</h1>
              <p className="text-[11px] text-slate-500">View required documents per applicant type.</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <label className="relative w-full sm:w-64">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search requirement..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-600 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-200 px-2 text-[11px]">
            {categories.length === 0 ? (
              <span className="px-4 py-2 text-slate-400 italic">No requirements found.</span>
            ) : (
              categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`px-4 py-2.5 font-medium transition whitespace-nowrap ${
                    activeTab === category
                      ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))
            )}
          </div>

          <div className="grid gap-4 px-4 py-5 md:grid-cols-2 lg:grid-cols-3">
            {groupedRequirements[activeTab]?.length > 0 ? (
              groupedRequirements[activeTab].map((requirement) => (
                <motion.div
                  key={requirement.id}
                  whileHover={{ y: -2 }}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:shadow"
                >
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">{requirement.name}</h3>
                  <p className="line-clamp-3 text-[11px] text-slate-600">
                    {requirement.description || 'No description provided.'}
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-[10px] font-medium text-blue-600">
                    {requirement.required_for}
                  </span>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="rounded-full px-2 py-0.5 font-medium text-slate-500">
                      Status: {requirement.status ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => openViewModal(requirement)}
                      className="flex items-center gap-1 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      View details
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                No requirements found for this category.
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {viewModal && selectedRequirement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-semibold text-slate-800">Requirement Info</h2>
                <button
                  onClick={() => {
                    setViewModal(false);
                    setSelectedRequirement(null);
                  }}
                  className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  <span className="font-medium text-slate-700">Name:</span> {selectedRequirement.name}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Description:</span> {selectedRequirement.description || '—'}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Required For:</span> {selectedRequirement.required_for}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Status:</span> {selectedRequirement.status ? 'Active' : 'Inactive'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
