import { useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    fName: '',
    mName: '',
    lName: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    return () => {
      reset('password', 'password_confirmation');
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    post(route('register'));
  };

  return (
    <GuestLayout>
      <Head title="Register" />

      <form onSubmit={submit} className="space-y-4">
        {/* First Name */}
        <div>
          <InputLabel htmlFor="fName" value="First Name" />
          <TextInput
            id="fName"
            name="fName"
            value={data.fName}
            className="mt-1 block w-full"
            onChange={(e) => setData('fName', e.target.value)}
            required
          />
          <InputError message={errors.fName} className="mt-2" />
        </div>

        {/* Middle Name */}
        <div>
          <InputLabel htmlFor="mName" value="Middle Name" />
          <TextInput
            id="mName"
            name="mName"
            value={data.mName}
            className="mt-1 block w-full"
            onChange={(e) => setData('mName', e.target.value)}
          />
          <InputError message={errors.mName} className="mt-2" />
        </div>

        {/* Last Name */}
        <div>
          <InputLabel htmlFor="lName" value="Last Name" />
          <TextInput
            id="lName"
            name="lName"
            value={data.lName}
            className="mt-1 block w-full"
            onChange={(e) => setData('lName', e.target.value)}
            required
          />
          <InputError message={errors.lName} className="mt-2" />
        </div>

        {/* Username */}
        <div>
          <InputLabel htmlFor="username" value="Username" />
          <TextInput
            id="username"
            name="username"
            value={data.username}
            className="mt-1 block w-full"
            onChange={(e) => setData('username', e.target.value)}
            required
          />
          <InputError message={errors.username} className="mt-2" />
        </div>

        {/* Email */}
        <div>
          <InputLabel htmlFor="email" value="Email" />
          <TextInput
            id="email"
            type="email"
            name="email"
            value={data.email}
            className="mt-1 block w-full"
            onChange={(e) => setData('email', e.target.value)}
            required
          />
          <InputError message={errors.email} className="mt-2" />
        </div>

        {/* Password */}
        <div>
          <InputLabel htmlFor="password" value="Password" />
          <TextInput
            id="password"
            type="password"
            name="password"
            value={data.password}
            className="mt-1 block w-full"
            onChange={(e) => setData('password', e.target.value)}
            required
          />
          <InputError message={errors.password} className="mt-2" />
        </div>

        {/* Confirm Password */}
        <div>
          <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
          <TextInput
            id="password_confirmation"
            type="password"
            name="password_confirmation"
            value={data.password_confirmation}
            className="mt-1 block w-full"
            onChange={(e) => setData('password_confirmation', e.target.value)}
            required
          />
          <InputError message={errors.password_confirmation} className="mt-2" />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end mt-4">
          <Link
            href={route('login')}
            className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Already registered?
          </Link>

          <PrimaryButton className="ms-4" disabled={processing}>
            Register
          </PrimaryButton>
        </div>
      </form>
    </GuestLayout>
  );
}
