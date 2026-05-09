type Standing = {
    user_id: string;
    username: string;
    points: number;
    total_predictions: number;
};

export default function PredictionStandings({ standings }: { standings: Standing[] }) {
    const sorted = [...standings].sort((a, b) => b.points - a.points);

    return (
        <div className="standingsTable">
            <h2 className="standingstitle">Standings</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>User</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((s, i) => (
                        <tr key={s.user_id}>
                            <td
                                className={`standingsRank${i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : ''}`}
                            >
                                {i + 1}
                            </td>
                            <td>{s.username}</td>
                            <td>{s.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
