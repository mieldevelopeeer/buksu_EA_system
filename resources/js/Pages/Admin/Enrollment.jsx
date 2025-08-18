import AdminLayout from "../../Layouts/AdminLayout";

export default function Enrollment() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">Enrollment Records</h1>
      <div className="bg-white p-6 rounded shadow">
        <p>This is the enrollment management section for administrators.</p>
      </div>
    </AdminLayout>
  );
}
