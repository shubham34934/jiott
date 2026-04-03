import { formatDisplayDate } from "@/lib/formatDisplayDate";

export default function PrivacyPage() {
  return (
    <div className="px-4 pt-8 pb-16 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-xs text-neutral mb-6">
        Last updated: {formatDisplayDate(new Date(2026, 2, 27))}
      </p>

      <div className="space-y-6 text-sm text-text-primary leading-relaxed">
        <section>
          <h2 className="font-semibold text-base mb-2">1. Overview</h2>
          <p>
            JioTT (&quot;the App&quot;) is an internal table tennis match tracker
            for use within a company or group. This Privacy Policy explains how
            we collect, use, and protect your personal information when you use
            the App.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">
            2. Information We Collect
          </h2>
          <p>When you sign in with Google, we collect:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-neutral">
            <li>Your name</li>
            <li>Your email address</li>
            <li>Your Google profile picture</li>
          </ul>
          <p className="mt-2">
            We also store match data you create: match scores, set results, and
            player ratings.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">
            3. How We Use Your Information
          </h2>
          <ul className="list-disc list-inside space-y-1 text-neutral">
            <li>To create and manage your player profile</li>
            <li>To display your name on match records and the leaderboard</li>
            <li>To calculate and update your ELO rating</li>
            <li>To authenticate you securely via Google Sign-In</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">4. Data Storage</h2>
          <p>
            All data is stored securely in MongoDB Atlas (cloud database). We
            do not sell, share, or transfer your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">
            5. Google OAuth Scopes
          </h2>
          <p>
            We only request the minimum required Google OAuth scopes:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-neutral">
            <li>
              <code className="bg-background px-1 rounded">email</code> — to
              identify your account
            </li>
            <li>
              <code className="bg-background px-1 rounded">profile</code> — to
              display your name and photo
            </li>
          </ul>
          <p className="mt-2">
            We do not access your Google Drive, Gmail, Contacts, or any other
            Google services.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">6. Data Retention</h2>
          <p>
            Your data is retained as long as you have an account. You can
            request deletion of your account and associated data by contacting
            the app administrator.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-neutral">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">8. Contact</h2>
          <p>
            For any privacy-related questions or data deletion requests, contact
            the app administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
