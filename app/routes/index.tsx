import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/server-runtime';
import type { LoaderFunction } from '@remix-run/server-runtime';
import { authenticator } from "../services/auth.server";
import { Form, redirect } from 'remix';

import { getArcConfig, Arc } from '~/models/arc.server';
import { AuthorizationError } from 'remix-auth';

export const loader: LoaderFunction = async () => {
  let config = await getArcConfig();
  return await json<Arc>(config);
};

export default function Index() {
  let data: Arc = useLoaderData();

  return (
    <Form method="post">
      <input type="text" name="username" required />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />
      <button>Sign In</button>
    </Form>
  );
}

export let action: ActionFunction = async ({ request }) => {
  try {
    return await authenticator.authenticate("user-pass", request, {
      successRedirect: "/dashboard",
      throwOnError: true,
    });
  } catch (e) {
    if (e instanceof Response) { return e; }
    if (e instanceof AuthorizationError) {
      try {
        console.log('Trying to parse...', e.message);
        let details = JSON.parse(e.message);
        switch(details.type) {
          case "password_reset":
            return redirect(`/reset-password?session=${encodeURIComponent(details.session)}&username=${encodeURIComponent(details.username)}`);
          default:
            console.error(e);
            return redirect('/login');
        }
      } catch(e) {
        console.error(e);
        return redirect('/login');
      }
    }

    console.error(e);
    return redirect('/login');
  }
};