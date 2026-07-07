import { AuthForm } from '@/components/auth/AuthForm';
import { signup } from './actions';

export default function SignupPage() {
    return (
        <AuthForm
            title="Create your account"
            subtitle="Predict matches and compete with friends"
            fields={[
                {
                    id: 'username',
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    autoComplete: 'username',
                },
                {
                    id: 'email',
                    name: 'email',
                    label: 'Email',
                    type: 'email',
                    autoComplete: 'email',
                },
                {
                    id: 'password',
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    autoComplete: 'new-password',
                },
            ]}
            submitLabel="Sign up"
            action={signup}
            footer={{ text: 'Already have an account?', linkLabel: 'Log in', href: '/login' }}
        />
    );
}
