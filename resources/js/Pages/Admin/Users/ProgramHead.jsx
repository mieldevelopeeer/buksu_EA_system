// resources/js/Pages/Admin/Users/ProgramHead.jsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Plus, Pencil, EnvelopeSimple, Key, X } from 'phosphor-react';
import Swal from 'sweetalert2';

export default function ProgramHead({ programHeads = [], departments = [] }) {
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedHead, setSelectedHead] = useState(null);
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = csrfMeta ? csrfMeta.content : '';

    const form = useForm({
        fName: '',
        mName: '',
        lName: '',
        suffix: '',
        email: '',
        username: '',
        password: '',
        generated_password: '',
        id_number: '',
        department_id: '',
        contact_no: '',
    });

    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
    });

    useEffect(() => {
        if (!editMode && form.data.fName && form.data.lName) {
            const generatedUsername = `${form.data.fName.toLowerCase()}.${form.data.lName.toLowerCase()}`;
            form.setData('username', generatedUsername);
        }
    }, [form.data.fName, form.data.lName, editMode]);

    useEffect(() => {
        if (!editMode && showModal) {
            const randomPass = Math.random().toString(36).slice(-8);
            form.setData('password', randomPass);
        }
    }, [showModal, editMode]);

    const openAddModal = () => {
        setEditMode(false);
        setSelectedHead(null);
        form.reset();
        setShowModal(true);
    };

    const openEditModal = (head) => {
        setEditMode(true);
        setSelectedHead(head);
        form.setData({
            fName: head.fName || '',
            mName: head.mName || '',
            lName: head.lName || '',
            suffix: head.suffix || '',
            email: head.email || '',
            username: head.username || '',
            password: '',
            generated_password: '',
            id_number: head.id_number || '',
      department_id: head.department_id || '',
       contact_no: head.contact_no || '',

        });
        setShowModal(true);
    };

    const handleSendEmail = (head) => {
        if (!head?.email) {
            Toast.fire({ icon: 'error', title: 'No email address available.' });
            return;
        }

        if (!head?.generated_password) {
            Toast.fire({ icon: 'info', title: 'No generated password to send.' });
            return;
        }

        fetch(route('admin.programHead.send.email'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({
                to: head.email,
                fName: head.fName,
                mName: head.mName ?? '',
                lName: head.lName,
                username: head.username,
                id_number: head.id_number,
                password: head.generated_password,
            }),
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (ok && data.success) {
                    Toast.fire({ icon: 'success', title: data.message });
                } else {
                    Toast.fire({ icon: 'error', title: data.message || 'Failed to send email.' });
                }
            })
            .catch((error) => {
                console.error(error);
                Toast.fire({ icon: 'error', title: 'Server error while sending email.' });
            });
    };

   const submit = (e) => {
    e.preventDefault();

    if (editMode) {
        form.put(route('admin.programHead.update', selectedHead.id), {
            onSuccess: () => {
                Toast.fire({ icon: "success", title: "Program Head updated successfully" });
                setShowModal(false);
            },
            onError: (errors) => {
                Toast.fire({ icon: "error", title: "Please fix the validation errors" });
            },
        });
    } else {
        form.post(route('admin.programHead.store'), {
            onSuccess: () => {
                Toast.fire({ icon: "success", title: "Program Head added successfully" });
                setShowModal(false);
            },
            onError: (errors) => {
                Toast.fire({ icon: "error", title: "Please fix the validation errors" });
            },
        });
    }
};


    return (
        <AdminLayout>
            <Head title="Program Heads" />

         <div className="flex justify-between items-center mb-6">
  <h1 className="text-xl font-semibold text-gray-800">Program Heads</h1>
  <button
    onClick={openAddModal}
    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow transition text-[11px]"
  >
    <Plus size={16} /> Add Program Head
  </button>
</div>

<div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
  {programHeads.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[11px] text-left text-gray-700">
        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-[11px]">
          <tr>
            <th className="px-4 py-3">ID Number</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">Generated Password</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {programHeads.map((head) => (
            <tr
              key={head.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3">{head.id_number || '-'}</td>
              <td className="px-4 py-3">
                {head.fName} {head.mName} {head.lName} {head.suffix}
              </td>
              <td className="px-4 py-3">{head.username}</td>
              <td className="px-4 py-3 font-mono text-blue-600">
                {head.generated_password || '-'}
              </td>
              <td className="px-4 py-3">{head.email || '-'}</td>
              <td className="px-4 py-3">{head.department?.name || '-'}</td>
              <td className="px-4 py-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => openEditModal(head)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleSendEmail(head)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                >
                  <EnvelopeSimple size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="p-4 text-gray-500 text-sm">No program heads found.</p>
  )}
</div>

            {/* Modal */}
            {showModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto text-xs"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-semibold text-gray-800">
                                {editMode ? 'Edit Program Head' : 'Add Program Head'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-rose-500 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">ID Number</label>
                                <input
                                    type="text"
                                    placeholder="ID Number"
                                    value={form.data.id_number}
                                    onChange={(e) => form.setData('id_number', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {form.errors.id_number && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.id_number}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">First Name</label>
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    value={form.data.fName}
                                    onChange={(e) => form.setData('fName', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {form.errors.fName && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.fName}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Middle Name</label>
                                <input
                                    type="text"
                                    placeholder="Middle Name"
                                    value={form.data.mName}
                                    onChange={(e) => form.setData('mName', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {form.errors.mName && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.mName}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Last Name"
                                    value={form.data.lName}
                                    onChange={(e) => form.setData('lName', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {form.errors.lName && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.lName}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Suffix</label>
                                <select
                                    value={form.data.suffix}
                                    onChange={(e) => form.setData('suffix', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Suffix</option>
                                    <option value="Jr.">Jr.</option>
                                    <option value="Sr.">Sr.</option>
                                    <option value="II">II</option>
                                    <option value="III">III</option>
                                    <option value="IV">IV</option>
                                </select>
                                {form.errors.suffix && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.suffix}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {form.errors.email && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Contact Number</label>
                                <input
                                    type="text"
                                    placeholder="Contact Number"
                                    value={form.data.contact_no}
                                    onChange={(e) => form.setData('contact_no', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {form.errors.contact_no && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.contact_no}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
                                <select
                                    value={form.data.department_id}
                                    onChange={(e) => form.setData('department_id', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                                {form.errors.department_id && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.department_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Username</label>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={form.data.username}
                                    onChange={(e) => form.setData('username', e.target.value)}
                                    className="border rounded-md px-2 py-1.5 w-full text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    readOnly={!editMode}
                                />
                                {form.errors.username && (
                                    <p className="text-red-500 text-[11px] mt-1">{form.errors.username}</p>
                                )}
                            </div>

                            {!editMode && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Password</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Password"
                                            value={form.data.generated_password}
                                            readOnly
                                            className="border rounded-md px-2 py-1.5 w-full bg-gray-100 font-mono text-[11px] text-blue-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const randomPass = Math.random().toString(36).slice(-10);
                                                form.setData('generated_password', randomPass);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                                        >
                                            <Key size={16} />
                                        </button>
                                    </div>
                                    {form.errors.generated_password && (
                                        <p className="text-red-500 text-[11px] mt-1">{form.errors.generated_password}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-3 py-1.5 rounded-md border text-[11px] text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-[11px] hover:bg-blue-700 transition"
                                >
                                    {editMode ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AdminLayout>
    );
}
