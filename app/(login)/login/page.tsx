import { AuthForm } from '@/components/auth/AuthForm';
import { login } from './actions';

export default function LoginPage() {
    return (
        <AuthForm
            title="Welcome back"
            subtitle="Sign in to your account"
            fields={[
                {
                    id: 'username',
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    autoComplete: 'username',
                },
                {
                    id: 'password',
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    autoComplete: 'current-password',
                },
            ]}
            submitLabel="Sign in"
            action={login}
            footer={{ text: "Don't have an account?", linkLabel: 'Sign up', href: '/signup' }}
        />
    );
}
