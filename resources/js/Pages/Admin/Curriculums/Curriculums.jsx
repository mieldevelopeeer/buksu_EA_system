import React, { useState } from 'react';
import { useForm, usePage, router, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Plus, PencilSimple, X, Files, FileX, MagnifyingGlass ,ArrowCounterClockwise , CheckCircle,
  XCircle, } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Curricula() {
  // ✅ Safe defaults for props
  const { curricula = { data: [], from: 1, links: [] }, courses = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCourseId, setActiveCourseId] = useState('all'); // Tab filter by department/course

  const form = useForm({
    name: '',
    description: '',
    courses_id: '',
    majors_id: '',
  });

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
  });

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedCurriculum(null);
    setShowModal(true);
  };

  const openEditModal = (curriculum) => {
    let courseId = null;
    courses.forEach(course => {
      const found = course.majors.find(m => m.id === curriculum.majors_id);
      if (found) courseId = course.id;
    });

    form.setData({
      name: curriculum.name,
      description: curriculum.description,
      majors_id: curriculum.majors_id,
      courses_id: courseId,
    });

    setSelectedCurriculum(curriculum);
    setEditMode(true);
    setShowModal(true);
  };
const handleStatusChange = (curriculum, status) => {
  Swal.fire({
    title: `Are you sure you want to ${status} this curriculum?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
  }).then((result) => {
    if (result.isConfirmed) {
      router.put(route('admin.curricula.updateStatus', curriculum.id), { status }, {
        onSuccess: () => {
          Toast.fire({
            icon: 'success',
            title: `Curriculum ${status}!`,
          });
        },
        onError: () => {
          Toast.fire({
            icon: 'error',
            title: 'Failed to update status.',
          });
        },
      });
    }
  });
};

  const submit = (e) => {
    e.preventDefault();

    const onSuccess = () => {
      Toast.fire({
        icon: 'success',
        title: editMode ? 'Curriculum updated!' : 'Curriculum added!',
      });
      setShowModal(false);
      setEditMode(false);
      setSelectedCurriculum(null);
      form.reset();
    };

    const onError = () => {
      Toast.fire({
        icon: 'error',
        title: 'Failed to save curriculum.',
      });
    };

    if (editMode && selectedCurriculum) {
      form.put(route('admin.curriculums.update', selectedCurriculum.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route('admin.curriculums.store'), {
        onSuccess,
        onError,
      });
    }
  };

const filteredCurricula = (curricula.data || []).filter((c) => {
  const matchesSearch =
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(search.toLowerCase());

  const matchesCourse =
    activeCourseId === 'all' ||
    (c.courses_id != null && c.courses_id.toString() === activeCourseId.toString());

  return matchesSearch && matchesCourse;
});

  return (
   <AdminLayout>
  <div className="text-gray-800 font-[Poppins] px-5 py-3">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
      <h1 className="text-lg font-semibold tracking-wide text-slate-800">Curricula Overview</h1>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search */}
        <div className="relative w-full sm:w-56">
          <MagnifyingGlass
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search curricula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-md pl-8 pr-2.5 py-1.5 text-sm focus:ring focus:ring-blue-500/50 focus:border-blue-500 transition"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium shadow-sm transition"
        >
          <Plus size={16} />
          Add Curriculum
        </button>
      </div>
    </div>

    {/* Filter by Course */}
    <div className="mb-4 w-full sm:w-52">
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        Filter by Course
      </label>
      <select
        value={activeCourseId}
        onChange={(e) => setActiveCourseId(e.target.value)}
        className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring focus:ring-blue-500/50 focus:border-blue-500 transition"
      >
        <option value="all">All Courses</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
    </div>

    {/* Grid View */}
    <style>{`
      @keyframes pulseRibbon {
        0% { transform: scaleX(1); opacity: 0.45; }
        50% { transform: scaleX(1.05); opacity: 0.7; }
        100% { transform: scaleX(1); opacity: 0.45; }
      }
    `}</style>

    <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
      {filteredCurricula.length > 0 ? (
        filteredCurricula.map((curriculum, idx) => {
          const accentPalette = [
            "#2563eb",
            "#16a34a",
            "#f97316",
            "#dc2626",
            "#7c3aed",
            "#0ea5e9",
          ];
          const accentColor = accentPalette[idx % accentPalette.length];
          const firstLetter = curriculum.name.charAt(0).toUpperCase();

          return (
            <div
              key={curriculum.id}
              onClick={() =>
                router.get(route("admin.DeptCurriculums.show", curriculum.id))
              }
              className="rounded-lg border border-slate-200 p-4 flex flex-col justify-between gap-4 hover:shadow-lg transition cursor-pointer relative overflow-hidden"
              style={{
                borderTopWidth: '3px',
                borderTopColor: accentColor,
                background: `linear-gradient(180deg, ${accentColor}4d 0%, #ffffff 88%)`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}4f, transparent 60%)`,
                  animation: 'pulseRibbon 6s ease-in-out infinite',
                }}
              />

              {/* Icon */}
              <div className="relative z-10 flex items-start justify-between text-slate-500">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                  >
                    {firstLetter}
                  </div>
                  {curriculum.status}
                </div>
                <Files size={18} className="text-slate-400" weight="duotone" />
              </div>

              {/* Info */}
              <div className="relative z-10 space-y-1.5">
                <h3 className="text-base font-semibold text-slate-800 truncate">
                  {curriculum.name}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {curriculum.description || "No description"}
                </p>

                {/* Status Badge */}
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur-sm"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  {curriculum.status}
                </span>
              </div>

            {/* Action Buttons */}
<motion.div
  className="flex justify-end items-center mt-3 gap-1.5"
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
>
  {/* 🔁 Redo (if already approved/rejected) */}
  {["approved", "rejected"].includes(curriculum.status) && (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        handleStatusChange(curriculum, "pending");
      }}
      className="p-1.5 rounded-full bg-yellow-50 hover:bg-yellow-100 text-yellow-700 transition flex items-center justify-center border border-yellow-200"
      title="Redo to Pending"
    >
      <ArrowCounterClockwise size={16} weight="bold" />
    </motion.button>
  )}

  {/* ✅ Approve / ❌ Reject when Pending */}
  {curriculum.status === "pending" && (
    <div className="flex gap-1.5">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(curriculum, "approved");
        }}
        className="p-1.5 rounded-full bg-green-50 hover:bg-green-100 text-green-700 transition flex items-center justify-center border border-green-200"
        title="Approve Curriculum"
      >
        <CheckCircle size={16} weight="bold" />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(curriculum, "rejected");
        }}
        className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 transition flex items-center justify-center border border-red-200"
        title="Reject Curriculum"
      >
        <XCircle size={16} weight="bold" />
      </motion.button>
    </div>
  )}

  {/* 🏷 Status Tag */}
  {curriculum.status === "approved" && (
    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-green-50 text-green-600 border border-green-100">
      Approved
    </span>
  )}

  {curriculum.status === "rejected" && (
    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-red-50 text-red-600 border border-red-100">
      Rejected
    </span>
  )}
