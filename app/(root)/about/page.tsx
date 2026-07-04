import { PageHeader } from '@/components/ui/PageHeader';

const About = () => {
    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="About"
                subtitle="Small betting pools with friends — no money involved."
            />

            <div className="flex max-w-2xl flex-col gap-4 text-fg-muted text-sm leading-relaxed">
                <p>
                    Wettsite lets you predict the winners of esports and sports matches and compete
                    with your friends. Pick a tournament, make your predictions before each match
                    starts, and earn points for every correct call.
                </p>
                <p>
                    Standings are tracked per tournament, so every event is a fresh race. No stakes,
                    no payouts — just bragging rights.
                </p>
            </div>
        </div>
    );
};

export default About;
