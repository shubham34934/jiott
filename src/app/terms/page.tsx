export default function TermsPage() {
  return (
    <div className="px-4 pt-8 pb-16 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
      <p className="text-xs text-neutral mb-6">Last updated: March 27, 2026</p>

      <div className="space-y-6 text-sm text-text-primary leading-relaxed">
        <section>
          <h2 className="font-semibold text-base mb-2">1. Acceptance</h2>
          <p>
            By using JioTT, you agree to these Terms of Service. This app is
            intended for internal use within a company or group to track table
            tennis matches.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">2. Use of Service</h2>
          <ul className="list-disc list-inside space-y-1 text-neutral">
            <li>You must sign in with a valid Google account</li>
            <li>You are responsible for the match data you submit</li>
            <li>Do not submit false or misleading match results</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">3. Disclaimer</h2>
          <p>
            JioTT is provided &quot;as is&quot; without warranties of any kind.
            The app is not liable for any data loss or service interruptions.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">4. Changes</h2>
          <p>
            We may update these terms at any time. Continued use of the app
            constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
