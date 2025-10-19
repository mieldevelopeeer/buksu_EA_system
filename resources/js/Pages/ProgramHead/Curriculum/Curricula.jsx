import React, { useState } from 'react';
import { useForm, usePage, router, Link } from '@inertiajs/react';
import ProgramHeadLayout from '@/Layouts/ProgramHeadLayout';
import { Plus, PencilSimple, X, Files, FileX, MagnifyingGlass, PlusCircle } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Curricula() {
  const { curricula = { data: [], links: [] } } = usePage().props;
  const { courses = [], departments = [], majors = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [search, setSearch] = useState("");

  const form = useForm({
    name: '',
    description: '',
    courses_id: '',
    department_id: '',
    majors_id: '', // optional
  });

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
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
      majors_id: curriculum.majors_id || '',
      courses_id: courseId,
    });

    setSelectedCurriculum(curriculum);
    setEditMode(true);
    setShowModal(true);
  };

const submit = (e) => {
  e.preventDefault();

  // Ensure courses_id is set
  let courseId = form.data.courses_id;

  if (!courseId) {
    if (form.data.majors_id) {
      // Find course from selected major
      const course = courses.find(c => c.majors.some(m => m.id == form.data.majors_id));
      if (course) courseId = course.id;
    } else if (courses.length > 0) {
      // If no major selected, pick first course automatically
      courseId = courses[0].id;
    }
  }

  form.setData('courses_id', courseId);

  console.log('Submitting curriculum with courses_id:', courseId);

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

  const onError = (errors) => {
    console.log('Submission failed!', errors);
    Toast.fire({
      icon: 'error',
      title: 'Failed to save curriculum.',
    });
  };

  if (editMode && selectedCurriculum) {
    form.put(route('program-head.curriculum.update', selectedCurriculum.id), { onSuccess, onError });
  } else {
    form.post(route('program-head.curriculum.store'), { onSuccess, onError });
  }
};


  const filteredCurricula = curricula.data.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProgramHeadLayout>
      <div className="text-gray-800 font-[Poppins] px-6 py-4">

      {/* Header */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
  {/* Title with subtle accent */}
  <div className="flex items-center gap-2">
    <div className="w-1 h-5 rounded bg-blue-600" />
    <h1 className="text-lg font-semibold text-gray-800">Curricula</h1>
  </div>

  {/* Actions */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
    {/* Search */}
    <div className="relative w-full sm:w-52">
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-md pl-8 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
      />
      <MagnifyingGlass
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>

    {/* Add Button */}
    <button
      onClick={openAddModal}
      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
    >
      <PlusCircle size={14} weight="bold" />
      Add
    </button>
  </div>
</div>

        

       {/* Grid View */}
<div className="grid md:grid-cols-3 sm:grid-cols-2 gap-5">
  {filteredCurricula.length > 0 ? (
    filteredCurricula.map((curriculum, index) => (
      <motion.div
        key={curriculum.id}
        onClick={() => router.get(route("program-head.curriculum.show", curriculum.id))}
        whileHover={{ scale: 1.02 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.05,
          duration: 0.4,
        }}
        className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex flex-col"
      >
        {/* 🎨 Full Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600" />

        {/* 🎭 Floating Decorative Shapes */}
        <motion.div
          className="absolute top-6 left-6 w-20 h-20 rounded-full bg-white/10"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-8 right-8 w-28 h-28 rounded-full bg-white/5"
          animate={{ x: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* 🔹 Content Wrapper (keeps text readable) */}
        <div className="relative z-10 p-5 flex-1 flex flex-col justify-between text-white">
          {/* Title */}
          <h3 className="font-semibold text-base truncate">{curriculum.name}</h3>

          {/* Description */}
          <p className="text-sm text-white/90 truncate">
            {curriculum.description || "No description"}
          </p>

          {/* Bottom row */}
          <div className="mt-3 flex items-center justify-between">
            {/* Status Badge */}
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                curriculum.status === "approved"
                  ? "bg-green-200/80 text-green-800"
                  : curriculum.status === "rejected"
                  ? "bg-red-200/80 text-red-800"
                  : "bg-yellow-200/80 text-yellow-800"
              }`}
            >
              {curriculum.status}
            </span>

            {/* Edit Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(curriculum);
              }}
              className="p-1.5 rounded-md hover:bg-white/20 transition"
            >
              <PencilSimple size={16} className="text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    ))
  ) : (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
      <FileX size={50} className="text-gray-400 mb-2" weight="duotone" />
      <span className="text-sm font-medium">No curricula found</span>
    </div>
  )}
</div>

        {/* Pagination */}
        {curricula.links.length > 1 && (
          <div className="flex justify-center p-4">
            <nav className="flex gap-1">
              {curricula.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.url || '#'}
                  className={`px-3 py-1 border rounded text-xs ${
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
                className="bg-white rounded-lg p-4 w-full max-w-sm shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">
                    {editMode ? 'Edit Curriculum' : 'Add Curriculum'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={submit} className="space-y-3 text-sm">
                  <input type="hidden" name="curriculum_id" value={selectedCurriculum?.id || ''} />

                  {/* Name */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={form.data.name}
                      onChange={(e) => form.setData('name', e.target.value)}
                      className="w-full border rounded-md p-1.5 focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {form.errors.name && <p className="text-red-600 text-xs mt-0.5">{form.errors.name}</p>}
                  </div>

               {/* Course & Major */}
<div className="space-y-2">
  <label className="block font-medium text-gray-700 mb-1">Course & Major (optional)</label>

  {/* Course Select */}
  <select
    value={form.data.courses_id || ''}
    onChange={(e) => {
      form.setData('courses_id', e.target.value);
    }}
    className="w-full border rounded-md p-1.5 focus:ring-2 focus:ring-blue-500 text-sm"
  >
    <option value="">-- Select a course --</option>
    {courses.map(course => (
      <option key={course.id} value={course.id}>{course.name}</option>
    ))}
  </select>

  {/* Major Select */}
  <select
    value={form.data.majors_id || ''}
    onChange={(e) => {
      const majorId = e.target.value || '';
      form.setData('majors_id', majorId);

      // If major is selected, automatically set the corresponding course
      if (majorId) {
        const course = courses.find(c => c.majors.some(m => m.id == majorId));
        if (course) form.setData('courses_id', course.id);
      }
    }}
    className="w-full border rounded-md p-1.5 focus:ring-2 focus:ring-blue-500 text-sm"
  >
    <option value="">-- Select a major (optional) --</option>
    {courses.map(course => (
      <optgroup key={course.id} label={course.name}>
        {course.majors.map(major => (
          <option key={major.id} value={major.id}>{major.name}</option>
        ))}
      </optgroup>
    ))}
  </select>
</div>


                  {/* Description */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={form.data.description || ''}
                      onChange={(e) => form.setData('description', e.target.value)}
                      className="w-full border rounded-md p-1.5 focus:ring-2 focus:ring-blue-500 text-sm"
                      rows="2"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-3 py-1.5 rounded-md transition text-sm ${
                      form.processing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
    </ProgramHeadLayout>
  );
}
