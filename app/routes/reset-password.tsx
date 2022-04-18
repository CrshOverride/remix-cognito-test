import { Form } from 'remix';
import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/server-runtime';
import type { LoaderFunction } from '@remix-run/server-runtime';
import { resetPassword } from '~/services/auth.server';
import { redirect } from 'remix';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const session = url.searchParams.get('session');
  const username = url.searchParams.get('username');
  return json({ session, username });
};

export default function ResetPassword() {
  let { session, username } = useLoaderData();

  return (
    <Form method='post'>
      <input type="password" name="password" autoComplete='current-password' required />
      <input type="password" name="confirm" autoComplete='current-password' required />
      <input type='hidden' name='session' value={session} />
      <input type='hidden' name='username' value={username} />
      <button>Set New Password</button>
    </Form>
  );
};

export let action: ActionFunction = async ({ request }) => {
  let form = await request.formData();
  let username = form.get('username');
  let session = form.get('session');
  let password = form.get('password');
  let confirm = form.get('confirm');

  if (password !== confirm) {
    // bad, very bad.
    console.log('Password:', password);
    console.log('Confirm:', confirm);
    throw new Error('Passwords do not match');
  }

  console.log('Passwords match, resetting password...');
  try {
    console.log('Username: ', username);
    console.log('Password: ', password);
    let response = await resetPassword(username, password, session);
    return redirect('/login');
  } catch (e) {
    console.error(e);
    throw e;
  }
}