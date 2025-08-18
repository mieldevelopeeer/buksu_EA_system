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

    const form = useForm({
        id_number: '',
        fName: '',
        mName: '',
        lName: '',
        email: '',
        username: '',
        password: '',
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
            id_number: registrar.registrar?.id_number || '',
            fName: registrar.fName,
            mName: registrar.mName || '',
            lName: registrar.lName,
            email: registrar.email,
            username: registrar.username,
            password: '',
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

        const successMessage = editMode
            ? 'Registrar updated successfully!'
            : 'Registrar added successfully!';
        const errorMessage = editMode
            ? 'Failed to update registrar.'
            : 'Failed to add registrar.';

        const onSuccess = () => {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: successMessage,
                timer: 2000,
                showConfirmButton: false,
            });
            closeModal();
        };

        const onError = () => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
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
  const defaultMessage = `Hello ${user.fName} ${user.lName},

Username: ${user.username}
ID Number: ${user.registrar?.id_number}
Password: ${user.password}`;

  const { value: message } = await Swal.fire({
    title: `Send Account Details to ${user.email}`,
    input: 'textarea',
    inputValue: defaultMessage,
    showCancelButton: true,
    confirmButtonText: 'Send',
    inputValidator: (value) => value ? null : 'Message cannot be empty!'
  });

  if (message) {
    fetch('/admin/registrar/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify({
        to: user.email,
        message
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        Swal.fire('Success', data.message, 'success');
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    })
    .catch(err => {
      Swal.fire('Error', 'Server error while sending email', 'error');
      console.error(err);
    });
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h1 className="text-2xl font-semibold tracking-wide">Registrar List</h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <MagnifyingGlass
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow transition"
                    >
                        <Plus size={18} /> Add Registrar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-left uppercase text-gray-600">
                        <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">ID Number</th>
                            <th className="p-3">First Name</th>
                            <th className="p-3">Last Name</th>
                            <th className="p-3">Username</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800">
                        {filteredRegistrars.length > 0 ? (
                            filteredRegistrars.map((reg, index) => (
  <tr key={reg.id} className="border-t hover:bg-gray-50 transition">
    <td className="p-3">{index + 1}</td>
    <td className="p-3">{reg.registrar?.id_number ?? '-'}</td>
    <td className="p-3">{reg.fName}</td>
    <td className="p-3">{reg.lName}</td>
    <td className="p-3">{reg.username}</td>
    <td className="p-3 flex gap-2">
      <button
        onClick={() => openEditModal(reg)}
        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
      >
        <PencilSimple size={16} /> Edit
      </button>
      <button
        onClick={() => openViewModal(reg)}
        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
      >
        <Eye size={16} /> View
      </button>
      <button
        onClick={() => handleCustomEmail(reg)}
        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
      >
        <EnvelopeSimple size={16} /> Email
      </button>
    </td>
  </tr>
))

                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center p-4 text-gray-500">
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
                        className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
                    >
                        {/* Outer scroll container */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">
                                    {editMode ? 'Edit Registrar' : 'Add Registrar'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-600 hover:text-red-600 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                {/* ID Number */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ID Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="ID Number"
                                    value={form.data.id_number}
                                    onChange={(e) => form.setData('id_number', e.target.value)}
                                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                                />

                                {/* First Name */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Firstname
                                </label>
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    value={form.data.fName}
                                    onChange={(e) => form.setData('fName', e.target.value)}
                                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                                />

                                {/* Middle Name */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Middlename
                                </label>
                                <input
                                    type="text"
                                    placeholder="Middle Name"
                                    value={form.data.mName}
                                    onChange={(e) => form.setData('mName', e.target.value)}
                                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                                />

                                {/* Last Name */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lastname
                                </label>
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    value={form.data.lName}
                                    onChange={(e) => form.setData('lName', e.target.value)}
                                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                                />

                                {/* Email */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                                />

                                {/* Username */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={form.data.username}
                                        onChange={(e) => form.setData('username', e.target.value)}
                                        className="flex-1 border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
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
                                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Generate
                                    </button>
                                </div>

                               
                                {!editMode && (
                                    <div className="flex gap-2">
                                         {/* Password */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                        <input
                                            type="text"
                                            placeholder="Password"
                                            value={form.data.password}
                                            onChange={(e) => form.setData('password', e.target.value)}
                                            className="flex-1 border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const generated = Math.random().toString(36).slice(-10);
                                                form.setData('password', generated);
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: 'Password Generated',
                                                    text: generated,
                                                });
                                            }}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className={`w-full text-white px-4 py-2 rounded-md transition ${form.processing
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
                        className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Registrar Info</h2>
                                <button
                                    onClick={() => {
                                        setViewModal(false);
                                        setSelectedRegistrar(null);
                                    }}
                                    className="text-gray-600 hover:text-red-600 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-2 text-sm text-gray-700">
                                <p><strong>ID:</strong> {selectedRegistrar.id}</p>
                                <p><strong>ID Number:</strong> {selectedRegistrar.registrar?.id_number ?? '-'}</p>
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
