import { useForm, usePage , router} from '@inertiajs/react';
import { useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Plus, X, MagnifyingGlass, PencilSimple, Eye, EnvelopeSimple } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Registrar() {
    const { registrars , user } = usePage().props;

    const [showModal, setShowModal] = useState(false);
    const [viewModal, setViewModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedRegistrar, setSelectedRegistrar] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = csrfMeta ? csrfMeta.content : '';

    const form = useForm({
        id_number: '',
        fName: '',
        mName: '',
        lName: '',
        email: '',
        username: '',
    });

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        },
    });

    const closeModal = () => {
        form.reset();
        setShowModal(false);
        setEditMode(false);
        setSelectedRegistrar(null);
    };

    const openAddModal = () => {
        form.reset();
        setEditMode(false);
        setSelectedRegistrar(null);
        setShowModal(true);
    };

    const openEditModal = (registrar) => {
        form.setData({
            id_number: registrar.id_number || '',
            fName: registrar.fName,
            mName: registrar.mName || '',
            lName: registrar.lName,
            email: registrar.email,
            username: registrar.username,
        });
        setEditMode(true);
        setSelectedRegistrar(registrar);
        setShowModal(true);
    };

    const openViewModal = (registrar) => {
        setSelectedRegistrar(registrar);
        setViewModal(true);
    };

    const submit = (e) => {
        e.preventDefault();

        console.log('[Registrar] Submit triggered', {
            payload: form.data,
            editMode,
            selectedRegistrar,
        });

        const successMessage = editMode
            ? 'Registrar updated successfully!'
            : 'Registrar added successfully!';
        const errorMessage = editMode
            ? 'Failed to update registrar.'
            : 'Failed to add registrar.';

        // Show "Please wait..." while saving
        Swal.fire({
            title: 'Please wait...',
            text: editMode ? 'Updating registrar credentials' : 'Saving registrar credentials',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        const onSuccess = () => {
            console.log('[Registrar] Submit success');
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: successMessage,
                timer: 2000,
                showConfirmButton: false,
            });
            closeModal();
        };

        const onError = (errors) => {
            console.error('[Registrar] Submit failed', errors || form.errors);
            const firstErrorKey = errors && Object.keys(errors)[0];
            const detailedMessage = firstErrorKey ? errors[firstErrorKey] : errorMessage;

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: detailedMessage || errorMessage,
            });
        };

        if (editMode && selectedRegistrar) {
            form.put(route('admin.registrar.update', selectedRegistrar.id), {
                onSuccess,
                onError,
            });
        } else {
            form.post(route('admin.registrar.store'), {
                onSuccess,
                onError,
            });
        }
    };

    const handleCustomEmail = async (user) => {
        if (!user) return;

        try {
            const response = await fetch(route('admin.registrar.send.email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    registrar_id: user.id,
                    to: user.email,
                    fName: user.fName,
                    mName: user.mName ?? '',
                    lName: user.lName,
                    username: user.username,
                    id_number: user.id_number,
                    password: user.generated_password || null,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                Toast.fire({ icon: 'success', title: data.message });
            } else {
                Toast.fire({ icon: 'error', title: data.message || 'Failed to send email.' });
            }
        } catch (error) {
            console.error(error);
            Toast.fire({ icon: 'error', title: 'Server error while sending email.' });
        }
    };

    const filteredRegistrars = useMemo(() => {
        return registrars.filter((reg) =>
            `${reg.fName} ${reg.lName} ${reg.username} ${reg.registrar?.id_number ?? ''}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        );
    }, [registrars, searchTerm]);

    return (
      <AdminLayout title="Registrar Users">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
    <h1 className="text-lg font-semibold tracking-tight text-slate-800">
      Registrar List
    </h1>
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white/80 shadow-sm focus:ring-2 focus:ring-slate-300 focus:border-slate-400 focus:outline-none"
        />
      </div>
      {/* Add Button */}
      <button
        onClick={openAddModal}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium shadow-sm transition"
      >
        <Plus size={18} /> Add Registrar
      </button>
    </div>
  </div>

  {/* Table */}
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
    <table className="min-w-full text-[11px] text-slate-700">
      <thead className="bg-slate-50 uppercase tracking-wide text-slate-600 text-[10px]">
        <tr>
          <th className="p-2.5 text-left font-semibold">#</th>
          <th className="p-2.5 text-left font-semibold">ID Number</th>
          <th className="p-2.5 text-left font-semibold">First Name</th>
          <th className="p-2.5 text-left font-semibold">Last Name</th>
          <th className="p-2.5 text-left font-semibold">Generated Password</th>
          <th className="p-2.5 text-left font-semibold">Username</th>
          <th className="p-2.5 text-center font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredRegistrars.length > 0 ? (
          filteredRegistrars.map((reg, index) => (
            <tr
              key={reg.id}
              className="hover:bg-slate-50 transition-colors"
            >
              <td className="p-2.5 text-[11px]">{index + 1}</td>
              <td className="p-2.5 text-[11px]">{reg.id_number ?? "-"}</td>
              <td className="p-2.5 text-[11px]">{reg.fName}</td>
              <td className="p-2.5 text-[11px]">{reg.lName}</td>
              <td className="p-2.5 font-mono text-indigo-600 text-[11px]">
                {reg.generated_password}
              </td>
              <td className="p-2.5 text-[11px]">{reg.username}</td>
              <td className="p-2.5 flex items-center justify-center gap-2.5">
                <button
                  onClick={() => openEditModal(reg)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <PencilSimple size={14} /> Edit
                </button>
                <button
                  onClick={() => openViewModal(reg)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  onClick={() => handleCustomEmail(reg)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <EnvelopeSimple size={14} /> Email
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan="7"
              className="text-center p-4 text-slate-400 text-xs"
            >
              No results found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>



            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
                    >
                        {/* Outer scroll container */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto text-xs"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-base font-semibold text-slate-800">
                                    {editMode ? 'Edit Registrar' : 'Add Registrar'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-slate-400 hover:text-rose-500 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        ID Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ID Number"
                                        value={form.data.id_number}
                                        onChange={(e) => form.setData('id_number', e.target.value)}
                                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={form.data.fName}
                                        onChange={(e) => form.setData('fName', e.target.value)}
                                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Middle Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Middle Name"
                                        value={form.data.mName}
                                        onChange={(e) => form.setData('mName', e.target.value)}
                                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={form.data.lName}
                                        onChange={(e) => form.setData('lName', e.target.value)}
                                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Username
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            value={form.data.username}
                                            onChange={(e) => form.setData('username', e.target.value)}
                                            className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const first = (form.data.fName || '').trim().toLowerCase();
                                                const last = (form.data.lName || '').trim().toLowerCase();
                                                const randomPart = Math.random().toString(36).slice(-5);
                                                const username = `${first}.${last}.${randomPart}`;
                                                form.setData('username', username);
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: 'Username Generated',
                                                    text: username,
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-[11px] rounded-md hover:bg-blue-700 transition"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                {/* Password handled by backend auto-generation */}

                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className={`w-full text-white px-3 py-2 rounded-md text-[11px] transition ${form.processing
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


            {/* View Modal */}
            <AnimatePresence>
                {viewModal && selectedRegistrar && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-5 rounded-xl shadow-lg w-full max-w-sm"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-lg font-semibold text-slate-800">Registrar Info</h2>
                                <button
                                    onClick={() => {
                                        setViewModal(false);
                                        setSelectedRegistrar(null);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-2 text-xs text-slate-600">
                                <p><strong>ID:</strong> {selectedRegistrar.id}</p>
                                <p><strong>ID Number:</strong> {selectedRegistrar.id_number ?? '-'}</p>
                                <p><strong>First Name:</strong> {selectedRegistrar.fName}</p>
                                <p><strong>Middle Name:</strong> {selectedRegistrar.mName ?? '-'}</p>
                                <p><strong>Last Name:</strong> {selectedRegistrar.lName}</p>
                                <p><strong>Username:</strong> {selectedRegistrar.username}</p>
                                <p><strong>Email:</strong> {selectedRegistrar.email ?? '-'}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminLayout>
    );
}