</motion.div>


    
          </div>
      
      );
    })
  ) : (
    <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-500">
      <FileX size={48} className="text-gray-400 mb-2" weight="duotone" />
      <span className="text-sm font-medium">No curricula found</span>
    </div>
  )}
</div>


        {/* Pagination */}
        {curricula.links.length > 1 && (
          <div className="flex justify-center p-3">
            <nav className="flex gap-1.5 text-sm">
              {curricula.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.url || '#'}
                  className={`px-2.5 py-1 border rounded ${
                    link.active
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </nav>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editMode ? 'Edit Curriculum' : 'Add Curriculum'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={form.data.name}
                      onChange={(e) => form.setData('name', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course & Major
                    </label>
                    <select
                      value={form.data.majors_id || ''}
                      onChange={(e) => {
                        const majorId = e.target.value;
                        form.setData('majors_id', majorId);
                        courses.forEach(course => {
                          const found = course.majors.find(m => m.id == majorId);
                          if (found) form.setData('courses_id', course.id);
                        });
                      }}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" disabled>Select a major</option>
                      {courses.map(course => (
                        <optgroup key={course.id} label={course.name}>
                          {course.majors.map(major => (
                            <option key={major.id} value={major.id}>
                              {major.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={form.data.description || ''}
                      onChange={(e) => form.setData('description', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-4 py-2 rounded-md transition ${
                      form.processing
                        ? 'bg-blue-400'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {form.processing ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
