import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeleteUserForm from "./Partials/DeleteUserForm";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";
import { Head } from "@inertiajs/react";

export default function Edit({ auth, mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            backgroundClass="min-h-screen bg-gradient-to-br from-[#020617] via-[#030b2a] to-[#051a44] text-slate-100 transition-colors duration-500"
            navClassName="border-b border-white/10 bg-slate-950/80 backdrop-blur"
            headerContainerClass="border-b border-white/10 bg-slate-950/70 backdrop-blur"
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-100">Profile Security</h2>
                </div>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-500 ease-out hover:translate-y-[-4px]">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl text-slate-200"
                        />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-500 ease-out hover:translate-y-[-4px]">
                        <UpdatePasswordForm className="max-w-xl text-slate-200" />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-500 ease-out hover:translate-y-[-4px]">
                        <DeleteUserForm className="max-w-xl text-slate-200" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
