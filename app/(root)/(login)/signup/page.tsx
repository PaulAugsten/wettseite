import { signup } from './actions';

export default function LoginPage() {
    return (
        <form id="registration-form">
            <label htmlFor="username">Username:</label>
            <input id="username" name="username" type="text" required />
            <label htmlFor="email">Email:</label>
            <input id="email" name="email" type="email" />
            <label htmlFor="password">Password:</label>
            <input id="password" name="password" type="password" required />
            <button formAction={signup}>Sign up</button>
        </form>
    );
}
