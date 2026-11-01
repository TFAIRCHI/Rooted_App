"use client";

export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="loading-screen"><h1>We couldn’t open this page.</h1><p>Your saved work remains on the server.</p><button onClick={reset}>Try again</button></main>; }
